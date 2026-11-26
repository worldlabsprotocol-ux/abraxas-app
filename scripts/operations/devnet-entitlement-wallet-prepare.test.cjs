const test=require('node:test');
const assert=require('node:assert/strict');
const {randomBytes}=require('node:crypto');
const {Keypair,Transaction,PublicKey}=require('@solana/web3.js');
const {prepare,STEPS,verifyPrefix}=require('./devnet-entitlement-wallet-prepare.cjs');
const {walletEvidence,verifyEvidence}=require('./verify-devnet-entitlement-lifecycle.cjs');

const FOUNDER='3cKi3oxEoFDZ7corbQ1Uk21gxqdgPu3LpH4MN313EnRd';
const PROOF='CpTXbbnM6crXj1b6WKwuk87bBTYjJWeGRePcJGXS526F';
const CONSUMER='9gaEjncEjJYq7YVKELNWmegL4dCgtkVqHeaRFCLBr92s';
const GENESIS='EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
const input=()=>({admin:FOUNDER,receipt1:randomBytes(32).toString('hex'),
  payload1:randomBytes(32).toString('hex'),receipt2:randomBytes(32).toString('hex'),
  payload2:randomBytes(32).toString('hex'),expires:Math.floor(Date.now()/1000)+900,evidence:[]});
const rpc={getGenesisHash:async()=>GENESIS,
  getLatestBlockhash:async()=>({blockhash:'11111111111111111111111111111111',lastValidBlockHeight:123}),
  getFeeForMessage:async()=>({value:5000}),getMinimumBalanceForRentExemption:async()=>1_000_000};
const enabled=()=>{process.env.ABRAXAS_DEVNET_WALLET_TEST_ENABLED='true';
  process.env.ABRAXAS_DEVNET_WALLET_TEST_MAX_LAMPORTS='50000000';
  process.env.ABRAXAS_DEVNET_WALLET_TEST_APPROVAL_REFERENCE=
    'https://github.com/worldlabsprotocol-ux/abraxas-app/pull/1000#issuecomment-123456';};
const disabled=()=>{delete process.env.ABRAXAS_DEVNET_WALLET_TEST_ENABLED;
  delete process.env.ABRAXAS_DEVNET_WALLET_TEST_MAX_LAMPORTS;
  delete process.env.ABRAXAS_DEVNET_WALLET_TEST_APPROVAL_REFERENCE;};

test('execution and issuer messages stay disabled without a separate cap',async()=>{
  disabled();
  const f=input();
  const status=await prepare({...f,action:'preflight'},rpc);
  assert.equal(status.executionEnabled,false);
  await assert.rejects(prepare({...f,action:'transaction',stepId:STEPS[0].id},rpc),/not been authorized/);
  await assert.rejects(prepare({...f,action:'message',stepId:STEPS[4].id},rpc),/not been authorized/);
  process.env.ABRAXAS_DEVNET_WALLET_TEST_ENABLED='true';
  await assert.rejects(prepare({...f,action:'transaction',stepId:STEPS[0].id},rpc),/not been authorized/);
  process.env.ABRAXAS_DEVNET_WALLET_TEST_MAX_LAMPORTS='50000000';
  await assert.rejects(prepare({...f,action:'transaction',stepId:STEPS[0].id},rpc),/not been authorized/);
  disabled();
});
test('wrong wallet, stale receipt, wrong genesis, and skipped step fail closed',async()=>{
  enabled();
  const f=input();
  await assert.rejects(prepare({...f,admin:Keypair.generate().publicKey.toBase58(),action:'review',stepId:STEPS[0].id},rpc),/Unapproved/);
  await assert.rejects(prepare({...f,expires:1,action:'review',stepId:STEPS[0].id},rpc),/Invalid or stale/);
  await assert.rejects(prepare({...f,action:'review',stepId:STEPS[0].id},
    {...rpc,getGenesisHash:async()=>'wrong'}),/Wrong Solana cluster/);
  await assert.rejects(prepare({...f,action:'review',stepId:STEPS[1].id},rpc),/Incomplete journey evidence/);
  disabled();
});
test('review bounds next debit and unsigned transaction requires founder payer',async()=>{
  enabled(); const f=input();
  const review=await prepare({...f,action:'review',stepId:STEPS[0].id},rpc);
  assert.equal(review.spentLamports,0);
  assert.equal(review.maxDebitLamports,1_105_000);
  const result=await prepare({...f,action:'transaction',stepId:STEPS[0].id},rpc);
  const tx=Transaction.from(Buffer.from(result.transaction,'base64'));
  assert.equal(tx.feePayer.toBase58(),FOUNDER);
  assert.equal(tx.signatures.length,1);
  assert.equal(tx.signatures[0].signature,null);
  process.env.ABRAXAS_DEVNET_WALLET_TEST_MAX_LAMPORTS='1000000';
  await assert.rejects(prepare({...f,action:'review',stepId:STEPS[0].id},rpc),/spending ceiling/);
  disabled();
});
test('prior evidence must be a finalized, program-bound, sequential prefix',async()=>{
  enabled(); const f=input();
  const fake=Array.from({length:2},(_,n)=>({id:STEPS[n].id,signature:Keypair.generate().publicKey.toBase58().repeat(2),slot:n+1}));
  await assert.rejects(verifyPrefix({...f,evidence:fake},rpc,1),/Incomplete journey evidence/);
  const one={...f,evidence:[fake[0]]};
  await assert.rejects(verifyPrefix(one,{...rpc,getTransaction:async()=>null},1),/not finalized/);
  disabled();
});
test('server counts actual finalized payer debit before preparing the next step',async()=>{
  enabled(); const f=input();
  const first=await prepare({...f,action:'transaction',stepId:STEPS[0].id},rpc);
  const message=Transaction.from(Buffer.from(first.transaction,'base64')).compileMessage();
  const signature=Keypair.generate().publicKey.toBase58().repeat(2);
  const prior={id:STEPS[0].id,signature,slot:123};
  const observed={slot:123,meta:{err:null,preBalances:[50_000_000],postBalances:[48_000_000]},
    transaction:{message}};
  const next=await prepare({...f,evidence:[prior],action:'review',stepId:STEPS[1].id},
    {...rpc,getTransaction:async()=>observed});
  assert.equal(next.spentLamports,2_000_000);
  assert.equal(next.remainingAfterMaxLamports,50_000_000-2_000_000-next.maxDebitLamports);
  await assert.rejects(prepare({...f,evidence:[prior],action:'review',stepId:STEPS[1].id},
    {...rpc,getTransaction:async()=>({...observed,transaction:{message:{...message,accountKeys:[Keypair.generate().publicKey]}}})}),
    /account binding mismatch/);
  disabled();
});
test('independent wallet evidence requires two distinct receipts and the complete sequence',async()=>{
  const f=input();
  const packet={schema:'abraxas-devnet-entitlement-wallet-v2',genesis:GENESIS,
    programs:[PROOF,CONSUMER],test_admin:FOUNDER,holder2:FOUNDER,
    receipt1:f.receipt1,payload1:f.payload1,receipt2:f.receipt2,payload2:f.payload2,expires_at:f.expires,
    transactions:STEPS.map((s,n)=>({label:s.id,signature:`sig${n}`,slot:n+1,
      expected_failure:Boolean(s.rejected)}))};
  const derived=walletEvidence(packet);
  assert.equal(derived.accounts.ata1,derived.accounts.ata2);
  assert.notEqual(derived.accounts.commitment1,derived.accounts.commitment2);
  assert.throws(()=>walletEvidence({...packet,receipt2:packet.receipt1}),/shape mismatch/);
  await assert.rejects(verifyEvidence({...packet,transactions:packet.transactions.slice(1)},rpc,async()=>{}),/shape mismatch/);
});
test('independent verifier rejects wrong account ownership after finalized sequence',async()=>{
  const f=input(),wrong=Keypair.generate().publicKey;
  const packet={schema:'abraxas-devnet-entitlement-wallet-v2',genesis:GENESIS,
    programs:[PROOF,CONSUMER],test_admin:FOUNDER,holder2:FOUNDER,
    receipt1:f.receipt1,payload1:f.payload1,receipt2:f.receipt2,payload2:f.payload2,
    expires_at:f.expires,transactions:STEPS.map((s,n)=>({label:s.id,
      signature:Keypair.generate().publicKey.toBase58().repeat(2),slot:n+1,
      expected_failure:Boolean(s.rejected),...(s.action==='wrong_holder'?{wrongHolder:wrong.toBase58()}: {})}))};
  const a=walletEvidence(packet).accounts;
  const observed=new Map(packet.transactions.map((item,index)=>{
    const step=STEPS[index],consumer=['initialize_relying_party','consume_entitlement',
      'repeat_consume','wrong_holder','revoked_consume'].includes(step.action);
    const program=new PublicKey(consumer?CONSUMER:PROOF);
    const account=new PublicKey(step.action==='initialize_registry'||step.action==='bind_holder'?a.registry:
      step.action==='initialize_mint'?a.mint:step.action==='initialize_relying_party'?a.trusted_config:
      step.action==='mint_entitlement'?a[`issuance${step.receipt}`]:
      ['consume_entitlement','repeat_consume','wrong_holder','revoked_consume'].includes(step.action)?
        a[`ata${step.receipt}`]:a[`commitment${step.receipt}`]);
    const keys=[new PublicKey(FOUNDER),...(step.action==='wrong_holder'?[wrong]:[]),account,program];
    if(['signed_receipt','revoke_receipt'].includes(step.action)) keys.push(new PublicKey('Ed25519SigVerify111111111111111111111111111'));
    const instructions=step.action==='signed_receipt'||step.action==='revoke_receipt'?
      [{programIdIndex:keys.length-1},{programIdIndex:keys.indexOf(program)}]:
      [{programIdIndex:keys.indexOf(program)}];
    return [item.signature,{slot:item.slot,meta:{err:step.rejected?{InstructionError:[0,{Custom:1}]}:null},
      transaction:{message:{accountKeys:keys,instructions,header:{numRequiredSignatures:step.action==='wrong_holder'?2:1}}}}];
  }));
  const fakeRpc={getGenesisHash:async()=>GENESIS,
    getTransaction:async signature=>observed.get(signature),
    getAccountInfo:async()=>({owner:wrong,data:Buffer.alloc(250)})};
  await assert.rejects(verifyEvidence(packet,fakeRpc,async()=>{}),/wrong owner/);
});

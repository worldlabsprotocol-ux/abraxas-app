const test=require('node:test');
const assert=require('node:assert/strict');
const {randomBytes}=require('node:crypto');
const {Keypair,Transaction,PublicKey}=require('@solana/web3.js');
const {prepare,STEPS,verifyPrefix}=require('./devnet-entitlement-wallet-prepare.cjs');
const {walletEvidence,verifyEvidence,requireNativeIssuerInstruction}=require('./verify-devnet-entitlement-lifecycle.cjs');
const ix=require('./devnet-entitlement-instructions.cjs');

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
test('standalone compatibility probe is canonical, expired, and cannot prepare a transaction',async()=>{
  disabled();
  const probe=await prepare({admin:FOUNDER,action:'message_only_probe'},rpc);
  const bytes=Buffer.from(probe.message,'base64');
  assert.equal(bytes.length,211);
  assert.equal(probe.expires,0);
  assert.equal(probe.stepId,'message_only_probe');
  assert.equal(probe.transaction,undefined);
  assert.equal(bytes.subarray(0,Buffer.byteLength('ABRAXAS_PROOF_CONTINUITY_V1')).toString(),
    'ABRAXAS_PROOF_CONTINUITY_V1');
  assert.equal(bytes.readBigUInt64BE(187),0n);
  assert.equal(bytes.readBigUInt64BE(195),0n);
  assert.equal(bytes.readBigUInt64BE(203),0n);
  await assert.rejects(prepare({admin:FOUNDER,action:'message_only_probe'},
    {...rpc,getGenesisHash:async()=>'wrong'}),/Wrong Solana cluster/);
  await assert.rejects(prepare({admin:Keypair.generate().publicKey.toBase58(),action:'message_only_probe'},rpc),
    /Unapproved/);
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

test('expired unissued receipts can be replaced only after four finalized steps and absent ledger',async()=>{
  enabled(); const f=input(),observed=new Map(),evidence=[];
  const liveRpc={...rpc,getTransaction:async signature=>observed.get(signature),
    getMultipleAccountsInfo:async()=>[null,null,null]};
  for(let i=0;i<4;i++) {
    const prepared=await prepare({...f,evidence,action:'transaction',stepId:STEPS[i].id},liveRpc);
    const message=Transaction.from(Buffer.from(prepared.transaction,'base64')).compileMessage();
    const signature=Keypair.generate().publicKey.toBase58().repeat(2);
    observed.set(signature,{slot:i+1,meta:{err:null,preBalances:[50_000_000-i*1_000_000],
      postBalances:[49_000_000-i*1_000_000]},transaction:{message}});
    evidence.push({id:STEPS[i].id,signature,slot:i+1});
  }
  disabled();
  const current={...f,evidence,action:'compatibility_message',stepId:'signed_receipt1'};
  const messageOnly=await prepare(current,liveRpc);
  assert.equal(Buffer.from(messageOnly.message,'base64').length,211);
  assert.equal(messageOnly.transaction,undefined);
  await assert.rejects(prepare({...current,action:'transaction'},liveRpc),/not been authorized/);
  await assert.rejects(prepare({...current,evidence:evidence.slice(1)},liveRpc),/four finalized/);
  await assert.rejects(prepare(current,{...liveRpc,getMultipleAccountsInfo:async()=>[null,Buffer.alloc(1),null]}),
    /ledger already exists/);
  await assert.rejects(prepare({...current,expires:1},liveRpc),/Invalid or stale/);
  const expired={...f,expires:1,evidence,action:'recover',stepId:'signed_receipt1'};
  const result=await prepare(expired,liveRpc);
  assert.equal(result.recoverable,true);
  assert.equal(result.spentLamports,4_000_000);
  await assert.rejects(prepare({...expired,evidence:evidence.slice(1)},liveRpc),/four finalized/);
  await assert.rejects(prepare(expired,{...liveRpc,getMultipleAccountsInfo:async()=>[Buffer.alloc(1),null,null]}),
    /ledger already exists/);
  await assert.rejects(prepare({...expired,receipt1:Keypair.generate().publicKey.toBase58()},liveRpc),
    /Invalid or stale/);
  disabled();
});
test('native issuer transaction binds the registered issuer, exact receipt and policy without a message signature',async()=>{
  enabled(); process.env.ABRAXAS_DEVNET_NATIVE_ISSUER_ENABLED='true';
  process.env.ABRAXAS_DEVNET_NATIVE_ISSUER_APPROVAL_REFERENCE=
    'https://github.com/worldlabsprotocol-ux/abraxas-app/pull/1004#issuecomment-987654';
  try {
    const f=input(), observed=new Map(), evidence=[];
    const liveRpc={...rpc,getTransaction:async signature=>observed.get(signature)};
    for(let i=0;i<4;i++) {
      const prepared=await prepare({...f,evidence,action:'transaction',stepId:STEPS[i].id},liveRpc);
      const message=Transaction.from(Buffer.from(prepared.transaction,'base64')).compileMessage();
      const signature=Keypair.generate().publicKey.toBase58().repeat(2);
      observed.set(signature,{slot:i+1,meta:{err:null,preBalances:[50_000_000],postBalances:[49_000_000]},transaction:{message}});
      evidence.push({id:STEPS[i].id,signature,slot:i+1});
    }
    assert.equal((await prepare({...f,action:'preflight'},liveRpc,async()=>({}))).nativeIssuerReady,true);
    await assert.rejects(prepare({...f,evidence,action:'message',stepId:'signed_receipt1'},liveRpc),
      /transaction signature only/);
    const prepared=await prepare({...f,evidence,action:'transaction',stepId:'signed_receipt1'},liveRpc);
    const tx=Transaction.from(Buffer.from(prepared.transaction,'base64'));
    assert.equal(tx.instructions.length,1);
    const expected=ix.harnessNativeIx(new PublicKey(FOUNDER),new PublicKey(FOUNDER),new PublicKey(FOUNDER),
      ix.addresses(new PublicKey(FOUNDER),new PublicKey(FOUNDER),Buffer.from(f.receipt1,'hex')),
      Buffer.from(f.receipt1,'hex'),Buffer.from(f.payload1,'hex'),f.expires);
    assert.deepEqual(tx.instructions[0].data,expected.data);
    assert.equal(tx.instructions[0].keys[2].isSigner,true);
    assert.equal(tx.instructions[0].keys[2].pubkey.toBase58(),FOUNDER);
    assert.equal(tx.instructions[0].keys[4].pubkey.toBase58(),expected.keys[4].pubkey.toBase58());
    assert.equal(tx.instructions.some(item=>item.programId.toBase58()==='Ed25519SigVerify111111111111111111111111111'),false);
  } finally { delete process.env.ABRAXAS_DEVNET_NATIVE_ISSUER_ENABLED;
    delete process.env.ABRAXAS_DEVNET_NATIVE_ISSUER_APPROVAL_REFERENCE; disabled(); }
});
test('independent native verifier rejects altered receipts and wrong signer',()=>{
  const f=input(), founder=new PublicKey(FOUNDER), receipt=Buffer.from(f.receipt1,'hex');
  const accounts=ix.addresses(founder,founder,receipt);
  const instruction=ix.harnessNativeIx(founder,founder,founder,accounts,receipt,
    Buffer.from(f.payload1,'hex'),f.expires);
  const tx=new Transaction({feePayer:founder,recentBlockhash:'11111111111111111111111111111111'}).add(instruction);
  const message=tx.compileMessage();
  const step=STEPS.find(s=>s.id==='signed_receipt1');
  assert.doesNotThrow(()=>requireNativeIssuerInstruction(message,step,{
    test_admin:FOUNDER,receipt1:f.receipt1,payload1:f.payload1,expires_at:f.expires}));
  assert.throws(()=>requireNativeIssuerInstruction(message,step,{
    test_admin:FOUNDER,receipt1:f.receipt1,payload1:randomBytes(32).toString('hex'),expires_at:f.expires}),
    /exact receipt binding mismatch/);
  assert.throws(()=>requireNativeIssuerInstruction(message,step,{
    test_admin:Keypair.generate().publicKey.toBase58(),receipt1:f.receipt1,payload1:f.payload1,expires_at:f.expires}),
    /signature missing/);
  const swappedRegistry=ix.harnessNativeIx(founder,founder,founder,accounts,receipt,
    Buffer.from(f.payload1,'hex'),f.expires);
  swappedRegistry.keys[3].pubkey=Keypair.generate().publicKey;
  assert.throws(()=>requireNativeIssuerInstruction(new Transaction({feePayer:founder,
    recentBlockhash:'11111111111111111111111111111111'}).add(swappedRegistry).compileMessage(),step,{
    test_admin:FOUNDER,receipt1:f.receipt1,payload1:f.payload1,expires_at:f.expires}),
    /exact receipt binding mismatch/);
  const otherProgram=ix.harnessNativeIx(founder,founder,founder,accounts,receipt,
    Buffer.from(f.payload1,'hex'),f.expires);
  otherProgram.programId=new PublicKey(CONSUMER);
  assert.throws(()=>requireNativeIssuerInstruction(new Transaction({feePayer:founder,
    recentBlockhash:'11111111111111111111111111111111'}).add(otherProgram).compileMessage(),step,{
    test_admin:FOUNDER,receipt1:f.receipt1,payload1:f.payload1,expires_at:f.expires}),
    /exact receipt binding mismatch/);
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

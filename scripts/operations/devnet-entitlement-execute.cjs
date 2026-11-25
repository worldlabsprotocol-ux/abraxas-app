const { randomBytes }=require('node:crypto');
const { spawnSync }=require('node:child_process');
const { writeFileSync }=require('node:fs');
const { Connection, PublicKey, Keypair, Transaction, TransactionInstruction, SystemProgram }=require('@solana/web3.js');
const { PROOF, CONSUMER, scope, addresses, canonical, issuerIx, registerIx, sandboxIx, harnessIx, mintInitIx, trustedIx, mintIx, consumeIx, revokeIx }=require('./devnet-entitlement-instructions.cjs');
const RPC=process.env.ABRAXAS_DEVNET_RPC_URL||'https://api.devnet.solana.com';
const GENESIS='EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
const FOUNDER=new PublicKey('3cKi3oxEoFDZ7corbQ1Uk21gxqdgPu3LpH4MN313EnRd');
const MEMO=new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
const MAX_CEILING=100_000_000;
const connection=new Connection(RPC,'finalized');
async function submit(label,payer,signers,instructions,expectedFailure=false) {
  const {blockhash,lastValidBlockHeight}=await connection.getLatestBlockhash('finalized');
  const tx=new Transaction({feePayer:payer.publicKey,recentBlockhash:blockhash});
  tx.add(...instructions);
  tx.sign(payer,...signers.filter(s=>!s.publicKey.equals(payer.publicKey)));
  const signature=await connection.sendRawTransaction(tx.serialize(),{skipPreflight:expectedFailure,maxRetries:5});
  const confirmation=await connection.confirmTransaction({signature,blockhash,lastValidBlockHeight},'finalized');
  const details=await connection.getTransaction(signature,{commitment:'finalized',maxSupportedTransactionVersion:0});
  if (!details || Boolean(details.meta?.err)!==expectedFailure || Boolean(confirmation.value.err)!==expectedFailure)
    throw Error(`${label} outcome mismatch: ${signature} ${JSON.stringify(details?.meta?.err)}`);
  console.log(`${label}: ${signature} finalized ${expectedFailure?'rejected':'accepted'}`);
  return {label,signature,slot:details.slot,expected_failure:expectedFailure,error:details.meta?.err??null};
}
function uniqueMemo() { return new TransactionInstruction({programId:MEMO,keys:[],data:randomBytes(8)}); }

async function execute(plan) {
  const approved=Number(process.env.APPROVED_MAX_LAMPORTS);
  if (!Number.isSafeInteger(approved) || approved<plan.ceiling_lamports || approved>MAX_CEILING ||
      process.env.FOUNDER_CONFIRMATION!=='EXECUTE_ABRAXAS_DEVNET_TEST' ||
      !/^[A-Za-z0-9:/#._-]{16,240}$/.test(process.env.APPROVAL_REFERENCE||''))
    throw Error('Missing bounded founder authorization');
  const payer=Keypair.generate(), otherHolder=Keypair.generate();
  const payerText=payer.publicKey.toBase58();
  console.log(`Fund one-run Devnet test payer ${payerText} from ${FOUNDER.toBase58()} with exactly ${plan.ceiling_lamports} lamports; no private keys are logged.`);
  const wait=spawnSync(process.execPath,['scripts/operations/await-devnet-entitlement-funding.mjs',
    payerText,FOUNDER.toBase58(),String(plan.ceiling_lamports),String(approved),GENESIS],
    {stdio:'inherit',env:{...process.env,ABRAXAS_DEVNET_RPC_URL:RPC},timeout:46*60_000});
  if (wait.status!==0) throw Error('Founder funding authorization did not finalize');
  const receipt1=randomBytes(32),receipt2=randomBytes(32),payload1=randomBytes(32),payload2=randomBytes(32);
  const expires=Math.floor(Date.now()/1000)+15*60;
  const a1=addresses(payer.publicKey,payer.publicKey,receipt1);
  const a2=addresses(payer.publicKey,otherHolder.publicKey,receipt2);
  const evidence={schema:'abraxas-devnet-entitlement-test-v1',genesis:GENESIS,programs:[PROOF.toBase58(),CONSUMER.toBase58()],
    founder_funding_wallet:FOUNDER.toBase58(),test_admin:payerText,holder2:otherHolder.publicKey.toBase58(),
    scope_hashes:Object.fromEntries(Object.entries(scope).map(([k,v])=>[k,v.toString('hex')])),
    receipt1:receipt1.toString('hex'),receipt2:receipt2.toString('hex'),expires_at:expires,
    accounts:{registry:a1.registry.toBase58(),mint:a1.mint.toBase58(),trusted_config:a1.trusted.toBase58(),
      commitment1:a1.commitment.toBase58(),commitment2:a2.commitment.toBase58(),
      issuance1:a1.issuance.toBase58(),issuance2:a2.issuance.toBase58(),
      consumption1:a1.consumption.toBase58(),consumption2:a2.consumption.toBase58(),
      ata1:a1.ata.toBase58(),ata2:a2.ata.toBase58()},transactions:[]};
  const record=async(label,signers,ixs,fail=false)=>evidence.transactions.push(await submit(label,payer,signers,ixs,fail));
  try {
    await record('initialize_registry',[],[registerIx(payer.publicKey,a1)]);
    await record('bind_holder1',[],[sandboxIx(payer.publicKey,a1)]);
    await record('initialize_mint',[],[mintInitIx(payer.publicKey,a1)]);
    await record('initialize_relying_party',[],[trustedIx(payer.publicKey,a1)]);
    await record('signed_receipt1',[],[issuerIx(payer,canonical(receipt1,payload1,expires,1,1)),harnessIx(payer.publicKey,payer.publicKey,a1,receipt1,payload1,expires)]);
    await record('mint_entitlement1',[],[mintIx(payer.publicKey,payer.publicKey,a1,receipt1)]);
    await record('consume_entitlement1',[],[consumeIx(payer.publicKey,payer.publicKey,a1,receipt1)]);
    await record('repeat_consume_rejected',[],[uniqueMemo(),consumeIx(payer.publicKey,payer.publicKey,a1,receipt1)],true);
    await record('fund_second_holder',[],[SystemProgram.transfer({fromPubkey:payer.publicKey,toPubkey:otherHolder.publicKey,lamports:10_000_000})]);
    await record('bind_holder2',[otherHolder],[sandboxIx(otherHolder.publicKey,a2)]);
    await record('signed_receipt2',[otherHolder],[issuerIx(payer,canonical(receipt2,payload2,expires,1,1)),harnessIx(payer.publicKey,otherHolder.publicKey,a2,receipt2,payload2,expires)]);
    await record('mint_entitlement2',[otherHolder],[mintIx(payer.publicKey,otherHolder.publicKey,a2,receipt2)]);
    await record('wrong_holder_rejected',[],[uniqueMemo(),consumeIx(payer.publicKey,payer.publicKey,a2,receipt2)],true);
    for (const [label,a,receipt,payload] of [['revoke_receipt2',a2,receipt2,payload2],['revoke_receipt1',a1,receipt1,payload1]]) {
      const signed=Buffer.concat([Buffer.from('ABRAXAS_PROOF_STATUS_V1'),canonical(receipt,payload,expires,2,1).subarray(Buffer.byteLength('ABRAXAS_PROOF_CONTINUITY_V1')),Buffer.from([1])]);
      await record(label,[],[issuerIx(payer,signed),revokeIx(payer.publicKey,a,receipt,payload,expires)]);
    }
    await record('revoked_consume_rejected',[otherHolder],[uniqueMemo(),consumeIx(payer.publicKey,otherHolder.publicKey,a2,receipt2)],true);
  } finally {
    const output=process.env.GITHUB_OUTPUT_EVIDENCE || 'devnet-entitlement-lifecycle-evidence.json';
    // Return liquid test SOL; rent remains locked in test-only accounts.
    for (const source of [otherHolder,payer]) {
      try {
        const balance=await connection.getBalance(source.publicKey,'finalized');
        if (balance>20_000) evidence.transactions.push(await submit(
          `return_unspent_${source.publicKey.equals(payer.publicKey)?'payer':'holder'}`,
          source,[],[SystemProgram.transfer({fromPubkey:source.publicKey,toPubkey:FOUNDER,lamports:balance-10_000})]));
      } catch(e) { console.error(`Unspent test SOL return needs operator attention for ${source.publicKey.toBase58()}: ${e.message}`); }
    }
    writeFileSync(output,JSON.stringify(evidence,null,2)+'\n',{mode:0o600});
  }
}


module.exports={execute};


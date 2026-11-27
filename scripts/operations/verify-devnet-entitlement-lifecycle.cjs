// Separate, read-only finalized-RPC verification of the public test evidence.
const { readFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const { Connection, PublicKey, Transaction } = require('@solana/web3.js');
const { getAccount, getMint, getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, ExtensionType, getExtensionData } = require('@solana/spl-token');
const { addresses, scope, harnessNativeIx, revokeNativeIx }=require('./devnet-entitlement-instructions.cjs');
const { assertNetworkAndPrograms }=require('./devnet-entitlement-quote.cjs');
const walletSteps=require('./devnet-entitlement-wallet-steps.json');
const identity = require('../../solana/abraxas-eligibility-gate/release/devnet-entitlement-identity.json');
const GENESIS='EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
const PROOF=new PublicKey('CpTXbbnM6crXj1b6WKwuk87bBTYjJWeGRePcJGXS526F');
const CONSUMER=new PublicKey('9gaEjncEjJYq7YVKELNWmegL4dCgtkVqHeaRFCLBr92s');
const connection=new Connection(process.env.ABRAXAS_DEVNET_RPC_URL||'https://api.devnet.solana.com','finalized');
const equal=(a,b)=>new PublicKey(a).equals(new PublicKey(b));
const requireTrue=(condition,message)=>{ if(!condition) throw Error(message); };
const pk=(data,offset)=>new PublicKey(data.subarray(offset,offset+32));
const hash=(data)=>createHash('sha256').update(data).digest();
const d=(name)=>hash(`account:${name}`).subarray(0,8);

async function owned(address,program,name,rpc=connection) {
  const account=await rpc.getAccountInfo(new PublicKey(address),'finalized');
  requireTrue(account && account.owner.equals(program),`${name} missing or wrong owner`);
  requireTrue(account.data.subarray(0,8).equals(d(name)),`${name} discriminator mismatch`);
  return account.data;
}
function walletEvidence(evidence) {
  requireTrue(evidence.schema==='abraxas-devnet-entitlement-wallet-v2' &&
    evidence.test_admin==='3cKi3oxEoFDZ7corbQ1Uk21gxqdgPu3LpH4MN313EnRd' &&
    evidence.holder2===evidence.test_admin &&
    /^[0-9a-f]{64}$/.test(evidence.receipt1) && /^[0-9a-f]{64}$/.test(evidence.receipt2) &&
    /^[0-9a-f]{64}$/.test(evidence.payload1) && /^[0-9a-f]{64}$/.test(evidence.payload2) &&
    evidence.receipt1!==evidence.receipt2 && Number.isSafeInteger(evidence.expires_at) &&
    Array.isArray(evidence.transactions) && evidence.transactions.length===walletSteps.length,
    'Wallet test evidence shape mismatch');
  const admin=new PublicKey(evidence.test_admin);
  const a1=addresses(admin,admin,Buffer.from(evidence.receipt1,'hex'));
  const a2=addresses(admin,admin,Buffer.from(evidence.receipt2,'hex'));
  const key=k=>k.toBase58();
  return {...evidence,scope_hashes:Object.fromEntries(Object.entries(scope).map(([k,v])=>[k,v.toString('hex')])),
    accounts:{registry:key(a1.registry),mint:key(a1.mint),trusted_config:key(a1.trusted),
      commitment1:key(a1.commitment),commitment2:key(a2.commitment),
      issuance1:key(a1.issuance),issuance2:key(a2.issuance),
      consumption1:key(a1.consumption),consumption2:key(a2.consumption),
      ata1:key(a1.ata),ata2:key(a2.ata)}};
}
function requireNativeIssuerInstruction(message, step, evidence) {
  const issuer = new PublicKey(evidence.test_admin);
  const receipt = Buffer.from(evidence[`receipt${step.receipt}`], 'hex');
  const payload = Buffer.from(evidence[`payload${step.receipt}`], 'hex');
  const accounts = addresses(issuer, issuer, receipt);
  const expected = step.action === 'signed_receipt' ?
    harnessNativeIx(issuer, issuer, issuer, accounts, receipt, payload, evidence.expires_at) :
    revokeNativeIx(issuer, accounts, receipt, payload, evidence.expires_at);
  const signerKeys = message.accountKeys.slice(0, message.header.numRequiredSignatures);
  requireTrue(signerKeys.some(key => key.equals(issuer)), 'Native issuer transaction signature missing');
  const matching = Transaction.populate(message).instructions.filter(ix => ix.programId.equals(PROOF) &&
    ix.data.equals(expected.data) && ix.keys.length === expected.keys.length &&
    ix.keys.every((key, n) => key.pubkey.equals(expected.keys[n].pubkey) &&
      (!expected.keys[n].isSigner || key.isSigner) &&
      (!expected.keys[n].isWritable || key.isWritable)));
  requireTrue(matching.length === 1, 'Native issuer instruction or exact receipt binding mismatch');
}
async function verifyEvidence(rawEvidence,rpc=connection,programCheck=assertNetworkAndPrograms) {
  const isWallet=rawEvidence?.schema==='abraxas-devnet-entitlement-wallet-v2';
  const evidence=isWallet?walletEvidence(rawEvidence):rawEvidence;
  requireTrue((isWallet||evidence.schema==='abraxas-devnet-entitlement-test-v1') && evidence.genesis===GENESIS &&
    identity.status==='approved' && identity.genesis_hash===GENESIS &&
    identity.proof_continuity_program_id===PROOF.toBase58() &&
    identity.entitlement_consumer_program_id===CONSUMER.toBase58() &&
    await rpc.getGenesisHash()===GENESIS,'Wrong network or evidence schema');
  await programCheck(rpc);
  requireTrue(evidence.programs[0]===PROOF.toBase58() && evidence.programs[1]===CONSUMER.toBase58(),
    'Program pin mismatch');
  if(isWallet) for(let i=0;i<walletSteps.length;i++) {
    const item=evidence.transactions[i],step=walletSteps[i];
    requireTrue(item.label===step.id && item.expected_failure===Boolean(step.rejected),
      `Wallet journey step ${i+1} mismatch`);
  }
  const sigs=new Set();
  for(const [index,tx] of evidence.transactions.entries()) {
    requireTrue(!sigs.has(tx.signature),'Duplicate transaction signature');
    sigs.add(tx.signature);
    const onchain=await rpc.getTransaction(tx.signature,{commitment:'finalized',maxSupportedTransactionVersion:0});
    requireTrue(onchain && onchain.slot===tx.slot && Boolean(onchain.meta?.err)===tx.expected_failure,
      `${tx.label} finalized transaction mismatch`);
    const expectedPayer=!isWallet&&tx.label==='return_unspent_holder' ? evidence.holder2 : evidence.test_admin;
    requireTrue(onchain.transaction.message.accountKeys[0].toBase58()===expectedPayer,
      `${tx.label} fee payer mismatch`);
    const message=onchain.transaction.message;
    const invoked=message.instructions.map(ix=>message.accountKeys[ix.programIdIndex].toBase58());
    if(isWallet) {
      const step=walletSteps[index];
      const expected=step.action==='initialize_registry'||step.action==='bind_holder'?evidence.accounts.registry:
        step.action==='initialize_mint'?evidence.accounts.mint:
        step.action==='initialize_relying_party'?evidence.accounts.trusted_config:
        step.action==='mint_entitlement'?evidence.accounts[`issuance${step.receipt}`]:
        ['consume_entitlement','repeat_consume','wrong_holder','revoked_consume'].includes(step.action)?
          evidence.accounts[`ata${step.receipt}`]:evidence.accounts[`commitment${step.receipt}`];
      requireTrue(message.accountKeys.some(key=>key.toBase58()===expected),
        `${tx.label} expected account binding missing`);
      if(step.action==='signed_receipt'||step.action==='revoke_receipt') {
        if(!invoked.includes('Ed25519SigVerify111111111111111111111111111'))
          requireNativeIssuerInstruction(message,step,evidence);
      }
    }
    const consumerLabels=new Set(['consume_entitlement1','repeat_consume_rejected',
      'wrong_holder_rejected','revoked_consume_rejected']);
    const proofLabels=new Set(['initialize_registry','bind_holder1','initialize_mint',
      'signed_receipt1','mint_entitlement1','bind_holder2','signed_receipt2',
      'mint_entitlement2','revoke_receipt1','revoke_receipt2','bind_holder']);
    if (consumerLabels.has(tx.label)) requireTrue(invoked.includes(CONSUMER.toBase58()),
      `${tx.label} did not invoke the entitlement consumer`);
    if (proofLabels.has(tx.label)) requireTrue(invoked.includes(PROOF.toBase58()),
      `${tx.label} did not invoke proof continuity`);
    if (tx.expected_failure) {
      const failedIndex=onchain.meta.err?.InstructionError?.[0];
      requireTrue(Number.isInteger(failedIndex) &&
        invoked[failedIndex]===CONSUMER.toBase58(),
        `${tx.label} failed outside the entitlement consumer`);
    }
    if(isWallet&&tx.label==='wrong_holder_rejected') {
      const wrong=new PublicKey(tx.wrongHolder);
      requireTrue(!wrong.equals(new PublicKey(evidence.test_admin)) &&
        message.accountKeys.slice(0,message.header.numRequiredSignatures).some(k=>k.equals(wrong)),
        'Wrong-holder negative probe lacked unrelated signer');
    }
  }
  const labels=new Map(evidence.transactions.map(t=>[t.label,t]));
  const successes=isWallet?walletSteps.filter(s=>!s.rejected).map(s=>s.id):
    ['initialize_registry','bind_holder1','initialize_mint','initialize_relying_party',
      'signed_receipt1','mint_entitlement1','consume_entitlement1','fund_second_holder','bind_holder2',
      'signed_receipt2','mint_entitlement2','revoke_receipt1','revoke_receipt2'];
  for(const label of successes)
    requireTrue(labels.has(label) && !labels.get(label).expected_failure,`Missing success ${label}`);
  for(const label of (isWallet?walletSteps.filter(s=>s.rejected).map(s=>s.id):
    ['repeat_consume_rejected','wrong_holder_rejected','revoked_consume_rejected']))
    requireTrue(labels.has(label) && labels.get(label).expected_failure,`Missing rejected ${label}`);

  const a=evidence.accounts, admin=new PublicKey(evidence.test_admin),holder2=new PublicKey(evidence.holder2);
  const derived=(program,...seeds)=>PublicKey.findProgramAddressSync(seeds,program)[0];
  const registryPda=derived(PROOF,Buffer.from('proof_registry'),admin.toBuffer());
  requireTrue(equal(a.registry,registryPda),'Registry PDA mismatch');
  requireTrue(equal(a.mint,derived(PROOF,Buffer.from('entitlement_mint'),registryPda.toBuffer())),
    'Mint PDA mismatch');
  requireTrue(equal(a.trusted_config,derived(CONSUMER,Buffer.from('relying_party_config'),admin.toBuffer())),
    'Trusted config PDA mismatch');
  const registry=await owned(a.registry,PROOF,'ProofContinuityRegistry',rpc);
  requireTrue(pk(registry,8).equals(admin) && pk(registry,40).equals(admin),'Registry administrator/issuer mismatch');
  for(const [offset,scope] of [[72,'partner'],[104,'policy'],[136,'application']])
    requireTrue(registry.subarray(offset,offset+32).toString('hex')===evidence.scope_hashes[scope],
      `${scope} registry mismatch`);
  const trusted=await owned(a.trusted_config,CONSUMER,'TrustedRelyingPartyConfig',rpc);
  requireTrue(pk(trusted,8).equals(admin) && pk(trusted,40).equals(admin),'Relying-party authority mismatch');
  for(const [offset,scope] of [[72,'partner'],[104,'policy'],[136,'application']])
    requireTrue(trusted.subarray(offset,offset+32).toString('hex')===evidence.scope_hashes[scope],
      `${scope} relying-party mismatch`);
  const mintConfigAddress=PublicKey.findProgramAddressSync(
    [Buffer.from('entitlement_mint_config'),new PublicKey(a.registry).toBuffer()],PROOF)[0];
  const mintConfig=await owned(mintConfigAddress,
    PROOF,'EntitlementMintConfig',rpc);
  requireTrue(pk(mintConfig,8).equals(new PublicKey(a.registry)) && pk(mintConfig,40).equals(new PublicKey(a.mint)) &&
    mintConfig[73]===1,'Mint configuration mismatch');
  const mint=await getMint(rpc,new PublicKey(a.mint),'finalized',TOKEN_2022_PROGRAM_ID);
  requireTrue(mint.decimals===0 && mint.supply===2n &&
    getExtensionData(ExtensionType.NonTransferable,mint.tlvData)!==null,'Token-2022 non-transferable mint mismatch');
  for(const [index,holder,receipt,ata] of [[1,admin,evidence.receipt1,a.ata1],[2,holder2,evidence.receipt2,a.ata2]]) {
    const receiptBytes=Buffer.from(receipt,'hex');
    requireTrue(receiptBytes.length===32 &&
      equal(a[`commitment${index}`],derived(PROOF,Buffer.from('receipt_commitment'),registryPda.toBuffer(),receiptBytes)) &&
      equal(a[`issuance${index}`],derived(PROOF,Buffer.from('entitlement_issuance'),registryPda.toBuffer(),receiptBytes)) &&
      equal(a[`consumption${index}`],derived(CONSUMER,Buffer.from('entitlement_consumption'),registryPda.toBuffer(),receiptBytes)) &&
      equal(ata,getAssociatedTokenAddressSync(new PublicKey(a.mint),holder,false,
        TOKEN_2022_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID)),
      `Receipt ${index} PDA or ATA mismatch`);
    const commitment=await owned(a[`commitment${index}`],PROOF,'ReceiptCommitment',rpc);
    requireTrue(pk(commitment,8).equals(new PublicKey(a.registry)) &&
      commitment.subarray(40,72).toString('hex')===receipt && commitment[208]===1 &&
      commitment.readBigUInt64LE(209)===2n && pk(commitment,217).equals(holder),
      `Receipt ${index} not issuer-bound and revoked`);
    if(isWallet) requireTrue(commitment.subarray(72,104).toString('hex')===evidence[`payload${index}`] &&
      commitment.readBigInt64LE(200)===BigInt(evidence.expires_at),
      `Receipt ${index} payload or expiry mismatch`);
    for(const [offset,scope] of [[104,'partner'],[136,'policy'],[168,'application']])
      requireTrue(commitment.subarray(offset,offset+32).toString('hex')===evidence.scope_hashes[scope],
        `Receipt ${index} ${scope} mismatch`);
    const issuance=await owned(a[`issuance${index}`],PROOF,'EntitlementIssuanceLedger',rpc);
    requireTrue(pk(issuance,8).equals(new PublicKey(a.registry)) &&
      issuance.subarray(40,72).toString('hex')===receipt && pk(issuance,72).equals(holder),
      `Receipt ${index} issuance mismatch`);
    const token=await getAccount(rpc,new PublicKey(ata),'finalized',TOKEN_2022_PROGRAM_ID);
    requireTrue(token.mint.equals(new PublicKey(a.mint)) && token.owner.equals(holder) &&
      token.amount===(isWallet?2n:1n),
      `Holder ${index} token mismatch`);
  }
  const consumed=await owned(a.consumption1,CONSUMER,'EntitlementConsumption',rpc);
  requireTrue(pk(consumed,8).equals(new PublicKey(a.registry)) &&
    consumed.subarray(40,72).toString('hex')===evidence.receipt1 && pk(consumed,72).equals(admin) && consumed[104]===1,
    'Successful single-use consumption not recorded');
  const denied=await rpc.getAccountInfo(new PublicKey(a.consumption2),'finalized');
  requireTrue(!denied,'Revoked entitlement unexpectedly consumed');
  return {verified:true,genesis:GENESIS,proof_program:PROOF.toBase58(),
    consumer_program:CONSUMER.toBase58(),transaction_count:evidence.transactions.length,
    current_status:'both receipts revoked; first consumed once; second not consumed',
    independent_source:'finalized Solana Devnet RPC'};
}
if(require.main===module) {
  const evidence=JSON.parse(readFileSync(process.argv[2],'utf8'));
  verifyEvidence(evidence).then(result=>console.log(JSON.stringify(result,null,2)))
    .catch(e=>{console.error(e.message);process.exitCode=1;});
}
module.exports={verifyEvidence,walletEvidence,requireNativeIssuerInstruction};


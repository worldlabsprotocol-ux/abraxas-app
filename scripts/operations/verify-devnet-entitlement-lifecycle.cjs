// Separate, read-only finalized-RPC verification of the public test evidence.
const { readFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const { Connection, PublicKey } = require('@solana/web3.js');
const { getAccount, getMint, getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = require('@solana/spl-token');
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

async function owned(address,program,name) {
  const account=await connection.getAccountInfo(new PublicKey(address),'finalized');
  requireTrue(account && account.owner.equals(program),`${name} missing or wrong owner`);
  requireTrue(account.data.subarray(0,8).equals(d(name)),`${name} discriminator mismatch`);
  return account.data;
}
async function main() {
  const evidence=JSON.parse(readFileSync(process.argv[2],'utf8'));
  requireTrue(evidence.schema==='abraxas-devnet-entitlement-test-v1' && evidence.genesis===GENESIS &&
    identity.status==='approved' && identity.genesis_hash===GENESIS &&
    identity.proof_continuity_program_id===PROOF.toBase58() &&
    identity.entitlement_consumer_program_id===CONSUMER.toBase58() &&
    await connection.getGenesisHash()===GENESIS,'Wrong network or evidence schema');
  requireTrue(evidence.programs[0]===PROOF.toBase58() && evidence.programs[1]===CONSUMER.toBase58(),
    'Program pin mismatch');
  const sigs=new Set();
  for(const tx of evidence.transactions) {
    requireTrue(!sigs.has(tx.signature),'Duplicate transaction signature');
    sigs.add(tx.signature);
    const onchain=await connection.getTransaction(tx.signature,{commitment:'finalized',maxSupportedTransactionVersion:0});
    requireTrue(onchain && onchain.slot===tx.slot && Boolean(onchain.meta?.err)===tx.expected_failure,
      `${tx.label} finalized transaction mismatch`);
    const expectedPayer=tx.label==='return_unspent_holder' ? evidence.holder2 : evidence.test_admin;
    requireTrue(onchain.transaction.message.accountKeys[0].toBase58()===expectedPayer,
      `${tx.label} fee payer mismatch`);
  }
  const labels=new Map(evidence.transactions.map(t=>[t.label,t]));
  for(const label of ['initialize_registry','bind_holder1','initialize_mint','initialize_relying_party',
    'signed_receipt1','mint_entitlement1','consume_entitlement1','fund_second_holder','bind_holder2',
    'signed_receipt2','mint_entitlement2','revoke_receipt1','revoke_receipt2'])
    requireTrue(labels.has(label) && !labels.get(label).expected_failure,`Missing success ${label}`);
  for(const label of ['repeat_consume_rejected','wrong_holder_rejected','revoked_consume_rejected'])
    requireTrue(labels.has(label) && labels.get(label).expected_failure,`Missing rejected ${label}`);

  const a=evidence.accounts, admin=new PublicKey(evidence.test_admin),holder2=new PublicKey(evidence.holder2);
  const derived=(program,...seeds)=>PublicKey.findProgramAddressSync(seeds,program)[0];
  const registryPda=derived(PROOF,Buffer.from('proof_registry'),admin.toBuffer());
  requireTrue(equal(a.registry,registryPda),'Registry PDA mismatch');
  requireTrue(equal(a.mint,derived(PROOF,Buffer.from('entitlement_mint'),registryPda.toBuffer())),
    'Mint PDA mismatch');
  requireTrue(equal(a.trusted_config,derived(CONSUMER,Buffer.from('relying_party_config'),admin.toBuffer())),
    'Trusted config PDA mismatch');
  const registry=await owned(a.registry,PROOF,'ProofContinuityRegistry');
  requireTrue(pk(registry,8).equals(admin) && pk(registry,40).equals(admin),'Registry administrator/issuer mismatch');
  for(const [offset,scope] of [[72,'partner'],[104,'policy'],[136,'application']])
    requireTrue(registry.subarray(offset,offset+32).toString('hex')===evidence.scope_hashes[scope],
      `${scope} registry mismatch`);
  const trusted=await owned(a.trusted_config,CONSUMER,'TrustedRelyingPartyConfig');
  requireTrue(pk(trusted,8).equals(admin) && pk(trusted,40).equals(admin),'Relying-party authority mismatch');
  for(const [offset,scope] of [[72,'partner'],[104,'policy'],[136,'application']])
    requireTrue(trusted.subarray(offset,offset+32).toString('hex')===evidence.scope_hashes[scope],
      `${scope} relying-party mismatch`);
  const mintConfigAddress=PublicKey.findProgramAddressSync(
    [Buffer.from('entitlement_mint_config'),new PublicKey(a.registry).toBuffer()],PROOF)[0];
  const mintConfig=await owned(mintConfigAddress,
    PROOF,'EntitlementMintConfig');
  requireTrue(pk(mintConfig,8).equals(new PublicKey(a.registry)) && pk(mintConfig,40).equals(new PublicKey(a.mint)) &&
    mintConfig[73]===1,'Mint configuration mismatch');
  const mint=await getMint(connection,new PublicKey(a.mint),'finalized',TOKEN_2022_PROGRAM_ID);
  requireTrue(mint.decimals===0 && mint.supply===2n,'Token-2022 mint mismatch');
  for(const [index,holder,receipt,ata] of [[1,admin,evidence.receipt1,a.ata1],[2,holder2,evidence.receipt2,a.ata2]]) {
    const receiptBytes=Buffer.from(receipt,'hex');
    requireTrue(receiptBytes.length===32 &&
      equal(a[`commitment${index}`],derived(PROOF,Buffer.from('receipt_commitment'),registryPda.toBuffer(),receiptBytes)) &&
      equal(a[`issuance${index}`],derived(PROOF,Buffer.from('entitlement_issuance'),registryPda.toBuffer(),receiptBytes)) &&
      equal(a[`consumption${index}`],derived(CONSUMER,Buffer.from('entitlement_consumption'),registryPda.toBuffer(),receiptBytes)) &&
      equal(ata,getAssociatedTokenAddressSync(new PublicKey(a.mint),holder,false,
        TOKEN_2022_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID)),
      `Receipt ${index} PDA or ATA mismatch`);
    const commitment=await owned(a[`commitment${index}`],PROOF,'ReceiptCommitment');
    requireTrue(pk(commitment,8).equals(new PublicKey(a.registry)) &&
      commitment.subarray(40,72).toString('hex')===receipt && commitment[208]===1 &&
      commitment.readBigUInt64LE(209)===2n && pk(commitment,217).equals(holder),
      `Receipt ${index} not issuer-bound and revoked`);
    for(const [offset,scope] of [[104,'partner'],[136,'policy'],[168,'application']])
      requireTrue(commitment.subarray(offset,offset+32).toString('hex')===evidence.scope_hashes[scope],
        `Receipt ${index} ${scope} mismatch`);
    const issuance=await owned(a[`issuance${index}`],PROOF,'EntitlementIssuanceLedger');
    requireTrue(pk(issuance,8).equals(new PublicKey(a.registry)) &&
      issuance.subarray(40,72).toString('hex')===receipt && pk(issuance,72).equals(holder),
      `Receipt ${index} issuance mismatch`);
    const token=await getAccount(connection,new PublicKey(ata),'finalized',TOKEN_2022_PROGRAM_ID);
    requireTrue(token.mint.equals(new PublicKey(a.mint)) && token.owner.equals(holder) && token.amount===1n,
      `Holder ${index} token mismatch`);
  }
  const consumed=await owned(a.consumption1,CONSUMER,'EntitlementConsumption');
  requireTrue(pk(consumed,8).equals(new PublicKey(a.registry)) &&
    consumed.subarray(40,72).toString('hex')===evidence.receipt1 && pk(consumed,72).equals(admin) && consumed[104]===1,
    'Successful single-use consumption not recorded');
  const denied=await connection.getAccountInfo(new PublicKey(a.consumption2),'finalized');
  requireTrue(!denied,'Revoked entitlement unexpectedly consumed');
  console.log(JSON.stringify({verified:true,genesis:GENESIS,proof_program:PROOF.toBase58(),
    consumer_program:CONSUMER.toBase58(),transaction_count:evidence.transactions.length,
    current_status:'both receipts revoked; first consumed once; second not consumed',
    independent_source:'finalized Solana Devnet RPC'},null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});


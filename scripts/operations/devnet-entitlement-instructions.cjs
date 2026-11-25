const { createHash } = require('node:crypto');
const { PublicKey, TransactionInstruction, Ed25519Program, SystemProgram } = require('@solana/web3.js');
const { TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } = require('@solana/spl-token');
const PROOF = new PublicKey('CpTXbbnM6crXj1b6WKwuk87bBTYjJWeGRePcJGXS526F');
const CONSUMER = new PublicKey('9gaEjncEjJYq7YVKELNWmegL4dCgtkVqHeaRFCLBr92s');
const SYSTEM = SystemProgram.programId;
const hash = (bytes) => createHash('sha256').update(bytes).digest();
const u64 = (n) => { const b=Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b; };
const i64 = (n) => { const b=Buffer.alloc(8); b.writeBigInt64LE(BigInt(n)); return b; };
const be64 = (n) => { const b=Buffer.alloc(8); b.writeBigUInt64BE(BigInt(n)); return b; };
const disc = (name) => hash(`global:${name}`).subarray(0,8);
const ix = (programId, name, keys, ...args) => new TransactionInstruction({
  programId, keys: keys.map(([pubkey,isSigner=false,isWritable=false]) => ({pubkey,isSigner,isWritable})),
  data: Buffer.concat([disc(name), ...args]),
});
const pda = (program, ...seeds) => PublicKey.findProgramAddressSync(seeds.map(s => Buffer.isBuffer(s) ? s : Buffer.from(s)), program)[0];
const proofPda = (...seeds) => pda(PROOF,...seeds);
const consumerPda = (...seeds) => pda(CONSUMER,...seeds);
const scope = {
  partner:hash('ABRAXAS_DEVNET_LIFECYCLE_TEST_PARTNER_V1'),
  policy:hash('ABRAXAS_DEVNET_LIFECYCLE_TEST_POLICY_V1'),
  application:hash('ABRAXAS_DEVNET_LIFECYCLE_TEST_APPLICATION_V1'),
};
const meta = (key, signer=false, writable=false) => [key,signer,writable];


function addresses(admin, holder, receipt) {
  const registry = proofPda('proof_registry',admin.toBuffer());
  const sandbox = proofPda('sandbox_binding',registry.toBuffer(),holder.toBuffer());
  const ledger = proofPda('execution_ledger',sandbox.toBuffer());
  const commitment = proofPda('receipt_commitment',registry.toBuffer(),receipt);
  const mintConfig = proofPda('entitlement_mint_config',registry.toBuffer());
  const mint = proofPda('entitlement_mint',registry.toBuffer());
  const mintAuthority = proofPda('entitlement_mint_authority',registry.toBuffer());
  const issuance = proofPda('entitlement_issuance',registry.toBuffer(),receipt);
  const trusted = consumerPda('relying_party_config',admin.toBuffer());
  const consumption = consumerPda('entitlement_consumption',registry.toBuffer(),receipt);
  const ata = getAssociatedTokenAddressSync(mint,holder,false,TOKEN_2022_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID);
  return {registry,sandbox,ledger,commitment,mintConfig,mint,mintAuthority,issuance,trusted,consumption,ata};
}

function canonical(receipt,payload,expires,version,nonce) {
  return Buffer.concat([Buffer.from('ABRAXAS_PROOF_CONTINUITY_V1'),receipt,payload,scope.partner,scope.policy,scope.application,
    be64(expires),be64(version),be64(nonce)]);
}
function issuerIx(issuer,message) { return Ed25519Program.createInstructionWithPrivateKey({privateKey:issuer.secretKey,message}); }

function registerIx(admin,a) { return ix(PROOF,'initialize_proof_registry',[
  meta(admin,true,true),meta(a.registry,false,true),meta(SYSTEM)],admin.toBuffer(),scope.partner,scope.policy,scope.application); }
function sandboxIx(holder,a) { return ix(PROOF,'register_sandbox_binding',[
  meta(holder,true,true),meta(a.registry),meta(a.sandbox,false,true),meta(SYSTEM)]); }
function harnessIx(payer,holder,a,receipt,payload,expires) { return ix(PROOF,'execute_harness_run',[
  meta(payer,true,true),meta(holder,true),meta(a.registry),meta(a.sandbox),meta(a.ledger,false,true),
  meta(a.commitment,false,true),meta(SYSVAR_INSTRUCTIONS_PUBKEY),meta(SYSTEM)],
  u64(1),receipt,payload,i64(expires),u64(1)); }
function mintInitIx(admin,a) { return ix(PROOF,'initialize_entitlement_mint',[
  meta(admin,true,true),meta(a.registry),meta(a.mintConfig,false,true),meta(a.mint,false,true),
  meta(a.mintAuthority),meta(TOKEN_2022_PROGRAM_ID),meta(SYSTEM)]); }
function trustedIx(admin,a) { return ix(CONSUMER,'initialize_trusted_config',[
  meta(admin,true,true),meta(a.trusted,false,true),meta(SYSTEM)],admin.toBuffer(),scope.partner,scope.policy,scope.application); }
function mintIx(payer,holder,a,receipt) { return ix(PROOF,'mint_verified_entitlement',[
  meta(payer,true,true),meta(holder,true),meta(a.registry),meta(a.sandbox),meta(a.commitment),meta(a.mintConfig),
  meta(a.mint,false,true),meta(a.ata,false,true),meta(a.issuance,false,true),meta(a.mintAuthority),
  meta(TOKEN_2022_PROGRAM_ID),meta(ASSOCIATED_TOKEN_PROGRAM_ID),meta(SYSTEM)],receipt); }
function consumeIx(payer,holder,a,receipt) { return ix(CONSUMER,'consume_verified_entitlement',[
  meta(payer,true,true),meta(holder,true),meta(PROOF),meta(a.trusted),meta(payer),meta(a.registry),meta(a.commitment),
  meta(a.mintConfig),meta(a.mint),meta(a.ata),meta(a.issuance),meta(a.consumption,false,true),
  meta(TOKEN_2022_PROGRAM_ID),meta(SYSTEM)],receipt); }
function revokeIx(admin,a,receipt,payload,expires) { return ix(PROOF,'update_receipt_status',[
  meta(admin,true),meta(a.registry),meta(a.commitment,false,true),meta(SYSVAR_INSTRUCTIONS_PUBKEY)],
  receipt,payload,Buffer.from([1]),u64(2),i64(expires)); }

module.exports={ PROOF, CONSUMER, SYSTEM, scope, addresses, canonical, issuerIx, registerIx, sandboxIx, harnessIx, mintInitIx, trustedIx, mintIx, consumeIx, revokeIx };


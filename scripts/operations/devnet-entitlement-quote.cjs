const { Connection, PublicKey }=require('@solana/web3.js');
const { createHash }=require('node:crypto');
const { PROOF, CONSUMER }=require('./devnet-entitlement-instructions.cjs');
const identity=require('../../solana/abraxas-eligibility-gate/release/devnet-entitlement-identity.json');
const verification=require('../../solana/abraxas-eligibility-gate/release/devnet-entitlement-verification.json');
const RPC=process.env.ABRAXAS_DEVNET_RPC_URL||'https://api.devnet.solana.com';
const GENESIS='EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
const FOUNDER=new PublicKey('3cKi3oxEoFDZ7corbQ1Uk21gxqdgPu3LpH4MN313EnRd');
const LOADER=new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111');
const MAX_CEILING=100_000_000;
const SIZES = { registry:177, sandbox:169, execution_ledger:49, commitment:250,
  mint_config:74, mint:278, trusted_config:177, issuance_ledger:105,
  consumption:122, holder_ata_upper:256 };

const connection=new Connection(RPC,'finalized');
const hash=(data)=>createHash('sha256').update(data).digest();
async function assertNetworkAndPrograms(rpc=connection) {
  if (identity.status !== 'approved' || identity.genesis_hash !== GENESIS || verification.genesis_hash !== GENESIS ||
      identity.proof_continuity_program_id !== PROOF.toBase58() || identity.entitlement_consumer_program_id !== CONSUMER.toBase58() ||
      await rpc.getGenesisHash() !== GENESIS) throw Error('Devnet identity or genesis mismatch');
  for (const [program, expected] of [[PROOF,verification.programs[0]],[CONSUMER,verification.programs[1]]]) {
    if (expected.program_id !== program.toBase58() || expected.upgrade_authority !== FOUNDER.toBase58()) throw Error('Unapproved program identity');
    const [account,dataAccount] = await rpc.getMultipleAccountsInfo([program,new PublicKey(expected.program_data)],'finalized');
    if (!account?.executable || !account.owner.equals(LOADER) || !dataAccount?.owner.equals(LOADER) ||
        account.data.readUInt32LE(0) !== 2 || dataAccount.data.readUInt32LE(0) !== 3 ||
        !new PublicKey(account.data.subarray(4,36)).equals(new PublicKey(expected.program_data)) ||
        dataAccount.data[12] !== 1 || !new PublicKey(dataAccount.data.subarray(13,45)).equals(FOUNDER)) throw Error('ProgramData authority mismatch');
    const length = program.equals(PROOF) ? 421384 : 295688;
    if (hash(dataAccount.data.subarray(45,45+length)).toString('hex') !== expected.elf_sha256) throw Error('Deployed bytecode hash mismatch');
  }
}

async function quote(rpc=connection) {
  await assertNetworkAndPrograms(rpc);
  const rent = {};
  for (const [name,size] of Object.entries(SIZES)) rent[name] = await rpc.getMinimumBalanceForRentExemption(size,'finalized');
  // Two holders: two sandbox/ledger/commitment/ATA/issuance accounts; one registry/mint/config.
  const upper = rent.registry + 2*(rent.sandbox+rent.execution_ledger+rent.commitment+rent.issuance_ledger+rent.holder_ata_upper) +
    rent.mint_config + rent.mint + rent.trusted_config + rent.consumption;
  const ceiling = Math.max(2*upper+1_000_000,50_000_000);
  if (ceiling > MAX_CEILING) throw Error('Test rent exceeds 0.1 Devnet SOL cap');
  return {genesis:GENESIS,proof_program:PROOF.toBase58(),consumer_program:CONSUMER.toBase58(),
    founder_funding_wallet:FOUNDER.toBase58(),rent_upper_lamports:upper,
    fee_and_safety_lamports:ceiling-upper,ceiling_lamports:ceiling,
    test_scope:'isolated ephemeral registry; both receipts revoked before completion; no Production account or program upgrade'};
}


module.exports={quote,assertNetworkAndPrograms,SIZES};


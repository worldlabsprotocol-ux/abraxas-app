// Offline transaction preparation only. No keypair, RPC, signing, or broadcast.
import { readFileSync } from "node:fs";
import { checkDemoSolanaSignerDocument } from "../lib/partner/chainAttestationSignerLifecycle/demoSolanaProvision";
import { prepareInstitutionalSolanaDevnetProofPacket, REVIEWED_INSTITUTIONAL_DEVNET, type InstitutionalSolanaAttestation } from "../lib/partner/chainAttestation/solanaDevnetProofPacket";

function main() {
  const [attestationPath, payer, signerDocumentPath] = process.argv.slice(2);
  if (!attestationPath || !payer || !signerDocumentPath || process.argv.length !== 5) {
    throw new Error("usage: npx tsx scripts/solana-devnet-proof-packet.ts <issued-attestation.json> <fee-payer-public-key> <public-signer-document.json>");
  }
  const document = JSON.parse(readFileSync(signerDocumentPath, "utf8"));
  const reason = checkDemoSolanaSignerDocument(document, {
    key_id: "cask_f01509a0a19a1f9b1331899e",
    public_verifier: REVIEWED_INSTITUTIONAL_DEVNET.signerPublicKey,
  });
  if (reason) throw new Error(`signer_document_${reason}`);
  const attestation = JSON.parse(readFileSync(attestationPath, "utf8")) as InstitutionalSolanaAttestation;
  const packet = prepareInstitutionalSolanaDevnetProofPacket({
    attestation, signerPublicKey: REVIEWED_INSTITUTIONAL_DEVNET.signerPublicKey, payer,
  });
  process.stdout.write(`${JSON.stringify({
    ok: true, network_id: "solana_devnet", gate_config_pda: REVIEWED_INSTITUTIONAL_DEVNET.gateConfig,
    protocol_config_pda: REVIEWED_INSTITUTIONAL_DEVNET.protocolConfig,
    authorization_pda: packet.authorization, entitlement_pda: packet.entitlement,
    instructions: packet.instructions.map((ix) => ({
      program_id: ix.programId.toBase58(),
      accounts: ix.keys.map((key) => ({ pubkey: key.pubkey.toBase58(), is_signer: key.isSigner, is_writable: key.isWritable })),
      data_base64: ix.data.toString("base64"),
    })),
    broadcast: false,
  }, null, 2)}\n`);
}

try { main(); } catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : "packet_failed"}\n`);
  process.exitCode = 1;
}


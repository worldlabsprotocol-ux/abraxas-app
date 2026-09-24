# DEMO Solana attestation signer handoff

The gate program ID, protocol-access program ID, gate admin keypair, and Abraxas attestation signer are different authorities. This handoff provisions only the last one. It does not initialize GateConfig, issue an attestation, or send a transaction.

Run on an interactive Ubuntu operator machine with the repository checked out. Keep the output outside git in a private directory. Do not paste its contents into chat, tickets, shell history, or logs.

```bash
mkdir -p "$HOME/.config/abraxas"
chmod 700 "$HOME/.config/abraxas"
npm run demo:solana-attestation-signer -- generate "$HOME/.config/abraxas/demo-solana-attestation-signer.json"
```

The command refuses CI, Vercel, tests, noninteractive shells, Windows, an existing file, and an output path under the checkout. The local JSON file is created once with mode 0600. The terminal prints only the public key ID, public verifier, fingerprint, expiry, and output path. Back up the local file securely before changing Vercel. Losing the signer means new attestations cannot be issued under this key. The signer expires after 90 days; rotate it through the reviewed lifecycle before then.

In the Vercel project serving **demo.abraxasworld.xyz**, manually set the following values from the local JSON file for **DEMO only**:

- `ABRAXAS_SOLANA_ATTESTATION_PRIVATE_KEY`
- `ABRAXAS_SOLANA_ATTESTATION_SIGNER_KEY_ID`
- `ABRAXAS_CHAIN_ATTESTATION_SIGNER_REGISTRY`

Keep `ABRAXAS_RUNTIME_ENV=demo` and `ABRAXAS_RUNTIME_ENVIRONMENT=sandbox` consistent with the DEMO deployment. Never copy the signer values into Production, Preview, source control, or a public issue. Redeploy DEMO after saving. Then run:

```bash
npm run demo:solana-attestation-signer -- check "$HOME/.config/abraxas/demo-solana-attestation-signer.json"
```

`check` sends no local signer material. It fetches the public DEMO Solana key document and requires the exact key ID/public verifier, active sandbox status, devnet scope, V2 schema, and current validity. A failed check blocks GateConfig initialization; inspect the DEMO environment and deployment, then rerun it. Once green, use the read-only devnet preflight and the separately reviewed human initializer from PR #402. The on-chain signer slot must match this exact public verifier and key ID. No SQL migration is required.

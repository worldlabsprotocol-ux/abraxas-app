// FILE: lib/partner/walletStandard/examples.ts
// Partner implementation steps. Server verifies. Client only signs a message.

export function walletStandardBindingExample(): string {
  return `// 1. Issue a domain-bound challenge on your server. Do not put a wallet address in the request.
const challenge = await fetch("/api/wallet-standard/challenge", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    partner_id: process.env.ABRAXAS_PARTNER_ID,
    action_contract_nonce: actionContract.nonce,
  }),
}).then((res) => res.json());

// 2. Ask the holder to signMessage through Wallet Standard (Phantom compatible).
//    Do not create a transaction. Do not request balances or extra permissions.
import { signWalletStandardChallenge } from "@/lib/partner/walletStandard/connector";
const signed = await signWalletStandardChallenge(challenge.message);

// 3. Bind on the server. Store only the opaque binding_ref.
const bound = await fetch("/api/wallet-standard/bind", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    challenge_id: challenge.challenge_id,
    partner_id: process.env.ABRAXAS_PARTNER_ID,
    action_contract_nonce: actionContract.nonce,
    signature: signed.ok ? signed.signature : "",
    public_key: signed.ok ? signed.publicKey : "",
  }),
}).then((res) => res.json());
// bound.binding_ref is tenant-scoped. Never log public_key or an address.

// 4. Optional or required preflight on the Trading Venue Adapter.
adapter.preflight({
  result: verifiedReceipt,
  contract: { ...actionContract, wallet_binding: "optional" },
  binding_ref: bound.binding_ref,
});
`;
}

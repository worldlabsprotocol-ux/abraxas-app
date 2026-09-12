# Abraxas Creditcoin demo video

Target length: 2 minutes 30 seconds.

## Recording setup

Open these tabs before recording:

1. `https://abraxasworld.xyz`
2. `creditcoin/contracts/SourceEligibilityRegistry.sol` in GitHub
3. `creditcoin/contracts/AbraxasEligibilityUSC.sol` in GitHub
4. The Sepolia source transaction in an explorer
5. The Creditcoin `verifyAndRecord` transaction in its explorer

Do not record secret keys, environment files, wallet recovery phrases, admin pages, or browser notifications.

## 0:00-0:20 - Problem

On screen: Abraxas home page.

Say:

"RWA applications need proof that a person or asset meets a policy, but copying identity data into every platform creates risk. Abraxas lets a holder verify once and lets each partner receive only the result it needs."

## 0:20-0:45 - Existing product

On screen: complete a short Abraxas partner flow or show the public receipt response with private fields hidden.

Say:

"The partner receives a signed Abraxas receipt and validates it independently. The receipt has a policy, decision, issuer, and expiration time. Personal documents stay out of the partner callback."

## 0:45-1:15 - Source commitment

On screen: `SourceEligibilityRegistry.sol`, then the Sepolia eligibility transaction.

Say:

"For Creditcoin, Abraxas hashes the receipt, the pairwise holder identifier, and the policy identifier. The source registry publishes those commitments with the expiration and decision. No name, email, birth date, ID image, or selfie appears on-chain."

## 1:15-1:55 - Attestcoin proof

On screen: `AbraxasEligibilityUSC.sol`, focusing on `verifyAndRecord`, then the Creditcoin explorer transaction.

Say:

"The Creditcoin contract sends the source transaction and its proofs to the Attestcoin native verifier at address 0x0FD2. It then confirms the transaction succeeded, came from the configured registry, and emitted the expected eligibility event. The same source transaction cannot be used twice."

## 1:55-2:15 - Result

On screen: query `isEligible` and show `true`, then show a mismatched policy returning `false`.

Say:

"A Creditcoin application can now ask one narrow question: does this pairwise holder currently satisfy this exact policy? A different policy, an expired record, or a denied decision returns false."

## 2:15-2:30 - Close

On screen: Abraxas logo and the architecture slide from the deck.

Say:

"Abraxas gives RWA applications reusable proof without reusable personal data. Creditcoin makes the source event independently verifiable across chains."

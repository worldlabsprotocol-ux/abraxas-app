# DoraHacks submission copy

## Project Name

Abraxas

## Project Logo

https://abraxasworld.xyz/icon-512.png

## Project Sector

RWA / Verification Infrastructure

## Project Description

Abraxas is a reusable verification and proof layer for real-world asset platforms. A holder verifies once and keeps a private Passport. Each partner receives only the policy result it needs and independently validates the signed public receipt before granting access.

For the Creditcoin prototype, Abraxas converts an off-chain verification decision into a minimal source-chain commitment. Creditcoin then verifies the source transaction and records an expiring eligibility result. The design gives RWA contracts usable evidence without putting identity documents, birth dates, names, or email addresses on-chain.

## USC Integration Summary

Abraxas uses Creditcoin's Attestcoin native verifier at `0x0FD2` to verify a source-chain eligibility event. The event contains a receipt hash, a pairwise subject hash, the policy hash, the expiration time, and the decision. `AbraxasEligibilityUSC` verifies the transaction's Merkle and continuity proofs, confirms the transaction succeeded, checks the configured source registry, rejects replays and out-of-order updates, and records the expiring result on Creditcoin.

This lets a Creditcoin RWA contract check whether a holder currently satisfies a specific policy without trusting an application database or receiving the holder's personal information.

## GitHub Repository URL

https://github.com/worldlabsprotocol-ux/abraxas-app

## Project Deck or Whitepaper

After this branch is pushed:

https://github.com/worldlabsprotocol-ux/abraxas-app/raw/feat/creditcoin-usc-hackathon/docs/hackathon/Abraxas-Creditcoin-Deck.pdf

Replace the branch URL with `main` after merge.

## Prototype Demo Video URL

Add the unlisted YouTube URL after recording the script in `DEMO_VIDEO_SCRIPT.md`.

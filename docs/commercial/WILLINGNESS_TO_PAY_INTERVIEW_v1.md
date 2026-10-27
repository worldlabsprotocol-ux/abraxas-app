# Institutional willingness-to-pay interview (v1)

**Purpose:** Learn whether a specific institution has a problem Abraxas already solves — not to pitch Abraxas.  
**Duration:** 30–45 minutes · **Audience:** Platform operator, engineering lead, compliance/risk, or procurement (note roles).  
**Do not record** wallet addresses, government IDs, or holder PII in written notes.

---

## Opening (neutral)

1. What does your organization operate (product category, geography, user type)?
2. Who owns verification or access gating decisions today (team and title)?

## Current workflow

3. Walk through the last time you had to verify someone before granting access or completing a transaction. What systems were involved?
4. What breaks or slows that process today (engineering, fraud, compliance, support)?
5. What does a failed or disputed verification cost you (support time, lost conversion, chargebacks, manual review)?

## Trust and data

6. What evidence do you require to treat a verification as authoritative in **your** systems?
7. Where is that evidence stored, and who can access it?
8. What identity or biometric data do you collect today that you would prefer **not** to re-collect on every visit?

## Volume and economics

9. Rough order of magnitude: verifications per month (band is fine: &lt;1k, 1k–10k, 10k–100k, 100k+).
10. What do you pay today for verification-related tooling, manual review, or fraud losses (even approximate)?
11. How is that budget approved (department, annual vs project)?

## Integration reality

12. Who would implement a new verification integration (in-house, agency, vendor)?
13. What environments must you support (web, mobile, server-side only)?
14. What security or compliance reviews are required before a new vendor handles verification signals?

## Decision process

15. What would need to be true for you to run a **90-day scoped pilot** with a new verification approach?
16. Who must sign off on a paid pilot (legal, security, procurement)?
17. What would make you **stop** a pilot early?

## Pricing discovery (non-leading)

18. When vendors charge per verification or per API call, what pricing shape have you accepted before (subscription, usage, hybrid)?
19. If a pilot priced verification outcomes separately from identity storage, what fee range would be **too cheap to trust** vs **too expensive to trial**? (Ask for ranges, not approval.)
20. Would you expect to pay for sandbox testing, only for production outcomes, or a fixed pilot fee? Why?

## Close

21. What question should we have asked that we did not?
22. May we follow up with a one-page pilot scope for your feedback (no commitment)?

---

**Interviewer reminders:** Do not describe Abraxas features until after questions 3–8. Do not ask “Would you use Abraxas?” Summarize problem severity and budget signals in `commercialValidationGates` outside the repo (founder CRM), not in git.

# DRAFT — Verifier sandbox evaluation agreement

**Status:** Draft for founder and **legal review only**. Do not send externally or execute without authorized signatories.

**Purpose:** Grant one external design partner limited rights to install and use the **compiled** `@abraxas/independent-verifier` v0.1.1 package during a **Demo sandbox** wallet-control pilot, while Abraxas retains all intellectual property and the package metadata may remain `UNLICENSED` until terms are finalized.

This draft is not legal advice.

---

## 1. Parties

| Role | Entity (complete before execution) |
|------|-------------------------------------|
| **Licensor** | [Abraxas legal entity name and address] |
| **Licensee** | [Partner legal entity name and address] |

**Effective date:** [date]  
**Pilot term:** [e.g. 90 days from Effective Date] unless terminated earlier under Section 8.

---

## 2. Definitions

- **Evaluation Software:** the prebuilt npm archive `abraxas-independent-verifier-0.1.1.tgz` and its published SHA-256 checksum, including compiled artifacts therein, as delivered by Licensor. Source code, Abraxas application repositories, and protocol implementation outside that archive are **not** licensed.
- **Sandbox Environment:** Licensor’s Demo deployment at `https://demo.abraxasworld.xyz` and credentials explicitly issued for Licensee’s pilot application only.
- **Pilot:** integration of one wallet-control verification path in Licensee’s application using Sandbox Environment, Partner Flow, and Evaluation Software, under the technical guide at `docs/integration/design-partner/START_HERE.md` (or successor link provided in handoff).

---

## 3. Grant (limited evaluation license)

Subject to this agreement and payment of no fee unless separately agreed, Licensor grants Licensee a **limited, nonexclusive, nontransferable, nonsublicensable, revocable** license during the Pilot term to:

1. Install Evaluation Software on Licensee-controlled systems used solely to develop and test the Pilot integration.
2. Execute Evaluation Software only to verify Abraxas-issued sandbox decision material in connection with the Pilot.
3. Use Licensor-provided Sandbox credentials and trust-anchor material only as documented in the secure handoff.

No other rights are granted. All rights not expressly granted are reserved by Licensor.

---

## 4. Restrictions

Licensee shall not:

1. Redistribute, publish, or make Evaluation Software available to any third party (including public package registries, open repositories, or shared drives outside Licensee’s pilot team).
2. Use Evaluation Software in production, for live end-user traffic, or outside the Sandbox Environment without a separate written agreement.
3. Reverse engineer, decompile, or disassemble Evaluation Software except to the extent such restriction is prohibited by applicable law.
4. Remove or alter proprietary notices in Evaluation Software or documentation.
5. Use Abraxas trademarks except as necessary to describe the Pilot to Licensor in writing.

---

## 5. Intellectual property

Evaluation Software, Abraxas protocol specifications, documentation, and all related IP remain **exclusive property of Licensor**. This agreement does not convey ownership, patent licenses, or rights to Abraxas hosted services beyond Sandbox credentials issued for the Pilot.

Licensee retains ownership of Licensee’s application code; Licensee grants Licensor no license therein except feedback Licensee voluntarily provides about the Pilot.

---

## 6. Confidentiality

Sandbox API keys, trust-anchor JSON, checksums, unreleased documentation marked confidential, and non-public Pilot results are **Confidential Information** of Licensor. Licensee shall protect them with reasonable care and use them only for the Pilot.

---

## 7. Feedback and metrics

Licensee agrees to provide Licensor with good-faith Pilot metrics: setup time, blockers, assistance required, and whether permit / deny / indeterminate enforcement behaved correctly on genuine sandbox receipts. Licensee may sanitize logs; no customer PII is required.

---

## 8. Termination

Either party may terminate the Pilot on written notice. Licensor may terminate immediately if Licensee breaches Section 4 or compromises Sandbox credentials. Upon termination, Licensee shall cease use of Evaluation Software and destroy copies unless Licensor requests retention for audit.

---

## 9. Disclaimer

Evaluation Software and Sandbox Environment are provided **“as is”** for evaluation. Licensor disclaims warranties to the maximum extent permitted by law. Licensee is solely responsible for access enforcement in Licensee’s application.

---

## 10. Limitation of liability

To the maximum extent permitted by law, Licensor’s aggregate liability arising from this agreement shall not exceed [amount or “zero for unpaid evaluation”]. Neither party shall be liable for indirect or consequential damages.

---

## 11. Relationship to package metadata

Licensee acknowledges the Evaluation Software may be labeled `UNLICENSED` in package metadata. **This executed agreement** is the controlling grant for the Pilot notwithstanding that label.

---

## 12. Governing law

[State/country — legal to complete]

---

## 13. Signatures

| Licensor | Licensee |
|----------|----------|
| Name: | Name: |
| Title: | Title: |
| Date: | Date: |

---

## Internal — before external send

- [ ] Legal review complete  
- [ ] Partner legal entity and signatory confirmed  
- [ ] Pilot term and liability cap filled  
- [ ] Founder authorized execution  
- [ ] Secure handoff scheduled only **after** execution (see [FIRST_DESIGN_PARTNER_SECURE_HANDOFF.md](../operations/FIRST_DESIGN_PARTNER_SECURE_HANDOFF.md))

# Presentation bundle schema

```json
{
  "credential": { "payload": {}, "payload_hash": "", "signature": "" },
  "presentation": {
    "signed_decision_receipt": {},
    "policy_id": "",
    "audience_partner_id": ""
  },
  "portable_revocation_snapshot": {},
  "partner_id": "",
  "policy_id": "",
  "request_id": ""
}
```

Bundle metadata must match the signed receipt audience. Your institution configuration is the authority for partner and policy verification.

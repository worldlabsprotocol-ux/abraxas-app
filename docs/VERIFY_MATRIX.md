# Abraxas Verify — Verification Matrix

Run before trusting engine changes in production:

```bash
npm test -- lib/idv/biometric/verificationMatrix.test.ts
```

## Synthetic cases (automated)

| Case | Expected |
|------|----------|
| Passport-like ID + matching selfie | `human_review` or `auto_approve` |
| Wall / uniform gray selfie | `reject` |
| Blank white ID | `reject` |
| Portrait random photo as ID | `reject` |
| Two faces in selfie | `reject` |
| Blurry ID | `reject` or `human_review` |
| Driver's license aspect | classified, not `unknown` |
| Explainable signals stored | all audit fields present |

## Manual cases (staging)

After deploy, verify on `https://abraxasworld.xyz/passport`:

- Real passport + matching selfie → appears at `/admin/identity`
- Wall photo selfie → blocked at Step 4 with reason
- Dog/pet photo → blocked (no face)
- Screenshot of ID → high tamper score / reject or review

## Explainable audit trail

Every assessment stores individual signals in `identity_biometric_assessments.signals`:

```
face_detected_id, face_detected_selfie, face_count_selfie,
face_match, liveness, document_type, document_confidence,
document_aspect_score, image_quality_id, image_quality_selfie,
tamper_score, fraud_risk, decision, rejection_reasons, engine_version
```

## Roadmap (v3+)

1. Real face embeddings (ONNX / Rekognition)
2. Active/passive liveness
3. MRZ/barcode extraction
4. Tamper detection (document security features)
5. Issuer/jurisdiction trust scoring

package worldlabs.abraxas.passport.model

data class PassportClaim(
    val claimType: String,
    val label: String,
    val assuranceLevel: String,
    val valueSummary: String,
    val reusable: Boolean = true,
)

data class ConsentPreview(
    val partnerId: String,
    val partnerName: String,
    val policyId: String,
    val purpose: String,
    val requestedClaim: String,
    val willShare: List<String>,
    val willNotShare: List<String>,
)

data class IssuedProof(
    val receiptId: String,
    val artifactType: String,
    val purpose: String,
    val assuranceLevel: String,
    val partnerId: String,
    val policyId: String,
    val issuedAt: String,
    val expiresAt: String,
    val payloadJson: String,
    val signatureBase64: String,
)

data class ConsentHistoryEntry(
    val id: String,
    val partnerName: String,
    val decision: String,
    val sharedSummary: String,
    val timestamp: String,
)

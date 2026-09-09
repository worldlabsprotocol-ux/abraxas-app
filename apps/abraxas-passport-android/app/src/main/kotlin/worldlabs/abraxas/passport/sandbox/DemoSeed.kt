package worldlabs.abraxas.passport.sandbox

import worldlabs.abraxas.passport.model.PassportClaim

object DemoSeed {
    const val DEMO_WALLET = "DemoSeekerWallet1111111111111111111111111111"

    fun claimsForWallet(walletAddress: String): List<PassportClaim> = listOf(
        PassportClaim(
            claimType = "product_eligibility",
            label = "Over 21 (verified)",
            assuranceLevel = "L2",
            valueSummary = "eligible",
            reusable = true,
        ),
        PassportClaim(
            claimType = "self_attested_age_band",
            label = "Browse access (self-attested)",
            assuranceLevel = "L0",
            valueSummary = "over_21 — browse only",
            reusable = true,
        ),
        PassportClaim(
            claimType = "wallet_binding_confirmed",
            label = "Wallet bound",
            assuranceLevel = "L2",
            valueSummary = walletAddress.take(8) + "…",
            reusable = true,
        ),
    )

    val neverSharedWithPartners = listOf(
        "Date of birth",
        "Government ID images",
        "Legal name",
        "Home address",
        "Document numbers",
        "OAuth identifiers",
    )
}

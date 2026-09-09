package worldlabs.abraxas.passport.receipts

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant

class ProofValidatorTest {
    private val future = "2099-01-01T00:00:00.000Z"
    private val past = "2000-01-01T00:00:00.000Z"

    private val browse = mapOf(
        "artifact_type" to ProofValidator.BROWSE_ARTIFACT,
        "purpose" to "browse",
        "valid_for_purchase" to false,
        "assurance_level" to "L0",
        "age_band" to "over_21",
        "partner_id" to ProofValidator.PARTNER_ID,
        "policy_id" to ProofValidator.BROWSE_POLICY,
        "receipt_id" to "br_1",
        "issued_at" to Instant.now().toString(),
        "expires_at" to future,
    )

    private val purchase = mapOf(
        "artifact_type" to ProofValidator.PURCHASE_ARTIFACT,
        "purpose" to "purchase",
        "valid_for_purchase" to true,
        "assurance_level" to "L2",
        "partner_id" to ProofValidator.PARTNER_ID,
        "policy_id" to ProofValidator.PURCHASE_POLICY,
        "over_21" to true,
        "receipt_id" to "dr_1",
        "issued_at" to Instant.now().toString(),
        "expires_at" to future,
    )

    @Test
    fun validBrowseAccepted() {
        assertTrue(ProofValidator.validateBrowse(browse).ok)
    }

    @Test
    fun expiredBrowseRejected() {
        assertFalse(ProofValidator.validateBrowse(browse + ("expires_at" to past)).ok)
    }

    @Test
    fun browseCannotAuthorizePurchase() {
        val auth = ProofValidator.authorizeRegulatedPurchase(
            proof = browse,
            walletVerified = true,
            flowConsumed = true,
            replaySeen = false,
        )
        assertFalse(auth.ok)
        assertEquals("browse_receipt_not_valid_for_purchase", auth.code)
    }

    @Test
    fun purchaseAuthorizedWhenConsumed() {
        val auth = ProofValidator.authorizeRegulatedPurchase(
            proof = purchase,
            walletVerified = true,
            flowConsumed = true,
            replaySeen = false,
        )
        assertTrue(auth.ok)
    }

    @Test
    fun replayRejected() {
        val auth = ProofValidator.authorizeRegulatedPurchase(
            proof = purchase,
            walletVerified = true,
            flowConsumed = true,
            replaySeen = true,
        )
        assertEquals("replay_detected", auth.code)
    }
}

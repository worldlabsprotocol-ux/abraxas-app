package worldlabs.abraxas.passport.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import worldlabs.abraxas.passport.consent.ConsentEngine
import worldlabs.abraxas.passport.model.ConsentHistoryEntry
import worldlabs.abraxas.passport.model.ConsentPreview
import worldlabs.abraxas.passport.model.IssuedProof
import worldlabs.abraxas.passport.model.PassportClaim
import worldlabs.abraxas.passport.sandbox.DemoSeed
import worldlabs.abraxas.passport.wallet.WalletSession

data class PassportUiState(
    val wallet: WalletSession? = null,
    val claims: List<PassportClaim> = emptyList(),
    val consentPreview: ConsentPreview? = null,
    val issuedProof: IssuedProof? = null,
    val browseRejectionCode: String? = null,
    val history: List<ConsentHistoryEntry> = emptyList(),
    val statusMessage: String? = null,
    val busy: Boolean = false,
)

class PassportViewModel : ViewModel() {
    private val consentEngine = ConsentEngine()
    private val _state = MutableStateFlow(PassportUiState())
    val state: StateFlow<PassportUiState> = _state.asStateFlow()

    fun onWalletConnected(session: WalletSession) {
        _state.value = _state.value.copy(
            wallet = session,
            claims = DemoSeed.claimsForWallet(session.publicKeyBase58),
            statusMessage = if (session.demoMode) {
                "Sandbox mode — demo wallet connected (MWA fallback or DEMO_MODE)."
            } else {
                "Wallet connected via Mobile Wallet Adapter."
            },
        )
    }

    fun startPartnerRequest() {
        _state.value = _state.value.copy(
            consentPreview = consentEngine.buildPurchaseConsentPreview(),
            issuedProof = null,
            browseRejectionCode = null,
        )
    }

    fun approveConsent() {
        val wallet = _state.value.wallet ?: return
        viewModelScope.launch {
            _state.value = _state.value.copy(busy = true, statusMessage = null)
            try {
                val proof = consentEngine.issuePurchaseProof(wallet.verified)
                val entry = consentEngine.historyEntry(proof)
                _state.value = _state.value.copy(
                    busy = false,
                    issuedProof = proof,
                    consentPreview = null,
                    history = _state.value.history + entry,
                    statusMessage = "Partner received signed eligibility only — no profile.",
                )
            } catch (e: Exception) {
                _state.value = _state.value.copy(
                    busy = false,
                    statusMessage = "Proof denied: ${e.message}",
                )
            }
        }
    }

    fun demonstrateBrowseRejection() {
        val wallet = _state.value.wallet ?: return
        val code = consentEngine.tryAuthorizePurchaseWithBrowseProof(wallet.verified)
        _state.value = _state.value.copy(
            browseRejectionCode = code,
            statusMessage = "L0 browse proof rejected for L2+ purchase: $code",
        )
    }

    fun resetFlow() {
        _state.value = _state.value.copy(
            consentPreview = null,
            issuedProof = null,
            browseRejectionCode = null,
        )
    }
}

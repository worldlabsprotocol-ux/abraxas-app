package worldlabs.abraxas.passport.wallet

data class WalletSession(
    val publicKeyBase58: String,
    val verified: Boolean,
    val demoMode: Boolean,
)

interface WalletConnector {
    suspend fun connect(activity: android.app.Activity): WalletSession
}

package worldlabs.abraxas.passport.wallet

import android.app.Activity
import android.net.Uri
import com.solana.mobilewalletadapter.clientlib.ActivityResultSender
import com.solana.mobilewalletadapter.clientlib.ConnectionIdentity
import com.solana.mobilewalletadapter.clientlib.MobileWalletAdapter
import com.solana.mobilewalletadapter.clientlib.TransactionResult
import worldlabs.abraxas.passport.BuildConfig
import worldlabs.abraxas.passport.sandbox.DemoSeed

class MwaWalletConnector : WalletConnector {
    private val adapter = MobileWalletAdapter(
        ConnectionIdentity(
            identityUri = Uri.parse("https://abraxasworld.xyz"),
            iconUri = Uri.parse("favicon.ico"),
            identityName = "Abraxas Passport",
        ),
    )

    override suspend fun connect(activity: Activity): WalletSession {
        if (BuildConfig.DEMO_MODE) {
            return demoSession("sandbox")
        }

        val sender = ActivityResultSender(activity)
        return when (val result = adapter.connect(sender)) {
            is TransactionResult.Success -> {
                val account = result.authResult.accounts.firstOrNull()
                    ?: return demoSession("no_accounts_fallback")
                WalletSession(
                    publicKeyBase58 = account.publicKey.toHexPreview(),
                    verified = true,
                    demoMode = false,
                )
            }
            is TransactionResult.Failure -> demoSession("mwa_failure_fallback")
            else -> demoSession("mwa_unavailable_fallback")
        }
    }

    private fun demoSession(reason: String): WalletSession = WalletSession(
        publicKeyBase58 = DemoSeed.DEMO_WALLET,
        verified = true,
        demoMode = true,
    )

    private fun ByteArray.toHexPreview(): String =
        joinToString("") { byte -> "%02x".format(byte) }.take(44)
}

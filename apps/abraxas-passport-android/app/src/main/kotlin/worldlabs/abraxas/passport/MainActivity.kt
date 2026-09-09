package worldlabs.abraxas.passport

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import worldlabs.abraxas.passport.ui.AbraxasPassportApp
import worldlabs.abraxas.passport.ui.PassportViewModel
import worldlabs.abraxas.passport.wallet.MwaWalletConnector

class MainActivity : ComponentActivity() {
    private val walletConnector = MwaWalletConnector()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MaterialTheme(colorScheme = darkColorScheme()) {
                val passportViewModel: PassportViewModel = viewModel()
                AbraxasPassportApp(
                    viewModel = passportViewModel,
                    onConnectWallet = {
                        lifecycleScope.launch {
                            runCatching { walletConnector.connect(this@MainActivity) }
                                .onSuccess { passportViewModel.onWalletConnected(it) }
                                .onFailure {
                                    passportViewModel.onWalletConnected(
                                        worldlabs.abraxas.passport.wallet.WalletSession(
                                            publicKeyBase58 = worldlabs.abraxas.passport.sandbox.DemoSeed.DEMO_WALLET,
                                            verified = true,
                                            demoMode = true,
                                        ),
                                    )
                                }
                        }
                    },
                )
            }
        }
    }
}

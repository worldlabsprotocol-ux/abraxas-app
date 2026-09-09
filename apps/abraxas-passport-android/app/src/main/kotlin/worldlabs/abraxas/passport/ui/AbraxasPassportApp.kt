package worldlabs.abraxas.passport.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import worldlabs.abraxas.passport.model.ConsentPreview
import worldlabs.abraxas.passport.model.IssuedProof
import worldlabs.abraxas.passport.model.PassportClaim

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AbraxasPassportApp(
    viewModel: PassportViewModel,
    onConnectWallet: () -> Unit,
) {
    val state by viewModel.state.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Abraxas Passport") })
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Text(
                    "Applications receive proofs, not profiles.",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                )
            }

            if (state.wallet == null) {
                item {
                    Button(onClick = onConnectWallet, modifier = Modifier.fillMaxWidth()) {
                        Text("Connect Solana wallet (MWA)")
                    }
                }
            } else {
                item { WalletCard(state.wallet!!.publicKeyBase58, state.wallet!!.demoMode) }
                item { SectionTitle("Reusable claims") }
                items(state.claims) { claim -> ClaimCard(claim) }

                item {
                    Button(
                        onClick = { viewModel.startPartnerRequest() },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text("Demo partner requests over_21")
                    }
                }

                item {
                    Button(
                        onClick = { viewModel.demonstrateBrowseRejection() },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text("Show L0 browse rejected for purchase")
                    }
                }

                state.consentPreview?.let { preview ->
                    item { ConsentCard(preview, onApprove = { viewModel.approveConsent() }) }
                }

                state.issuedProof?.let { proof ->
                    item { ProofCard(proof) }
                }

                state.browseRejectionCode?.let { code ->
                    item {
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(16.dp)) {
                                Text("Purchase gate", fontWeight = FontWeight.Bold)
                                Text("browse_receipt_not_valid_for_purchase → $code")
                            }
                        }
                    }
                }

                if (state.history.isNotEmpty()) {
                    item { SectionTitle("Consent history") }
                    items(state.history) { entry ->
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(12.dp)) {
                                Text(entry.partnerName, fontWeight = FontWeight.Medium)
                                Text(entry.sharedSummary)
                                Text(entry.timestamp, style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }
                }
            }

            state.statusMessage?.let { msg ->
                item { Text(msg, color = MaterialTheme.colorScheme.primary) }
            }
        }
    }
}

@Composable
private fun SectionTitle(text: String) {
    Text(text, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 8.dp))
}

@Composable
private fun WalletCard(address: String, demoMode: Boolean) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp)) {
            Text("Wallet", fontWeight = FontWeight.Bold)
            Text(address)
            if (demoMode) Text("Sandbox / demo wallet", style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun ClaimCard(claim: PassportClaim) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(12.dp)) {
            Text(claim.label, fontWeight = FontWeight.Medium)
            Text("${claim.assuranceLevel} · ${claim.valueSummary}")
        }
    }
}

@Composable
private fun ConsentCard(preview: ConsentPreview, onApprove: () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Consent", fontWeight = FontWeight.Bold)
            Text("${preview.partnerName} requests: ${preview.requestedClaim}")
            Text("Will share:", fontWeight = FontWeight.Medium)
            preview.willShare.forEach { Text("• $it") }
            Text("Will NOT share:", fontWeight = FontWeight.Medium)
            preview.willNotShare.forEach { Text("• $it") }
            Button(onClick = onApprove, modifier = Modifier.fillMaxWidth()) {
                Text("Approve selective disclosure")
            }
        }
    }
}

@Composable
private fun ProofCard(proof: IssuedProof) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text("Signed eligibility result", fontWeight = FontWeight.Bold)
            Text("Receipt: ${proof.receiptId}")
            Text("Purpose: ${proof.purpose} · ${proof.assuranceLevel}")
            Text("Signature (sandbox): ${proof.signatureBase64.take(24)}…")
            Text("No DOB or ID images in payload.", style = MaterialTheme.typography.bodySmall)
        }
    }
}

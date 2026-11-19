//! BUILD #981 — independent partner verification (ProgramTest + evidence-bound CLI).

use abraxas_proof_entitlement_consumer::{
    EntitlementConsumption, TrustedRelyingPartyConfig, ID as CONSUMER_ID,
    RELYING_PARTY_CONFIG_SEED, ENTITLEMENT_CONSUMPTION_SEED,
};
use abraxas_proof_continuity::{
    verify_receipt_backed_entitlement, EntitlementIssuanceLedger, EntitlementMintConfig,
    ProofContinuityRegistry, ReceiptBackedEntitlement, ReceiptCommitment, ID as PROOF_ID,
    COMMITMENT_SEED, ENTITLEMENT_ISSUANCE_SEED, ENTITLEMENT_MINT_CONFIG_SEED, REGISTRY_SEED,
    STATUS_ACTIVE, STATUS_REVOKED,
};
use anchor_lang::AccountDeserialize;
use base64::{engine::general_purpose::STANDARD as B64, Engine as _};
use serde_json::Value;
use solana_program_test::{BanksClient, ProgramTestContext};
use solana_sdk::{account::Account, clock::Clock, pubkey::Pubkey};
use spl_associated_token_account::get_associated_token_address_with_program_id;
use spl_token_2022::{
    extension::StateWithExtensions,
    state::Account as TokenAccountState,
};
use std::str::FromStr;
use std::time::{SystemTime, UNIX_EPOCH};

pub const ARTIFACT_REL: &str =
    "examples/independent-solana-entitlement-partner/artifacts/authorized-journey.json";
pub const ARTIFACT_REVOKE_REL: &str =
    "examples/independent-solana-entitlement-partner/artifacts/revoked-journey.json";

pub const EVIDENCE_SUPPLY_OFFLINE_SNAPSHOTS: &str = "caller_supplied_offline_snapshots";
pub const EVIDENCE_CAPTURE_PROGRAM_TEST: &str = "program_test_banks_client_capture";

fn default_evidence_supply() -> String {
    EVIDENCE_SUPPLY_OFFLINE_SNAPSHOTS.to_string()
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct JourneyStage {
    pub stage: String,
    pub program_id: String,
    pub outcome: String,
    pub signers: Vec<String>,
    pub accounts: serde_json::Map<String, Value>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AccountSnapshot {
    pub pubkey: String,
    pub owner: String,
    pub data_base64: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PartnerEvidenceBundle {
    pub registry_admin: String,
    pub relying_party_admin: String,
    pub observation_unix_timestamp: i64,
    pub receipt_id_hash_hex: String,
    pub entitlement_mint: String,
    pub holder_wallet: String,
    /// How evidence entered the artifact (offline JSON is never chain-authenticated by itself).
    #[serde(default = "default_evidence_supply")]
    pub evidence_supply: String,
    pub registry: AccountSnapshot,
    pub commitment: AccountSnapshot,
    pub mint_config: AccountSnapshot,
    pub issuance_ledger: AccountSnapshot,
    pub trusted_config: AccountSnapshot,
    pub holder_token_account: AccountSnapshot,
    pub consumption: Option<AccountSnapshot>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PartnerJourneyArtifact {
    pub build: String,
    pub environment: String,
    pub proof_continuity_program_id: String,
    pub entitlement_consumer_program_id: String,
    pub token_program_id: String,
    pub execution_kind: String,
    pub stages: Vec<JourneyStage>,
    pub receipt_id_hash_hex: String,
    pub registry: String,
    pub trusted_config: String,
    pub commitment: String,
    pub entitlement_mint: String,
    pub holder_wallet: String,
    pub consumption_account: Option<String>,
    pub token_balance: u64,
    pub commitment_status: u8,
    pub consumption_recorded: bool,
    /// Recorded by ProgramTest for human audit only — **never** trusted by `partner-verify`.
    pub independent_verification_ok: bool,
    pub recorded_at_unix_ms: u64,
    /// Raw account evidence for independent CLI re-verification.
    #[serde(default)]
    pub partner_evidence: Option<PartnerEvidenceBundle>,
}

/// Offline check of caller-supplied snapshots (PDAs, owners, receipt semantics).
#[derive(Debug, Clone)]
pub struct StructuralVerificationReport {
    pub canonical_pdas_ok: bool,
    pub program_owners_ok: bool,
    pub trusted_scope_matches_registry: bool,
    pub entitlement_currently_authorizes: bool,
    pub consumption_consumed: bool,
    pub details: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AuthenticatedChainOutcome {
    /// No RPC URL configured (expected for ProgramTest-exported artifacts).
    Unavailable { reason: String },
    /// RPC reachable but account absent — snapshots are not proven on this chain.
    RpcAccountMissing { pubkey: String },
    /// On-chain bytes differ from supplied snapshots.
    RpcDataMismatch { pubkey: String },
    /// Independent RPC returned account bytes matching supplied snapshots.
    RpcConfirmedMatchingState,
}

pub type IndependentVerificationReport = StructuralVerificationReport;

pub fn hex32(bytes: &[u8; 32]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut out = String::with_capacity(64);
    for b in bytes {
        out.push(HEX[(b >> 4) as usize] as char);
        out.push(HEX[(b & 0x0f) as usize] as char);
    }
    out
}

pub fn parse_hex32(hex: &str) -> Result<[u8; 32], String> {
    let hex = hex.strip_prefix("0x").unwrap_or(hex);
    if hex.len() != 64 {
        return Err("receipt_id_hash_hex must be 32 bytes hex".into());
    }
    let mut out = [0u8; 32];
    for i in 0..32 {
        out[i] = u8::from_str_radix(&hex[i * 2..i * 2 + 2], 16)
            .map_err(|_| "invalid receipt hex".to_string())?;
    }
    Ok(out)
}

pub fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

pub fn artifact_repo_path(relative: &str) -> std::path::PathBuf {
    std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../..")
        .join(relative)
}

pub fn write_artifact(relative: &str, artifact: &PartnerJourneyArtifact) -> std::io::Result<()> {
    let path = artifact_repo_path(relative);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let json = serde_json::to_vec_pretty(artifact)?;
    std::fs::write(path, json)
}

pub fn load_artifact(relative: &str) -> std::io::Result<PartnerJourneyArtifact> {
    let path = artifact_repo_path(relative);
    let bytes = std::fs::read(path)?;
    serde_json::from_slice(&bytes).map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))
}

pub fn execution_report(artifact: &PartnerJourneyArtifact) -> String {
    let mut lines = vec![
        "=== EXECUTION REPORT (untrusted recorded claims) ===".to_string(),
        format!("BUILD {}", artifact.build),
        format!("Environment: {}", artifact.environment),
        format!("Execution: {}", artifact.execution_kind),
        format!("Recorded at (ms): {}", artifact.recorded_at_unix_ms),
        format!("Proof program: {}", artifact.proof_continuity_program_id),
        format!("Consumer program: {}", artifact.entitlement_consumer_program_id),
        format!("Receipt: {}", artifact.receipt_id_hash_hex),
        format!("Registry: {}", artifact.registry),
        format!("Trusted config: {}", artifact.trusted_config),
        format!("Mint: {}", artifact.entitlement_mint),
        format!("Holder: {}", artifact.holder_wallet),
        format!(
            "Recorded token balance: {} | recorded commitment status: {} | recorded consumed: {}",
            artifact.token_balance,
            artifact.commitment_status,
            artifact.consumption_recorded
        ),
        format!(
            "Test-runner flag independent_verification_ok: {} (NOT used for proof)",
            artifact.independent_verification_ok
        ),
    ];
    lines.push("Stages:".into());
    for stage in &artifact.stages {
        lines.push(format!(
            "  - {} ({}) program={} signers={:?}",
            stage.stage, stage.outcome, stage.program_id, stage.signers
        ));
    }
    lines.join("\n")
}

pub fn structural_verification_report(report: &StructuralVerificationReport) -> String {
    let mut lines = vec![
        "=== STRUCTURAL & SEMANTIC VERIFICATION (offline snapshots) ===".to_string(),
        "WARNING: Validates caller-supplied base64 account blobs for internal consistency.".to_string(),
        "This does NOT prove the state existed on any Solana cluster.".to_string(),
        format!("Canonical PDAs: {}", report.canonical_pdas_ok),
        format!("Program owners: {}", report.program_owners_ok),
        format!("Trusted scope ↔ registry: {}", report.trusted_scope_matches_registry),
        format!(
            "Entitlement authorizes holder now: {}",
            report.entitlement_currently_authorizes
        ),
        format!("Consumption recorded on-chain: {}", report.consumption_consumed),
    ];
    for d in &report.details {
        lines.push(format!("  · {d}"));
    }
    lines.join("\n")
}

pub fn independent_verification_report(report: &StructuralVerificationReport) -> String {
    structural_verification_report(report)
}

pub fn authenticated_chain_report(outcome: &AuthenticatedChainOutcome) -> String {
    match outcome {
        AuthenticatedChainOutcome::Unavailable { reason } => format!(
            "=== AUTHENTICATED ON-CHAIN VERIFICATION ===\n\
             STATUS: NOT PERFORMED\n\
             Reason: {reason}\n\
             Executable local acceptance: `cargo test -p abraxas-eligibility-gate-integration-tests --test partner_acceptance`"
        ),
        AuthenticatedChainOutcome::RpcAccountMissing { pubkey } => format!(
            "=== AUTHENTICATED ON-CHAIN VERIFICATION ===\n\
             STATUS: FAILED\n\
             Account {pubkey} not found on configured RPC — offline snapshots are not chain proof."
        ),
        AuthenticatedChainOutcome::RpcDataMismatch { pubkey } => format!(
            "=== AUTHENTICATED ON-CHAIN VERIFICATION ===\n\
             STATUS: FAILED\n\
             Account {pubkey} bytes on RPC differ from supplied snapshots."
        ),
        AuthenticatedChainOutcome::RpcConfirmedMatchingState => {
            "=== AUTHENTICATED ON-CHAIN VERIFICATION ===\n\
             STATUS: PASSED (independent RPC account bytes match snapshots)"
                .to_string()
        }
    }
}

pub fn is_authenticated_chain_proof(outcome: &AuthenticatedChainOutcome) -> bool {
    matches!(outcome, AuthenticatedChainOutcome::RpcConfirmedMatchingState)
}

pub fn evidence_snapshots_are_authenticated_chain_proof(_bundle: &PartnerEvidenceBundle) -> bool {
    // Snapshots embedded in JSON are never authoritative chain evidence by themselves.
    false
}

pub fn verify_independent_from_evidence(
    bundle: &PartnerEvidenceBundle,
) -> Result<StructuralVerificationReport, String> {
    verify_structural_semantic_from_evidence(bundle)
}

pub fn verify_structural_semantic_from_evidence(
    bundle: &PartnerEvidenceBundle,
) -> Result<StructuralVerificationReport, String> {
    let mut details = Vec::new();
    let registry_admin = parse_pk(&bundle.registry_admin)?;
    let relying_party_admin = parse_pk(&bundle.relying_party_admin)?;
    let holder = parse_pk(&bundle.holder_wallet)?;
    let mint = parse_pk(&bundle.entitlement_mint)?;
    let receipt = parse_hex32(&bundle.receipt_id_hash_hex)?;

    let registry_key = parse_pk(&bundle.registry.pubkey)?;
    let commitment_key = parse_pk(&bundle.commitment.pubkey)?;
    let mint_config_key = parse_pk(&bundle.mint_config.pubkey)?;
    let issuance_key = parse_pk(&bundle.issuance_ledger.pubkey)?;
    let trusted_key = parse_pk(&bundle.trusted_config.pubkey)?;
    let token_acct_key = parse_pk(&bundle.holder_token_account.pubkey)?;

    let (exp_registry, _) =
        Pubkey::find_program_address(&[REGISTRY_SEED, registry_admin.as_ref()], &PROOF_ID);
    let (exp_commitment, _) = Pubkey::find_program_address(
        &[COMMITMENT_SEED, exp_registry.as_ref(), receipt.as_ref()],
        &PROOF_ID,
    );
    let (exp_mint_config, _) =
        Pubkey::find_program_address(&[ENTITLEMENT_MINT_CONFIG_SEED, exp_registry.as_ref()], &PROOF_ID);
    let (exp_issuance, _) = Pubkey::find_program_address(
        &[
            ENTITLEMENT_ISSUANCE_SEED,
            exp_registry.as_ref(),
            receipt.as_ref(),
        ],
        &PROOF_ID,
    );
    let (exp_trusted, _) = Pubkey::find_program_address(
        &[RELYING_PARTY_CONFIG_SEED, relying_party_admin.as_ref()],
        &CONSUMER_ID,
    );
    let exp_ata = get_associated_token_address_with_program_id(&holder, &mint, &spl_token_2022::id());

    let mut canonical_pdas_ok = registry_key == exp_registry
        && commitment_key == exp_commitment
        && mint_config_key == exp_mint_config
        && issuance_key == exp_issuance
        && trusted_key == exp_trusted
        && token_acct_key == exp_ata;
    if let Some(cons) = &bundle.consumption {
        let cons_key = parse_pk(&cons.pubkey)?;
        let (exp_cons, _) = Pubkey::find_program_address(
            &[
                ENTITLEMENT_CONSUMPTION_SEED,
                exp_registry.as_ref(),
                receipt.as_ref(),
            ],
            &CONSUMER_ID,
        );
        canonical_pdas_ok &= cons_key == exp_cons;
    }

    let program_owners_ok = bundle.registry.owner == PROOF_ID.to_string()
        && bundle.commitment.owner == PROOF_ID.to_string()
        && bundle.mint_config.owner == PROOF_ID.to_string()
        && bundle.issuance_ledger.owner == PROOF_ID.to_string()
        && bundle.trusted_config.owner == CONSUMER_ID.to_string()
        && bundle.holder_token_account.owner == spl_token_2022::id().to_string()
        && bundle
            .consumption
            .as_ref()
            .map(|c| c.owner == CONSUMER_ID.to_string())
            .unwrap_or(true);

    let registry: ProofContinuityRegistry =
        decode_anchor_account(&bundle.registry, &PROOF_ID)?;
    let commitment: ReceiptCommitment = decode_anchor_account(&bundle.commitment, &PROOF_ID)?;
    let mint_config: EntitlementMintConfig = decode_anchor_account(&bundle.mint_config, &PROOF_ID)?;
    let issuance: EntitlementIssuanceLedger =
        decode_anchor_account(&bundle.issuance_ledger, &PROOF_ID)?;
    let trusted: TrustedRelyingPartyConfig =
        decode_anchor_account(&bundle.trusted_config, &CONSUMER_ID)?;
    let token_amount = read_token_amount_snapshot(&bundle.holder_token_account)?;

    let trusted_scope_matches_registry = trusted.proof_registry_admin == registry_admin
        && trusted.partner_hash == registry.partner_hash
        && trusted.policy_hash == registry.policy_hash
        && trusted.application_hash == registry.application_hash
        && registry.admin == registry_admin
        && commitment.registry == registry_key
        && mint_config.registry == registry_key
        && mint_config.mint == mint
        && issuance.registry == registry_key
        && issuance.recipient == holder
        && issuance.receipt_id_hash == receipt;

    let entitlement_currently_authorizes = verify_receipt_backed_entitlement(ReceiptBackedEntitlement {
        registry_key,
        registry: &registry,
        commitment: &commitment,
        issuance_ledger: &issuance,
        mint_config: &mint_config,
        holder,
        mint,
        token_owner: holder,
        token_amount,
        now: bundle.observation_unix_timestamp,
    })
    .is_ok();

    let consumption_consumed = if let Some(cons) = &bundle.consumption {
        let record: EntitlementConsumption = decode_anchor_account(cons, &CONSUMER_ID)?;
        record.consumed
    } else {
        false
    };

    details.push(format!(
        "commitment status={} expires_at={}",
        commitment.status, commitment.expires_at
    ));
    details.push(format!("observation_unix_timestamp={}", bundle.observation_unix_timestamp));
    if !canonical_pdas_ok {
        details.push("canonical PDA mismatch".into());
    }
    if !program_owners_ok {
        details.push("unexpected account owner".into());
    }

    Ok(StructuralVerificationReport {
        canonical_pdas_ok,
        program_owners_ok,
        trusted_scope_matches_registry,
        entitlement_currently_authorizes,
        consumption_consumed,
        details,
    })
}

pub fn all_bundle_snapshots(bundle: &PartnerEvidenceBundle) -> Vec<&AccountSnapshot> {
    let mut out = vec![
        &bundle.registry,
        &bundle.commitment,
        &bundle.mint_config,
        &bundle.issuance_ledger,
        &bundle.trusted_config,
        &bundle.holder_token_account,
    ];
    if let Some(c) = &bundle.consumption {
        out.push(c);
    }
    out
}

pub fn verify_authenticated_chain_via_rpc(
    bundle: &PartnerEvidenceBundle,
    rpc_url: &str,
) -> AuthenticatedChainOutcome {
    use solana_client::rpc_client::RpcClient;
    let client = RpcClient::new(rpc_url.to_string());
    for snap in all_bundle_snapshots(bundle) {
        let pk = match parse_pk(&snap.pubkey) {
            Ok(p) => p,
            Err(e) => {
                return AuthenticatedChainOutcome::Unavailable {
                    reason: e,
                };
            }
        };
        let on_chain = match client.get_account(&pk) {
            Ok(a) => a,
            Err(_) => {
                return AuthenticatedChainOutcome::RpcAccountMissing {
                    pubkey: snap.pubkey.clone(),
                };
            }
        };
        if on_chain.owner.to_string() != snap.owner {
            return AuthenticatedChainOutcome::RpcDataMismatch {
                pubkey: snap.pubkey.clone(),
            };
        }
        let expected = match B64.decode(&snap.data_base64) {
            Ok(b) => b,
            Err(e) => {
                return AuthenticatedChainOutcome::Unavailable {
                    reason: format!("snapshot decode: {e}"),
                };
            }
        };
        if on_chain.data != expected {
            return AuthenticatedChainOutcome::RpcDataMismatch {
                pubkey: snap.pubkey.clone(),
            };
        }
    }
    AuthenticatedChainOutcome::RpcConfirmedMatchingState
}

pub fn resolve_authenticated_chain(
    bundle: &PartnerEvidenceBundle,
    rpc_url: Option<&str>,
) -> AuthenticatedChainOutcome {
    match rpc_url {
        Some(url) if !url.is_empty() => verify_authenticated_chain_via_rpc(bundle, url),
        _ => AuthenticatedChainOutcome::Unavailable {
            reason: "No independent RPC URL (set PARTNER_VERIFY_RPC_URL). ProgramTest artifacts cannot be chain-attested via JSON alone.".into(),
        },
    }
}

pub fn independent_passes_authorized_journey(report: &StructuralVerificationReport) -> bool {
    report.canonical_pdas_ok
        && report.program_owners_ok
        && report.trusted_scope_matches_registry
        && report.entitlement_currently_authorizes
        && report.consumption_consumed
}

pub fn independent_passes_revoked_journey(report: &StructuralVerificationReport) -> bool {
    report.canonical_pdas_ok
        && report.program_owners_ok
        && report.trusted_scope_matches_registry
        && !report.entitlement_currently_authorizes
        && !report.consumption_consumed
}

fn parse_pk(s: &str) -> Result<Pubkey, String> {
    Pubkey::from_str(s).map_err(|e| format!("invalid pubkey {s}: {e}"))
}

fn decode_anchor_account<T: AccountDeserialize>(
    snap: &AccountSnapshot,
    expected_owner: &Pubkey,
) -> Result<T, String> {
    if snap.owner != expected_owner.to_string() {
        return Err(format!(
            "account {} owner {} != expected {}",
            snap.pubkey, snap.owner, expected_owner
        ));
    }
    let raw = B64
        .decode(&snap.data_base64)
        .map_err(|e| format!("base64 decode: {e}"))?;
    let mut data: &[u8] = &raw;
    T::try_deserialize(&mut data).map_err(|e| format!("anchor deserialize: {e}"))
}

fn read_token_amount_snapshot(snap: &AccountSnapshot) -> Result<u64, String> {
    if snap.owner != spl_token_2022::id().to_string() {
        return Err("token account owner mismatch".into());
    }
    let raw = B64
        .decode(&snap.data_base64)
        .map_err(|e| format!("base64: {e}"))?;
    Ok(
        StateWithExtensions::<TokenAccountState>::unpack(&raw)
            .map_err(|e| format!("token unpack: {e}"))?
            .base
            .amount,
    )
}

pub async fn snapshot_account(client: &mut BanksClient, key: Pubkey) -> AccountSnapshot {
    let acc: Account = client.get_account(key).await.unwrap().expect("account");
    AccountSnapshot {
        pubkey: key.to_string(),
        owner: acc.owner.to_string(),
        data_base64: B64.encode(&acc.data),
    }
}

pub async fn capture_partner_evidence(
    ctx: &mut ProgramTestContext,
    registry_admin: Pubkey,
    relying_party_admin: Pubkey,
    registry: Pubkey,
    commitment: Pubkey,
    mint_config: Pubkey,
    mint: Pubkey,
    holder: Pubkey,
    trusted_config: Pubkey,
    receipt: [u8; 32],
    consumption: Option<Pubkey>,
) -> PartnerEvidenceBundle {
    let (issuance_ledger, _) = Pubkey::find_program_address(
        &[
            ENTITLEMENT_ISSUANCE_SEED,
            registry.as_ref(),
            receipt.as_ref(),
        ],
        &PROOF_ID,
    );
    let ata = get_associated_token_address_with_program_id(&holder, &mint, &spl_token_2022::id());
    let clock: Clock = ctx.banks_client.get_sysvar().await.unwrap();
    PartnerEvidenceBundle {
        registry_admin: registry_admin.to_string(),
        relying_party_admin: relying_party_admin.to_string(),
        observation_unix_timestamp: clock.unix_timestamp,
        receipt_id_hash_hex: hex32(&receipt),
        entitlement_mint: mint.to_string(),
        holder_wallet: holder.to_string(),
        evidence_supply: EVIDENCE_CAPTURE_PROGRAM_TEST.to_string(),
        registry: snapshot_account(&mut ctx.banks_client, registry).await,
        commitment: snapshot_account(&mut ctx.banks_client, commitment).await,
        mint_config: snapshot_account(&mut ctx.banks_client, mint_config).await,
        issuance_ledger: snapshot_account(&mut ctx.banks_client, issuance_ledger).await,
        trusted_config: snapshot_account(&mut ctx.banks_client, trusted_config).await,
        holder_token_account: snapshot_account(&mut ctx.banks_client, ata).await,
        consumption: if let Some(c) = consumption {
            Some(snapshot_account(&mut ctx.banks_client, c).await)
        } else {
            None
        },
    }
}

#[derive(Debug)]
pub struct IndependentPartnerVerification {
    pub token_balance: u64,
    pub commitment_status: u8,
    pub commitment_expires_at: i64,
    pub consumption_consumed: bool,
    pub trusted_config_version: u64,
    pub receipt_authorizes_holder: bool,
    pub verifier_accepts_entitlement: bool,
}

pub async fn verify_independent_partner_state(
    ctx: &mut ProgramTestContext,
    registry: Pubkey,
    commitment: Pubkey,
    mint: Pubkey,
    mint_config: Pubkey,
    issuance_ledger: Pubkey,
    trusted_config: Pubkey,
    holder: Pubkey,
    consumption: Option<Pubkey>,
) -> IndependentPartnerVerification {
    let commitment = load_account::<ReceiptCommitment>(&mut ctx.banks_client, commitment).await;
    let registry_account =
        load_account::<ProofContinuityRegistry>(&mut ctx.banks_client, registry).await;
    let mint_cfg =
        load_account::<EntitlementMintConfig>(&mut ctx.banks_client, mint_config).await;
    let issuance =
        load_account::<EntitlementIssuanceLedger>(&mut ctx.banks_client, issuance_ledger).await;
    let trusted =
        load_account::<TrustedRelyingPartyConfig>(&mut ctx.banks_client, trusted_config).await;
    let ata = get_associated_token_address_with_program_id(&holder, &mint, &spl_token_2022::id());
    let token_balance = read_token_balance(&mut ctx.banks_client, ata).await;
    let clock: Clock = ctx.banks_client.get_sysvar().await.unwrap();
    let consumption_consumed = if let Some(addr) = consumption {
        let record = load_account::<EntitlementConsumption>(&mut ctx.banks_client, addr).await;
        record.consumed
    } else {
        false
    };

    let receipt_authorizes_holder =
        commitment.authorized_holder == holder && commitment.status == STATUS_ACTIVE;
    let verifier_accepts_entitlement = verify_receipt_backed_entitlement(ReceiptBackedEntitlement {
        registry_key: registry,
        registry: &registry_account,
        commitment: &commitment,
        issuance_ledger: &issuance,
        mint_config: &mint_cfg,
        holder,
        mint,
        token_owner: holder,
        token_amount: token_balance,
        now: clock.unix_timestamp,
    })
    .is_ok();

    IndependentPartnerVerification {
        token_balance,
        commitment_status: commitment.status,
        commitment_expires_at: commitment.expires_at,
        consumption_consumed,
        trusted_config_version: trusted.config_version,
        receipt_authorizes_holder,
        verifier_accepts_entitlement,
    }
}

/// Legacy helper — do not use for CLI proof.
pub fn is_revoked_artifact(artifact: &PartnerJourneyArtifact) -> bool {
    artifact.commitment_status == STATUS_REVOKED
        && artifact.token_balance == 1
        && !artifact.consumption_recorded
}

async fn load_account<T: AccountDeserialize>(client: &mut BanksClient, key: Pubkey) -> T {
    let acc = client
        .get_account(key)
        .await
        .unwrap()
        .unwrap_or_else(|| panic!("missing account {}", key));
    let mut data: &[u8] = &acc.data;
    T::try_deserialize(&mut data).unwrap()
}

async fn read_token_balance(client: &mut BanksClient, ata: Pubkey) -> u64 {
    let acc = client.get_account(ata).await.unwrap().expect("token ata");
    StateWithExtensions::<TokenAccountState>::unpack(&acc.data)
        .unwrap()
        .base
        .amount
}

pub fn program_ids_banner() -> (String, String, String) {
    (
        PROOF_ID.to_string(),
        CONSUMER_ID.to_string(),
        spl_token_2022::id().to_string(),
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn offline_snapshots_are_never_authenticated_chain_proof() {
        let artifact = load_artifact(ARTIFACT_REL).expect("artifact");
        let bundle = artifact.partner_evidence.expect("evidence");
        assert!(!evidence_snapshots_are_authenticated_chain_proof(&bundle));
        let auth = resolve_authenticated_chain(&bundle, None);
        assert!(!is_authenticated_chain_proof(&auth));
    }

    #[test]
    fn fabricated_consistent_snapshots_still_not_authenticated_on_chain() {
        let mut bundle = load_artifact(ARTIFACT_REVOKE_REL)
            .expect("revoked artifact")
            .partner_evidence
            .expect("evidence");
        bundle.evidence_supply = EVIDENCE_SUPPLY_OFFLINE_SNAPSHOTS.to_string();
        let mut raw = B64
            .decode(&bundle.commitment.data_base64)
            .expect("commitment bytes");
        // Anchor account layout: 8-byte discriminator then fields; status is first u8 after fixed fields.
        let commitment: ReceiptCommitment =
            decode_anchor_account(&bundle.commitment, &PROOF_ID).expect("commitment");
        assert_eq!(commitment.status, STATUS_REVOKED);
        const STATUS_OFFSET: usize = 8 + 32 * 6 + 8;
        raw[STATUS_OFFSET] = STATUS_ACTIVE;
        bundle.commitment.data_base64 = B64.encode(&raw);
        let _structural = verify_structural_semantic_from_evidence(&bundle).expect("structural");
        let auth = resolve_authenticated_chain(&bundle, None);
        assert!(!is_authenticated_chain_proof(&auth));
        assert!(!evidence_snapshots_are_authenticated_chain_proof(&bundle));
    }

    #[test]
    fn tampered_json_ok_flag_does_not_independently_verify_revoked_journey() {
        let mut artifact =
            load_artifact(ARTIFACT_REVOKE_REL).expect("revoked artifact — run partner tests");
        let evidence = artifact
            .partner_evidence
            .clone()
            .expect("partner_evidence required");
        artifact.independent_verification_ok = true;
        assert!(artifact.independent_verification_ok);
        let report = verify_independent_from_evidence(&evidence).expect("verify evidence");
        assert!(
            !report.entitlement_currently_authorizes,
            "revoked commitment must fail entitlement verifier"
        );
        assert!(
            independent_passes_revoked_journey(&report),
            "evidence must still prove revoked journey"
        );
        assert!(!independent_passes_authorized_journey(&report));
    }

    #[test]
    fn tampered_true_flag_on_authorized_still_verifies_from_evidence() {
        let mut artifact =
            load_artifact(ARTIFACT_REL).expect("authorized artifact — run partner tests");
        artifact.independent_verification_ok = false;
        let evidence = artifact.partner_evidence.expect("partner_evidence");
        let report = verify_independent_from_evidence(&evidence).expect("verify");
        assert!(independent_passes_authorized_journey(&report));
    }
}
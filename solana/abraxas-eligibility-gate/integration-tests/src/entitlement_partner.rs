//! BUILD #981 — independent partner verification helpers (local ProgramTest + artifact CLI).

use abraxas_proof_entitlement_consumer::{
    EntitlementConsumption, TrustedRelyingPartyConfig, ID as CONSUMER_ID,
};
use abraxas_proof_continuity::{
    verify_receipt_backed_entitlement, EntitlementIssuanceLedger, EntitlementMintConfig,
    ProofContinuityRegistry, ReceiptBackedEntitlement, ReceiptCommitment, ID as PROOF_ID,
    STATUS_ACTIVE, STATUS_REVOKED,
};
use anchor_lang::AccountDeserialize;
use solana_program_test::{BanksClient, ProgramTestContext};
use solana_sdk::{clock::Clock, pubkey::Pubkey};
use spl_associated_token_account::get_associated_token_address_with_program_id;
use serde_json::Value;
use spl_token_2022::{
    extension::StateWithExtensions,
    state::Account as TokenAccountState,
};
use std::time::{SystemTime, UNIX_EPOCH};

pub const ARTIFACT_REL: &str =
    "examples/independent-solana-entitlement-partner/artifacts/authorized-journey.json";
pub const ARTIFACT_REVOKE_REL: &str =
    "examples/independent-solana-entitlement-partner/artifacts/revoked-journey.json";

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
    pub independent_verification_ok: bool,
    pub recorded_at_unix_ms: u64,
}

pub fn hex32(bytes: &[u8; 32]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut out = String::with_capacity(64);
    for b in bytes {
        out.push(HEX[(b >> 4) as usize] as char);
        out.push(HEX[(b & 0x0f) as usize] as char);
    }
    out
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
    let ata = get_associated_token_address_with_program_id(
        &holder,
        &mint,
        &spl_token_2022::id(),
    );
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

pub fn cli_report(artifact: &PartnerJourneyArtifact) -> String {
    let mut lines = vec![
        format!("BUILD {}", artifact.build),
        format!("Environment: {}", artifact.environment),
        format!("Execution: {}", artifact.execution_kind),
        format!("Proof program: {}", artifact.proof_continuity_program_id),
        format!("Consumer program: {}", artifact.entitlement_consumer_program_id),
        format!("Receipt: {}", artifact.receipt_id_hash_hex),
        format!("Registry: {}", artifact.registry),
        format!("Trusted config: {}", artifact.trusted_config),
        format!("Mint: {}", artifact.entitlement_mint),
        format!("Holder: {}", artifact.holder_wallet),
        format!(
            "Token balance: {} | commitment status: {} | consumed: {}",
            artifact.token_balance,
            artifact.commitment_status,
            artifact.consumption_recorded
        ),
        format!(
            "Independent verification OK: {}",
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

pub fn is_revoked_artifact(artifact: &PartnerJourneyArtifact) -> bool {
    artifact.commitment_status == STATUS_REVOKED
        && artifact.token_balance == 1
        && !artifact.consumption_recorded
        && !artifact.independent_verification_ok
}

async fn load_account<T: AccountDeserialize>(
    client: &mut BanksClient,
    key: Pubkey,
) -> T {
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
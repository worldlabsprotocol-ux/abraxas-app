//! BUILD #981 — independent partner acceptance (local ProgramTest only).

use abraxas_eligibility_gate_integration_tests::entitlement_partner::{
    artifact_repo_path, capture_partner_evidence, hex32, now_ms, program_ids_banner,
    verify_independent_from_evidence, verify_independent_partner_state, write_artifact,
    JourneyStage, PartnerJourneyArtifact, ARTIFACT_REL, ARTIFACT_REVOKE_REL,
};
use abraxas_proof_continuity::{ID as PROOF_ID, STATUS_REVOKED};
use anchor_lang::{InstructionData, ToAccountMetas};
use solana_sdk::{
    instruction::Instruction,
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    system_program,
};
use spl_associated_token_account::get_associated_token_address_with_program_id;

#[path = "common/entitlement_harness.rs"]
mod entitlement_harness;
use entitlement_harness::*;

fn stage(
    name: &str,
    program_id: Pubkey,
    outcome: &str,
    signers: &[Pubkey],
    accounts: serde_json::Map<String, serde_json::Value>,
    notes: Option<&str>,
) -> JourneyStage {
    JourneyStage {
        stage: name.to_string(),
        program_id: program_id.to_string(),
        outcome: outcome.to_string(),
        signers: signers.iter().map(|k| k.to_string()).collect(),
        accounts,
        notes: notes.map(str::to_string),
    }
}

#[tokio::test]
async fn partner_complete_authorized_journey() {
    let mut ctx = start().await;
    let admin = ctx.payer.insecure_clone();
    let issuer = Keypair::new();
    let holder = Keypair::new();
    let partner_admin = Keypair::new();
    send(
        &mut ctx,
        vec![solana_sdk::system_instruction::transfer(
            &admin.pubkey(),
            &partner_admin.pubkey(),
            1_000_000_000,
        )],
        &[&admin],
    )
    .await
    .unwrap();

    let env = setup_harness_with_entitlement_mint(
        &mut ctx,
        &admin,
        &issuer,
        &holder,
        &partner_admin,
    )
    .await;
    let payer = ctx.payer.pubkey();
    let mut stages = vec![
        stage(
            "register_proof_registry",
            PROOF_ID,
            "success",
            &[admin.pubkey()],
            serde_json::Map::new(),
            Some("ProofContinuityRegistry initialized"),
        ),
        stage(
            "initialize_partner_trusted_config",
            abraxas_proof_entitlement_consumer::ID,
            "success",
            &[partner_admin.pubkey()],
            serde_json::Map::from_iter([(
                "trusted_config".into(),
                env.trusted_config.to_string().into(),
            )]),
            Some("Partner-owned relying-party configuration PDA"),
        ),
    ];

    send(
        &mut ctx,
        vec![mint_entitlement_ix(payer, &holder, &env, env.sandbox)],
        &[&holder],
    )
    .await
    .unwrap();
    stages.push(stage(
        "mint_verified_entitlement",
        PROOF_ID,
        "success",
        &[holder.pubkey()],
        serde_json::Map::from_iter([
            ("mint".into(), env.mint.to_string().into()),
            ("commitment".into(), env.commitment.to_string().into()),
        ]),
        Some("Token-2022 non-transferable entitlement issued"),
    ));

    send(
        &mut ctx,
        vec![consume_entitlement_ix(payer, &holder, &env)],
        &[&holder],
    )
    .await
    .unwrap();
    let (consumption, _) = consumption_pda(&env.registry, &env.receipt);
    stages.push(stage(
        "partner_consume_verified_entitlement",
        abraxas_proof_entitlement_consumer::ID,
        "success",
        &[holder.pubkey(), payer],
        serde_json::Map::from_iter([("consumption".into(), consumption.to_string().into())]),
        Some("On-chain consumption record created"),
    ));

    let (issuance_ledger, _) = issuance_ledger_pda(&env.registry, &env.receipt);
    let verification = verify_independent_partner_state(
        &mut ctx,
        env.registry,
        env.commitment,
        env.mint,
        env.mint_config,
        issuance_ledger,
        env.trusted_config,
        holder.pubkey(),
        Some(consumption),
    )
    .await;
    assert!(verification.verifier_accepts_entitlement);
    assert!(verification.consumption_consumed);

    let (proof_id, consumer_id, token_id) = program_ids_banner();
    let ata = get_associated_token_address_with_program_id(
        &holder.pubkey(),
        &env.mint,
        &spl_token_2022::id(),
    );
    let balance = token_balance(&mut ctx, ata).await;
    let partner_evidence = capture_partner_evidence(
        &mut ctx,
        env.registry_admin,
        env.relying_party_admin,
        env.registry,
        env.commitment,
        env.mint_config,
        env.mint,
        holder.pubkey(),
        env.trusted_config,
        env.receipt,
        Some(consumption),
    )
    .await;
    let evidence_report = verify_independent_from_evidence(&partner_evidence).expect("evidence");
    assert!(evidence_report.entitlement_currently_authorizes);
    let artifact = PartnerJourneyArtifact {
        build: "981".into(),
        environment: "local_program_test".into(),
        proof_continuity_program_id: proof_id,
        entitlement_consumer_program_id: consumer_id,
        token_program_id: token_id,
        execution_kind: "banks_client_transaction".into(),
        stages,
        receipt_id_hash_hex: hex32(&env.receipt),
        registry: env.registry.to_string(),
        trusted_config: env.trusted_config.to_string(),
        commitment: env.commitment.to_string(),
        entitlement_mint: env.mint.to_string(),
        holder_wallet: holder.pubkey().to_string(),
        consumption_account: Some(consumption.to_string()),
        token_balance: balance,
        commitment_status: verification.commitment_status,
        consumption_recorded: verification.consumption_consumed,
        independent_verification_ok: verification.verifier_accepts_entitlement
            && verification.consumption_consumed,
        recorded_at_unix_ms: now_ms(),
        partner_evidence: Some(partner_evidence),
    };
    write_artifact(ARTIFACT_REL, &artifact).expect("write authorized artifact");
    assert!(artifact_repo_path(ARTIFACT_REL).exists());
}

#[tokio::test]
async fn partner_revoke_then_deny_while_token_remains() {
    let mut ctx = start().await;
    let admin = ctx.payer.insecure_clone();
    let issuer = Keypair::new();
    let holder = Keypair::new();
    let partner_admin = ctx.payer.insecure_clone();
    let env = setup_harness_with_entitlement_mint(&mut ctx, &admin, &issuer, &holder, &partner_admin)
        .await;
    let payer = ctx.payer.pubkey();
    send(
        &mut ctx,
        vec![mint_entitlement_ix(payer, &holder, &env, env.sandbox)],
        &[&holder],
    )
    .await
    .unwrap();
    let message = status_update_message(
        env.receipt,
        env.payload,
        env.partner,
        env.policy,
        env.application,
        env.expires_at,
        2,
        1,
        STATUS_REVOKED,
    );
    let update_ix = Instruction {
        program_id: PROOF_ID,
        accounts: abraxas_proof_continuity::accounts::UpdateReceiptStatus {
            operator: admin.pubkey(),
            registry: env.registry,
            commitment: env.commitment,
            instructions: solana_sdk::sysvar::instructions::id(),
        }
        .to_account_metas(None),
        data: abraxas_proof_continuity::instruction::UpdateReceiptStatus {
            receipt_id_hash: env.receipt,
            payload_hash: env.payload,
            status: STATUS_REVOKED,
            status_version: 2,
            expires_at: env.expires_at,
        }
        .data(),
    };
    send(
        &mut ctx,
        vec![ed25519_ix(&issuer, &message), update_ix],
        &[&admin],
    )
    .await
    .unwrap();

    let ata = get_associated_token_address_with_program_id(
        &holder.pubkey(),
        &env.mint,
        &spl_token_2022::id(),
    );
    assert_eq!(token_balance(&mut ctx, ata).await, 1);

    assert!(
        send(
            &mut ctx,
            vec![consume_entitlement_ix(payer, &holder, &env)],
            &[&holder],
        )
        .await
        .is_err()
    );

    let (consumption, _) = consumption_pda(&env.registry, &env.receipt);
    assert!(
        ctx.banks_client.get_account(consumption).await.unwrap().is_none(),
        "no consumption PDA after denied attempt"
    );

    let (issuance_ledger, _) = issuance_ledger_pda(&env.registry, &env.receipt);
    let verification = verify_independent_partner_state(
        &mut ctx,
        env.registry,
        env.commitment,
        env.mint,
        env.mint_config,
        issuance_ledger,
        env.trusted_config,
        holder.pubkey(),
        None,
    )
    .await;
    assert!(!verification.verifier_accepts_entitlement);
    assert_eq!(verification.token_balance, 1);

    let (proof_id, consumer_id, token_id) = program_ids_banner();
    let partner_evidence = capture_partner_evidence(
        &mut ctx,
        env.registry_admin,
        env.relying_party_admin,
        env.registry,
        env.commitment,
        env.mint_config,
        env.mint,
        holder.pubkey(),
        env.trusted_config,
        env.receipt,
        None,
    )
    .await;
    let artifact = PartnerJourneyArtifact {
        build: "981".into(),
        environment: "local_program_test".into(),
        proof_continuity_program_id: proof_id,
        entitlement_consumer_program_id: consumer_id,
        token_program_id: token_id,
        execution_kind: "banks_client_transaction".into(),
        stages: vec![
            stage("mint", PROOF_ID, "success", &[holder.pubkey()], serde_json::Map::new(), None),
            stage(
                "revoke",
                PROOF_ID,
                "success",
                &[admin.pubkey()],
                serde_json::Map::new(),
                Some("issuer-signed status update"),
            ),
            stage(
                "consume",
                abraxas_proof_entitlement_consumer::ID,
                "rejected",
                &[holder.pubkey()],
                serde_json::Map::new(),
                Some("revoked proof — possession insufficient"),
            ),
        ],
        receipt_id_hash_hex: hex32(&env.receipt),
        registry: env.registry.to_string(),
        trusted_config: env.trusted_config.to_string(),
        commitment: env.commitment.to_string(),
        entitlement_mint: env.mint.to_string(),
        holder_wallet: holder.pubkey().to_string(),
        consumption_account: None,
        token_balance: 1,
        commitment_status: STATUS_REVOKED,
        consumption_recorded: false,
        independent_verification_ok: false,
        recorded_at_unix_ms: now_ms(),
        partner_evidence: Some(partner_evidence),
    };
    write_artifact(ARTIFACT_REVOKE_REL, &artifact).expect("write revoked artifact");
}

#[tokio::test]
async fn partner_tampered_json_flag_does_not_fool_independent_verifier() {
    let evidence =
        abraxas_eligibility_gate_integration_tests::entitlement_partner::load_artifact(
            ARTIFACT_REVOKE_REL,
        )
        .expect("revoked artifact")
        .partner_evidence
        .expect("evidence");
    let mut artifact =
        abraxas_eligibility_gate_integration_tests::entitlement_partner::load_artifact(
            ARTIFACT_REVOKE_REL,
        )
        .unwrap();
    artifact.independent_verification_ok = true;
    let report = verify_independent_from_evidence(&evidence).unwrap();
    assert!(!report.entitlement_currently_authorizes);
    assert!(artifact.independent_verification_ok);
}

#[tokio::test]
async fn partner_expired_receipt_consume_denied() {
    let mut ctx = start().await;
    let admin = ctx.payer.insecure_clone();
    let issuer = Keypair::new();
    let holder = Keypair::new();
    let env = setup_harness_with_entitlement_mint(&mut ctx, &admin, &issuer, &holder, &admin).await;
    let payer = ctx.payer.pubkey();
    send(
        &mut ctx,
        vec![mint_entitlement_ix(payer, &holder, &env, env.sandbox)],
        &[&holder],
    )
    .await
    .unwrap();
    let mut clock = ctx
        .banks_client
        .get_sysvar::<solana_sdk::clock::Clock>()
        .await
        .unwrap();
    clock.unix_timestamp = env.expires_at + 1;
    ctx.set_sysvar::<solana_sdk::clock::Clock>(&clock);
    assert!(
        send(
            &mut ctx,
            vec![consume_entitlement_ix(payer, &holder, &env)],
            &[&holder],
        )
        .await
        .is_err()
    );
}

#[tokio::test]
async fn partner_independent_verification_without_hosted_ui() {
    let mut ctx = start().await;
    let admin = ctx.payer.insecure_clone();
    let issuer = Keypair::new();
    let holder = Keypair::new();
    let env = setup_harness_with_entitlement_mint(&mut ctx, &admin, &issuer, &holder, &admin).await;
    let payer = ctx.payer.pubkey();
    send(
        &mut ctx,
        vec![mint_entitlement_ix(payer, &holder, &env, env.sandbox)],
        &[&holder],
    )
    .await
    .unwrap();
    send(
        &mut ctx,
        vec![consume_entitlement_ix(payer, &holder, &env)],
        &[&holder],
    )
    .await
    .unwrap();
    let (consumption, _) = consumption_pda(&env.registry, &env.receipt);
    let (issuance_ledger, _) = issuance_ledger_pda(&env.registry, &env.receipt);
    let report = verify_independent_partner_state(
        &mut ctx,
        env.registry,
        env.commitment,
        env.mint,
        env.mint_config,
        issuance_ledger,
        env.trusted_config,
        holder.pubkey(),
        Some(consumption),
    )
    .await;
    assert!(report.verifier_accepts_entitlement);
    assert!(report.consumption_consumed);
    assert!(report.receipt_authorizes_holder);
}

#[tokio::test]
async fn partner_wrong_holder_consume_rejected() {
    let mut ctx = start().await;
    let admin = ctx.payer.insecure_clone();
    let issuer = Keypair::new();
    let holder = Keypair::new();
    let impostor = Keypair::new();
    let env = setup_harness_with_entitlement_mint(&mut ctx, &admin, &issuer, &holder, &admin).await;
    send(
        &mut ctx,
        vec![solana_sdk::system_instruction::transfer(
            &admin.pubkey(),
            &impostor.pubkey(),
            500_000_000,
        )],
        &[&admin],
    )
    .await
    .unwrap();
    let payer = ctx.payer.pubkey();
    send(
        &mut ctx,
        vec![mint_entitlement_ix(payer, &holder, &env, env.sandbox)],
        &[&holder],
    )
    .await
    .unwrap();
    assert!(
        send(
            &mut ctx,
            vec![consume_entitlement_ix(payer, &impostor, &env)],
            &[&impostor],
        )
        .await
        .is_err()
    );
}

#[tokio::test]
async fn partner_unauthorized_issuer_commit_rejected() {
    let mut ctx = start().await;
    let admin = ctx.payer.insecure_clone();
    let issuer = Keypair::new();
    let rogue = Keypair::new();
    let holder = Keypair::new();
    let partner = h32(11);
    let policy = h32(12);
    let application = h32(13);
    let receipt = h32(31);
    let payload = h32(15);
    let expires_at: i64 = 9_000_000_000;
    let (registry, _) = registry_pda(&admin.pubkey());
    send(
        &mut ctx,
        vec![Instruction {
            program_id: PROOF_ID,
            accounts: abraxas_proof_continuity::accounts::InitializeProofRegistry {
                admin: admin.pubkey(),
                registry,
                system_program: system_program::id(),
            }
            .to_account_metas(None),
            data: abraxas_proof_continuity::instruction::InitializeProofRegistry {
                trusted_issuer_pubkey: issuer.pubkey().to_bytes(),
                partner_hash: partner,
                policy_hash: policy,
                application_hash: application,
            }
            .data(),
        }],
        &[&admin],
    )
    .await
    .unwrap();
    send(
        &mut ctx,
        vec![solana_sdk::system_instruction::transfer(
            &admin.pubkey(),
            &holder.pubkey(),
            2_000_000_000,
        )],
        &[&admin],
    )
    .await
    .unwrap();
    let (sandbox, _) = sandbox_pda(&registry, &holder.pubkey());
    send(
        &mut ctx,
        vec![Instruction {
            program_id: PROOF_ID,
            accounts: abraxas_proof_continuity::accounts::RegisterSandboxBinding {
                holder: holder.pubkey(),
                registry,
                sandbox,
                system_program: system_program::id(),
            }
            .to_account_metas(None),
            data: abraxas_proof_continuity::instruction::RegisterSandboxBinding {}.data(),
        }],
        &[&holder],
    )
    .await
    .unwrap();
    let (ledger, _) = ledger_pda(&sandbox);
    let (commitment, _) = commitment_pda(&registry, &receipt);
    let message =
        commitment_message(receipt, payload, partner, policy, application, expires_at, 1, 1);
    let tx_payer = ctx.payer.pubkey();
    assert!(
        send(
            &mut ctx,
            vec![
                ed25519_ix(&rogue, &message),
                Instruction {
                    program_id: PROOF_ID,
                    accounts: abraxas_proof_continuity::accounts::ExecuteHarnessRun {
                        payer: tx_payer,
                        holder: holder.pubkey(),
                        registry,
                        sandbox,
                        ledger,
                        commitment,
                        instructions: solana_sdk::sysvar::instructions::id(),
                        system_program: system_program::id(),
                    }
                    .to_account_metas(None),
                    data: abraxas_proof_continuity::instruction::ExecuteHarnessRun {
                        execution_nonce: 1,
                        receipt_id_hash: receipt,
                        payload_hash: payload,
                        expires_at,
                        status_version: 1,
                    }
                    .data(),
                },
            ],
            &[&holder],
        )
        .await
        .is_err()
    );
}
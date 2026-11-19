//! Capstone Token-2022 — verified entitlement mint after proof-continuity authorization.

use abraxas_proof_entitlement_consumer::ID as CONSUMER_ID;
use abraxas_proof_continuity::{ID as PROOF_ID, STATUS_REVOKED};
use anchor_lang::{InstructionData, ToAccountMetas};
use solana_sdk::{
    ed25519_program,
    instruction::Instruction,
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    system_instruction,
    system_program,
};
use spl_associated_token_account::get_associated_token_address_with_program_id;
use spl_token_2022::{
    extension::{
        non_transferable::NonTransferable, BaseStateWithExtensions, StateWithExtensions,
    },
    instruction as token_ix,
    state::{Account as TokenAccountState, Mint as MintState},
};

#[path = "common/entitlement_harness.rs"]
mod entitlement_harness;
use entitlement_harness::*;

#[tokio::test]
async fn authorized_proof_mints_one_entitlement_token() {
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

    let ata = get_associated_token_address_with_program_id(
        &holder.pubkey(),
        &env.mint,
        &spl_token_2022::id(),
    );
    assert_eq!(token_balance(&mut ctx, ata).await, 1);
}

#[tokio::test]
async fn duplicate_entitlement_mint_rejected() {
    let mut ctx = start().await;
    let admin = ctx.payer.insecure_clone();
    let issuer = Keypair::new();
    let holder = Keypair::new();
    let env = setup_harness_with_entitlement_mint(&mut ctx, &admin, &issuer, &holder, &admin).await;
    let payer = ctx.payer.pubkey();
    let ix = mint_entitlement_ix(payer, &holder, &env, env.sandbox);
    send(&mut ctx, vec![ix.clone()], &[&holder]).await.unwrap();
  let ata = get_associated_token_address_with_program_id(
        &holder.pubkey(),
        &env.mint,
        &spl_token_2022::id(),
    );
    assert_eq!(token_balance(&mut ctx, ata).await, 1);
    let (ledger, _) = issuance_ledger_pda(&env.registry, &env.receipt);
    assert!(
        ctx.banks_client
            .get_account(ledger)
            .await
            .unwrap()
            .is_some(),
        "issuance ledger must exist after first mint"
    );
    refresh_blockhash(&mut ctx).await;
    let second = send(&mut ctx, vec![ix], &[&holder]).await;
    assert!(second.is_err(), "duplicate mint must fail: {:?}", second);
    assert_eq!(token_balance(&mut ctx, ata).await, 1);
}

#[tokio::test]
async fn wrong_wallet_entitlement_mint_rejected() {
    let mut ctx = start().await;
    let admin = ctx.payer.insecure_clone();
    let issuer = Keypair::new();
    let holder = Keypair::new();
    let impostor = Keypair::new();
    let env = setup_harness_with_entitlement_mint(&mut ctx, &admin, &issuer, &holder, &admin).await;
    send(
        &mut ctx,
        vec![system_instruction::transfer(
            &admin.pubkey(),
            &impostor.pubkey(),
            500_000_000,
        )],
        &[&admin],
    )
    .await
    .unwrap();
    let (impostor_sandbox, _) = sandbox_pda(&env.registry, &impostor.pubkey());
    send(
        &mut ctx,
        vec![Instruction {
            program_id: PROOF_ID,
            accounts: abraxas_proof_continuity::accounts::RegisterSandboxBinding {
                holder: impostor.pubkey(),
                registry: env.registry,
                sandbox: impostor_sandbox,
                system_program: system_program::id(),
            }
            .to_account_metas(None),
            data: abraxas_proof_continuity::instruction::RegisterSandboxBinding {}.data(),
        }],
        &[&impostor],
    )
    .await
    .unwrap();
    let payer = ctx.payer.pubkey();
    assert!(
        send(
            &mut ctx,
            vec![mint_entitlement_ix(payer, &impostor, &env, impostor_sandbox)],
            &[&impostor],
        )
        .await
        .is_err()
    );
}

#[tokio::test]
async fn wrong_policy_registry_entitlement_mint_rejected() {
    let mut ctx = start().await;
    let admin = ctx.payer.insecure_clone();
    let issuer = Keypair::new();
    let holder = Keypair::new();
    let env = setup_harness_with_entitlement_mint(&mut ctx, &admin, &issuer, &holder, &admin).await;

    let (registry_b, _) = registry_pda(&holder.pubkey());
    send(
        &mut ctx,
        vec![Instruction {
            program_id: PROOF_ID,
            accounts: abraxas_proof_continuity::accounts::InitializeProofRegistry {
                admin: holder.pubkey(),
                registry: registry_b,
                system_program: system_program::id(),
            }
            .to_account_metas(None),
            data: abraxas_proof_continuity::instruction::InitializeProofRegistry {
                trusted_issuer_pubkey: issuer.pubkey().to_bytes(),
                partner_hash: h32(11),
                policy_hash: h32(99),
                application_hash: h32(13),
            }
            .data(),
        }],
        &[&holder],
    )
    .await
    .unwrap();

    let (config_b, _) = entitlement_config_pda(&registry_b);
    let (mint_b, _) = entitlement_mint_pda(&registry_b);
    let (auth_b, _) = mint_authority_pda(&registry_b);
    send(
        &mut ctx,
        vec![Instruction {
            program_id: PROOF_ID,
            accounts: abraxas_proof_continuity::accounts::InitializeEntitlementMint {
                admin: holder.pubkey(),
                registry: registry_b,
                entitlement_mint_config: config_b,
                mint: mint_b,
                mint_authority: auth_b,
                token_program: spl_token_2022::id(),
                system_program: system_program::id(),
            }
            .to_account_metas(None),
            data: abraxas_proof_continuity::instruction::InitializeEntitlementMint {}.data(),
        }],
        &[&holder],
    )
    .await
    .unwrap();

    let mut bad_env = env.clone();
    bad_env.registry = registry_b;
    bad_env.mint_config = config_b;
    bad_env.mint = mint_b;
    bad_env.mint_authority = auth_b;
    let payer = ctx.payer.pubkey();
    assert!(
        send(
            &mut ctx,
            vec![mint_entitlement_ix(payer, &holder, &bad_env, env.sandbox)],
            &[&holder],
        )
        .await
        .is_err()
    );
}

#[tokio::test]
async fn revoked_proof_entitlement_mint_rejected() {
    let mut ctx = start().await;
    let admin = ctx.payer.insecure_clone();
    let issuer = Keypair::new();
    let holder = Keypair::new();
    let env = setup_harness_with_entitlement_mint(&mut ctx, &admin, &issuer, &holder, &admin).await;

    let message = status_update_message(
        env.receipt,
        env.payload,
        h32(11),
        h32(12),
        h32(13),
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

    let payer = ctx.payer.pubkey();
    assert!(
        send(
            &mut ctx,
            vec![mint_entitlement_ix(payer, &holder, &env, env.sandbox)],
            &[&holder],
        )
        .await
        .is_err()
    );
}

#[tokio::test]
async fn expired_proof_entitlement_mint_rejected() {
    let mut ctx = start().await;
    let admin = ctx.payer.insecure_clone();
    let issuer = Keypair::new();
    let holder = Keypair::new();
    let env = setup_harness_with_entitlement_mint(&mut ctx, &admin, &issuer, &holder, &admin).await;

    let mut clock = ctx.banks_client.get_sysvar::<solana_sdk::clock::Clock>().await.unwrap();
    clock.unix_timestamp = env.expires_at + 1;
    ctx.set_sysvar::<solana_sdk::clock::Clock>(&clock);

    let payer = ctx.payer.pubkey();
    assert!(
        send(
            &mut ctx,
            vec![mint_entitlement_ix(payer, &holder, &env, env.sandbox)],
            &[&holder],
        )
        .await
        .is_err()
    );
}

#[tokio::test]
async fn unauthorized_direct_token_mint_rejected() {
    let mut ctx = start().await;
    let admin = ctx.payer.insecure_clone();
    let issuer = Keypair::new();
    let holder = Keypair::new();
    let env = setup_harness_with_entitlement_mint(&mut ctx, &admin, &issuer, &holder, &admin).await;

    let ata = get_associated_token_address_with_program_id(
        &holder.pubkey(),
        &env.mint,
        &spl_token_2022::id(),
    );
    let payer = ctx.payer.pubkey();
    let create_ata_ix = spl_associated_token_account::instruction::create_associated_token_account(
        &payer,
        &holder.pubkey(),
        &env.mint,
        &spl_token_2022::id(),
    );
    send(&mut ctx, vec![create_ata_ix], &[]).await.unwrap();

    let direct_mint = token_ix::mint_to(
        &spl_token_2022::id(),
        &env.mint,
        &ata,
        &holder.pubkey(),
        &[],
        1,
    )
    .unwrap();
    assert!(send(&mut ctx, vec![direct_mint], &[&holder]).await.is_err());
}

#[tokio::test]
async fn non_transferable_extension_present_on_entitlement_mint() {
    let mut ctx = start().await;
    let admin = ctx.payer.insecure_clone();
    let issuer = Keypair::new();
    let holder = Keypair::new();
    let env = setup_harness_with_entitlement_mint(&mut ctx, &admin, &issuer, &holder, &admin).await;
    let mint_acc = ctx
        .banks_client
        .get_account(env.mint)
        .await
        .unwrap()
        .expect("mint");
    let mint_state = StateWithExtensions::<MintState>::unpack(&mint_acc.data).unwrap();
    assert!(mint_state.get_extension::<NonTransferable>().is_ok());
}

#[tokio::test]
async fn non_transferable_token_transfer_rejected() {
    let mut ctx = start().await;
    let admin = ctx.payer.insecure_clone();
    let issuer = Keypair::new();
    let holder = Keypair::new();
    let impostor = Keypair::new();
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
        vec![system_instruction::transfer(
            &admin.pubkey(),
            &impostor.pubkey(),
            500_000_000,
        )],
        &[&admin],
    )
    .await
    .unwrap();
    let from_ata = get_associated_token_address_with_program_id(
        &holder.pubkey(),
        &env.mint,
        &spl_token_2022::id(),
    );
    let to_ata = get_associated_token_address_with_program_id(
        &impostor.pubkey(),
        &env.mint,
        &spl_token_2022::id(),
    );
    let create_dest = spl_associated_token_account::instruction::create_associated_token_account(
        &payer,
        &impostor.pubkey(),
        &env.mint,
        &spl_token_2022::id(),
    );
    send(&mut ctx, vec![create_dest], &[]).await.unwrap();
    let transfer_ix = token_ix::transfer_checked(
        &spl_token_2022::id(),
        &from_ata,
        &env.mint,
        &to_ata,
        &holder.pubkey(),
        &[],
        1,
        0,
    )
    .unwrap();
    assert!(send(&mut ctx, vec![transfer_ix], &[&holder]).await.is_err());
}

#[tokio::test]
async fn relying_party_consumption_records_on_chain_state() {
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
    let acc = ctx
        .banks_client
        .get_account(consumption)
        .await
        .unwrap()
        .expect("consumption ledger");
    assert_eq!(acc.owner, CONSUMER_ID);
    assert_eq!(acc.data[8 + 32 + 32 + 32], 1); // consumed bool
}

#[tokio::test]
async fn consume_after_revoke_fails_while_token_balance_remains() {
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
    let message = status_update_message(
        env.receipt,
        env.payload,
        h32(11),
        h32(12),
        h32(13),
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
    refresh_blockhash(&mut ctx).await;
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
}

#[tokio::test]
async fn duplicate_relying_party_consumption_rejected() {
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
    let ix = consume_entitlement_ix(payer, &holder, &env);
    send(&mut ctx, vec![ix.clone()], &[&holder]).await.unwrap();
    refresh_blockhash(&mut ctx).await;
    assert!(send(&mut ctx, vec![ix], &[&holder]).await.is_err());
}

// --- BUILD #980 independent relying-party security hardening ---

#[tokio::test]
async fn build980_caller_selected_policy_rejected() {
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

    let alt_admin = Keypair::new();
    send(
        &mut ctx,
        vec![system_instruction::transfer(&admin.pubkey(), &alt_admin.pubkey(), 500_000_000)],
        &[&admin],
    )
    .await
    .unwrap();
    send(
        &mut ctx,
        vec![initialize_trusted_config_ix(
            payer,
            &alt_admin,
            admin.pubkey(),
            env.partner,
            h32(99),
            env.application,
        )],
        &[&alt_admin],
    )
    .await
    .unwrap();
    let (rogue_config, _) = trusted_config_pda(&alt_admin.pubkey());
    assert!(
        send(
            &mut ctx,
            vec![consume_entitlement_ix_with_config(payer, &holder, &env, rogue_config)],
            &[&holder],
        )
        .await
        .is_err()
    );
}

#[tokio::test]
async fn build980_foreign_registry_consumption_rejected() {
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

    let (registry_b, _) = registry_pda(&holder.pubkey());
    let mut foreign = env.clone();
    foreign.registry = registry_b;
    assert!(
        send(
            &mut ctx,
            vec![consume_entitlement_ix(payer, &holder, &foreign)],
            &[&holder],
        )
        .await
        .is_err()
    );
}

#[tokio::test]
async fn build980_untrusted_application_hash_rejected() {
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
        vec![update_trusted_config_ix(&admin, 2, env.partner, env.policy, h32(77))],
        &[&admin],
    )
    .await
    .unwrap();
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
async fn build980_substituted_commitment_rejected() {
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
    let other_receipt = h32(88);
    let (fake_commitment, _) = commitment_pda(&env.registry, &other_receipt);
    let mut forged = env.clone();
    forged.commitment = fake_commitment;
    assert!(
        send(
            &mut ctx,
            vec![consume_entitlement_ix(payer, &holder, &forged)],
            &[&holder],
        )
        .await
        .is_err()
    );
}

#[tokio::test]
async fn build980_unauthorized_config_update_rejected() {
    let mut ctx = start().await;
    let admin = ctx.payer.insecure_clone();
    let issuer = Keypair::new();
    let holder = Keypair::new();
    let _env =
        setup_harness_with_entitlement_mint(&mut ctx, &admin, &issuer, &holder, &admin).await;
    let impostor = Keypair::new();
    send(
        &mut ctx,
        vec![system_instruction::transfer(&admin.pubkey(), &impostor.pubkey(), 500_000_000)],
        &[&admin],
    )
    .await
    .unwrap();
    let (trusted_config, _) = trusted_config_pda(&admin.pubkey());
    assert!(
        send(
            &mut ctx,
            vec![Instruction {
                program_id: CONSUMER_ID,
                accounts: abraxas_proof_entitlement_consumer::accounts::UpdateTrustedConfig {
                    admin: impostor.pubkey(),
                    trusted_config,
                }
                .to_account_metas(None),
                data: abraxas_proof_entitlement_consumer::instruction::UpdateTrustedConfig {
                    next_config_version: 2,
                    partner_hash: h32(1),
                    policy_hash: h32(2),
                    application_hash: h32(3),
                }
                .data(),
            }],
            &[&impostor],
        )
        .await
        .is_err()
    );
}

#[tokio::test]
async fn build980_wrong_trusted_config_pda_rejected() {
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
    let stranger = Keypair::new();
    let (wrong_config, _) = trusted_config_pda(&stranger.pubkey());
    assert!(
        send(
            &mut ctx,
            vec![consume_entitlement_ix_with_config(payer, &holder, &env, wrong_config)],
            &[&holder],
        )
        .await
        .is_err()
    );
}

#[tokio::test]
async fn build980_revoked_entitlement_consumption_rejected() {
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
    let message = status_update_message(
        env.receipt,
        env.payload,
        h32(11),
        h32(12),
        h32(13),
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
async fn build980_expired_entitlement_consumption_rejected() {
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
    let mut clock = ctx.banks_client.get_sysvar::<solana_sdk::clock::Clock>().await.unwrap();
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


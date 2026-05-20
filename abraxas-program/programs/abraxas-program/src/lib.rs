// FILE: programs/verification/src/lib.rs
// Full Anchor program for Abraxas Verification Certificates.
// mint_certificate + revoke_certificate + update_risk_score
// Deploy: anchor build && anchor deploy --provider.cluster mainnet-beta

use anchor_lang::prelude::*;

declare_id!("ABRAXASverify1111111111111111111111111111111");

#[program]
pub mod abraxas_verification {
    use super::*;

    /// Mint a cryptographic Verification Certificate (single source of truth)
    pub fn mint_certificate(
        ctx: Context<MintCertificate>,
        params: CertificateParams,
    ) -> Result<()> {
        let cert  = &mut ctx.accounts.certificate;
        let clock = Clock::get()?;

        cert.asset_id          = params.asset_id;
        cert.verifier          = ctx.accounts.verifier.key();
        cert.provenance_root   = params.provenance_root;
        cert.custody_ref       = params.custody_ref;
        cert.collateral_score  = params.collateral_score;
        cert.fraud_risk        = params.fraud_risk;
        cert.issued_at         = clock.unix_timestamp;
        cert.valid_until       = params.valid_until
            .unwrap_or(clock.unix_timestamp + 31_536_000); // 1 year default
        cert.revoked           = false;
        cert.revoked_at        = None;
        cert.revocation_reason = String::new();

        emit!(CertificateMinted {
            certificate_id:  cert.key(),
            asset_id:        params.asset_id,
            verifier:        ctx.accounts.verifier.key(),
            collateral_score: params.collateral_score,
        });

        Ok(())
    }

    /// Revoke a certificate (verifier only)
    pub fn revoke_certificate(
        ctx: Context<RevokeCertificate>,
        reason: String,
    ) -> Result<()> {
        let cert = &mut ctx.accounts.certificate;
        require_keys_eq!(
            cert.verifier,
            ctx.accounts.verifier.key(),
            ErrorCode::Unauthorized
        );

        cert.revoked           = true;
        cert.revoked_at        = Some(Clock::get()?.unix_timestamp);
        cert.revocation_reason = reason.clone();

        emit!(CertificateRevoked {
            certificate_id: cert.key(),
            reason,
        });

        Ok(())
    }

    /// Update collateral score and fraud risk (verifier only)
    pub fn update_risk_score(
        ctx: Context<UpdateRiskScore>,
        new_collateral_score: u8,
        new_fraud_risk: u8,
    ) -> Result<()> {
        let cert = &mut ctx.accounts.certificate;
        require_keys_eq!(
            cert.verifier,
            ctx.accounts.verifier.key(),
            ErrorCode::Unauthorized
        );

        cert.collateral_score = new_collateral_score;
        cert.fraud_risk       = new_fraud_risk;

        emit!(RiskScoreUpdated {
            certificate_id:      cert.key(),
            new_collateral_score,
            new_fraud_risk,
        });

        Ok(())
    }
}

// ── Account contexts ──────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct MintCertificate<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + 400,
        seeds = [b"certificate", params.asset_id.as_ref()],
        bump,
    )]
    pub certificate:    Account<'info, VerificationCertificate>,
    #[account(mut)]
    pub payer:          Signer<'info>,
    pub verifier:       Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeCertificate<'info> {
    #[account(mut)]
    pub certificate: Account<'info, VerificationCertificate>,
    pub verifier:    Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateRiskScore<'info> {
    #[account(mut)]
    pub certificate: Account<'info, VerificationCertificate>,
    pub verifier:    Signer<'info>,
}

// ── On-chain account ──────────────────────────────────────────────────────────

#[account]
pub struct VerificationCertificate {
    pub asset_id:          Pubkey,       // 32
    pub verifier:          Pubkey,       // 32
    pub provenance_root:   [u8; 32],     // 32  — Merkle root of provenance records
    pub custody_ref:       [u8; 32],     // 32  — SHA-256 of custody vault reference
    pub collateral_score:  u8,           // 1
    pub fraud_risk:        u8,           // 1
    pub issued_at:         i64,          // 8
    pub valid_until:       i64,          // 8
    pub revoked:           bool,         // 1
    pub revoked_at:        Option<i64>,  // 9
    pub revocation_reason: String,       // 4 + up to 200 chars
}

// ── Params ───────────────────────────────────────────────────────────────────

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CertificateParams {
    pub asset_id:         Pubkey,
    pub provenance_root:  [u8; 32],
    pub custody_ref:      [u8; 32],
    pub collateral_score: u8,
    pub fraud_risk:       u8,
    pub valid_until:      Option<i64>,
}

// ── Events ───────────────────────────────────────────────────────────────────

#[event]
pub struct CertificateMinted {
    pub certificate_id:   Pubkey,
    pub asset_id:         Pubkey,
    pub verifier:         Pubkey,
    pub collateral_score: u8,
}

#[event]
pub struct CertificateRevoked {
    pub certificate_id: Pubkey,
    pub reason:         String,
}

#[event]
pub struct RiskScoreUpdated {
    pub certificate_id:      Pubkey,
    pub new_collateral_score: u8,
    pub new_fraud_risk:       u8,
}

// ── Errors ───────────────────────────────────────────────────────────────────

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized: caller is not the certificate verifier")]
    Unauthorized,
}
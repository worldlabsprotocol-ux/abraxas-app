// FILE: programs/cards/src/errors.rs
use anchor_lang::prelude::*;

#[error_code]
pub enum CardsError {
    #[msg("Unauthorized: signer is not vault authority")]
    Unauthorized,
    #[msg("Admin only: signer is not vault admin")]
    AdminOnly,
    #[msg("Vault is paused")]
    VaultPaused,
    #[msg("Circuit already triggered")]
    CircuitAlreadyTriggered,
    #[msg("Invalid risk signal: must be 0–255")]
    InvalidRiskSignal,
    #[msg("Insufficient balance")]
    InsufficientBalance,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Invalid duel ID")]
    InvalidDuelId,
    #[msg("Duel record already exists")]
    DuelAlreadyExists,
}
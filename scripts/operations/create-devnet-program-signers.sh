#!/usr/bin/env bash
# Run once on the authorized persistent Ubuntu operator host. Never run in CI.
# Requires an already mounted durable backup volume and an operator GPG key.
# Example (replace the mount and fingerprint; only the public IDs are printed):
# ABRAXAS_DEVNET_SIGNER_BACKUP_DIR=/mnt/abraxas-encrypted-backup \
# ABRAXAS_DEVNET_BACKUP_GPG_RECIPIENT=<full-40-or-64-hex-fingerprint> \
# bash scripts/operations/create-devnet-program-signers.sh
set -euo pipefail
umask 077

fail() { printf '%s\n' "$1" >&2; exit 1; }
[[ -z "${CI:-}" && -z "${GITHUB_ACTIONS:-}" ]] || fail 'Refusing to create signers in CI.'
command -v solana-keygen >/dev/null || fail 'solana-keygen is required.'
command -v gpg >/dev/null || fail 'gpg is required for encrypted durable backup.'
command -v mountpoint >/dev/null || fail 'mountpoint is required.'

key_dir="${ABRAXAS_DEVNET_SIGNER_DIR:-$HOME/.config/abraxas/devnet-programs}"
backup_dir="${ABRAXAS_DEVNET_SIGNER_BACKUP_DIR:-}"
recipient="${ABRAXAS_DEVNET_BACKUP_GPG_RECIPIENT:-}"
[[ "$key_dir" = /* && "$backup_dir" = /* ]] || fail 'Absolute signer and backup directories are required.'
[[ "$recipient" =~ ^[[:xdigit:]]{40}$|^[[:xdigit:]]{64}$ ]] || fail 'A full GPG recipient fingerprint is required.'
[[ ! -L "$key_dir" && ! -L "$backup_dir" ]] || fail 'Symlink directories are not accepted.'
mountpoint -q -- "$backup_dir" || fail 'Backup directory must be a mounted durable volume.'
[[ -w "$backup_dir" ]] || fail 'Backup volume is not writable.'
gpg --list-keys "$recipient" >/dev/null 2>&1 || fail 'Backup recipient public key is unavailable.'
gpg --list-secret-keys "$recipient" >/dev/null 2>&1 || fail 'Backup recipient decryption key is unavailable for restore check.'

mkdir -p -- "$key_dir"
chmod 700 -- "$key_dir"
key_dir="$(realpath -e -- "$key_dir")"
backup_dir="$(realpath -e -- "$backup_dir")"
[[ "$key_dir" != "$backup_dir" && "$key_dir" != "$backup_dir"/* ]] || fail 'Signer files must not live on the backup volume.'
[[ "$key_dir" != /tmp/* && "$key_dir" != /run/* && "$key_dir" != /dev/shm/* ]] || fail 'Signer directory must be persistent.'
if git -C "$key_dir" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  fail 'Signer directory must be outside every Git worktree.'
fi
if git -C "$backup_dir" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  fail 'Backup directory must be outside every Git worktree.'
fi

proof="$key_dir/abraxas-proof-continuity-devnet.json"
consumer="$key_dir/abraxas-entitlement-consumer-devnet.json"
proof_backup="$backup_dir/abraxas-proof-continuity-devnet.json.gpg"
consumer_backup="$backup_dir/abraxas-entitlement-consumer-devnet.json.gpg"

if [[ -e "$proof" || -e "$consumer" || -e "$proof_backup" || -e "$consumer_backup" ]]; then
  [[ -f "$proof" && -f "$consumer" && -f "$proof_backup" && -f "$consumer_backup" ]] ||
    fail 'Partial existing signer or backup set: stop and reconcile; no key will be replaced.'
else
  # --silent suppresses recovery phrase output; --force is deliberately absent.
  solana-keygen new --silent --no-bip39-passphrase --outfile "$proof" >/dev/null
  solana-keygen new --silent --no-bip39-passphrase --outfile "$consumer" >/dev/null
  chmod 600 -- "$proof" "$consumer"
  gpg --batch --encrypt --recipient "$recipient" --output "$proof_backup" "$proof"
  gpg --batch --encrypt --recipient "$recipient" --output "$consumer_backup" "$consumer"
  chmod 600 -- "$proof_backup" "$consumer_backup"
fi

[[ "$(stat -c %a -- "$proof")" = 600 && "$(stat -c %a -- "$consumer")" = 600 ]] || fail 'Signer permissions are unsafe.'
[[ "$(gpg --quiet --decrypt "$proof_backup" | sha256sum | cut -d ' ' -f 1)" = "$(sha256sum "$proof" | cut -d ' ' -f 1)" ]] ||
  fail 'Proof signer backup differs from the retained signer.'
[[ "$(gpg --quiet --decrypt "$consumer_backup" | sha256sum | cut -d ' ' -f 1)" = "$(sha256sum "$consumer" | cut -d ' ' -f 1)" ]] ||
  fail 'Consumer signer backup differs from the retained signer.'
printf 'proof_continuity_public_id=%s\n' "$(solana-keygen pubkey "$proof")"
printf 'entitlement_consumer_public_id=%s\n' "$(solana-keygen pubkey "$consumer")"
printf '%s\n' 'Both signer files and encrypted backups remain in operator custody. Share only the two public IDs.'

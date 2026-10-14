#!/usr/bin/env bash
# Create host evidence/backup dirs for portable sovereign runtime (mode 700).
set -euo pipefail
EVIDENCE="${SOVEREIGN_EVIDENCE_HOST_PATH:-./data/evidence}"
BACKUP="${SOVEREIGN_BACKUP_HOST_PATH:-./data/backups}"
mkdir -p "$EVIDENCE" "$BACKUP"
chmod 700 "$EVIDENCE" "$BACKUP"
echo "Created $EVIDENCE and $BACKUP (mode 700)"

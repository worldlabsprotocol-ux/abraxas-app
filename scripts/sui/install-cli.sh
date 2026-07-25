#!/usr/bin/env bash
# Install Sui CLI into project .sui-bin (Linux cloud / CI).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BIN="$ROOT/.sui-bin"
VERSION="${SUI_CLI_VERSION:-testnet-v1.76.0}"
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64) SUI_ARCH="x86_64" ;;
  aarch64|arm64) SUI_ARCH="aarch64" ;;
  *) echo "Unsupported arch: $ARCH"; exit 1 ;;
esac

URL="https://github.com/MystenLabs/sui/releases/download/${VERSION}/sui-${VERSION}-ubuntu-${SUI_ARCH}.tgz"

mkdir -p "$BIN"
if [[ -x "$BIN/sui" ]]; then
  echo "✓ Sui CLI already installed: $($BIN/sui --version)"
  exit 0
fi

echo "→ Downloading $URL"
curl -fL "$URL" -o /tmp/sui-cli.tgz
tar xzf /tmp/sui-cli.tgz -C "$BIN" --strip-components=1
echo "✓ $($BIN/sui --version)"

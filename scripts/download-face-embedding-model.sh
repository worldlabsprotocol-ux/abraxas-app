#!/usr/bin/env bash
# FILE: scripts/download-face-embedding-model.sh
# Downloads the ArcFace ONNX embedding model used by Abraxas Verify face match.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${ABRAXAS_FACE_EMBEDDING_MODEL:-$ROOT/models/mobilefacenet.onnx}"
mkdir -p "$(dirname "$DEST")"

if [[ -f "$DEST" ]]; then
  echo "Model already present: $DEST"
  exit 0
fi

URL="${ABRAXAS_FACE_EMBEDDING_MODEL_URL:-https://huggingface.co/onnx-community/arcface-onnx/resolve/main/arcface.onnx}"
echo "Downloading face embedding model to $DEST"
curl -fsSL "$URL" -o "$DEST"
echo "Done ($(du -h "$DEST" | cut -f1))"

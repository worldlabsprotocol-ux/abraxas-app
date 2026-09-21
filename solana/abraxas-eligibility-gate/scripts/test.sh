# Isolated Anchor workspace. Local/reference only. Not deployed to devnet or Mainnet.

cd "$(dirname "$0")/.."
cargo test --workspace -- --nocapture

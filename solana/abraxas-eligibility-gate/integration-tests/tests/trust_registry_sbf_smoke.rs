//! Build #536 — optional BPF artifact smoke (skipped when `.so` missing).
use std::path::Path;

#[test]
fn sbf_artifact_present_when_built() {
    let so = Path::new(env!("CARGO_MANIFEST_DIR")).join("../target/deploy/abraxas_trust_registry.so");
    if !so.exists() {
        eprintln!("SKIP: BPF artifact missing at {}", so.display());
        return;
    }
    let meta = std::fs::metadata(&so).expect("stat so");
    assert!(meta.len() > 10_000, "artifact unexpectedly small");
}

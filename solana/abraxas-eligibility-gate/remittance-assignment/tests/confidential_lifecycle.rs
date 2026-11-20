//! Full confidential lifecycle requires the zk-elgamal proof program in the test VM.

#[tokio::test]
#[ignore = "requires zk_elgamal_proof + spl_token_confidential_transfer_proof programs in ProgramTest"]
async fn confidential_transfer_lifecycle_not_run_in_default_ci() {
    panic!(
        "Intentionally ignored in default CI: run with ZK programs wired per README to execute deposit/transfer/withdraw lifecycle"
    );
}
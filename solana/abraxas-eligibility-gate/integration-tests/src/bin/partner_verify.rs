//! Partner journey CLI: recorded claims → structural snapshot check → optional RPC attestation.
use abraxas_eligibility_gate_integration_tests::entitlement_partner::{
    authenticated_chain_report, evidence_snapshots_are_authenticated_chain_proof,
    execution_report, independent_passes_authorized_journey, independent_passes_revoked_journey,
    is_authenticated_chain_proof, load_artifact, resolve_authenticated_chain,
    structural_verification_report, verify_structural_semantic_from_evidence,
    PartnerJourneyArtifact,
};
use std::env;

fn main() {
    let path = env::args().nth(1).unwrap_or_else(|| {
        eprintln!(
            "usage: partner-verify <artifact.json|authorized|revoked>\n\
             1) Untrusted execution report (JSON claims)\n\
             2) Structural/semantic verification of embedded offline snapshots\n\
             3) Authenticated on-chain verification via PARTNER_VERIFY_RPC_URL (optional)"
        );
        std::process::exit(2);
    });
    let artifact: PartnerJourneyArtifact = if path == "authorized" {
        load_artifact(
            abraxas_eligibility_gate_integration_tests::entitlement_partner::ARTIFACT_REL,
        )
        .expect("load authorized artifact — run partner_acceptance tests first")
    } else if path == "revoked" {
        load_artifact(
            abraxas_eligibility_gate_integration_tests::entitlement_partner::ARTIFACT_REVOKE_REL,
        )
        .expect("load revoked artifact — run partner_acceptance tests first")
    } else {
        let bytes = std::fs::read(&path).expect("read artifact");
        serde_json::from_slice::<PartnerJourneyArtifact>(&bytes).expect("parse artifact")
    };

    println!("{}", execution_report(&artifact));

    let Some(evidence) = &artifact.partner_evidence else {
        eprintln!("\nStructural verification SKIPPED (no partner_evidence).");
        eprintln!("Authenticated on-chain verification NOT PERFORMED.");
        std::process::exit(2);
    };

    if evidence_snapshots_are_authenticated_chain_proof(evidence) {
        eprintln!("internal error: snapshots misclassified as chain proof");
        std::process::exit(1);
    }

    let structural = match verify_structural_semantic_from_evidence(evidence) {
        Ok(r) => r,
        Err(e) => {
            eprintln!("\nStructural verification error: {e}");
            std::process::exit(1);
        }
    };
    println!("\n{}", structural_verification_report(&structural));

    let rpc_url = env::var("PARTNER_VERIFY_RPC_URL").ok();
    let auth = resolve_authenticated_chain(evidence, rpc_url.as_deref());
    println!("\n{}", authenticated_chain_report(&auth));

    let structural_journey_ok = if structural.consumption_consumed {
        independent_passes_authorized_journey(&structural)
    } else {
        independent_passes_revoked_journey(&structural)
    };

    if !structural_journey_ok {
        eprintln!("\nStructural verification FAILED for this journey shape.");
        std::process::exit(1);
    }

  if is_authenticated_chain_proof(&auth) {
        println!("\nSummary: structural/semantic PASS; authenticated on-chain PASS (RPC).");
        return;
    }

    println!("\nSummary: structural/semantic PASS for offline snapshots.");
    println!("Authenticated on-chain: NOT ESTABLISHED (expected for local ProgramTest JSON).");
    println!("Authoritative acceptance: run ProgramTest `partner_acceptance` (BanksClient), not this file alone.");
}
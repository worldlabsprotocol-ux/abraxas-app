//! CLI: partner journey — untrusted execution report + independent evidence verification.
use abraxas_eligibility_gate_integration_tests::entitlement_partner::{
    execution_report, independent_passes_authorized_journey, independent_passes_revoked_journey,
    independent_verification_report, load_artifact,
    verify_independent_from_evidence, PartnerJourneyArtifact,
};
use std::env;

fn main() {
    let path = env::args().nth(1).unwrap_or_else(|| {
        eprintln!(
            "usage: partner-verify <artifact.json|authorized|revoked>\n\
             Prints an untrusted execution report, then independently re-verifies embedded account evidence."
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
        eprintln!("\n=== INDEPENDENT RE-VERIFICATION ===");
        eprintln!("SKIPPED: artifact has no partner_evidence snapshots.");
        eprintln!("This file is an execution report only, not independently verified proof.");
        std::process::exit(2);
    };

    let report = match verify_independent_from_evidence(evidence) {
        Ok(r) => r,
        Err(e) => {
            eprintln!("\nIndependent verification error: {e}");
            std::process::exit(1);
        }
    };
    println!("\n{}", independent_verification_report(&report));

    let ok = if report.consumption_consumed {
        independent_passes_authorized_journey(&report)
    } else {
        independent_passes_revoked_journey(&report)
    };

    if !ok {
        eprintln!("\nIndependent verification FAILED (JSON flags ignored).");
        std::process::exit(1);
    }
    println!("\nIndependent verification PASSED (derived from account evidence only).");
}
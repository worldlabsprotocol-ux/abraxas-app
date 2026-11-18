//! CLI: verify partner journey artifact (no Abraxas hosted UI).
use abraxas_eligibility_gate_integration_tests::entitlement_partner::{
    cli_report, load_artifact, is_revoked_artifact, PartnerJourneyArtifact,
};
use std::env;

fn main() {
    let path = env::args()
        .nth(1)
        .unwrap_or_else(|| {
            eprintln!(
                "usage: partner-verify <artifact.json|authorized|revoked>\n\
                 If authorized|revoked, reads committed BUILD #981 examples artifacts."
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
    println!("{}", cli_report(&artifact));
    if path == "revoked" || is_revoked_artifact(&artifact) {
        if artifact.token_balance != 1 || artifact.consumption_recorded {
            eprintln!("revoked journey invariant failed");
            std::process::exit(1);
        }
        if artifact.independent_verification_ok {
            eprintln!("revoked journey must not pass independent verification");
            std::process::exit(1);
        }
    } else if !artifact.independent_verification_ok {
        eprintln!("authorized journey failed independent verification flag");
        std::process::exit(1);
    }
}
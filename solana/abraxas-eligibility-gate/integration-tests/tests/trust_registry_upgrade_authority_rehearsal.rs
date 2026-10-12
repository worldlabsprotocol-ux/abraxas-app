//! Build #537 — Upgradeable loader id + ProgramData enum variant rehearsal (local).

use solana_sdk::bpf_loader_upgradeable::{self, UpgradeableLoaderState};

#[test]
fn upgradeable_loader_programdata_variant_rehearsal() {
    assert!(!bpf_loader_upgradeable::id().to_string().is_empty());
    let authority = solana_sdk::pubkey::Pubkey::new_unique();
    let state = UpgradeableLoaderState::ProgramData {
        slot: 100,
        upgrade_authority_address: Some(authority),
    };
    match state {
        UpgradeableLoaderState::ProgramData {
            upgrade_authority_address,
            slot,
        } => {
            assert_eq!(slot, 100);
            assert_eq!(upgrade_authority_address, Some(authority));
        }
        other => panic!("unexpected state: {:?}", other),
    }
    let revoked = UpgradeableLoaderState::ProgramData {
        slot: 100,
        upgrade_authority_address: None,
    };
    match revoked {
        UpgradeableLoaderState::ProgramData {
            upgrade_authority_address,
            ..
        } => assert!(upgrade_authority_address.is_none()),
        other => panic!("unexpected state: {:?}", other),
    }
}

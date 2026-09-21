pragma solidity ^0.8.24;

import {AbraxasPartnerEligibilityGate} from "../src/AbraxasPartnerEligibilityGate.sol";

interface Vm {
    function addr(uint256 privateKey) external returns (address);
}

/// @dev Byte-for-byte match with TypeScript CONFORMANCE_VECTOR_FIELDS digest.
contract VerifierConformanceVectorsTest {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    bytes32 internal constant TS_DIGEST = 0xd050ffa43c9809816cc88a42c586ef46908e04e18b888c9bea05088eec03d8a1;

    function _cfg() internal returns (AbraxasPartnerEligibilityGate.GateConfig memory) {
        return AbraxasPartnerEligibilityGate.GateConfig({
            trustedSigner: vm.addr(0xA11CE),
            trustedSignerKeyId: keccak256("evm-attestation-test-1"),
            partnerHash: keccak256("conformance-partner"),
            networkId: keccak256("evm_sepolia"),
            policyHash: keccak256("conformance-policy:1"),
            actionHash: keccak256("activate_protocol_access:sandbox:protocol_access"),
            environment: keccak256("sandbox"),
            requireSubjectBinding: true,
            requireInstitutionalBinding: true
        });
    }

    function test_typescriptIssuedDigestMatchesFoundry() public {
        AbraxasPartnerEligibilityGate gate = new AbraxasPartnerEligibilityGate(_cfg());
        AbraxasPartnerEligibilityGate.ChainEligibilityAttestation memory att;
        att.schemaVersion = 2;
        att.networkId = keccak256("evm_sepolia");
        att.partnerHash = keccak256("conformance-partner");
        att.policyHash = keccak256("conformance-policy:1");
        att.actionHash = keccak256("activate_protocol_access:sandbox:protocol_access");
        att.subjectHash = keccak256("subject-binding");
        att.issuedAt = 1_700_000_000;
        att.expiresAt = 2_000_000_000;
        att.nonce = keccak256("nonce-conformance-1");
        att.attestationId = keccak256("attestation-conformance-1");
        att.environment = keccak256("sandbox");
        att.signerKeyId = keccak256("evm-attestation-test-1");
        att.organizationCommitment = keccak256("org-commitment");
        att.actorCommitment = keccak256("actor-commitment");
        att.institutionalResultCategory = keccak256("organization_eligible");
        bytes32 domain = keccak256(
            abi.encode(
                gate.DOMAIN_TYPEHASH(),
                keccak256(bytes("AbraxasEligibilityVerifier")),
                keccak256(bytes("2")),
                uint256(11155111),
                address(0x1111111111111111111111111111111111111111),
                keccak256("conformance-partner")
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domain, gate.hashAttestation(att)));
        require(digest == TS_DIGEST);
    }
}

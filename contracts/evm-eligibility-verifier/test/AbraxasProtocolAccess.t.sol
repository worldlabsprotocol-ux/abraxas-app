pragma solidity ^0.8.24;

import {AbraxasPartnerEligibilityGate} from "../src/AbraxasPartnerEligibilityGate.sol";
import {AbraxasProtocolAccess} from "../src/AbraxasProtocolAccess.sol";

interface Vm {
    function addr(uint256 privateKey) external returns (address);
    function sign(uint256 privateKey, bytes32 digest) external returns (uint8 v, bytes32 r, bytes32 s);
    function expectRevert(bytes4 selector) external;
    function chainId(uint256 newChainId) external;
    function deal(address who, uint256 amount) external;
    function warp(uint256 newTimestamp) external;
}

/// @dev Presentation-shaped result (hashes only) → EIP-712 attestation → gate consume → activate_protocol_access once.
contract AbraxasProtocolAccessTest {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    AbraxasPartnerEligibilityGate internal gate;
    AbraxasProtocolAccess internal protocol;
    uint256 internal signerPk = 0xA11CE;
    address internal signer;
    bytes32 internal partnerHash = keccak256("partner-acme");
    bytes32 internal networkId = keccak256("evm_sandbox");
    bytes32 internal policyHash = keccak256("policy");
    bytes32 internal actionHash = keccak256(abi.encodePacked("activate_protocol_access", bytes1(0), "sandbox:protocol_access"));
    bytes32 internal signerKeyId = keccak256("key-1");
    bytes32 internal environment = keccak256("sandbox");
    bytes32 internal subjectHash = keccak256("opaque-subject");

    function setUp() public {
        signer = vm.addr(signerPk);
        gate = new AbraxasPartnerEligibilityGate(_cfg(signer, signerKeyId, partnerHash, true));
        protocol = new AbraxasProtocolAccess(gate);
    }

    function _cfg(
        address trusted,
        bytes32 keyId,
        bytes32 partner,
        bool requireSubject
    ) internal view returns (AbraxasPartnerEligibilityGate.GateConfig memory) {
        return AbraxasPartnerEligibilityGate.GateConfig({
            trustedSigner: trusted,
            trustedSignerKeyId: keyId,
            partnerHash: partner,
            networkId: networkId,
            policyHash: policyHash,
            actionHash: actionHash,
            environment: environment,
            requireSubjectBinding: requireSubject
        });
    }

    function _att() internal view returns (AbraxasPartnerEligibilityGate.ChainEligibilityAttestation memory att) {
        att.schemaVersion = 1;
        att.networkId = networkId;
        att.partnerHash = partnerHash;
        att.policyHash = policyHash;
        att.actionHash = actionHash;
        att.subjectHash = subjectHash;
        att.issuedAt = uint64(block.timestamp);
        att.expiresAt = uint64(block.timestamp + 600);
        att.nonce = keccak256("nonce-protocol-1");
        att.attestationId = keccak256("att-protocol-1");
        att.environment = environment;
        att.signerKeyId = signerKeyId;
    }

    function _sign(
        AbraxasPartnerEligibilityGate.ChainEligibilityAttestation memory att,
        uint256 pk,
        AbraxasPartnerEligibilityGate target
    ) internal returns (bytes memory) {
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", target.domainSeparator(), target.hashAttestation(att)));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }

    function test_happyPathActivateOnce() public {
        AbraxasPartnerEligibilityGate.ChainEligibilityAttestation memory att = _att();
        bytes memory sig = _sign(att, signerPk, gate);
        require(protocol.activateProtocolAccess(att, sig));
        require(protocol.accessGranted(subjectHash));
        require(gate.consumedNonces(att.nonce));
    }

    function test_replayEntitlementReverts() public {
        AbraxasPartnerEligibilityGate.ChainEligibilityAttestation memory att = _att();
        bytes memory sig = _sign(att, signerPk, gate);
        protocol.activateProtocolAccess(att, sig);
        vm.expectRevert(AbraxasProtocolAccess.AttestationReplayed.selector);
        protocol.activateProtocolAccess(att, sig);
    }

    function test_secondAttestationSameSubjectReverts() public {
        AbraxasPartnerEligibilityGate.ChainEligibilityAttestation memory att = _att();
        bytes memory sig = _sign(att, signerPk, gate);
        protocol.activateProtocolAccess(att, sig);
        att.nonce = keccak256("nonce-protocol-2");
        att.attestationId = keccak256("att-protocol-2");
        sig = _sign(att, signerPk, gate);
        vm.expectRevert(AbraxasProtocolAccess.AlreadyGranted.selector);
        protocol.activateProtocolAccess(att, sig);
    }

    function test_expiryReverts() public {
        AbraxasPartnerEligibilityGate.ChainEligibilityAttestation memory att = _att();
        att.expiresAt = uint64(block.timestamp);
        bytes memory sig = _sign(att, signerPk, gate);
        vm.expectRevert(AbraxasPartnerEligibilityGate.Expired.selector);
        protocol.activateProtocolAccess(att, sig);
    }

    function test_wrongPartnerPolicyActionEnvironment() public {
        AbraxasPartnerEligibilityGate.ChainEligibilityAttestation memory att = _att();
        att.partnerHash = keccak256("other-partner");
        bytes memory sig = _sign(att, signerPk, gate);
        vm.expectRevert(AbraxasProtocolAccess.BindingMismatch.selector);
        protocol.activateProtocolAccess(att, sig);

        att = _att();
        att.policyHash = keccak256("other-policy");
        sig = _sign(att, signerPk, gate);
        vm.expectRevert(AbraxasProtocolAccess.BindingMismatch.selector);
        protocol.activateProtocolAccess(att, sig);

        att = _att();
        att.actionHash = keccak256("other-action");
        sig = _sign(att, signerPk, gate);
        vm.expectRevert(AbraxasProtocolAccess.BindingMismatch.selector);
        protocol.activateProtocolAccess(att, sig);

        att = _att();
        att.environment = keccak256("production");
        sig = _sign(att, signerPk, gate);
        vm.expectRevert(AbraxasProtocolAccess.BindingMismatch.selector);
        protocol.activateProtocolAccess(att, sig);
    }

    function test_wrongDomainAndChain() public {
        AbraxasPartnerEligibilityGate.ChainEligibilityAttestation memory att = _att();
        bytes memory sig = _sign(att, signerPk, gate);
        vm.chainId(999);
        vm.expectRevert(AbraxasPartnerEligibilityGate.UnknownSigner.selector);
        protocol.activateProtocolAccess(att, sig);
    }

    function test_wrongGateRejects() public {
        AbraxasPartnerEligibilityGate other = new AbraxasPartnerEligibilityGate(_cfg(signer, signerKeyId, partnerHash, true));
        AbraxasPartnerEligibilityGate.ChainEligibilityAttestation memory att = _att();
        bytes memory sig = _sign(att, signerPk, other);
        vm.expectRevert(AbraxasPartnerEligibilityGate.UnknownSigner.selector);
        protocol.activateProtocolAccess(att, sig);
    }

    function test_missingSubjectBinding() public {
        AbraxasPartnerEligibilityGate.ChainEligibilityAttestation memory att = _att();
        att.subjectHash = bytes32(0);
        bytes memory sig = _sign(att, signerPk, gate);
        vm.expectRevert(AbraxasProtocolAccess.SubjectRequired.selector);
        protocol.activateProtocolAccess(att, sig);
    }

    function test_directEthBypassReverts() public {
        vm.deal(address(this), 1 ether);
        vm.expectRevert(AbraxasProtocolAccess.ExecutionRejected.selector);
        (bool sent,) = address(protocol).call{value: 1}("");
        sent;
        vm.expectRevert(AbraxasProtocolAccess.ExecutionRejected.selector);
        (bool sent2,) = address(protocol).call{value: 0}(hex"01");
        sent2;
    }

    function test_cannotCallGateBypassToGrant() public {
        AbraxasPartnerEligibilityGate.ChainEligibilityAttestation memory att = _att();
        bytes memory sig = _sign(att, signerPk, gate);
        require(gate.consumeEligibility(att, sig));
        require(!protocol.accessGranted(subjectHash));
        vm.expectRevert(AbraxasPartnerEligibilityGate.Replayed.selector);
        protocol.activateProtocolAccess(att, sig);
    }
}

pragma solidity ^0.8.24;

import {AbraxasEligibilityVerifier} from "../src/AbraxasEligibilityVerifier.sol";

interface Vm {
    function addr(uint256 privateKey) external returns (address);
    function sign(uint256 privateKey, bytes32 digest) external returns (uint8 v, bytes32 r, bytes32 s);
    function expectRevert(bytes4 selector) external;
    function chainId(uint256 newChainId) external;
}

contract AbraxasEligibilityVerifierTest {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    AbraxasEligibilityVerifier internal verifier;
    uint256 internal signerPk = 0xA11CE;
    address internal signer;
    bytes32 internal partnerHash = keccak256("partner-acme");

    function setUp() public {
        signer = vm.addr(signerPk);
        verifier = new AbraxasEligibilityVerifier(partnerHash, signer);
        verifier.setExpectedBindings(
            keccak256("evm_sandbox"),
            keccak256("policy"),
            keccak256("action"),
            keccak256("sandbox"),
            false
        );
    }

    function _att() internal view returns (AbraxasEligibilityVerifier.ChainEligibilityAttestation memory att) {
        att.schemaVersion = 2;
        att.networkId = keccak256("evm_sandbox");
        att.partnerHash = partnerHash;
        att.policyHash = keccak256("policy");
        att.actionHash = keccak256("action");
        att.subjectHash = bytes32(0);
        att.issuedAt = uint64(block.timestamp);
        att.expiresAt = uint64(block.timestamp + 600);
        att.nonce = keccak256("nonce-1");
        att.attestationId = keccak256("att-1");
        att.environment = keccak256("sandbox");
        att.signerKeyId = keccak256("key-1");
    }

    function _sign(AbraxasEligibilityVerifier.ChainEligibilityAttestation memory att, uint256 pk)
        internal
        returns (bytes memory)
    {
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", verifier.domainSeparator(), verifier.hashAttestation(att)));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }

    function test_validSignatureAuthorizes() public {
        AbraxasEligibilityVerifier.ChainEligibilityAttestation memory att = _att();
        bytes memory sig = _sign(att, signerPk);
        require(verifier.verifyEligibility(att, sig));
    }

    function test_unknownSignerReverts() public {
        AbraxasEligibilityVerifier.ChainEligibilityAttestation memory att = _att();
        bytes memory sig = _sign(att, uint256(0xB0B));
        vm.expectRevert(AbraxasEligibilityVerifier.UnknownSigner.selector);
        verifier.verifyEligibility(att, sig);
    }

    function test_signerRotation() public {
        address next = vm.addr(uint256(0xB0B));
        verifier.setTrustedSigner(next);
        AbraxasEligibilityVerifier.ChainEligibilityAttestation memory att = _att();
        bytes memory oldSig = _sign(att, signerPk);
        vm.expectRevert(AbraxasEligibilityVerifier.UnknownSigner.selector);
        verifier.verifyEligibility(att, oldSig);
        bytes memory newSig = _sign(att, uint256(0xB0B));
        require(verifier.verifyEligibility(att, newSig));
    }

    function test_nonceReplayReverts() public {
        AbraxasEligibilityVerifier.ChainEligibilityAttestation memory att = _att();
        bytes memory sig = _sign(att, signerPk);
        verifier.verifyEligibility(att, sig);
        vm.expectRevert(AbraxasEligibilityVerifier.Replayed.selector);
        verifier.verifyEligibility(att, sig);
    }

    function test_expiryReverts() public {
        AbraxasEligibilityVerifier.ChainEligibilityAttestation memory att = _att();
        att.expiresAt = uint64(block.timestamp - 1);
        bytes memory sig = _sign(att, signerPk);
        vm.expectRevert(AbraxasEligibilityVerifier.Expired.selector);
        verifier.verifyEligibility(att, sig);
    }

    function test_partnerMismatch() public {
        AbraxasEligibilityVerifier.ChainEligibilityAttestation memory att = _att();
        att.partnerHash = keccak256("other");
        bytes memory sig = _sign(att, signerPk);
        vm.expectRevert(AbraxasEligibilityVerifier.BindingMismatch.selector);
        verifier.verifyEligibility(att, sig);
    }

    function test_policyMismatch() public {
        AbraxasEligibilityVerifier.ChainEligibilityAttestation memory att = _att();
        att.policyHash = keccak256("other-policy");
        bytes memory sig = _sign(att, signerPk);
        vm.expectRevert(AbraxasEligibilityVerifier.BindingMismatch.selector);
        verifier.verifyEligibility(att, sig);
    }

    function test_actionMismatch() public {
        AbraxasEligibilityVerifier.ChainEligibilityAttestation memory att = _att();
        att.actionHash = keccak256("other-action");
        bytes memory sig = _sign(att, signerPk);
        vm.expectRevert(AbraxasEligibilityVerifier.BindingMismatch.selector);
        verifier.verifyEligibility(att, sig);
    }

    function test_wrongChainDomain() public {
        AbraxasEligibilityVerifier.ChainEligibilityAttestation memory att = _att();
        bytes memory sig = _sign(att, signerPk);
        vm.chainId(999);
        vm.expectRevert(AbraxasEligibilityVerifier.UnknownSigner.selector);
        verifier.verifyEligibility(att, sig);
    }

    function test_requiredSubject() public {
        verifier.setExpectedBindings(
            keccak256("evm_sandbox"),
            keccak256("policy"),
            keccak256("action"),
            keccak256("sandbox"),
            true
        );
        AbraxasEligibilityVerifier.ChainEligibilityAttestation memory att = _att();
        bytes memory missing = _sign(att, signerPk);
        vm.expectRevert(AbraxasEligibilityVerifier.SubjectRequired.selector);
        verifier.verifyEligibility(att, missing);
        att.subjectHash = keccak256("wallet-binding");
        bytes memory present = _sign(att, signerPk);
        require(verifier.verifyEligibility(att, present));
    }

    function test_optionalSubjectZeroOk() public {
        AbraxasEligibilityVerifier.ChainEligibilityAttestation memory att = _att();
        bytes memory sig = _sign(att, signerPk);
        require(verifier.verifyEligibility(att, sig));
    }

    function test_rejectEthTransfer() public {
        vm.expectRevert(AbraxasEligibilityVerifier.ExecutionRejected.selector);
        (bool sent,) = address(verifier).call{value: 0}("");
        sent;
    }
}

pragma solidity ^0.8.24;

import {AbraxasEligibilityVerifier} from "../src/AbraxasEligibilityVerifier.sol";

interface Vm {
    function addr(uint256 privateKey) external returns (address);
    function sign(uint256 privateKey, bytes32 digest) external returns (uint8 v, bytes32 r, bytes32 s);
    function expectRevert(bytes4 selector) external;
    function chainId(uint256 newChainId) external;
}

contract AbraxasEligibilityVerifierTest {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat codes")))));
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
        att.schemaVersion = 1;
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
        view
        returns (bytes memory)
    {
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", verifier.domainSeparator(), verifier.hashAttestation(att)));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }

    function test_validSignatureAuthorizes() public {
        AbraxasEligibilityVerifier.ChainEligibilityAttestation memory att = _att();
        require(verifier.verifyEligibility(att, _sign(att, signerPk)));
    }

    function test_unknownSignerReverts() public {
        AbraxasEligibilityVerifier.ChainEligibilityAttestation memory att = _att();
        vm.expectRevert(AbraxasEligibilityVerifier.UnknownSigner.selector);
        verifier.verifyEligibility(att, _sign(att, uint256(0xB0B)));
    }

    function test_signerRotation() public {
        address next = vm.addr(uint256(0xB0B));
        verifier.setTrustedSigner(next);
        AbraxasEligibilityVerifier.ChainEligibilityAttestation memory att = _att();
        vm.expectRevert(AbraxasEligibilityVerifier.UnknownSigner.selector);
        verifier.verifyEligibility(att, _sign(att, signerPk));
        require(verifier.verifyEligibility(att, _sign(att, uint256(0xB0B))));
    }

    function test_nonceReplayReverts() public {
        AbraxasEligibilityVerifier.ChainEligibilityAttestation memory att = _att();
        verifier.verifyEligibility(att, _sign(att, signerPk));
        vm.expectRevert(AbraxasEligibilityVerifier.Replayed.selector);
        verifier.verifyEligibility(att, _sign(att, signerPk));
    }

    function test_expiryReverts() public {
        AbraxasEligibilityVerifier.ChainEligibilityAttestation memory att = _att();
        att.expiresAt = uint64(block.timestamp - 1);
        vm.expectRevert(AbraxasEligibilityVerifier.Expired.selector);
        verifier.verifyEligibility(att, _sign(att, signerPk));
    }

    function test_partnerMismatch() public {
        AbraxasEligibilityVerifier.ChainEligibilityAttestation memory att = _att();
        att.partnerHash = keccak256("other");
        vm.expectRevert(AbraxasEligibilityVerifier.BindingMismatch.selector);
        verifier.verifyEligibility(att, _sign(att, signerPk));
    }

    function test_policyMismatch() public {
        AbraxasEligibilityVerifier.ChainEligibilityAttestation memory att = _att();
        att.policyHash = keccak256("other-policy");
        vm.expectRevert(AbraxasEligibilityVerifier.BindingMismatch.selector);
        verifier.verifyEligibility(att, _sign(att, signerPk));
    }

    function test_actionMismatch() public {
        AbraxasEligibilityVerifier.ChainEligibilityAttestation memory att = _att();
        att.actionHash = keccak256("other-action");
        vm.expectRevert(AbraxasEligibilityVerifier.BindingMismatch.selector);
        verifier.verifyEligibility(att, _sign(att, signerPk));
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
        vm.expectRevert(AbraxasEligibilityVerifier.SubjectRequired.selector);
        verifier.verifyEligibility(att, _sign(att, signerPk));
        att.subjectHash = keccak256("wallet-binding");
        require(verifier.verifyEligibility(att, _sign(att, signerPk)));
    }

    function test_optionalSubjectZeroOk() public {
        AbraxasEligibilityVerifier.ChainEligibilityAttestation memory att = _att();
        require(verifier.verifyEligibility(att, _sign(att, signerPk)));
    }

    function test_rejectEthTransfer() public {
        vm.expectRevert(AbraxasEligibilityVerifier.ExecutionRejected.selector);
        (bool sent,) = address(verifier).call{value: 1 ether}("");
        sent;
    }
}

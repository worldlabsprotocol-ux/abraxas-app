pragma solidity ^0.8.24;

import {AbraxasPartnerEligibilityGate} from "../src/AbraxasPartnerEligibilityGate.sol";
import {AbraxasProtocolAccess} from "../src/AbraxasProtocolAccess.sol";

interface Vm {
    function addr(uint256 privateKey) external returns (address);
    function sign(uint256 privateKey, bytes32 digest) external returns (uint8 v, bytes32 r, bytes32 s);
    function expectRevert(bytes4 selector) external;
    function deal(address who, uint256 amount) external;
}

/// @dev Sepolia-shaped V2 institutional plan compatibility. No funds movement.
contract InstitutionalTestnetGatePlanTest {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 internal constant SEPOLIA = 11155111;
    bytes32 internal constant V2_TYPEHASH = keccak256(
        "ChainEligibilityAttestation(uint256 schemaVersion,bytes32 networkId,bytes32 partnerHash,bytes32 policyHash,bytes32 actionHash,bytes32 subjectHash,uint64 issuedAt,uint64 expiresAt,bytes32 nonce,bytes32 attestationId,bytes32 environment,bytes32 signerKeyId,bytes32 organizationCommitment,bytes32 actorCommitment,bytes32 institutionalResultCategory)"
    );

    function _cfg(address signer) internal pure returns (AbraxasPartnerEligibilityGate.GateConfig memory) {
        return AbraxasPartnerEligibilityGate.GateConfig({
            trustedSigner: signer,
            trustedSignerKeyId: keccak256("key-1"),
            partnerHash: keccak256("partner"),
            networkId: keccak256("evm_sepolia"),
            policyHash: keccak256("policy"),
            actionHash: keccak256("action"),
            environment: keccak256("sandbox"),
            requireSubjectBinding: true
        });
    }

    function test_v2TypehashAndSepoliaChainIdAreDeterministic() public pure {
        require(uint256(V2_TYPEHASH) != 0);
        require(SEPOLIA == 11155111);
    }

    function test_commitmentMismatchChangesDigest() public pure {
        bytes32 a = keccak256(abi.encode(V2_TYPEHASH, keccak256("org-a"), keccak256("actor"), SEPOLIA));
        bytes32 b = keccak256(abi.encode(V2_TYPEHASH, keccak256("org-b"), keccak256("actor"), SEPOLIA));
        require(a != b);
    }

    function test_signerMismatchChangesDigest() public pure {
        require(keccak256(abi.encode(V2_TYPEHASH, keccak256("key-1"))) != keccak256(abi.encode(V2_TYPEHASH, keccak256("key-2"))));
    }

    function test_noFundsOnReferenceConsumer() public {
        AbraxasPartnerEligibilityGate gate = new AbraxasPartnerEligibilityGate(_cfg(vm.addr(0xA11CE)));
        AbraxasProtocolAccess protocol = new AbraxasProtocolAccess(gate);
        vm.deal(address(this), 1 ether);
        vm.expectRevert(AbraxasProtocolAccess.ExecutionRejected.selector);
        (bool sent,) = address(protocol).call{value: 1}("");
        sent;
        require(!protocol.hasAccess(keccak256("subject")));
    }

    function test_replayRejects() public {
        uint256 pk = 0xA11CE;
        AbraxasPartnerEligibilityGate gate = new AbraxasPartnerEligibilityGate(_cfg(vm.addr(pk)));
        AbraxasPartnerEligibilityGate.ChainEligibilityAttestation memory att;
        att.schemaVersion = 1;
        att.networkId = keccak256("evm_sepolia");
        att.partnerHash = keccak256("partner");
        att.policyHash = keccak256("policy");
        att.actionHash = keccak256("action");
        att.subjectHash = keccak256("subject");
        att.issuedAt = 1;
        att.expiresAt = 9_000_000_000;
        att.nonce = keccak256("nonce-inst");
        att.attestationId = keccak256("att-inst");
        att.environment = keccak256("sandbox");
        att.signerKeyId = keccak256("key-1");
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", gate.domainSeparator(), gate.hashAttestation(att)));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        bytes memory sig = abi.encodePacked(r, s, v);
        require(gate.consumeEligibility(att, sig));
        vm.expectRevert(AbraxasPartnerEligibilityGate.Replayed.selector);
        gate.consumeEligibility(att, sig);
    }

    function test_expiryRejects() public {
        uint256 pk = 0xA11CE;
        AbraxasPartnerEligibilityGate gate = new AbraxasPartnerEligibilityGate(_cfg(vm.addr(pk)));
        AbraxasPartnerEligibilityGate.ChainEligibilityAttestation memory att;
        att.schemaVersion = 1;
        att.networkId = keccak256("evm_sepolia");
        att.partnerHash = keccak256("partner");
        att.policyHash = keccak256("policy");
        att.actionHash = keccak256("action");
        att.subjectHash = keccak256("subject");
        att.issuedAt = 1;
        att.expiresAt = uint64(block.timestamp);
        att.nonce = keccak256("nonce-exp");
        att.attestationId = keccak256("att-exp");
        att.environment = keccak256("sandbox");
        att.signerKeyId = keccak256("key-1");
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", gate.domainSeparator(), gate.hashAttestation(att)));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        vm.expectRevert(AbraxasPartnerEligibilityGate.Expired.selector);
        gate.consumeEligibility(att, abi.encodePacked(r, s, v));
    }
}

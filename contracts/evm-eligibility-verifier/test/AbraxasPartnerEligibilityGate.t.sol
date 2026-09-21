pragma solidity ^0.8.24;

import {AbraxasPartnerEligibilityGate} from "../src/AbraxasPartnerEligibilityGate.sol";
import {AbraxasPartnerEligibilityConsumer} from "../src/AbraxasPartnerEligibilityConsumer.sol";
import {DeployPartnerGate} from "../script/DeployPartnerGate.s.sol";

interface Vm {
    function addr(uint256 privateKey) external returns (address);
    function sign(uint256 privateKey, bytes32 digest) external returns (uint8 v, bytes32 r, bytes32 s);
    function expectRevert(bytes4 selector) external;
    function chainId(uint256 newChainId) external;
    function deal(address who, uint256 amount) external;
    function warp(uint256 newTimestamp) external;
    function prank(address msgSender) external;
    function expectEmit(bool checkTopic1, bool checkTopic2, bool checkTopic3, bool checkData) external;
}

contract AbraxasPartnerEligibilityGateTest {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    event TrustedSignerAdded(bytes32 indexed keyId, address indexed account);
    event TrustedSignerRetired(bytes32 indexed keyId, address indexed account);
    event TrustedSignerRevoked(bytes32 indexed keyId, address indexed account);

    AbraxasPartnerEligibilityGate internal gate;
    AbraxasPartnerEligibilityConsumer internal consumer;
    uint256 internal signerPk = 0xA11CE;
    address internal signer;
    bytes32 internal partnerHash = keccak256("partner-acme");
    bytes32 internal networkId = keccak256("evm_sandbox");
    bytes32 internal policyHash = keccak256("policy");
    bytes32 internal actionHash = keccak256("action");
    bytes32 internal signerKeyId = keccak256("key-1");
    bytes32 internal environment = keccak256("sandbox");

    function setUp() public {
        signer = vm.addr(signerPk);
        gate = new AbraxasPartnerEligibilityGate(_cfg(signer, signerKeyId, partnerHash, false));
        consumer = new AbraxasPartnerEligibilityConsumer(gate);
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
            requireSubjectBinding: requireSubject,
            requireInstitutionalBinding: false
        });
    }

    function _att() internal view returns (AbraxasPartnerEligibilityGate.ChainEligibilityAttestation memory att) {
        att.schemaVersion = 2;
        att.networkId = networkId;
        att.partnerHash = partnerHash;
        att.policyHash = policyHash;
        att.actionHash = actionHash;
        att.subjectHash = bytes32(0);
        att.issuedAt = uint64(block.timestamp);
        att.expiresAt = uint64(block.timestamp + 600);
        att.nonce = keccak256("nonce-1");
        att.attestationId = keccak256("att-1");
        att.environment = environment;
        att.signerKeyId = keccak256("key-1");
    }

    function _sign(AbraxasPartnerEligibilityGate.ChainEligibilityAttestation memory att, uint256 pk, AbraxasPartnerEligibilityGate target)
        internal
        returns (bytes memory)
    {
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", target.domainSeparator(), target.hashAttestation(att)));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }

    function test_validConsume() public {
        AbraxasPartnerEligibilityGate.ChainEligibilityAttestation memory att = _att();
        bytes memory sig = _sign(att, signerPk, gate);
        require(gate.consumeEligibility(att, sig));
        require(gate.consumedNonces(att.nonce));
    }

    function test_replayReverts() public {
        AbraxasPartnerEligibilityGate.ChainEligibilityAttestation memory att = _att();
        bytes memory sig = _sign(att, signerPk, gate);
        gate.consumeEligibility(att, sig);
        vm.expectRevert(AbraxasPartnerEligibilityGate.Replayed.selector);
        gate.consumeEligibility(att, sig);
    }

    function test_expiryReverts() public {
        AbraxasPartnerEligibilityGate.ChainEligibilityAttestation memory att = _att();
        att.expiresAt = uint64(block.timestamp);
        bytes memory sig = _sign(att, signerPk, gate);
        vm.expectRevert(AbraxasPartnerEligibilityGate.Expired.selector);
        gate.consumeEligibility(att, sig);
        att = _att();
        att.expiresAt = uint64(block.timestamp + 10);
        sig = _sign(att, signerPk, gate);
        vm.warp(block.timestamp + 11);
        vm.expectRevert(AbraxasPartnerEligibilityGate.Expired.selector);
        gate.consumeEligibility(att, sig);
    }

    function test_wrongSignerReverts() public {
        AbraxasPartnerEligibilityGate.ChainEligibilityAttestation memory att = _att();
        bytes memory sig = _sign(att, uint256(0xB0B), gate);
        vm.expectRevert(AbraxasPartnerEligibilityGate.UnknownSigner.selector);
        gate.consumeEligibility(att, sig);
    }

    function test_wrongPartnerPolicyActionEnvironment() public {
        AbraxasPartnerEligibilityGate.ChainEligibilityAttestation memory att = _att();
        att.partnerHash = keccak256("other");
        bytes memory sig = _sign(att, signerPk, gate);
        vm.expectRevert(AbraxasPartnerEligibilityGate.BindingMismatch.selector);
        gate.consumeEligibility(att, sig);

        att = _att();
        att.policyHash = keccak256("other-policy");
        sig = _sign(att, signerPk, gate);
        vm.expectRevert(AbraxasPartnerEligibilityGate.BindingMismatch.selector);
        gate.consumeEligibility(att, sig);

        att = _att();
        att.actionHash = keccak256("other-action");
        sig = _sign(att, signerPk, gate);
        vm.expectRevert(AbraxasPartnerEligibilityGate.BindingMismatch.selector);
        gate.consumeEligibility(att, sig);

        att = _att();
        att.environment = keccak256("production");
        sig = _sign(att, signerPk, gate);
        vm.expectRevert(AbraxasPartnerEligibilityGate.BindingMismatch.selector);
        gate.consumeEligibility(att, sig);
    }

    function test_wrongChainAndWrongGateDomain() public {
        AbraxasPartnerEligibilityGate.ChainEligibilityAttestation memory att = _att();
        bytes memory sig = _sign(att, signerPk, gate);
        vm.chainId(999);
        vm.expectRevert(AbraxasPartnerEligibilityGate.UnknownSigner.selector);
        gate.consumeEligibility(att, sig);

        AbraxasPartnerEligibilityGate other = new AbraxasPartnerEligibilityGate(
            _cfg(signer, signerKeyId, partnerHash, false)
        );
        att = _att();
        bytes memory otherSig = _sign(att, signerPk, other);
        vm.expectRevert(AbraxasPartnerEligibilityGate.UnknownSigner.selector);
        gate.consumeEligibility(att, otherSig);
    }

    function test_requiredWalletMismatch() public {
        AbraxasPartnerEligibilityGate requiredGate = new AbraxasPartnerEligibilityGate(
            _cfg(signer, signerKeyId, partnerHash, true)
        );
        AbraxasPartnerEligibilityGate.ChainEligibilityAttestation memory att = _att();
        bytes memory missing = _sign(att, signerPk, requiredGate);
        vm.expectRevert(AbraxasPartnerEligibilityGate.SubjectRequired.selector);
        requiredGate.consumeEligibility(att, missing);
        att.subjectHash = keccak256("wallet-binding");
        bytes memory present = _sign(att, signerPk, requiredGate);
        require(requiredGate.consumeEligibility(att, present));
    }

    function test_malformedSignature() public {
        AbraxasPartnerEligibilityGate.ChainEligibilityAttestation memory att = _att();
        vm.expectRevert(AbraxasPartnerEligibilityGate.MalformedSignature.selector);
        gate.consumeEligibility(att, hex"aaaa");
        bytes memory badV = new bytes(65);
        badV[64] = bytes1(uint8(29));
        vm.expectRevert(AbraxasPartnerEligibilityGate.MalformedSignature.selector);
        gate.consumeEligibility(att, badV);
    }

    function test_consumerAcceptsOnceAndRejectsReplay() public {
        AbraxasPartnerEligibilityGate.ChainEligibilityAttestation memory att = _att();
        bytes memory sig = _sign(att, signerPk, gate);
        require(consumer.recordNamedAction(att, sig));
        require(consumer.lastAccepted());
        require(consumer.lastAttestationRef() == att.attestationId);
        vm.expectRevert(AbraxasPartnerEligibilityGate.Replayed.selector);
        consumer.recordNamedAction(att, sig);
    }

    function test_consumerRejectsOtherPartnerActionPolicy() public {
        AbraxasPartnerEligibilityGate other = new AbraxasPartnerEligibilityGate(
            _cfg(signer, signerKeyId, keccak256("other-partner"), false)
        );
        AbraxasPartnerEligibilityConsumer otherConsumer = new AbraxasPartnerEligibilityConsumer(other);
        AbraxasPartnerEligibilityGate.ChainEligibilityAttestation memory att = _att();
        bytes memory sig = _sign(att, signerPk, gate);
        vm.expectRevert(AbraxasPartnerEligibilityGate.BindingMismatch.selector);
        otherConsumer.recordNamedAction(att, sig);
    }

    function test_noPayableOrTransferSurface() public {
        vm.deal(address(this), 1 ether);
        vm.expectRevert(AbraxasPartnerEligibilityGate.ExecutionRejected.selector);
        (bool sent,) = address(gate).call{value: 1}("");
        sent;
        vm.expectRevert(AbraxasPartnerEligibilityConsumer.ExecutionRejected.selector);
        (bool sent2,) = address(consumer).call{value: 1}("");
        sent2;
        vm.expectRevert(AbraxasPartnerEligibilityGate.ExecutionRejected.selector);
        (bool sent3,) = address(gate).call{value: 0}(hex"deadbeef");
        sent3;
    }

    function test_create2PredictionMatchesDeploy() public {
        DeployPartnerGate factory = new DeployPartnerGate();
        AbraxasPartnerEligibilityGate.GateConfig memory config = _cfg(signer, signerKeyId, partnerHash, false);
        bytes32 salt = keccak256("local-test-salt");
        bytes memory initCode = abi.encodePacked(type(AbraxasPartnerEligibilityGate).creationCode, abi.encode(config));
        address predicted = address(uint160(uint256(keccak256(abi.encodePacked(
            bytes1(0xff),
            address(factory),
            salt,
            keccak256(initCode)
        )))));
        AbraxasPartnerEligibilityGate deployed = factory.deploy(salt, config);
        require(address(deployed) == predicted);
        require(address(deployed) == factory.predictCreate2(salt, initCode));
    }

    function test_constructorRejectsZeroConfig() public {
        vm.expectRevert(AbraxasPartnerEligibilityGate.InvalidConfig.selector);
        new AbraxasPartnerEligibilityGate(_cfg(address(0), signerKeyId, partnerHash, false));
    }

    function test_ownerOnlyRotationRejectsZeroAndDuplicate() public {
        bytes32 nextKey = keccak256("key-2");
        uint256 nextPk = 0xB0B;
        address nextSigner = vm.addr(nextPk);
        vm.prank(address(0xBEEF));
        vm.expectRevert(AbraxasPartnerEligibilityGate.NotOwner.selector);
        gate.addTrustedSigner(nextKey, nextSigner);

        vm.expectRevert(AbraxasPartnerEligibilityGate.UnknownSigner.selector);
        gate.addTrustedSigner(nextKey, address(0));

        vm.expectEmit(true, true, false, true);
        emit TrustedSignerAdded(nextKey, nextSigner);
        gate.addTrustedSigner(nextKey, nextSigner);

        vm.expectRevert(AbraxasPartnerEligibilityGate.DuplicateSigner.selector);
        gate.addTrustedSigner(nextKey, nextSigner);
        vm.expectRevert(AbraxasPartnerEligibilityGate.DuplicateSigner.selector);
        gate.addTrustedSigner(keccak256("key-3"), signer);
    }

    function test_retiringOverlapAndNonceReplayAfterRotation() public {
        bytes32 nextKey = keccak256("key-2");
        uint256 nextPk = 0xB0B;
        address nextSigner = vm.addr(nextPk);
        gate.addTrustedSigner(nextKey, nextSigner);

        AbraxasPartnerEligibilityGate.ChainEligibilityAttestation memory att = _att();
        bytes memory sig = _sign(att, signerPk, gate);
        require(gate.consumeEligibility(att, sig));

        vm.expectEmit(true, true, false, true);
        emit TrustedSignerRetired(signerKeyId, signer);
        gate.retireTrustedSigner(signerKeyId);

        AbraxasPartnerEligibilityGate.ChainEligibilityAttestation memory retiringAtt = _att();
        retiringAtt.nonce = keccak256("nonce-retiring");
        retiringAtt.attestationId = keccak256("att-retiring");
        bytes memory retiringSig = _sign(retiringAtt, signerPk, gate);
        require(gate.consumeEligibility(retiringAtt, retiringSig));

        vm.expectRevert(AbraxasPartnerEligibilityGate.Replayed.selector);
        gate.consumeEligibility(att, sig);

        AbraxasPartnerEligibilityGate.ChainEligibilityAttestation memory nextAtt = _att();
        nextAtt.nonce = keccak256("nonce-next");
        nextAtt.attestationId = keccak256("att-next");
        nextAtt.signerKeyId = nextKey;
        bytes memory nextSig = _sign(nextAtt, nextPk, gate);
        require(gate.consumeEligibility(nextAtt, nextSig));
    }

    function test_revokedSignerCannotVerify() public {
        AbraxasPartnerEligibilityGate.ChainEligibilityAttestation memory att = _att();
        att.nonce = keccak256("nonce-revoke");
        bytes memory sig = _sign(att, signerPk, gate);
        vm.expectEmit(true, true, false, true);
        emit TrustedSignerRevoked(signerKeyId, signer);
        gate.revokeTrustedSigner(signerKeyId);
        vm.expectRevert(AbraxasPartnerEligibilityGate.UnknownSigner.selector);
        gate.consumeEligibility(att, sig);
    }
}

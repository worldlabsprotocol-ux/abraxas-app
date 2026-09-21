// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AbraxasPartnerEligibilityGate} from "./AbraxasPartnerEligibilityGate.sol";

/// @title AbraxasProtocolAccess
/// @notice Partner-owned reference consumer for `activate_protocol_access`.
/// @dev Local/sandbox Foundry reference only. Never transfers tokens, mints,
///      approves spending, routes orders, settles payments, custodies funds,
///      or makes arbitrary external calls. Not a generic execution router.
contract AbraxasProtocolAccess {
    bytes32 public constant ACTION_NAME = keccak256("activate_protocol_access");

    AbraxasPartnerEligibilityGate public immutable gate;
    mapping(bytes32 => bool) public accessGranted;
    mapping(bytes32 => bool) public consumedAttestationRefs;

    event ProtocolAccessActivated(bytes32 indexed subjectHash, bytes32 indexed attestationRef);

    error GateRejected();
    error AlreadyGranted();
    error AttestationReplayed();
    error SubjectRequired();
    error BindingMismatch();
    error ExecutionRejected();
    error WrongGate();

    constructor(AbraxasPartnerEligibilityGate gate_) {
        if (address(gate_) == address(0)) revert WrongGate();
        gate = gate_;
    }

    /// @notice Consume a valid gate authorization once and record feature access.
    /// @dev Keyed by the attestation subject hash (required wallet binding or opaque hash).
    function activateProtocolAccess(
        AbraxasPartnerEligibilityGate.ChainEligibilityAttestation calldata att,
        bytes calldata signature
    ) external returns (bool granted) {
        if (att.actionHash != gate.expectedActionHash()) revert BindingMismatch();
        if (att.partnerHash != gate.partnerHash()) revert BindingMismatch();
        if (att.policyHash != gate.expectedPolicyHash()) revert BindingMismatch();
        if (att.environment != gate.expectedEnvironment()) revert BindingMismatch();
        if (att.networkId != gate.expectedNetworkId()) revert BindingMismatch();
        if (gate.requireSubjectBinding() && att.subjectHash == bytes32(0)) revert SubjectRequired();
        if (consumedAttestationRefs[att.attestationId]) revert AttestationReplayed();
        if (accessGranted[att.subjectHash]) revert AlreadyGranted();

        bool authorized = gate.consumeEligibility(att, signature);
        if (!authorized) revert GateRejected();

        consumedAttestationRefs[att.attestationId] = true;
        accessGranted[att.subjectHash] = true;
        emit ProtocolAccessActivated(att.subjectHash, att.attestationId);
        return true;
    }

    receive() external payable {
        revert ExecutionRejected();
    }

    fallback() external payable {
        revert ExecutionRejected();
    }
}

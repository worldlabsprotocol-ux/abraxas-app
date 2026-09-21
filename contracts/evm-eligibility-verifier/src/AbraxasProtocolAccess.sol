// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AbraxasPartnerEligibilityGate} from "./AbraxasPartnerEligibilityGate.sol";

/// @title AbraxasProtocolAccess
/// @notice Partner-owned reference consumer for `activate_protocol_access`.
/// @dev Local/sandbox Foundry reference only. Entitlement is expiry-bound from
///      the verified attestation expiresAt. Never transfers tokens, mints,
///      approves spending, routes orders, settles payments, custodies funds,
///      or makes arbitrary external calls. Not a generic execution router.
contract AbraxasProtocolAccess {
    bytes32 public constant ACTION_NAME = keccak256("activate_protocol_access");

    AbraxasPartnerEligibilityGate public immutable gate;
    mapping(bytes32 => uint64) public validUntil;
    mapping(bytes32 => bool) public consumedAttestationRefs;

    event ProtocolAccessActivated(bytes32 indexed subjectHash, bytes32 indexed attestationRef, uint64 validUntil);

    error GateRejected();
    error AttestationReplayed();
    error StaleAttestation();
    error Inactive();
    error SubjectRequired();
    error BindingMismatch();
    error ExecutionRejected();
    error WrongGate();

    constructor(AbraxasPartnerEligibilityGate gate_) {
        if (address(gate_) == address(0)) revert WrongGate();
        gate = gate_;
    }

    /// @notice True only while block.timestamp is strictly before stored validUntil.
    function hasAccess(bytes32 subjectHash) public view returns (bool) {
        return validUntil[subjectHash] > block.timestamp;
    }

    /// @notice Consume a valid gate authorization once and record expiry-bound access.
    /// @dev validUntil is copied only from att.expiresAt. Callers cannot pass expiry.
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
        uint64 until = att.expiresAt;
        if (validUntil[att.subjectHash] > until) revert StaleAttestation();

        bool authorized = gate.consumeEligibility(att, signature);
        if (!authorized) revert GateRejected();

        consumedAttestationRefs[att.attestationId] = true;
        validUntil[att.subjectHash] = until;
        emit ProtocolAccessActivated(att.subjectHash, att.attestationId, until);
        return hasAccess(att.subjectHash);
    }

    /// @notice Partner-owned access check. Inactive once timestamp reaches validUntil.
    function requireAccess(bytes32 subjectHash) external view {
        if (!hasAccess(subjectHash)) revert Inactive();
    }

    receive() external payable {
        revert ExecutionRejected();
    }

    fallback() external payable {
        revert ExecutionRejected();
    }
}

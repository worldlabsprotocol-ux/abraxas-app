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

    event ProtocolAccessActivated(
        bytes32 indexed subjectHash,
        bytes32 indexed organizationCommitment,
        bytes32 indexed attestationRef,
        uint64 validUntil
    );

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

    function entitlementKey(
        bytes32 subjectHash,
        bytes32 organizationCommitment,
        bytes32 actionHash
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(subjectHash, organizationCommitment, actionHash));
    }

    function accessValidUntil(bytes32 subjectHash) public view returns (uint64) {
        return validUntil[entitlementKey(subjectHash, bytes32(0), gate.expectedActionHash())];
    }

    /// @notice True only while block.timestamp is strictly before stored validUntil.
    /// Personal (zero organization commitment) lookup for the gate action hash.
    function hasAccess(bytes32 subjectHash) public view returns (bool) {
        return hasInstitutionalAccess(subjectHash, bytes32(0), gate.expectedActionHash());
    }

    function hasInstitutionalAccess(
        bytes32 subjectHash,
        bytes32 organizationCommitment,
        bytes32 actionHash
    ) public view returns (bool) {
        return validUntil[entitlementKey(subjectHash, organizationCommitment, actionHash)] > block.timestamp;
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
        bytes32 key = entitlementKey(att.subjectHash, att.organizationCommitment, att.actionHash);
        uint64 until = att.expiresAt;
        if (validUntil[key] > until) revert StaleAttestation();

        bool authorized = gate.consumeEligibility(att, signature);
        if (!authorized) revert GateRejected();

        consumedAttestationRefs[att.attestationId] = true;
        validUntil[key] = until;
        emit ProtocolAccessActivated(att.subjectHash, att.organizationCommitment, att.attestationId, until);
        return hasInstitutionalAccess(att.subjectHash, att.organizationCommitment, att.actionHash);
    }

    /// @notice Partner-owned access check. Inactive once timestamp reaches validUntil.
    function requireAccess(bytes32 subjectHash) external view {
        if (!hasAccess(subjectHash)) revert Inactive();
    }

    function requireInstitutionalAccess(
        bytes32 subjectHash,
        bytes32 organizationCommitment,
        bytes32 actionHash
    ) external view {
        if (!hasInstitutionalAccess(subjectHash, organizationCommitment, actionHash)) revert Inactive();
    }

    receive() external payable {
        revert ExecutionRejected();
    }

    fallback() external payable {
        revert ExecutionRejected();
    }
}

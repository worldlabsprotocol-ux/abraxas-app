// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AbraxasPartnerEligibilityGate} from "./AbraxasPartnerEligibilityGate.sol";

/// @title AbraxasPartnerEligibilityConsumer
/// @notice Reference consumer. Records a test authorization result only.
/// @dev Never transfers tokens, mints, swaps, pays, or makes arbitrary external calls.
contract AbraxasPartnerEligibilityConsumer {
    AbraxasPartnerEligibilityGate public immutable gate;
    bool public lastAccepted;
    bytes32 public lastAttestationRef;
    bytes32 public lastActionHash;

    error GateRejected();
    error ExecutionRejected();

    event NamedActionRecorded(bytes32 indexed attestationRef, bytes32 actionHash);

    constructor(AbraxasPartnerEligibilityGate gate_) {
        gate = gate_;
    }

    function recordNamedAction(
        AbraxasPartnerEligibilityGate.ChainEligibilityAttestation calldata att,
        bytes calldata signature
    ) external returns (bool accepted) {
        bool authorized = gate.consumeEligibility(att, signature);
        if (!authorized) revert GateRejected();
        lastAccepted = true;
        lastAttestationRef = att.attestationId;
        lastActionHash = att.actionHash;
        emit NamedActionRecorded(att.attestationId, att.actionHash);
        return true;
    }

    receive() external payable {
        revert ExecutionRejected();
    }

    fallback() external payable {
        revert ExecutionRejected();
    }
}

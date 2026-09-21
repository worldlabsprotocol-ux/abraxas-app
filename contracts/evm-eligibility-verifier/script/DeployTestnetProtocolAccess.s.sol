// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AbraxasPartnerEligibilityGate} from "../src/AbraxasPartnerEligibilityGate.sol";
import {AbraxasProtocolAccess} from "../src/AbraxasProtocolAccess.sol";

/// @notice Human-operated EVM testnet deploy helper. Foundry script is never invoked by CI, Vercel, or API routes.
/// Operator supplies RPC and key at the command line: forge script ... --rpc-url $ABRAXAS_GATE_EVM_RPC_URL --private-key $ABRAXAS_GATE_EVM_PRIVATE_KEY --broadcast
contract DeployTestnetProtocolAccess {
    error HumanConfirmRequired();

    function deploy(
        bool confirm,
        AbraxasPartnerEligibilityGate.GateConfig memory config
    ) public returns (AbraxasPartnerEligibilityGate gate, AbraxasProtocolAccess protocol) {
        if (!confirm) revert HumanConfirmRequired();
        gate = new AbraxasPartnerEligibilityGate(config);
        protocol = new AbraxasProtocolAccess(gate);
    }
}

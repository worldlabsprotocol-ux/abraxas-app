// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AbraxasPartnerEligibilityGate} from "../src/AbraxasPartnerEligibilityGate.sol";

/// @notice Local/reference CREATE2 helper. Does not imply Abraxas deploys the gate.
/// RPC URL and deployer key are supplied by the human operator at run time only.
contract DeployPartnerGate {
    error MissingRpc();

    function predictCreate2(bytes32 salt, bytes memory initCode) public view returns (address) {
        return address(uint160(uint256(keccak256(abi.encodePacked(
            bytes1(0xff),
            address(this),
            salt,
            keccak256(initCode)
        )))));
    }

    function deploy(bytes32 salt, AbraxasPartnerEligibilityGate.GateConfig memory config)
        public
        returns (AbraxasPartnerEligibilityGate gate)
    {
        gate = new AbraxasPartnerEligibilityGate{salt: salt}(config);
    }
}

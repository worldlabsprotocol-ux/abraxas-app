pragma solidity ^0.8.24;

import {AbraxasPartnerEligibilityGate} from "../src/AbraxasPartnerEligibilityGate.sol";
import {DeployTestnetProtocolAccess} from "../script/DeployTestnetProtocolAccess.s.sol";

interface Vm {
    function expectRevert(bytes4 selector) external;
    function addr(uint256 privateKey) external returns (address);
}

contract DeployTestnetProtocolAccessTest {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function test_humanConfirmRequired() public {
        DeployTestnetProtocolAccess helper = new DeployTestnetProtocolAccess();
        AbraxasPartnerEligibilityGate.GateConfig memory cfg;
        cfg.trustedSigner = vm.addr(1);
        cfg.trustedSignerKeyId = keccak256("k");
        cfg.partnerHash = keccak256("p");
        cfg.networkId = keccak256("evm_sepolia");
        cfg.policyHash = keccak256("pol");
        cfg.actionHash = keccak256("a");
        cfg.environment = keccak256("sandbox");
        cfg.requireSubjectBinding = true;
        vm.expectRevert(DeployTestnetProtocolAccess.HumanConfirmRequired.selector);
        helper.deploy(false, cfg);
    }
}

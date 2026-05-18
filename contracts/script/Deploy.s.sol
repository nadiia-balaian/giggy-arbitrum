// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {TaskEscrow} from "../src/TaskEscrow.sol";
import {IERC20} from "../src/IERC20.sol";

/// Deploys TaskEscrow.
/// Required env: PRIVATE_KEY, USDC_ADDRESS, AGENT_ADDRESS
/// Run: forge script script/Deploy.s.sol --rpc-url $ARBITRUM_SEPOLIA_RPC --broadcast --verify
contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address usdc = vm.envAddress("USDC_ADDRESS");
        address agent = vm.envAddress("AGENT_ADDRESS");

        vm.startBroadcast(deployerKey);
        TaskEscrow escrow = new TaskEscrow(IERC20(usdc), agent);
        vm.stopBroadcast();

        console2.log("TaskEscrow deployed at:", address(escrow));
        console2.log("Token:", usdc);
        console2.log("Agent:", agent);
    }
}

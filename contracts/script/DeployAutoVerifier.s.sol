// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {AutoVerifier} from "../src/AutoVerifier.sol";

/// Deploys AutoVerifier.
/// Required env: PRIVATE_KEY (deployer), SCORER_ADDRESS
/// Run: forge script script/DeployAutoVerifier.s.sol --rpc-url $ARBITRUM_SEPOLIA_RPC --broadcast --verify
contract DeployAutoVerifier is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address scorer = vm.envAddress("SCORER_ADDRESS");

        vm.startBroadcast(deployerKey);
        AutoVerifier verifier = new AutoVerifier(scorer);
        vm.stopBroadcast();

        console2.log("AutoVerifier deployed at:", address(verifier));
        console2.log("Scorer:", scorer);
    }
}

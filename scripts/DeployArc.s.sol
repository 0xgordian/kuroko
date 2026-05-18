// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/ArcPredictionMarket.sol";

contract DeployArc is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("ARC_DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        ArcPredictionMarket market = new ArcPredictionMarket();
        console.log("ArcPredictionMarket deployed at:", address(market));

        vm.stopBroadcast();
    }
}

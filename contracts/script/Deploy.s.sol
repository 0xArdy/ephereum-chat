// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {MessageEnvelopeRegistry} from "../src/MessageEnvelopeRegistry.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        MessageEnvelopeRegistry registry = new MessageEnvelopeRegistry();
        
        console.log("MessageEnvelopeRegistry deployed to:", address(registry));
        
        vm.stopBroadcast();
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";

import {HookMiner} from "hook-miner/HookMiner.sol";
import {Constants} from "./base/Constants.sol";

import {HookRegistry} from "../src/HookRegistry.sol";
import {OFAHook} from "../src/hooks/OFAHook.sol";
import {BCSHook} from "../src/hooks/BCSHook.sol";
import {PLTHook} from "../src/hooks/PLTHook.sol";
import {SUBAHook} from "../src/hooks/SUBAHook.sol";
import {CALHook} from "../src/hooks/CALHook.sol";

/// @notice Deploy all X Hooks Protocol contracts to X Layer Mainnet (Chain 196).
/// Usage:
///   Dry run: forge script script/DeployAll.s.sol --rpc-url https://rpc.xlayer.tech
///   Broadcast: forge script script/DeployAll.s.sol --rpc-url https://rpc.xlayer.tech \
///              --private-key $PRIVATE_KEY --broadcast --slow
contract DeployAll is Script {
    // -------------------------------------------------------------------------
    // Deploy
    // -------------------------------------------------------------------------
    function run() external {
        require(block.chainid == Constants.X_LAYER_CHAIN_ID, "Must deploy on X Layer Mainnet");

        IPoolManager poolManager = IPoolManager(Constants.POOL_MANAGER);
        address deployer = Constants.CREATE2_DEPLOYER;

        vm.startBroadcast();

        // 1. HookRegistry — no mining needed (no hook flags required)
        HookRegistry registry = new HookRegistry();
        console.log("HookRegistry:", address(registry));

        // 2. OFAHook — BEFORE_SWAP | BEFORE_SWAP_RETURNS_DELTA
        uint160 ofaFlags = uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG);
        (address ofaAddr, bytes32 ofaSalt) = HookMiner.find(
            deployer,
            ofaFlags,
            type(OFAHook).creationCode,
            abi.encode(poolManager, Constants.OFA_AUCTION_THRESHOLD, Constants.OFA_AUCTION_DURATION_BLOCKS)
        );
        OFAHook ofaHook = new OFAHook{salt: ofaSalt}(
            poolManager, Constants.OFA_AUCTION_THRESHOLD, Constants.OFA_AUCTION_DURATION_BLOCKS
        );
        require(address(ofaHook) == ofaAddr, "OFAHook address mismatch");
        console.log("OFAHook:", address(ofaHook));

        // 3. BCSHook — BEFORE_SWAP
        uint160 bcsFlags = uint160(Hooks.BEFORE_SWAP_FLAG);
        (address bcsAddr, bytes32 bcsSalt) =
            HookMiner.find(deployer, bcsFlags, type(BCSHook).creationCode, abi.encode(poolManager));
        BCSHook bcsHook = new BCSHook{salt: bcsSalt}(poolManager);
        require(address(bcsHook) == bcsAddr, "BCSHook address mismatch");
        console.log("BCSHook:", address(bcsHook));

        // 4. PLTHook — AFTER_INITIALIZE | BEFORE_ADD_LIQUIDITY | BEFORE_REMOVE_LIQUIDITY | AFTER_SWAP
        uint160 pltFlags = uint160(
            Hooks.AFTER_INITIALIZE_FLAG | Hooks.BEFORE_ADD_LIQUIDITY_FLAG | Hooks.BEFORE_REMOVE_LIQUIDITY_FLAG
                | Hooks.AFTER_SWAP_FLAG
        );
        (address pltAddr, bytes32 pltSalt) =
            HookMiner.find(deployer, pltFlags, type(PLTHook).creationCode, abi.encode(poolManager));
        PLTHook pltHook = new PLTHook{salt: pltSalt}(poolManager);
        require(address(pltHook) == pltAddr, "PLTHook address mismatch");
        console.log("PLTHook:", address(pltHook));

        // 5. SUBAHook — AFTER_INITIALIZE | BEFORE_SWAP | BEFORE_SWAP_RETURNS_DELTA
        uint160 subaFlags =
            uint160(Hooks.AFTER_INITIALIZE_FLAG | Hooks.BEFORE_SWAP_FLAG | Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG);
        address subaKeeper = msg.sender; // deployer is initial keeper
        (address subaAddr, bytes32 subaSalt) = HookMiner.find(
            deployer,
            subaFlags,
            type(SUBAHook).creationCode,
            abi.encode(poolManager, Constants.SUBA_EPOCH_DURATION_BLOCKS, subaKeeper)
        );
        SUBAHook subaHook = new SUBAHook{salt: subaSalt}(
            poolManager, Constants.SUBA_EPOCH_DURATION_BLOCKS, subaKeeper
        );
        require(address(subaHook) == subaAddr, "SUBAHook address mismatch");
        console.log("SUBAHook:", address(subaHook));

        // 6. CALHook — BEFORE_SWAP | BEFORE_SWAP_RETURNS_DELTA
        uint160 calFlags = uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG);
        (address calAddr, bytes32 calSalt) =
            HookMiner.find(deployer, calFlags, type(CALHook).creationCode, abi.encode(poolManager));
        CALHook calHook = new CALHook{salt: calSalt}(poolManager);
        require(address(calHook) == calAddr, "CALHook address mismatch");
        console.log("CALHook:", address(calHook));

        // ---------------------------------------------------------------
        // Register all hooks in the registry
        // ---------------------------------------------------------------
        bytes32[] memory flags;

        registry.registerHook(
            address(ofaHook),
            HookRegistry.HookType.ORDERFLOW_AUCTION,
            "OFAHook",
            "Orderflow Auction: large swaps trigger N-block solver auction with AMM fallback",
            "1.0.0",
            flags
        );

        registry.registerHook(
            address(bcsHook),
            HookRegistry.HookType.BILATERAL_COMMITMENT,
            "BCSHook",
            "Bilateral Commitment Settlement: two-party OTC deal auto-settles at trigger price",
            "1.0.0",
            flags
        );

        registry.registerHook(
            address(pltHook),
            HookRegistry.HookType.LIQUIDITY_TRANCHING,
            "PLTHook",
            "Programmable Liquidity Tranching: Senior/Junior LP tranches with 70/30 fee waterfall",
            "1.0.0",
            flags
        );

        registry.registerHook(
            address(subaHook),
            HookRegistry.HookType.BATCH_AUCTION,
            "SUBAHook",
            "Sealed-Bid Uniform-Price Batch Auction: all swaps buffered into epochs, settled at uniform price",
            "1.0.0",
            flags
        );

        registry.registerHook(
            address(calHook),
            HookRegistry.HookType.COMMITMENTS_AS_LIQUIDITY,
            "CALHook",
            "Commitments-as-Liquidity: collateral auto-executes as liquidity when price crosses trigger",
            "1.0.0",
            flags
        );

        // Verify all 5 hooks
        registry.verifyHook(address(ofaHook));
        registry.verifyHook(address(bcsHook));
        registry.verifyHook(address(pltHook));
        registry.verifyHook(address(subaHook));
        registry.verifyHook(address(calHook));

        vm.stopBroadcast();

        // ---------------------------------------------------------------
        // Print address table
        // ---------------------------------------------------------------
        console.log("===== X HOOKS PROTOCOL - DEPLOYMENT COMPLETE =====");
        console.log("Chain:         X Layer Mainnet (196)");
        console.log("Deployer:      ", msg.sender);
        console.log("---------------------------------------------------");
        console.log("HookRegistry:  ", address(registry));
        console.log("OFAHook:       ", address(ofaHook));
        console.log("BCSHook:       ", address(bcsHook));
        console.log("PLTHook:       ", address(pltHook));
        console.log("SUBAHook:      ", address(subaHook));
        console.log("CALHook:       ", address(calHook));
        console.log("===================================================");

        // ---------------------------------------------------------------
        // Write deployments JSON
        // ---------------------------------------------------------------
        string memory json = string(
            abi.encodePacked(
                '{\n',
                '  "chainId": 196,\n',
                '  "deployedAt": "',
                vm.toString(block.number),
                '",\n',
                '  "contracts": {\n',
                '    "HookRegistry": "',
                vm.toString(address(registry)),
                '",\n',
                '    "OFAHook": "',
                vm.toString(address(ofaHook)),
                '",\n',
                '    "BCSHook": "',
                vm.toString(address(bcsHook)),
                '",\n',
                '    "PLTHook": "',
                vm.toString(address(pltHook)),
                '",\n',
                '    "SUBAHook": "',
                vm.toString(address(subaHook)),
                '",\n',
                '    "CALHook": "',
                vm.toString(address(calHook)),
                '"\n',
                '  }\n',
                '}'
            )
        );

        vm.writeFile("../deployments/xlayer-mainnet.json", json);
        console.log("Deployments written to deployments/xlayer-mainnet.json");
    }
}

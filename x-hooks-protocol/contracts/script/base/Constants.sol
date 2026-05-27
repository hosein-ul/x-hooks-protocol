// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title Constants — X Hooks Protocol deployment & configuration constants.
/// @notice Network: X Layer Mainnet (Chain ID 196).
library Constants {
    // ---------------------------------------------------------------------
    // Network / canonical addresses
    // ---------------------------------------------------------------------
    uint256 internal constant X_LAYER_CHAIN_ID = 196;

    address internal constant POOL_MANAGER = 0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32;
    address internal constant POSITION_MANAGER = 0xcF1EAFC6928dC385A342E7C6491d371d2871458b;
    address internal constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;
    address internal constant CREATE2_DEPLOYER = 0x4e59b44847b379578588920cA78FbF26c0B4956C;

    // ---------------------------------------------------------------------
    // OFAHook params
    // ---------------------------------------------------------------------
    uint256 internal constant OFA_AUCTION_THRESHOLD = 1000e18;
    uint256 internal constant OFA_AUCTION_DURATION_BLOCKS = 5;

    // ---------------------------------------------------------------------
    // SUBAHook params
    // ---------------------------------------------------------------------
    uint256 internal constant SUBA_EPOCH_DURATION_BLOCKS = 10;
}

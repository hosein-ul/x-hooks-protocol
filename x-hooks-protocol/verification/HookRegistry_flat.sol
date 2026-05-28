// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// src/HookRegistry.sol

/// @title HookRegistry — On-chain catalog of deployed X Hooks Protocol contracts
/// @notice Anyone can register a hook. The owner can verify/deactivate hooks.
/// Pools can be linked to hooks for discoverability.
contract HookRegistry {
    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------
    error NotOwner();
    error HookAlreadyRegistered();
    error HookNotRegistered();

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------
    event HookRegistered(address indexed hookAddress, HookType hookType, address indexed deployer);
    event HookVerified(address indexed hookAddress);
    event HookDeactivated(address indexed hookAddress);
    event PoolLinked(bytes32 indexed poolId, address indexed hookAddress, string label);
    event InteractionRecorded(address indexed hookAddress, uint256 totalInteractions);

    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------
    enum HookType {
        ORDERFLOW_AUCTION,      // 0
        BILATERAL_COMMITMENT,   // 1
        LIQUIDITY_TRANCHING,    // 2
        BATCH_AUCTION,          // 3
        COMMITMENTS_AS_LIQUIDITY // 4
    }

    struct HookInfo {
        address hookAddress;
        HookType hookType;
        string name;
        string description;
        string version;
        address deployer;
        uint256 deployedAt;
        bool isVerified;
        bool isActive;
        uint256 totalPoolsUsing;
        uint256 totalInteractions;
    }

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------
    address public owner;
    address[] private _allHooks;
    mapping(address => HookInfo) private _hooks;
    mapping(address => bool) private _registered;
    mapping(address => bytes32[]) private _hookPools;
    mapping(HookType => address[]) private _byType;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // -------------------------------------------------------------------------
    // Registration
    // -------------------------------------------------------------------------
    function registerHook(
        address hookAddress,
        HookType hookType,
        string calldata name,
        string calldata description,
        string calldata version,
        bytes32[] calldata /* flags */
    ) external {
        if (_registered[hookAddress]) revert HookAlreadyRegistered();

        _registered[hookAddress] = true;
        _allHooks.push(hookAddress);
        _byType[hookType].push(hookAddress);

        HookInfo storage info = _hooks[hookAddress];
        info.hookAddress = hookAddress;
        info.hookType = hookType;
        info.name = name;
        info.description = description;
        info.version = version;
        info.deployer = msg.sender;
        info.deployedAt = block.number;
        info.isVerified = false;
        info.isActive = true;
        info.totalPoolsUsing = 0;
        info.totalInteractions = 0;

        emit HookRegistered(hookAddress, hookType, msg.sender);
    }

    // -------------------------------------------------------------------------
    // Pool linking
    // -------------------------------------------------------------------------
    function linkPool(bytes32 poolId, address hookAddress, string calldata label) external {
        if (!_registered[hookAddress]) revert HookNotRegistered();
        _hookPools[hookAddress].push(poolId);
        _hooks[hookAddress].totalPoolsUsing++;
        emit PoolLinked(poolId, hookAddress, label);
    }

    // -------------------------------------------------------------------------
    // Interaction tracking
    // -------------------------------------------------------------------------
    function recordInteraction(address hookAddress) external {
        if (!_registered[hookAddress]) revert HookNotRegistered();
        _hooks[hookAddress].totalInteractions++;
        emit InteractionRecorded(hookAddress, _hooks[hookAddress].totalInteractions);
    }

    // -------------------------------------------------------------------------
    // Owner-only management
    // -------------------------------------------------------------------------
    function verifyHook(address hookAddress) external onlyOwner {
        if (!_registered[hookAddress]) revert HookNotRegistered();
        _hooks[hookAddress].isVerified = true;
        emit HookVerified(hookAddress);
    }

    function deactivateHook(address hookAddress) external onlyOwner {
        if (!_registered[hookAddress]) revert HookNotRegistered();
        _hooks[hookAddress].isActive = false;
        emit HookDeactivated(hookAddress);
    }

    // -------------------------------------------------------------------------
    // Views
    // -------------------------------------------------------------------------
    function getAllHooks() external view returns (address[] memory) {
        return _allHooks;
    }

    function getHooksByType(HookType hookType) external view returns (address[] memory) {
        return _byType[hookType];
    }

    function getHookPools(address hookAddress) external view returns (bytes32[] memory) {
        return _hookPools[hookAddress];
    }

    function getHookInfo(address hookAddress) external view returns (HookInfo memory) {
        return _hooks[hookAddress];
    }

    function getHookCount() external view returns (uint256) {
        return _allHooks.length;
    }

    function getPoolCount() external view returns (uint256) {
        uint256 total;
        for (uint256 i = 0; i < _allHooks.length; i++) {
            total += _hookPools[_allHooks[i]].length;
        }
        return total;
    }

    function isRegistered(address hookAddress) external view returns (bool) {
        return _registered[hookAddress];
    }
}


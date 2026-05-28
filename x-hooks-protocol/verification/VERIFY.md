# Contract Verification — X Layer Mainnet

Compiler: Solidity 0.8.26  
Optimizer: enabled, 200 runs  
via_ir: true  

## Deployed Addresses

| Contract     | Address                                      |
|-------------|----------------------------------------------|
| HookRegistry | 0xeBc902Cee74345DD23f63E2f132f81E5fBE1D56D |
| OFAHook      | 0x955523a8eD7999e05015bC6F7b854D447717c088 |
| BCSHook      | 0xb7128F16104e6DD0DCe6f89dfBf733440E7F8080 |
| PLTHook      | 0xb4313ADd866F4E30F22751F9Ccf2C526839eda40 |
| SUBAHook     | 0xD8b747E0e895eD02FbDac6378A9548368374d088 |
| CALHook      | 0x3F26eF2279a0FfbBdC8270198106633008d78088 |

## Manual Verification on OKLink

For each contract:

1. Go to `https://www.oklink.com/x-layer/address/<ADDRESS>#code`
2. Click **"Verify and Publish"**
3. Select:
   - Compiler: `v0.8.26`
   - Optimization: **Yes**, 200 runs
   - EVM version: `paris`
4. Paste the flattened source from `<ContractName>_flat.sol`
5. No constructor args for `HookRegistry`

Constructor args (ABI-encoded) for hooks — use forge to generate:
```bash
# OFAHook
cast abi-encode "constructor(address,uint256,uint256)" \
  0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32 1000000000000000000000 50

# BCSHook / PLTHook / CALHook
cast abi-encode "constructor(address)" \
  0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32

# SUBAHook
cast abi-encode "constructor(address,uint256,address)" \
  0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32 50 \
  0xC0d1AC70A3A32BceA4a124e65eb22eb5f0d0Adc2
```

## OKLink API Verification (if you have API key)

```bash
ETHERSCAN_API_KEY=<your_oklink_api_key> forge verify-contract \
  --chain-id 196 \
  --compiler-version 0.8.26 \
  --verifier etherscan \
  --verifier-url "https://www.oklink.com/api/v5/explorer/contract/verify-source-code-plugin/XLAYER" \
  <address> <ContractName>
```

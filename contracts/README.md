# Ephereum Chat Contracts

Smart contracts for the Ephereum Chat messaging protocol.

## Overview

The `MessageEnvelopeRegistry` contract is a minimal event-only contract for announcing encrypted message envelopes. It stores no state and only emits events for message discovery.

## Metadata Format

`metadata` is app-defined bytes passed through unchanged by the contract.

For the current chat client, metadata is minimal JSON:

```json
{
  "version": "v1",
  "payloadHash": "0x..." // optional
}
```

No thread title, timestamps, or TTL values are stored in on-chain metadata.

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- Git submodules enabled

## Installation

```bash
cd contracts
git submodule update --init --recursive
forge install
```

## Build

```bash
forge build
```

## Test

```bash
forge test
```

## Deploy to Sepolia

1. Create a `.env` file:

```bash
cp .env.example .env
```

2. Fill in your environment variables:

   - `PRIVATE_KEY`: Your deployer wallet private key
   - `SEPOLIA_RPC_URL`: Sepolia RPC endpoint (e.g., from Alchemy or Infura)
   - `ETHERSCAN_API_KEY`: For contract verification (optional)

3. Deploy:

```bash
source .env
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify
```

## Contract Addresses

| Network | Address                                    |
| ------- | ------------------------------------------ |
| Sepolia | 0xe42A8d79AE1e4bbA02F753c592C43941f442c9A7 |

## Gas Costs

- `announce()`: ~23,000 gas
- `announceBatch(n)`: ~23,000 + (n \* 21,000) gas

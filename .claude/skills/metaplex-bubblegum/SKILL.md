---
name: metaplex-bubblegum
description: >
  Compressed NFT (cNFT) development using Metaplex Bubblegum and Umi framework.
  Activate for: minting Discovery Attestations, creating Merkle trees, transferring
  cNFTs, DAS API queries, batch minting, collection management, and any
  @metaplex-foundation/mpl-bubblegum work on Solana.
  Source: metaplex-foundation/skill (official Metaplex, production-grade)
---

# Metaplex Bubblegum — Compressed NFT Skill

You are an expert in Metaplex Bubblegum (mpl-bubblegum) and the Umi framework for compressed NFT operations on Solana.

## Why Compressed NFTs for Discovery Attestations

- 1 million traditional NFTs ≈ 24,000 SOL → same with cNFTs ≈ 10 SOL (1000x cheaper)
- Perfect for high-volume per-user discovery minting (Stellarr use case)
- On-chain Merkle root proves ownership; DAS API retrieves full metadata off-chain
- Fully composable: burn, transfer, delegate work identically to standard NFTs

## Stack

```
@metaplex-foundation/mpl-bubblegum   # Bubblegum program client
@metaplex-foundation/umi             # Umi framework
@metaplex-foundation/umi-bundle-defaults  # Umi connection bundle
@metaplex-foundation/digital-asset-standard-api  # DAS API queries
```

## Umi Initialization

```typescript
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { mplBubblegum } from '@metaplex-foundation/mpl-bubblegum'
import { keypairIdentity } from '@metaplex-foundation/umi'

const umi = createUmi('https://mainnet.helius-rpc.com/?api-key=YOUR_KEY')
  .use(mplBubblegum())

// For server-side minting (fee payer / tree authority)
const keypair = umi.eddsa.createKeypairFromSecretKey(
  new Uint8Array(JSON.parse(process.env.TREE_AUTHORITY_KEYPAIR!))
)
umi.use(keypairIdentity(keypair))
```

## Create Merkle Tree (one-time setup)

```typescript
import {
  createTree,
  getMerkleTreeSize,
} from '@metaplex-foundation/mpl-bubblegum'
import { generateSigner } from '@metaplex-foundation/umi'

// maxDepth=14 → supports 16,384 NFTs; maxBufferSize=64 recommended
const merkleTree = generateSigner(umi)

const { signature } = await createTree(umi, {
  merkleTree,
  maxDepth: 14,
  maxBufferSize: 64,
  // canopyDepth reduces proof size in transfer TXs — use 10 for better UX
  canopyDepth: 10,
}).sendAndConfirm(umi)

console.log('Merkle Tree:', merkleTree.publicKey)
// Save MERKLE_TREE_ADDRESS to env — you cannot change it after creation
```

## Mint Discovery Attestation cNFT

```typescript
import { mintToCollectionV1 } from '@metaplex-foundation/mpl-bubblegum'
import { publicKey } from '@metaplex-foundation/umi'

async function mintDiscoveryAttestation({
  discovererWallet,
  objectName,
  coordinates,
  imageUri,
  discoveryDate,
}: DiscoveryAttestationParams) {
  const { signature } = await mintToCollectionV1(umi, {
    leafOwner: publicKey(discovererWallet),
    merkleTree: publicKey(process.env.MERKLE_TREE_ADDRESS!),
    collectionMint: publicKey(process.env.STELLARR_COLLECTION_MINT!),
    metadata: {
      name: `Stellarr Discovery: ${objectName}`,
      uri: await uploadMetadata({
        name: `Stellarr Discovery: ${objectName}`,
        description: `Verified astronomical discovery attestation`,
        image: imageUri,
        attributes: [
          { trait_type: 'Object', value: objectName },
          { trait_type: 'RA', value: String(coordinates[0]) },
          { trait_type: 'Dec', value: String(coordinates[1]) },
          { trait_type: 'Discovery Date', value: discoveryDate },
          { trait_type: 'Platform', value: 'Stellarr' },
        ],
        properties: { category: 'image' },
      }),
      sellerFeeBasisPoints: 0,
      collection: { key: publicKey(process.env.STELLARR_COLLECTION_MINT!), verified: false },
      creators: [
        { address: umi.identity.publicKey, verified: true, share: 100 },
      ],
    },
  }).sendAndConfirm(umi)

  return signature
}
```

## Upload Metadata to Arweave / IPFS

```typescript
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys'

// Add to umi init
umi.use(irysUploader())

async function uploadMetadata(metadata: object): Promise<string> {
  const [uri] = await umi.uploader.uploadJson([metadata])
  return uri
}
```

## Query User's Discoveries (DAS API via Helius)

```typescript
async function getUserDiscoveries(walletAddress: string) {
  const response = await fetch(
    `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'stellarr-discoveries',
        method: 'getAssetsByOwner',
        params: {
          ownerAddress: walletAddress,
          page: 1,
          limit: 100,
          displayOptions: { showCollectionMetadata: true },
        },
      }),
    }
  )
  const { result } = await response.json()
  // Filter to Stellarr collection only
  return result.items.filter(
    (a: any) => a.grouping?.[0]?.group_value === process.env.STELLARR_COLLECTION_MINT
  )
}
```

## Transfer cNFT

```typescript
import { transfer, getAssetWithProof } from '@metaplex-foundation/mpl-bubblegum'

async function transferDiscovery(assetId: string, newOwner: string) {
  // Fetch proof from DAS API — required for all state-changing operations
  const assetWithProof = await getAssetWithProof(umi, publicKey(assetId))

  await transfer(umi, {
    ...assetWithProof,
    leafOwner: umi.identity.publicKey,
    newLeafOwner: publicKey(newOwner),
  }).sendAndConfirm(umi)
}
```

## Common Errors & Fixes

| Error | Cause | Fix |
|---|---|---|
| `TreeFull` | Merkle tree at capacity | Create new tree, update env |
| `InvalidProof` | Stale Merkle proof | Re-fetch proof from DAS before retry |
| `AccountNotFound` on DAS | RPC indexer lag | Wait 2–3 slots, retry with backoff |
| `CanopyTooSmall` | Proof too large for tx | Increase `canopyDepth` on new tree |
| Collection verify fails | Wrong collection authority | Use `verifyCollection` instruction after mint |

## Batch Minting (Off-chain Merkle, then finalize)

For bulk airdrop scenarios, use the batch SDK:
```bash
npm i @metaplex-foundation/bubblegum-batch-sdk
```
Build off-chain tree → persist JSON to Arweave → call `finalize_tree` in one transaction.
Cuts setup cost from N transactions to ~2 transactions for thousands of NFTs.

## References

- Bubblegum Docs: https://developers.metaplex.com/bubblegum
- DAS API Spec: https://developers.metaplex.com/das-api
- Umi Docs: https://developers.metaplex.com/umi
- Helius DAS: https://docs.helius.dev/compression-and-das-api/digital-asset-standard-das-api

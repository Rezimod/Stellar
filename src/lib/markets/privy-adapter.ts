'use client';

import { useMemo } from 'react';
import { useWallets } from '@privy-io/react-auth/solana';
import { useWallet as useWalletAdapter } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';
import {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js';
import {
  getProgram,
  getReadOnlyProgram,
  type AnchorWalletLike,
  type PrivySigner,
  type StellarMarketsProgram,
} from './client';

const RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
  process.env.NEXT_PUBLIC_HELIUS_RPC_URL ??
  'https://api.devnet.solana.com';

function chainFromRpc(url: string): 'solana:devnet' | 'solana:testnet' | 'solana:mainnet' {
  if (url.includes('devnet')) return 'solana:devnet';
  if (url.includes('testnet')) return 'solana:testnet';
  return 'solana:mainnet';
}

const CHAIN = chainFromRpc(RPC_URL);

let _connection: Connection | null = null;
function getConnection(): Connection {
  if (!_connection) _connection = new Connection(RPC_URL, 'confirmed');
  return _connection;
}

export function getSharedConnection(): Connection {
  return getConnection();
}

interface PrivySolanaWalletLike {
  address: string;
  signTransaction: (
    input: { transaction: Uint8Array; chain?: string },
  ) => Promise<{ signedTransaction: Uint8Array }>;
  signAndSendTransaction?: (
    input: { transaction: Uint8Array; chain: string },
  ) => Promise<{ signature: Uint8Array }>;
}

type SignableTx = Transaction | VersionedTransaction;

async function signOne<T extends SignableTx>(
  wallet: PrivySolanaWalletLike,
  tx: T,
): Promise<T> {
  const isVersioned = tx instanceof VersionedTransaction;
  const serialized = isVersioned
    ? (tx as VersionedTransaction).serialize()
    : (tx as Transaction).serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });
  const { signedTransaction } = await wallet.signTransaction({
    transaction: serialized as Uint8Array,
    chain: CHAIN,
  });
  return (
    isVersioned
      ? VersionedTransaction.deserialize(signedTransaction)
      : Transaction.from(signedTransaction)
  ) as T;
}

export function usePrivyAnchorWallet(): AnchorWalletLike | null {
  const { wallets, ready } = useWallets();
  return useMemo(() => {
    if (!ready) return null;
    const wallet = wallets[0] as unknown as PrivySolanaWalletLike | undefined;
    if (!wallet?.address) return null;

    const publicKey = new PublicKey(wallet.address);

    return {
      publicKey,
      async signTransaction<T extends Transaction>(tx: T): Promise<T> {
        return signOne(wallet, tx as unknown as SignableTx) as unknown as T;
      },
      async signAllTransactions<T extends Transaction>(txs: T[]): Promise<T[]> {
        const out: T[] = [];
        for (const tx of txs) {
          out.push(
            (await signOne(wallet, tx as unknown as SignableTx)) as unknown as T,
          );
        }
        return out;
      },
    };
  }, [wallets, ready]);
}

export function useProgramWithPrivy(): StellarMarketsProgram | null {
  const wallet = usePrivyAnchorWallet();
  return useMemo(() => {
    if (!wallet) return null;
    return getProgram(wallet, getConnection());
  }, [wallet]);
}

export function useReadOnlyProgram(): StellarMarketsProgram {
  return useMemo(() => getReadOnlyProgram(getConnection()), []);
}

function useWalletAdapterAnchorWallet(): AnchorWalletLike | null {
  const adapter = useWalletAdapter();
  return useMemo(() => {
    if (!adapter.connected || !adapter.publicKey || !adapter.signTransaction) {
      return null;
    }
    const publicKey = adapter.publicKey;
    const signTx = adapter.signTransaction;
    const signAll = adapter.signAllTransactions;

    return {
      publicKey,
      async signTransaction<T extends Transaction>(tx: T): Promise<T> {
        return (await signTx(tx as unknown as Transaction)) as unknown as T;
      },
      async signAllTransactions<T extends Transaction>(txs: T[]): Promise<T[]> {
        if (signAll) {
          return (await signAll(txs as unknown as Transaction[])) as unknown as T[];
        }
        const out: T[] = [];
        for (const tx of txs) {
          out.push((await signTx(tx as unknown as Transaction)) as unknown as T);
        }
        return out;
      },
    };
  }, [adapter.connected, adapter.publicKey, adapter.signTransaction, adapter.signAllTransactions]);
}

export function useStellarAnchorWallet(): AnchorWalletLike | null {
  const adapterWallet = useWalletAdapterAnchorWallet();
  const privyWallet = usePrivyAnchorWallet();
  return adapterWallet ?? privyWallet;
}

export function useStellarProgram(): StellarMarketsProgram | null {
  const wallet = useStellarAnchorWallet();
  return useMemo(() => {
    if (!wallet) return null;
    return getProgram(wallet, getConnection());
  }, [wallet]);
}

export function useStellarSigner(): PrivySigner {
  const adapter = useWalletAdapter();
  const privySigner = usePrivySigner();

  return useMemo<PrivySigner>(() => {
    if (
      adapter.connected &&
      adapter.publicKey &&
      (adapter.sendTransaction || adapter.signTransaction)
    ) {
      const publicKey = adapter.publicKey;
      const sendTx = adapter.sendTransaction;
      const signTx = adapter.signTransaction;

      return {
        publicKey,
        isReady: true,
        async signAndSend(tx: Transaction) {
          const connection = getConnection();
          if (!tx.recentBlockhash) {
            const { blockhash } = await connection.getLatestBlockhash('confirmed');
            tx.recentBlockhash = blockhash;
          }
          if (!tx.feePayer) tx.feePayer = publicKey;

          let signatureBase58: string;
          let usedPath: 'A' | 'B' = 'A';

          if (sendTx) {
            signatureBase58 = await sendTx(tx, connection);
          } else if (signTx) {
            const signed = await signTx(tx);
            signatureBase58 = await connection.sendRawTransaction(signed.serialize(), {
              skipPreflight: false,
              preflightCommitment: 'confirmed',
            });
            usedPath = 'B';
          } else {
            throw new Error('Wallet does not support signing');
          }

          const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
          await connection.confirmTransaction(
            { signature: signatureBase58, blockhash, lastValidBlockHeight },
            'confirmed',
          );

          return { signature: signatureBase58, path: usedPath };
        },
      };
    }

    return privySigner;
  }, [adapter.connected, adapter.publicKey, adapter.sendTransaction, adapter.signTransaction, privySigner]);
}

export function usePrivySigner(): PrivySigner {
  const { wallets, ready } = useWallets();
  return useMemo<PrivySigner>(() => {
    const wallet = wallets[0] as unknown as PrivySolanaWalletLike | undefined;
    const publicKey = wallet?.address ? new PublicKey(wallet.address) : null;
    const isReady = !!(ready && wallet?.address);

    return {
      publicKey,
      isReady,
      async signAndSend(tx: Transaction): Promise<{ signature: string; path: 'A' | 'B' }> {
        if (!wallet?.address || !publicKey) {
          throw new Error('Wallet not connected');
        }
        const connection = getConnection();
        if (!tx.recentBlockhash) {
          const { blockhash } = await connection.getLatestBlockhash('confirmed');
          tx.recentBlockhash = blockhash;
        }
        if (!tx.feePayer) tx.feePayer = publicKey;

        const serialized = tx.serialize({
          requireAllSignatures: false,
          verifySignatures: false,
        });

        let signatureBase58: string | null = null;
        let usedPath: 'A' | 'B' = 'A';

        if (typeof wallet.signAndSendTransaction === 'function') {
          try {
            const { signature } = await wallet.signAndSendTransaction({
              transaction: serialized as Uint8Array,
              chain: CHAIN,
            });
            signatureBase58 = bs58.encode(signature);
            usedPath = 'A';
          } catch (err) {
            console.warn('[privy signAndSend] Path A failed, falling back to Path B', err);
            signatureBase58 = null;
          }
        }

        if (!signatureBase58) {
          const { signedTransaction } = await wallet.signTransaction({
            transaction: serialized as Uint8Array,
            chain: CHAIN,
          });
          const sig = await connection.sendRawTransaction(signedTransaction, {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
          });
          signatureBase58 = sig;
          usedPath = 'B';
        }

        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
        await connection.confirmTransaction(
          {
            signature: signatureBase58,
            blockhash,
            lastValidBlockHeight,
          },
          'confirmed',
        );

        return { signature: signatureBase58, path: usedPath };
      },
    };
  }, [wallets, ready]);
}

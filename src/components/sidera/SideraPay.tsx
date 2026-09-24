'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth/solana';
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { createTransfer, parseURL, type TransferRequestURL } from '@solana/pay';
import bs58 from 'bs58';
import Caption from './ui/Caption';
import DataRow from './ui/DataRow';

export type SideraOrder = {
  orderId: string;
  url: string;
  amountSol: number;
  amountFiat: number;
  currency: string;
  expiresAt: string | null;
};

export type Confirmation = {
  confirmed: boolean;
  capsuleId?: string | null;
  edition?: { designation: string; editionNumber: number; editionSize: number };
  error?: string;
};

function minutesLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 60_000));
}

/** A deployment that rehearses instead of selling. Set at build, not by the page. */
const REHEARSAL = process.env.NEXT_PUBLIC_SIDERA_SIMULATED_PAYMENT === '1';
const DEVNET = process.env.NEXT_PUBLIC_SOLANA_CLUSTER === 'devnet';
const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? (DEVNET ? 'https://api.devnet.solana.com' : 'https://api.mainnet-beta.solana.com');
const explorer = (sig: string) => `https://explorer.solana.com/tx/${sig}${DEVNET ? '?cluster=devnet' : ''}`;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * One Solana Pay order, waiting to be paid: the request as a code and as a
 * link, the quote it stands on, and a check that asks the chain whether the
 * transfer arrived. The quote expires; a payment made after it does is
 * recorded as a refund due rather than dropped.
 *
 * On a rehearsal deployment there is no code and no wallet: the order settles
 * on the button, nothing is charged, and the page says so before it is
 * pressed. The capsule behind it is real, and so is everything after.
 */
export default function SideraPay({ order, onConfirmed }: { order: SideraOrder; onConfirmed: (c: Confirmation) => void }) {
  const { getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const [checking, setChecking] = useState(false);
  const [paying, setPaying] = useState(false);
  const [note, setNote] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const [left, setLeft] = useState<number | null>(minutesLeft(order.expiresAt));

  useEffect(() => {
    setLeft(minutesLeft(order.expiresAt));
    const t = setInterval(() => setLeft(minutesLeft(order.expiresAt)), 30_000);
    return () => clearInterval(t);
  }, [order.expiresAt]);

  const check = async (quiet = false): Promise<boolean> => {
    setChecking(true);
    if (!quiet) setNote('');
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/sidera/orders/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ orderId: order.orderId }),
      });
      const data = (await res.json().catch(() => ({}))) as Confirmation;
      if (data.confirmed) {
        onConfirmed(data);
        return true;
      }
      if (!quiet) setNote(data.error ?? 'No transfer has arrived yet.');
    } catch {
      if (!quiet) setNote('The check could not be made. Try again in a moment.');
    } finally {
      setChecking(false);
    }
    return false;
  };

  const wallet = wallets[0];

  /** The same transfer the code asks for, signed by the holder's own wallet and sent from here. */
  const payFromWallet = async () => {
    if (!wallet) {
      setNote('No wallet is connected to this account yet.');
      return;
    }
    setPaying(true);
    setNote('');
    try {
      const req = parseURL(order.url) as TransferRequestURL;
      const connection = new Connection(RPC, 'confirmed');
      const tx = await createTransfer(connection, new PublicKey(wallet.address), {
        recipient: req.recipient,
        amount: req.amount!,
        reference: req.reference,
        memo: req.memo,
      });
      const { signature } = await wallet.signAndSendTransaction({
        transaction: tx.serialize({ requireAllSignatures: false, verifySignatures: false }),
        chain: DEVNET ? 'solana:devnet' : 'solana:mainnet',
      });
      setSent(bs58.encode(signature));
      setNote('Sent. Waiting for the network to confirm it.');
      for (let i = 0; i < 12; i++) {
        await wait(2500);
        if (await check(true)) return;
      }
      setNote('Sent, but not confirmed yet. Press "I have paid" in a moment.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setNote(/insufficient|balance/i.test(msg) ? 'This wallet has too little SOL for the transfer and its fee.' : msg || 'The transfer was not sent.');
    } finally {
      setPaying(false);
    }
  };

  /** Devnet only: 1 test SOL from the network's faucet, which has no value. */
  const airdrop = async () => {
    if (!wallet) return;
    setPaying(true);
    setNote('');
    try {
      const connection = new Connection(RPC, 'confirmed');
      const sig = await connection.requestAirdrop(new PublicKey(wallet.address), LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig, 'confirmed');
      setNote('1 test SOL arrived.');
    } catch {
      setNote('The devnet faucet refused, as it often does. Use faucet.solana.com with the address below.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="sd-pay">
      {REHEARSAL ? (
        <div className="sd-pay__rehearsal">
          <p className="sd-label">Rehearsal</p>
          <p className="sd-blurb">
            Nothing is charged. This capsule, its sealed outcome and the editions it draws are real — only the
            payment is stood in for, and the log records that it was.
          </p>
        </div>
      ) : (
        <div className="sd-pay__code">
          <QRCodeSVG value={order.url} size={168} bgColor="#0b0c0e" fgColor="#ece7da" level="M" />
        </div>
      )}
      <div className="sd-pay__side">
        <DataRow
          layout="stacked"
          items={[
            { label: 'Price', value: `${order.amountFiat} ${order.currency}` },
            { label: 'Amount', value: REHEARSAL ? 'Not charged' : `${order.amountSol.toFixed(4)} SOL` },
            { label: 'Quote', value: left === null ? 'Open' : left > 0 ? `${left} min left` : 'Expired' },
          ]}
        />
        <div className="sd-pay__actions">
          {REHEARSAL ? (
            <button type="button" className="sd-btn sd-btn--primary" onClick={() => check()} disabled={checking}>
              {checking ? 'Settling' : 'Settle without paying'}
            </button>
          ) : (
            <>
              <button type="button" className="sd-btn sd-btn--primary" onClick={payFromWallet} disabled={paying || !wallet}>
                {paying ? 'Sending' : `Pay ${order.amountSol.toFixed(4)} SOL`}
              </button>
              <a className="sd-btn" href={order.url}>
                Other wallet
              </a>
              <button type="button" className="sd-btn" onClick={() => check()} disabled={checking}>
                {checking ? 'Checking the chain' : 'I have paid'}
              </button>
              {DEVNET && (
                <button type="button" className="sd-btn" onClick={airdrop} disabled={paying || !wallet}>
                  Get 1 test SOL
                </button>
              )}
            </>
          )}
        </div>
        {note && <p className="sd-data">{note}</p>}
        {sent && (
          <a className="sd-link sd-data" href={explorer(sent)} target="_blank" rel="noopener noreferrer">
            Transaction {sent.slice(0, 10)}… on the explorer
          </a>
        )}
        {DEVNET && wallet && <p className="sd-data">Wallet {wallet.address}</p>}
        <Caption as="p" parts={[REHEARSAL ? 'No payment taken' : DEVNET ? 'Solana devnet · test SOL' : 'Solana Pay', `Order ${order.orderId.slice(0, 8)}`]} />
      </div>
    </div>
  );
}

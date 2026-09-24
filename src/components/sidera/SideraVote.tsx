'use client';

import { useState } from 'react';
import { usePrivySafe as usePrivy } from './usePrivySafe';
import { useSideraHolder } from './useSideraHolder';

/** A holder's vote for one card of the night. Casting again for another card moves the vote. */
export default function SideraVote({ designation, name }: { designation: string; name: string }) {
  const { getAccessToken, login } = usePrivy();
  const { authenticated, ready, address } = useSideraHolder();
  const [state, setState] = useState<{ busy: boolean; note: string }>({ busy: false, note: '' });

  if (!ready || !authenticated) {
    return (
      <>
        <button type="button" className="sd-btn" onClick={() => login()} aria-label={`Sign in to vote for ${name}`}>
          Vote
        </button>
      </>
    );
  }

  const vote = async () => {
    if (!address) {
      setState({ busy: false, note: 'This account has no Solana wallet yet.' });
      return;
    }
    setState({ busy: true, note: '' });
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/sidera/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ walletAddress: address, designation }),
      });
      const data = await res.json().catch(() => ({}));
      setState({
        busy: false,
        note: res.ok ? `Your vote, weight ${data.weight}, is on ${name}.` : data.error ?? 'The vote was not recorded.',
      });
    } catch {
      setState({ busy: false, note: 'The vote was not recorded. Try again in a moment.' });
    }
  };

  return (
    <>
      <button type="button" className="sd-btn" onClick={vote} disabled={state.busy} aria-label={`Vote for ${name}`}>
        {state.busy ? 'Recording' : 'Vote'}
      </button>
      {state.note && <p className="sd-data">{state.note}</p>}
    </>
  );
}

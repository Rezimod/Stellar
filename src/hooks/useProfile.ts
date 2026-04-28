'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';

export type ProfileRow = {
  privyId: string;
  username: string | null;
  avatar: string | null;
  walletAddress: string | null;
};

type UpdateInput = { username?: string | null; avatar?: string | null };

export function useProfile() {
  const { user, getAccessToken, authenticated } = usePrivy();
  const privyId = user?.id ?? null;

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!privyId) { setProfile(null); return; }
    setLoading(true);
    try {
      const r = await fetch(`/api/users/profile?privyId=${encodeURIComponent(privyId)}`);
      const j = await r.json();
      setProfile(j.user ?? null);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [privyId]);

  useEffect(() => {
    if (!authenticated || !privyId) { setProfile(null); return; }
    reload();
  }, [authenticated, privyId, reload]);

  const update = useCallback(async (input: UpdateInput): Promise<{ ok: boolean; error?: string }> => {
    if (!authenticated) return { ok: false, error: 'Not signed in' };
    setSaving(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) { setError('Not signed in'); return { ok: false, error: 'Not signed in' }; }
      const r = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(input),
      });
      const j = await r.json();
      if (!r.ok || !j.success) {
        setError(j.error ?? 'Failed to save');
        return { ok: false, error: j.error ?? 'Failed to save' };
      }
      setProfile(j.user);
      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Network error';
      setError(msg);
      return { ok: false, error: msg };
    } finally {
      setSaving(false);
    }
  }, [authenticated, getAccessToken]);

  return { profile, loading, saving, error, update, reload };
}

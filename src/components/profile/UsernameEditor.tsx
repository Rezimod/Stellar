'use client';

import { useEffect, useRef, useState } from 'react';
import { Pencil, Check, X, Loader2 } from 'lucide-react';

const USERNAME_RE = /^[a-zA-Z0-9_.-]{2,24}$/;

type Props = {
  value: string | null;
  fallback: string;
  saving?: boolean;
  onSave: (next: string | null) => Promise<{ ok: boolean; error?: string }>;
};

export function UsernameEditor({ value, fallback, saving, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editing) {
      setDraft(value ?? '');
      setError(null);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [editing, value]);

  const display = value && value.length > 0 ? value : fallback;

  const commit = async () => {
    const trimmed = draft.trim();
    if (trimmed.length === 0) {
      const r = await onSave(null);
      if (r.ok) setEditing(false);
      else setError(r.error ?? 'Save failed');
      return;
    }
    if (!USERNAME_RE.test(trimmed)) {
      setError('2–24 chars · letters, numbers, _ . -');
      return;
    }
    if (trimmed === value) { setEditing(false); return; }
    const r = await onSave(trimmed);
    if (r.ok) setEditing(false);
    else setError(r.error ?? 'Save failed');
  };

  if (!editing) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <h2
          className="stl-display-lg"
          style={{
            color: 'var(--stl-text-bright)',
            margin: 0,
            fontSize: 22,
            lineHeight: 1.15,
          }}
        >
          {display}
        </h2>
        <button
          onClick={() => setEditing(true)}
          aria-label="Edit username"
          style={{
            width: 26, height: 26, borderRadius: 6,
            background: 'transparent', border: '1px solid var(--stl-border-regular)',
            color: 'var(--stl-text-muted)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
          }}
        >
          <Pencil size={12} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <input
          ref={inputRef}
          value={draft}
          onChange={e => { setDraft(e.target.value); setError(null); }}
          onKeyDown={e => {
            if (e.key === 'Enter') commit();
            else if (e.key === 'Escape') { setEditing(false); setError(null); }
          }}
          placeholder={fallback}
          maxLength={24}
          aria-label="Username"
          style={{
            background: 'var(--stl-bg-surface)',
            border: '1px solid var(--stl-border-strong)',
            borderRadius: 8,
            color: 'var(--stl-text-bright)',
            fontFamily: 'var(--font-display)',
            fontSize: 18,
            padding: '6px 10px',
            outline: 'none',
            minWidth: 180,
            textAlign: 'center',
          }}
        />
        <button
          onClick={commit}
          disabled={saving}
          aria-label="Save username"
          style={{
            width: 30, height: 30, borderRadius: 6,
            background: 'rgba(94, 234, 212,0.10)',
            border: '1px solid var(--stl-border-green)',
            color: 'var(--stl-green)',
            cursor: saving ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
          }}
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />}
        </button>
        <button
          onClick={() => { setEditing(false); setError(null); }}
          disabled={saving}
          aria-label="Cancel"
          style={{
            width: 30, height: 30, borderRadius: 6,
            background: 'transparent',
            border: '1px solid var(--stl-border-regular)',
            color: 'var(--stl-text-muted)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
          }}
        >
          <X size={14} />
        </button>
      </div>
      {error && (
        <p className="stl-mono-data" style={{ color: 'var(--color-error, var(--negative))', margin: 0 }}>
          {error}
        </p>
      )}
    </div>
  );
}

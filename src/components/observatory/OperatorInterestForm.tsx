'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useStellarUser } from '@/hooks/useStellarUser';

/**
 * The supply funnel.
 *
 * Brand and model are asked for because they are the whole point: a network
 * that knows which instrument is where can route a target to the rig that can
 * actually show it. Signing in is not required — an owner deciding whether to
 * list should not have to make an account first.
 */
export default function OperatorInterestForm() {
  const { getAccessToken } = usePrivy();
  const { authenticated } = useStellarUser();

  const [form, setForm] = useState({
    email: '',
    city: '',
    telescope: '',
    mount: '',
    camera: '',
    note: '',
  });
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState('');

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('sending');
    setError('');
    try {
      const token = authenticated ? await getAccessToken() : null;
      const res = await fetch('/api/observatory/operator/interest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'That did not send. Try again.');
        setState('idle');
        return;
      }
      setState('done');
    } catch {
      setError('Network error — try again.');
      setState('idle');
    }
  };

  if (state === 'done') {
    return (
      <section
        className="mt-8 rounded-xl border p-5"
        style={{ borderColor: 'var(--yes-border)', background: 'var(--yes-dim)' }}
      >
        <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
          Your telescope is on the list
        </h2>
        <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--text-secondary)' }}>
          We will write when the first partner nodes are commissioned, and we will tell you
          plainly whether your rig needs the kit or just the agent.
        </p>
      </section>
    );
  }

  return (
    <section
      className="mt-8 rounded-xl border p-5"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
    >
      <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
        Register your telescope
      </h2>
      <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--text-secondary)' }}>
        No commitment, and nothing to install yet. Listing opens as the first partner nodes come
        online, oldest registrations first.
      </p>

      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Email" required value={form.email} onChange={set('email')} type="email" />
        <Field label="City" required value={form.city} onChange={set('city')} />
        <Field
          label="Telescope"
          required
          value={form.telescope}
          onChange={set('telescope')}
          placeholder="Celestron NexStar 6SE"
        />
        <Field label="Mount" value={form.mount} onChange={set('mount')} placeholder="GoTo, EQ, none" />
        <Field label="Camera" value={form.camera} onChange={set('camera')} placeholder="ZWO ASI585MC" />
        <Field label="Anything else" value={form.note} onChange={set('note')} />

        {error && (
          <p className="text-sm sm:col-span-2" style={{ color: 'var(--no)' }} role="alert">
            {error}
          </p>
        )}

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={state === 'sending'}
            className="rounded-md border px-4 py-2 text-sm disabled:opacity-60"
            style={{
              borderColor: 'var(--accent-border)',
              background: 'var(--accent-dim)',
              color: 'var(--accent-text)',
            }}
          >
            {state === 'sending' ? 'Sending…' : 'Register'}
          </button>
        </div>
      </form>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}
        {required && ' *'}
      </span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="rounded-md border px-3 py-2 text-sm"
        style={{
          borderColor: 'var(--border)',
          background: 'var(--canvas)',
          color: 'var(--text-primary)',
        }}
      />
    </label>
  );
}

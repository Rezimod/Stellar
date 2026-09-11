'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('observatory.operator');
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
        setError(data.error ?? t('formFailed'));
        setState('idle');
        return;
      }
      setState('done');
    } catch {
      setError(t('network'));
      setState('idle');
    }
  };

  if (state === 'done') {
    return (
      <section className="obs-float obs-float--section" style={{ borderColor: 'var(--yes-border)' }}>
        <h2 className="obs-h2">{t('doneTitle')}</h2>
        <p className="obs-float__text" style={{ maxWidth: '64ch' }}>{t('doneLead')}</p>
      </section>
    );
  }

  return (
    <section className="obs-float obs-float--section" id="register">
      <h2 className="obs-h2">{t('formTitle')}</h2>
      <p className="obs-float__text" style={{ maxWidth: '64ch' }}>{t('formLead')}</p>

      <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label={t('email')} required value={form.email} onChange={set('email')} type="email" />
        <Field label={t('city')} required value={form.city} onChange={set('city')} />
        <Field
          label={t('telescope')}
          required
          value={form.telescope}
          onChange={set('telescope')}
          placeholder="Celestron NexStar 6SE"
        />
        <Field
          label={t('mount')}
          value={form.mount}
          onChange={set('mount')}
          placeholder={t('mountHint')}
        />
        <Field label={t('camera')} value={form.camera} onChange={set('camera')} placeholder="ZWO ASI585MC" />
        <Field label={t('note')} value={form.note} onChange={set('note')} />

        {error && (
          <p className="text-sm sm:col-span-2" style={{ color: 'var(--no)' }} role="alert">
            {error}
          </p>
        )}

        <div className="sm:col-span-2">
          <button type="submit" disabled={state === 'sending'} className="obs-capture">
            {state === 'sending' ? t('sending') : t('register')}
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
    <label className="obs-field-label">
      <span>
        {label}
        {required && ' *'}
      </span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="obs-input"
      />
    </label>
  );
}

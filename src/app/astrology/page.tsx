'use client';

import { useState, useRef, useCallback, Suspense } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useStellarUser } from '@/hooks/useStellarUser';
import { AuthModal } from '@/components/auth/AuthModal';
import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import PageContainer from '@/components/layout/PageContainer';
import StarMark from '@/components/ui/StarMark';

function AstrologyPageInner() {
  const { login, getAccessToken } = usePrivy();
  const { authenticated } = useStellarUser();
  const t = useTranslations('astrology');
  const tNav = useTranslations('nav');

  const [authOpen, setAuthOpen] = useState(false);
  const [step, setStep] = useState<'intro' | 'form' | 'loading' | 'result'>('intro');
  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',
    birthTime: '12:00',
    locationName: '',
    lat: 41.7151,
    lon: 44.8271,
  });
  const [result, setResult] = useState<{
    id: string;
    chart: {
      sunSign: string;
      moonSign: string;
      risingSign: string;
      natalReading: string;
    };
  } | null>(null);
  const [error, setError] = useState('');

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
    },
    [],
  );

  const handleLocationChange = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev) => ({
            ...prev,
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          }));
        },
        () => {
          setError(t('locationError'));
        },
      );
    }
  }, [t]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!formData.name || !formData.birthDate || !formData.birthTime || !formData.locationName) {
        setError(t('missingFields'));
        return;
      }

      setStep('loading');
      setError('');

      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          login();
          return;
        }

        const res = await fetch('/api/astrology/chart', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(formData),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to create chart');
        }

        const data = await res.json();
        setResult(data);
        setStep('result');
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t('chartCreationError'),
        );
        setStep('form');
      }
    },
    [formData, getAccessToken, login, t],
  );

  return (
    <PageContainer variant="content" className="py-8">
      <style>{`
        .astro-hero {
          background: linear-gradient(135deg, rgba(10, 23, 53, 0.8) 0%, rgba(26, 47, 90, 0.6) 100%);
          border: 1px solid rgba(94, 234, 212, 0.2);
          border-radius: 18px;
          padding: 48px 32px;
          text-align: center;
          margin-bottom: 40px;
        }
        .astro-form {
          max-width: 500px;
          margin: 0 auto;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 18px;
          padding: 32px;
        }
        .form-group {
          margin-bottom: 24px;
        }
        .form-group label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }
        .form-group input {
          width: 100%;
          padding: 12px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--color-bg-card);
          color: var(--text-primary);
          font-family: var(--font-body);
          font-size: 14px;
        }
        .form-group input:focus {
          outline: none;
          border-color: var(--accent-teal);
          background: var(--color-bg-card-strong);
        }
        .btn-primary {
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #5EEAD4 0%, #06B6D4 100%);
          border: none;
          border-radius: 8px;
          color: #0A1735;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .btn-primary:hover {
          transform: translateY(-2px);
        }
        .btn-secondary {
          width: 100%;
          padding: 12px;
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-primary);
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          margin-top: 12px;
        }
        .result-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 18px;
          padding: 32px;
          text-align: center;
          max-width: 600px;
          margin: 0 auto;
        }
        .zodiac-display {
          display: flex;
          justify-content: space-around;
          margin: 30px 0;
          gap: 20px;
        }
        .zodiac-item {
          flex: 1;
        }
        .zodiac-item-label {
          font-size: 12px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 8px;
        }
        .zodiac-item-sign {
          font-size: 48px;
          margin: 8px 0;
        }
        .zodiac-item-name {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .reading {
          margin: 30px 0;
          text-align: left;
          padding: 20px;
          background: rgba(94, 234, 212, 0.05);
          border-left: 3px solid var(--accent-teal);
          border-radius: 8px;
          font-size: 14px;
          line-height: 1.6;
          color: var(--text-secondary);
        }
        .action-buttons {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }
        .action-buttons a,
        .action-buttons button {
          flex: 1;
          padding: 12px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          text-decoration: none;
          text-align: center;
        }
        .action-buttons .btn-primary {
          background: linear-gradient(135deg, #5EEAD4 0%, #06B6D4 100%);
          color: #0A1735;
        }
        .action-buttons .btn-secondary {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-primary);
        }
        .error {
          color: var(--warning);
          font-size: 14px;
          margin-bottom: 16px;
          text-align: center;
        }
      `}</style>

      {!authenticated ? (
        <div style={{ textAlign: 'center', paddingTop: '60px' }}>
          <h1 style={{ fontSize: '32px', marginBottom: '16px' }}>{t('title')}</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>{t('subtitle')}</p>
          <button
            onClick={() => setAuthOpen(true)}
            className="btn-primary"
            style={{ maxWidth: '200px', margin: '0 auto' }}
          >
            {tNav('signIn')}
          </button>
          <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
        </div>
      ) : step === 'intro' ? (
        <>
          <div className="astro-hero">
            <Sparkles size={32} style={{ margin: '0 auto 16px', color: 'var(--accent-teal)' }} />
            <h1 style={{ fontSize: '32px', marginBottom: '16px' }}>{t('title')}</h1>
            <p style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '600px', margin: '0 auto 24px' }}>
              {t('subtitle')}
            </p>
            <button className="btn-primary" onClick={() => setStep('form')} style={{ maxWidth: '200px', margin: '0 auto' }}>
              {t('getStarted')}
            </button>
          </div>
          <div style={{ textAlign: 'center', opacity: 0.7 }}>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              ✦ {t('distinction')} ✦
            </p>
          </div>
        </>
      ) : step === 'form' ? (
        <form onSubmit={handleSubmit} className="astro-form">
          <h2 style={{ marginBottom: '24px' }}>{t('birthInfo')}</h2>
          {error && <div className="error">{error}</div>}

          <div className="form-group">
            <label>{t('name')}</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder={t('namePlaceholder')}
            />
          </div>

          <div className="form-group">
            <label>{t('birthDate')}</label>
            <input
              type="date"
              name="birthDate"
              value={formData.birthDate}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-group">
            <label>{t('birthTime')}</label>
            <input
              type="time"
              name="birthTime"
              value={formData.birthTime}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-group">
            <label>{t('location')}</label>
            <input
              type="text"
              name="locationName"
              value={formData.locationName}
              onChange={handleInputChange}
              placeholder={t('locationPlaceholder')}
            />
            <button
              type="button"
              onClick={handleLocationChange}
              className="btn-secondary"
            >
              {t('useMyLocation')}
            </button>
          </div>

          <button type="submit" className="btn-primary">
            {t('createChart')}
          </button>
        </form>
      ) : step === 'loading' ? (
        <div style={{ textAlign: 'center', paddingTop: '60px' }}>
          <Sparkles size={32} style={{ margin: '0 auto 16px', animation: 'spin 2s linear infinite' }} />
          <p>{t('generating')}</p>
        </div>
      ) : result ? (
        <div className="result-card">
          <h2 style={{ marginBottom: '8px' }}>{result.chart.sunSign}</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>{t('chartReady')}</p>

          <div className="zodiac-display">
            <div className="zodiac-item">
              <div className="zodiac-item-label">Sun</div>
              <div className="zodiac-item-sign">☀</div>
              <div className="zodiac-item-name">{result.chart.sunSign}</div>
            </div>
            <div className="zodiac-item">
              <div className="zodiac-item-label">Moon</div>
              <div className="zodiac-item-sign">☽</div>
              <div className="zodiac-item-name">{result.chart.moonSign}</div>
            </div>
            <div className="zodiac-item">
              <div className="zodiac-item-label">Rising</div>
              <div className="zodiac-item-sign">↑</div>
              <div className="zodiac-item-name">{result.chart.risingSign}</div>
            </div>
          </div>

          {result.chart.natalReading && (
            <div className="reading">
              {result.chart.natalReading}
            </div>
          )}

          <div className="action-buttons">
            <a href={`/api/astrology/star-map?chartId=${result.id}`} className="btn-primary" target="_blank" rel="noopener noreferrer">
              {t('viewStarMap')}
            </a>
            <button className="btn-secondary" onClick={() => setStep('intro')}>
              {t('createAnother')}
            </button>
          </div>
        </div>
      ) : null}
    </PageContainer>
  );
}

export default function AstrologyPage() {
  return (
    <Suspense fallback={null}>
      <AstrologyPageInner />
    </Suspense>
  );
}

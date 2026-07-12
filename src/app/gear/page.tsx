'use client';

import { useState, useCallback, Suspense } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useTranslations, useLocale } from 'next-intl';
import { Sparkles, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import PageContainer from '@/components/layout/PageContainer';

type Step = 'intro' | 'experience' | 'budget' | 'interests' | 'portability' | 'loading' | 'results';

interface FormState {
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | '';
  budgetGEL: number;
  observingInterests: string[];
  portability: 'stationary' | 'portable' | 'ultra-portable' | '';
}

interface Recommendation {
  productId: string;
  name: string;
  priceGEL: number;
  why: string;
  redeemableStars?: number;
  url: string;
}

function GearPageInner() {
  const { getAccessToken } = usePrivy();
  const t = useTranslations('gear');
  const rawLocale = useLocale();
  const locale = rawLocale === 'ka' ? 'ka' : 'en';

  const [step, setStep] = useState<Step>('intro');
  const [form, setForm] = useState<FormState>({
    experienceLevel: '',
    budgetGEL: 500,
    observingInterests: [],
    portability: '',
  });
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [error, setError] = useState('');

  const interestOptions = ['moon', 'planets', 'deep-sky', 'star-clusters', 'galaxies', 'urban'];
  const budgetPresets = [200, 500, 1000, 2000, 5000];

  const toggleInterest = useCallback(
    (interest: string) => {
      setForm((prev) => ({
        ...prev,
        observingInterests: prev.observingInterests.includes(interest)
          ? prev.observingInterests.filter((i) => i !== interest)
          : [...prev.observingInterests, interest],
      }));
    },
    [],
  );

  const handleGetRecommendations = useCallback(async () => {
    if (!form.experienceLevel || !form.portability || form.observingInterests.length === 0) {
      setError(t('selectAll'));
      return;
    }

    setStep('loading');
    setError('');

    try {
      const accessToken = await getAccessToken();

      const res = await fetch('/api/gear/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        },
        body: JSON.stringify({
          experienceLevel: form.experienceLevel,
          budgetGEL: form.budgetGEL,
          observingInterests: form.observingInterests,
          portability: form.portability,
          locale,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to get recommendations');
      }

      const data = await res.json();
      setRecommendations(data.recommendations || []);
      setStep('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
      setStep('portability');
    }
  }, [form, getAccessToken, t, locale]);

  return (
    <PageContainer variant="content" className="py-8">
      <style>{`
        .gear-hero {
          background: linear-gradient(135deg, rgba(10, 23, 53, 0.8) 0%, rgba(26, 47, 90, 0.6) 100%);
          border: 1px solid rgba(94, 234, 212, 0.2);
          border-radius: 18px;
          padding: 48px 32px;
          text-align: center;
          margin-bottom: 40px;
        }
        .gear-form {
          max-width: 600px;
          margin: 0 auto;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 18px;
          padding: 32px;
        }
        .form-section {
          margin-bottom: 32px;
        }
        .form-label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 16px;
        }
        .button-group {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 24px;
        }
        .btn-option {
          flex: 0 1 calc(50% - 6px);
          padding: 12px;
          border: 2px solid var(--border);
          border-radius: 8px;
          background: transparent;
          color: var(--text-primary);
          font-weight: 500;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-option:hover {
          border-color: var(--accent-teal);
          color: var(--accent-teal);
        }
        .btn-option.active {
          background: var(--accent-teal);
          border-color: var(--accent-teal);
          color: #0A1735;
        }
        .budget-slider {
          width: 100%;
          height: 6px;
          border-radius: 3px;
          background: var(--border);
          outline: none;
          -webkit-appearance: none;
        }
        .budget-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--accent-teal);
          cursor: pointer;
        }
        .budget-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--accent-teal);
          cursor: pointer;
          border: none;
        }
        .budget-display {
          display: flex;
          justify-content: space-between;
          margin-top: 12px;
          font-size: 13px;
          color: var(--text-muted);
        }
        .btn-primary {
          width: 100%;
          padding: 14px;
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
        .recommendations {
          display: grid;
          gap: 20px;
          margin-top: 24px;
        }
        .recommendation-card {
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
          background: var(--color-bg-card);
        }
        .recommendation-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .recommendation-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .recommendation-price {
          font-size: 14px;
          font-weight: 600;
          color: var(--accent-teal);
        }
        .recommendation-why {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.5;
          margin-bottom: 12px;
        }
        .recommendation-actions {
          display: flex;
          gap: 12px;
        }
        .btn-link {
          flex: 1;
          padding: 10px;
          background: linear-gradient(135deg, #5EEAD4 0%, #06B6D4 100%);
          color: #0A1735;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          text-decoration: none;
          text-align: center;
        }
        .error {
          color: var(--warning);
          font-size: 13px;
          margin-bottom: 16px;
        }
        .loading {
          text-align: center;
          padding: 40px 20px;
        }
        .intro-buttons {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 24px;
        }
      `}</style>

      {step === 'intro' ? (
        <>
          <div className="gear-hero">
            <ShoppingCart size={32} style={{ margin: '0 auto 16px', color: 'var(--accent-teal)' }} />
            <h1 style={{ fontSize: '32px', marginBottom: '16px' }}>{t('title')}</h1>
            <p style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '600px', margin: '0 auto 24px' }}>
              {t('subtitle')}
            </p>
          </div>
          <div className="gear-form" style={{ textAlign: 'center' }}>
            <p style={{ marginBottom: '24px', color: 'var(--text-secondary)' }}>{t('howItWorks')}</p>
            <button className="btn-primary" onClick={() => setStep('experience')}>
              {t('getStarted')}
            </button>
          </div>
        </>
      ) : step === 'experience' ? (
        <div className="gear-form">
          <h2 style={{ marginBottom: '20px' }}>{t('experience')}</h2>
          <div className="form-section">
            <div className="button-group">
              {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                <button
                  key={level}
                  className={`btn-option ${form.experienceLevel === level ? 'active' : ''}`}
                  onClick={() => setForm((prev) => ({ ...prev, experienceLevel: level }))}
                >
                  {t(`experienceLevel.${level}`)}
                </button>
              ))}
            </div>
          </div>
          <button
            className="btn-primary"
            disabled={!form.experienceLevel}
            onClick={() => setStep('budget')}
          >
            {t('next')}
          </button>
          <button className="btn-secondary" onClick={() => setStep('intro')}>
            {t('back')}
          </button>
        </div>
      ) : step === 'budget' ? (
        <div className="gear-form">
          <h2 style={{ marginBottom: '20px' }}>{t('budget')}</h2>
          <div className="form-section">
            <label style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              {t('budgetAbout')} {form.budgetGEL} GEL
            </label>
            <input
              type="range"
              className="budget-slider"
              min="100"
              max="10000"
              value={form.budgetGEL}
              onChange={(e) => setForm((prev) => ({ ...prev, budgetGEL: parseInt(e.target.value) }))}
            />
            <div className="budget-display">
              {budgetPresets.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setForm((prev) => ({ ...prev, budgetGEL: preset }))}
                  style={{
                    background: form.budgetGEL === preset ? 'var(--accent-teal)' : 'transparent',
                    color: form.budgetGEL === preset ? '#0A1735' : 'var(--text-muted)',
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  {preset} ₾
                </button>
              ))}
            </div>
          </div>
          <button className="btn-primary" onClick={() => setStep('interests')}>
            {t('next')}
          </button>
          <button className="btn-secondary" onClick={() => setStep('experience')}>
            {t('back')}
          </button>
        </div>
      ) : step === 'interests' ? (
        <div className="gear-form">
          <h2 style={{ marginBottom: '20px' }}>{t('interests')}</h2>
          <div className="form-section">
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {t('selectAtLeast')}
            </p>
            <div className="button-group">
              {interestOptions.map((interest) => (
                <button
                  key={interest}
                  className={`btn-option ${form.observingInterests.includes(interest) ? 'active' : ''}`}
                  onClick={() => toggleInterest(interest)}
                >
                  {t(`interest.${interest}`)}
                </button>
              ))}
            </div>
          </div>
          <button
            className="btn-primary"
            disabled={form.observingInterests.length === 0}
            onClick={() => setStep('portability')}
          >
            {t('next')}
          </button>
          <button className="btn-secondary" onClick={() => setStep('budget')}>
            {t('back')}
          </button>
        </div>
      ) : step === 'portability' ? (
        <div className="gear-form">
          <h2 style={{ marginBottom: '20px' }}>{t('portability')}</h2>
          {error && <div className="error">{error}</div>}
          <div className="form-section">
            <div className="button-group">
              {(['stationary', 'portable', 'ultra-portable'] as const).map((option) => (
                <button
                  key={option}
                  className={`btn-option ${form.portability === option ? 'active' : ''}`}
                  onClick={() => setForm((prev) => ({ ...prev, portability: option }))}
                >
                  {t(`portability.${option}`)}
                </button>
              ))}
            </div>
          </div>
          <button className="btn-primary" onClick={handleGetRecommendations}>
            {t('seeRecommendations')}
          </button>
          <button className="btn-secondary" onClick={() => setStep('interests')}>
            {t('back')}
          </button>
        </div>
      ) : step === 'loading' ? (
        <div className="gear-form loading">
          <Sparkles size={32} style={{ animation: 'spin 2s linear infinite', color: 'var(--accent-teal)' }} />
          <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>{t('finding')}</p>
        </div>
      ) : (
        <div className="gear-form">
          <h2 style={{ marginBottom: '8px' }}>{t('forYou')}</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '14px' }}>
            {t('basedOn')}
          </p>

          {recommendations.length > 0 ? (
            <div className="recommendations">
              {recommendations.map((rec, idx) => (
                <div key={idx} className="recommendation-card">
                  <div className="recommendation-header">
                    <div>
                      <div className="recommendation-title">{rec.name}</div>
                      {rec.redeemableStars && (
                        <div style={{ fontSize: '12px', color: 'var(--accent)', marginTop: '4px' }}>
                          💫 {rec.redeemableStars} Stars
                        </div>
                      )}
                    </div>
                    <div className="recommendation-price">{rec.priceGEL} ₾</div>
                  </div>
                  <div className="recommendation-why">✦ {rec.why}</div>
                  <div className="recommendation-actions">
                    <Link href={rec.url} className="btn-link">
                      {t('viewProduct')}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              {t('noRecommendations')}
            </p>
          )}

          <button
            className="btn-secondary"
            onClick={() => setStep('experience')}
            style={{ marginTop: '24px' }}
          >
            {t('tryAgain')}
          </button>
        </div>
      )}
    </PageContainer>
  );
}

export default function GearPage() {
  return (
    <Suspense fallback={null}>
      <GearPageInner />
    </Suspense>
  );
}

'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ChevronLeft, Download, MessageCircle, Mic, WifiOff } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';

const APK_URL = process.env.NEXT_PUBLIC_FIELD_APK_URL ?? '';

export default function FieldPage() {
  const t = useTranslations('field');
  const apkAvailable = APK_URL.length > 0;

  return (
    <PageContainer variant="content">
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 96px' }}>
        <Link
          href="/chat"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--text-muted)',
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            textDecoration: 'none',
            marginBottom: 32,
          }}
        >
          <ChevronLeft size={14} /> {t('back')}
        </Link>

        <div style={{ marginBottom: 40 }}>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--accent)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              margin: '0 0 12px',
            }}
          >
            {t('eyebrow')}
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 'clamp(28px, 5vw, 40px)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
              margin: '0 0 16px',
            }}
          >
            {t('title')}
          </h1>
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.55,
              color: 'var(--text-secondary)',
              margin: 0,
              maxWidth: 560,
            }}
          >
            {t('lede')}
          </p>
        </div>

        <div className="card-base" style={{ padding: 20, marginBottom: 32 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  margin: '0 0 8px',
                }}
              >
                {t('online.label')}
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: '0 0 4px', lineHeight: 1.4 }}>
                {t('online.title')}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                {t('online.body')}
              </p>
            </div>
            <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: 16 }}>
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--accent)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  margin: '0 0 8px',
                }}
              >
                {t('offline.label')}
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: '0 0 4px', lineHeight: 1.4 }}>
                {t('offline.title')}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                {t('offline.body')}
              </p>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 32 }}>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              margin: '0 0 16px',
            }}
          >
            {t('capabilities.heading')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Capability icon={<MessageCircle size={16} />} title={t('capabilities.llm.title')} body={t('capabilities.llm.body')} />
            <Capability icon={<Mic size={16} />} title={t('capabilities.whisper.title')} body={t('capabilities.whisper.body')} />
            <Capability icon={<WifiOff size={16} />} title={t('capabilities.background.title')} body={t('capabilities.background.body')} />
          </div>
        </div>

        <div className="card-base" style={{ padding: 24, textAlign: 'center', marginBottom: 24 }}>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 18,
              color: 'var(--text-primary)',
              margin: '0 0 6px',
            }}
          >
            {t('cta.title')}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 20px', lineHeight: 1.5 }}>
            {t('cta.body')}
          </p>
          {apkAvailable ? (
            <a
              href={APK_URL}
              download
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', fontSize: 14 }}
            >
              <Download size={16} />
              {t('cta.download')}
            </a>
          ) : (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                fontSize: 13,
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
                border: '1px dashed var(--border-subtle)',
                borderRadius: 999,
              }}
            >
              {t('cta.soon')}
            </div>
          )}
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              margin: '16px 0 0',
            }}
          >
            {t('cta.platform')}
          </p>
        </div>

        <div
          style={{
            paddingTop: 16,
            borderTop: '1px solid var(--border-subtle)',
            fontSize: 11,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            textAlign: 'center',
          }}
        >
          {t('credit')}
        </div>
      </div>
    </PageContainer>
  );
}

function Capability({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="card-base" style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'var(--accent-dim)',
          border: '1px solid var(--accent-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent)',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px', lineHeight: 1.3 }}>{title}</p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>{body}</p>
      </div>
    </div>
  );
}

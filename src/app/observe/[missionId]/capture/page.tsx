'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import BackButton from '@/components/shared/BackButton';
import CameraCapture from '@/components/sky/CameraCapture';
import { MISSIONS } from '@/lib/constants';
import { getMissionImage } from '@/lib/mission-icons';
import { useObserveFlow, type UploadSource } from '../ObserveFlowContext';
import PageContainer from '@/components/layout/PageContainer';
import { useLocation } from '@/lib/location';

export default function ObserveCapturePage() {
  const { location } = useLocation();
  const router = useRouter();
  const params = useParams<{ missionId: string }>();
  const missionId = params?.missionId ?? '';
  const mission = MISSIONS.find(m => m.id === missionId);
  const { setPhoto, setSource, setTimestamp, setCoords, setMintError } = useObserveFlow();
  const ka = useLocale() === 'ka';

  if (!mission) {
    return (
      <PageContainer variant="content" className="py-6 flex flex-col gap-4">
        <BackButton />
        <div
          className="rounded-2xl p-6 text-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p className="text-text-primary font-semibold text-base mb-2">{ka ? 'მისია ვერ მოიძებნა' : 'Mission not found'}</p>
          <Link
            href="/missions"
            className="inline-block px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'rgba(255, 179, 71,0.12)', border: '1px solid rgba(255, 179, 71,0.25)', color: 'var(--terracotta)' }}
          >
            {ka ? 'მისიებზე დაბრუნება' : 'Back to missions'}
          </Link>
        </div>
      </PageContainer>
    );
  }

  const handleCapture = async (p: string, source: UploadSource) => {
    setMintError('');
    setPhoto(p);
    setSource(source);

    const ts = new Date().toISOString();
    setTimestamp(ts);

    setCoords({ lat: location.lat, lon: location.lon });

    router.push(`/observe/${missionId}/verify${window.location.search}`);
  };

  return (
    <PageContainer variant="fullscreen" className="py-3 flex flex-col gap-3">
      <div className="w-full max-w-3xl mx-auto flex flex-col gap-3">
      <BackButton />

      <div className="flex items-center gap-3 px-1">
        <div className="relative w-9 h-9 rounded-lg overflow-hidden flex-shrink-0">
          <Image src={getMissionImage(mission.id)} alt={mission.name} fill sizes="36px" className="object-cover" />
        </div>
        <div className="min-w-0">
          <h1
            className="text-base font-semibold leading-tight"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--stl-text-bright)' }}
          >
            {ka ? 'გადაიღე შენი დაკვირვება' : 'Capture your observation'}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--stl-text-muted)' }}>
            {mission.name}
          </p>
        </div>
      </div>

      <CameraCapture
        missionName={mission.name}
        onCapture={(p) => handleCapture(p, 'camera')}
        onUpload={(p) => handleCapture(p, 'upload')}
      />
      </div>
    </PageContainer>
  );
}

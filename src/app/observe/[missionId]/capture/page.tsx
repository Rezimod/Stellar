'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import BackButton from '@/components/shared/BackButton';
import CameraCapture from '@/components/sky/CameraCapture';
import { MISSIONS } from '@/lib/constants';
import { getMissionImage } from '@/lib/mission-icons';
import { useObserveFlow, type UploadSource } from '../ObserveFlowContext';

export default function ObserveCapturePage() {
  const router = useRouter();
  const params = useParams<{ missionId: string }>();
  const missionId = params?.missionId ?? '';
  const mission = MISSIONS.find(m => m.id === missionId);
  const { setPhoto, setSource, setTimestamp, setCoords, setMintError } = useObserveFlow();

  if (!mission) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">
        <BackButton />
        <div
          className="rounded-2xl p-6 text-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p className="text-white font-semibold text-base mb-2">Mission not found</p>
          <Link
            href="/missions"
            className="inline-block px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8' }}
          >
            Back to missions
          </Link>
        </div>
      </div>
    );
  }

  const handleCapture = async (p: string, source: UploadSource) => {
    setMintError('');
    setPhoto(p);
    setSource(source);

    const ts = new Date().toISOString();
    setTimestamp(ts);

    let lat = 41.7151;
    let lon = 44.8271;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000 })
      );
      lat = pos.coords.latitude;
      lon = pos.coords.longitude;
    } catch {
      // GPS unavailable — use Tbilisi fallback
    }
    setCoords({ lat, lon });

    router.push(`/observe/${missionId}/verify`);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-3 flex flex-col gap-3">
      <BackButton />

      <div className="flex items-center gap-3 px-1">
        <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0">
          <img src={getMissionImage(mission.id)} alt={mission.name} className="w-full h-full object-cover" />
        </div>
        <div className="min-w-0">
          <h1
            className="text-base font-semibold leading-tight"
            style={{ fontFamily: 'var(--font-serif)', color: 'var(--stl-text-bright)' }}
          >
            Capture your observation
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
  );
}

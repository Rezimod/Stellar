'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useStellarUser } from '@/hooks/useStellarUser';
import { useAppState } from '@/hooks/useAppState';
import { MISSIONS } from '@/lib/constants';
import { calculateSkyScore, visibilityToMeters } from '@/lib/sky-score';
import { getTierForStreak } from '@/lib/constellation-streak';
import { calculateRarity } from '@/lib/nft-rarity';
import { rollCosmicBonus } from '@/lib/cosmic-bonus';
import { consumeStarlight } from '@/lib/starlight';
import { recordChallengeProgress, claimChallengeReward, getActiveChallenge } from '@/lib/celestial-challenges';
import { urlToBlob } from '@/lib/data-url';
import type { PhotoVerificationResult, SkyVerification } from '@/lib/types';
import BackButton from '@/components/shared/BackButton';
import Verification from '@/components/sky/Verification';
import MintAnimation from '@/components/shared/MintAnimation';
import { useObserveFlow } from '../ObserveFlowContext';
import PageContainer from '@/components/layout/PageContainer';

type Stage = 'verifying-sky' | 'verifying-photo' | 'mint-ready' | 'minting' | 'done';

const isSafePhoto = (url: string) =>
  url.startsWith('data:image/jpeg;base64,') ||
  url.startsWith('data:image/png;base64,') ||
  url.startsWith('data:image/webp;base64,') ||
  url.startsWith('blob:') ||
  url.startsWith('/images/');

function makeEstimatedSky(): SkyVerification {
  return {
    verified: true,
    cloudCover: 20,
    visibility: 'Good',
    visibilityMeters: 15000,
    conditions: 'Sky data temporarily unavailable — using estimated conditions',
    humidity: 50,
    temperature: 12,
    windSpeed: 5,
    windDirection: 'W',
    bortleClass: 5,
    oracleHash: '0x' + Date.now().toString(16).padStart(40, '0'),
    verifiedAt: new Date().toISOString(),
  };
}

export default function ObserveVerifyPage() {
  const router = useRouter();
  const params = useParams<{ missionId: string }>();
  const missionId = params?.missionId ?? '';
  const mission = MISSIONS.find(m => m.id === missionId);

  const { addMission } = useAppState();
  const { user, getAccessToken } = usePrivy();
  const { address: stellarAddress } = useStellarUser();
  const solanaWallet = stellarAddress ? { address: stellarAddress } : null;

  const flow = useObserveFlow();
  const {
    photo, source, timestamp, coords,
    sky, skyScore, photoVerification, mintError,
    setSky, setSkyScore, setPhotoVerification, setMintTxId, setMintError,
    setMintTier, setMintRarity, setCosmicBonus, setTotalStarsEarned,
    setChallengeCompleted, setNftImageUrl,
  } = flow;

  const [stage, setStage] = useState<Stage>('verifying-sky');
  const [mintDone, setMintDone] = useState(false);
  const [showSlowMint, setShowSlowMint] = useState(false);
  const startedRef = useRef(false);

  // An unverified observation still mints — as a keepsake worth 0 Stars.
  const isUnverified = !!photoVerification && !photoVerification.accepted;

  useEffect(() => {
    if (stage !== 'minting') { setShowSlowMint(false); return; }
    const t = setTimeout(() => setShowSlowMint(true), 30000);
    return () => clearTimeout(t);
  }, [stage]);

  // Redirect if arrived mid-flow with no photo
  useEffect(() => {
    if (!photo && missionId) {
      router.replace(`/observe/${missionId}/capture`);
    }
  }, [photo, missionId, router]);

  // Run sky + photo verification on mount (StrictMode-safe)
  useEffect(() => {
    if (!mission || !photo || startedRef.current) return;
    startedRef.current = true;

    (async () => {
      const lat = coords.lat;
      const lon = coords.lon;
      const ts = timestamp || new Date().toISOString();

      if (!navigator.onLine) {
        setMintError('No internet connection — try again when back online');
        setStage('mint-ready');
        return;
      }

      try {
        let skyData: SkyVerification;
        const res = await fetch(`/api/sky/verify?lat=${lat}&lon=${lon}`);
        if (res.ok) {
          skyData = await res.json();
        } else {
          skyData = makeEstimatedSky();
          setMintError('Sky data unavailable — proceeding with estimated conditions.');
        }

        const effectiveSky = mission.demo ? { ...skyData, verified: true } : skyData;
        setSky(effectiveSky);
        setSkyScore(calculateSkyScore({
          cloudCover: skyData.cloudCover,
          visibility: visibilityToMeters(skyData.visibility),
          humidity: skyData.humidity ?? 50,
          windSpeed: skyData.windSpeed ?? 5,
        }));
        if (!skyData.verified && !mission.demo) {
          setMintError('Cloudy sky — observation logged with 0 stars. You can still mint.');
        }

        if (!mission.demo) {
          setStage('verifying-photo');
          try {
            const verifyToken = await getAccessToken().catch(() => null);
            const blob = await urlToBlob(photo);
            const mimeType = blob.type || 'image/jpeg';
            const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
            const file = new File([blob], `observation.${ext}`, { type: mimeType });
            const fd = new FormData();
            fd.append('file', file);
            fd.append('lat', String(lat));
            fd.append('lon', String(lon));
            fd.append('capturedAt', ts);
            if (solanaWallet?.address) fd.append('wallet', solanaWallet.address);
            fd.append('uploadSource', source ?? 'upload');
            const pvRes = await fetch('/api/observe/verify', {
              method: 'POST',
              body: fd,
              headers: verifyToken ? { 'Authorization': `Bearer ${verifyToken}` } : {},
            });
            if (pvRes.ok) {
              const pv: PhotoVerificationResult = await pvRes.json();
              setPhotoVerification(pv);
              // Never bounce the user back to the camera. A photo that can't be
              // verified (suspect, wrong object, or a service hiccup) still
              // proceeds to the mint screen — it just mints as an unverified
              // keepsake worth 0 Stars, with a clear note explaining why.
              if (!pv.accepted) {
                setMintError(pv.reason || "This photo couldn't be verified, so it earns no Stars — you can still keep it as a personal record.");
              }
            }
          } catch {
            // Photo verification offline — allow but log low confidence
          }
        }

        setStage('mint-ready');
      } catch {
        // Sky oracle offline — don't bounce; proceed with estimated conditions.
        setSky(makeEstimatedSky());
        setMintError('Sky check offline — proceeding with estimated conditions.');
        setStage('mint-ready');
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMint = async () => {
    if (!mission) return;
    setStage('minting');
    setMintDone(false);

    let streakCount = 0;
    if (solanaWallet?.address) {
      try {
        const r = await fetch(`/api/streak?walletAddress=${encodeURIComponent(solanaWallet.address)}`);
        const d = await r.json();
        streakCount = d.streak ?? 0;
      } catch {
        streakCount = 0;
      }
    }
    const tier = getTierForStreak(streakCount);
    setMintTier(tier);

    // Unverified keepsake: the photo couldn't be certified, so it mints with
    // 0 Stars and "Unverified" rarity (server enforces both). No streak/bonus.
    const isUnverifiedMint = !!photoVerification && !photoVerification.accepted;

    const baseStars = (sky?.verified && !isUnverifiedMint) ? mission.stars : 0;
    const effectiveStars = isUnverifiedMint ? 0 : Math.round(baseStars * tier.multiplier);

    const rarityInfo = calculateRarity(skyScore?.score ?? 0, streakCount);
    setMintRarity(rarityInfo);
    const mintRarityName = isUnverifiedMint ? 'Unverified' : rarityInfo.rarity;

    setMintError('');

    let txId: string | null = null;
    try {
      const authToken = await getAccessToken().catch(() => null);
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 60000);
      const res = await fetch('/api/mint', {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          userAddress: stellarAddress,
          target: mission.target || (mission.name === 'Demo Observation' ? 'Jupiter' : mission.name),
          timestampMs: new Date(timestamp).getTime(),
          lat: coords.lat,
          lon: coords.lon,
          cloudCover: sky?.cloudCover ?? 0,
          oracleHash: sky?.oracleHash ?? 'sim',
          stars: effectiveStars,
          rarity: mintRarityName,
          multiplier: tier.multiplier,
          demo: mission.demo === true,
          verificationToken: photoVerification?.verificationToken,
          identifiedObject: photoVerification?.identifiedObject,
          confidence: photoVerification?.confidence,
          capturedAt: photoVerification?.metadata?.capturedAt,
          fileHash: photoVerification?.metadata?.fileHash,
          uploadSource: photoVerification?.metadata?.uploadSource,
          deviceTier: photoVerification?.metadata?.deviceTier,
          deviceMake: photoVerification?.metadata?.deviceMake,
          deviceModel: photoVerification?.metadata?.deviceModel,
          exifLat: photoVerification?.metadata?.exifLat,
          exifLon: photoVerification?.metadata?.exifLon,
          exifTakenAt: photoVerification?.metadata?.exifTakenAt,
          isInternetSourced: photoVerification?.metadata?.isInternetSourced,
        }),
      });
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        if (typeof data.txId === 'string' && data.txId.length > 0) {
          txId = data.txId;
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        const msg: string = errData?.error ?? '';
        if (res.status === 429) {
          setMintError(msg || 'Too many mints right now — try again in a minute.');
        } else {
          setMintError(msg || "Couldn't save your record — please retry.");
        }
      }
    } catch (err) {
      console.error('[mint] network/timeout', err);
      setMintError('Network error — please retry.');
    }

    if (!txId) {
      // No on-chain mint → don't pretend the mission is sealed.
      setStage('mint-ready');
      setMintDone(false);
      return;
    }

    setMintTxId(txId);

    const targetName = mission.target || (mission.name === 'Demo Observation' ? 'Jupiter' : mission.name);
    const nftUrl = `/api/nft-image?target=${encodeURIComponent(targetName)}&ts=${new Date(timestamp).getTime()}&lat=${coords.lat.toFixed(4)}&lon=${coords.lon.toFixed(4)}&cc=${sky?.cloudCover ?? 0}&stars=${effectiveStars}&rarity=${mintRarityName}`;
    setNftImageUrl(nftUrl);

    // Bonus Stars, weekly-challenge credit and the streak ledger only apply to
    // certified observations. An unverified keepsake earns nothing extra.
    let totalStars = effectiveStars;
    if (!isUnverifiedMint) {
      const bonus = rollCosmicBonus(rarityInfo.rarity, sky?.oracleHash ?? 'sim', user?.id ?? '', mission.id);
      setCosmicBonus(bonus);

      totalStars = effectiveStars + (bonus.triggered ? bonus.amount : 0);

      if (bonus.triggered && solanaWallet?.address) {
        const authToken = await getAccessToken().catch(() => null);
        fetch('/api/award-stars', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            recipientAddress: solanaWallet.address,
            reason: `cosmic_bonus:${targetName}`,
            verificationToken: photoVerification?.verificationToken,
            idempotencyKey: `cosmic:${txId}`,
          }),
        }).catch(() => {});
      }

      if (!mission.demo) consumeStarlight();

      const chResult = recordChallengeProgress(skyScore?.score ?? 0, targetName);
      if (chResult.justCompleted) {
        setChallengeCompleted(true);
        const cb = claimChallengeReward();
        if (cb > 0 && solanaWallet?.address) {
          const authToken = await getAccessToken().catch(() => null);
          fetch('/api/award-stars', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
            },
            body: JSON.stringify({
              recipientAddress: solanaWallet.address,
              reason: 'weekly_challenge',
              verificationToken: photoVerification?.verificationToken,
              idempotencyKey: `challenge:${getActiveChallenge().id}:${solanaWallet.address}`,
            }),
          }).catch(() => {});
        }
      }
    }
    setTotalStarsEarned(totalStars);

    setMintDone(true);

    if (solanaWallet?.address) {
      const pvm = photoVerification?.metadata;
      const logToken = await getAccessToken().catch(() => null);
      fetch('/api/observe/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(logToken ? { Authorization: `Bearer ${logToken}` } : {}),
        },
        body: JSON.stringify({
          wallet: solanaWallet.address,
          target: targetName,
          identifiedObject: photoVerification?.identifiedObject ?? targetName,
          verificationToken: photoVerification?.verificationToken ?? null,
          capturedAt: pvm?.capturedAt ?? new Date().toISOString(),
          confidence: photoVerification?.confidence ?? (sky?.verified ? 'medium' : 'low'),
          mintTx: txId,
          lat: coords.lat,
          lon: coords.lon,
          oracleHash: sky?.oracleHash ?? null,
          fileHash: pvm?.fileHash,
          uploadSource: pvm?.uploadSource,
          deviceTier: pvm?.deviceTier,
          deviceMake: pvm?.deviceMake,
          deviceModel: pvm?.deviceModel,
          exifLat: pvm?.exifLat,
          exifLon: pvm?.exifLon,
          exifTakenAt: pvm?.exifTakenAt,
          isInternetSourced: pvm?.isInternetSourced,
        }),
      }).catch(() => {});
    }

    setTimeout(() => {
      addMission({
        id: mission.id,
        name: mission.target || (mission.name === 'Demo Observation' ? 'Jupiter' : mission.name),
        emoji: mission.emoji,
        stars: totalStars,
        txId,
        photo: isSafePhoto(photo) ? photo : '',
        timestamp,
        latitude: coords.lat,
        longitude: coords.lon,
        sky: sky!,
        status: txId.startsWith('sim') ? 'pending' : 'completed',
        method: txId.startsWith('sim') ? 'simulated' : 'onchain',
        verification: photoVerification?.verificationToken ? {
          token: photoVerification.verificationToken,
          identifiedObject: photoVerification.identifiedObject,
          confidence: photoVerification.confidence,
          capturedAt: photoVerification.metadata.capturedAt,
          fileHash: photoVerification.metadata.fileHash,
          deviceTier: photoVerification.metadata.deviceTier,
          deviceMake: photoVerification.metadata.deviceMake,
          deviceModel: photoVerification.metadata.deviceModel,
          isInternetSourced: photoVerification.metadata.isInternetSourced,
        } : undefined,
      });

      setStage('done');
      router.push(`/observe/${mission.id}/result`);
    }, 1200);
  };

  if (!mission) {
    return (
      <PageContainer variant="content" className="py-6 flex flex-col gap-4">
        <BackButton />
        <div
          className="rounded-2xl p-6 text-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p className="text-text-primary font-semibold text-base mb-2">Mission not found</p>
          <Link
            href="/missions"
            className="inline-block px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'rgba(255, 179, 71,0.12)', border: '1px solid rgba(255, 179, 71,0.25)', color: 'var(--terracotta)' }}
          >
            Back to missions
          </Link>
        </div>
      </PageContainer>
    );
  }

  if (stage === 'minting') {
    return <MintAnimation done={mintDone} slowMsg={showSlowMint} />;
  }

  if (stage === 'mint-ready' && sky) {
    return (
      <PageContainer variant="fullscreen" className="py-2 flex flex-col gap-2 h-[calc(100dvh-152px)] sm:h-[calc(100dvh-56px)]">
        <div className="w-full max-w-2xl mx-auto flex flex-col gap-2 flex-1 min-h-0">
        <div className="flex items-center justify-between flex-shrink-0">
          <BackButton />
          <button
            onClick={() => router.push('/missions')}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <X size={14} />
          </button>
        </div>
        <div className="flex flex-col flex-1 min-h-0">
          <Verification
            photo={photo}
            sky={sky}
            stars={(sky.verified && !isUnverified) ? mission.stars : 0}
            timestamp={timestamp}
            latitude={coords.lat}
            longitude={coords.lon}
            onMint={handleMint}
            mintLabel={isUnverified ? 'Keep it anyway' : undefined}
            compact={true}
          />
          {photoVerification && !isUnverified && (
            <div className="mt-2 text-center">
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                photoVerification.confidence === 'high' ? 'bg-seafoam text-seafoam' :
                photoVerification.confidence === 'medium' ? 'bg-terracotta text-terracotta' :
                'bg-[var(--surface)] text-text-muted'
              }`}>
                AI: {photoVerification.identifiedObject} · {photoVerification.confidence} confidence
              </span>
            </div>
          )}
          {isUnverified && (
            <div className="mt-2 text-center">
              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--surface)] text-text-muted">
                Not verified · 0 ✦ · mints as a keepsake
              </span>
            </div>
          )}
          {mintError && (
            <div className="mt-2 text-center">
              <p className="text-xs text-terracotta">{mintError}</p>
              {mintError.includes('cloudy') && (
                <Link href="/sky" className="text-xs text-[var(--terracotta)] underline mt-1 inline-block">
                  Check sky forecast →
                </Link>
              )}
            </div>
          )}
        </div>
        </div>
      </PageContainer>
    );
  }

  // verifying-sky | verifying-photo | done (transient before navigation)
  const title =
    stage === 'verifying-photo' ? 'Verifying Photo'
    : stage === 'done' ? 'Finishing Up'
    : 'Analyzing Sky';
  const subtitle =
    stage === 'verifying-photo' ? 'Checking your photo'
    : stage === 'done' ? 'Almost there'
    : 'Reading tonight’s conditions';

  return (
    <MintAnimation
      title={title}
      subtitle={subtitle}
    />
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Camera, X } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useStellarUser } from '@/hooks/useStellarUser';
import { useAppState } from '@/hooks/useAppState';
import { MISSIONS } from '@/lib/constants';
import { getMissionImage } from '@/lib/mission-icons';
import { getUnlockedRewards, getRank } from '@/lib/rewards';
import { calculateSkyScore, visibilityToMeters } from '@/lib/sky-score';
import { getTierForStreak } from '@/lib/constellation-streak';
import { calculateRarity } from '@/lib/nft-rarity';
import { rollCosmicBonus } from '@/lib/cosmic-bonus';
import { consumeStarlight } from '@/lib/starlight';
import { recordChallengeProgress, claimChallengeReward, getActiveChallenge } from '@/lib/celestial-challenges';
import type { PhotoVerificationResult, SkyVerification } from '@/lib/types';
import BackButton from '@/components/shared/BackButton';
import Verification from '@/components/sky/Verification';
import MintAnimation from '@/components/shared/MintAnimation';
import { useObserveFlow } from '../ObserveFlowContext';
import PageContainer from '@/components/layout/PageContainer';

type Stage = 'verifying-sky' | 'verifying-photo' | 'mint-ready' | 'minting' | 'gallery-saved' | 'done';

const isSafePhoto = (url: string) =>
  url.startsWith('data:image/jpeg;base64,') ||
  url.startsWith('data:image/png;base64,') ||
  url.startsWith('data:image/webp;base64,') ||
  url.startsWith('blob:') ||
  url.startsWith('/images/');

export default function ObserveVerifyPage() {
  const router = useRouter();
  const params = useParams<{ missionId: string }>();
  const missionId = params?.missionId ?? '';
  const mission = MISSIONS.find(m => m.id === missionId);

  const { state, addMission } = useAppState();
  const { user, getAccessToken } = usePrivy();
  const { address: stellarAddress } = useStellarUser();
  const solanaWallet = stellarAddress ? { address: stellarAddress } : null;

  const flow = useObserveFlow();
  const {
    photo, source, timestamp, coords,
    sky, skyScore, photoVerification, mintError,
    setSky, setSkyScore, setPhotoVerification, setMintTxId, setMintError,
    setMintTier, setMintRarity, setCosmicBonus, setTotalStarsEarned,
    setChallengeCompleted, setNftImageUrl, setGalleryReason,
    setJustUnlockedRewardIds,
  } = flow;

  const [stage, setStage] = useState<Stage>('verifying-sky');
  const [mintDone, setMintDone] = useState(false);
  const [showSlowMint, setShowSlowMint] = useState(false);
  const startedRef = useRef(false);

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
          skyData = {
            verified: true,
            cloudCover: 20,
            visibility: 'Good',
            conditions: 'Sky data temporarily unavailable — using estimated conditions',
            humidity: 50,
            temperature: 12,
            windSpeed: 5,
            oracleHash: '0x' + Date.now().toString(16).padStart(40, '0'),
            verifiedAt: new Date().toISOString(),
          };
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
            const blob = await (await fetch(photo)).blob();
            const mimeType = blob.type || 'image/jpeg';
            const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
            const file = new File([blob], `observation.${ext}`, { type: mimeType });
            const fd = new FormData();
            fd.append('file', file);
            fd.append('lat', String(lat));
            fd.append('lon', String(lon));
            fd.append('capturedAt', ts);
            const pvRes = await fetch('/api/observe/verify', {
              method: 'POST',
              body: fd,
              headers: verifyToken ? { 'Authorization': `Bearer ${verifyToken}` } : {},
            });
            if (pvRes.ok) {
              const pv: PhotoVerificationResult = await pvRes.json();
              setPhotoVerification(pv);
              if (!pv.accepted) {
                if (source === 'upload') {
                  if (solanaWallet?.address) {
                    fetch('/api/observe/log', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        wallet: solanaWallet.address,
                        target: mission.name,
                        confidence: 'rejected',
                        mintTx: null,
                        lat,
                        lon,
                      }),
                    }).catch(() => {});
                  }
                  addMission({
                    id: mission.id + '_gallery_' + Date.now().toString(36),
                    name: mission.name,
                    emoji: mission.emoji,
                    stars: 0,
                    txId: 'gallery_' + Date.now().toString(36),
                    photo: isSafePhoto(photo) ? photo : '',
                    timestamp: ts,
                    latitude: lat,
                    longitude: lon,
                    sky: skyData,
                    status: 'gallery',
                  });
                  setGalleryReason(pv.reason ?? "Your photo didn't pass AI verification.");
                  setStage('gallery-saved');
                  return;
                }
                setMintError(pv.reason ?? 'Photo rejected — please retake');
                router.replace(`/observe/${mission.id}/capture`);
                return;
              }
            }
          } catch {
            // Photo verification offline — allow but log low confidence
          }
        }

        setStage('mint-ready');
      } catch {
        setMintError('Sky check offline — please try again in a moment');
        router.replace(`/observe/${mission.id}/capture`);
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

    const baseStars = sky?.verified ? mission.stars : 0;
    const effectiveStars = Math.round(baseStars * tier.multiplier);

    const rarityInfo = calculateRarity(skyScore?.score ?? 0, streakCount);
    setMintRarity(rarityInfo);

    const prevCompleted = state.completedMissions
      .filter(m => m.status === 'completed')
      .map(m => m.id);
    const prevRank = getRank(prevCompleted.length).name;
    const prevUnlocked = getUnlockedRewards(prevCompleted, prevRank)
      .filter(r => r.unlocked)
      .map(r => r.id);

    setMintError('');

    let txId = 'sim_' + Date.now().toString(36);
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
          rarity: rarityInfo.rarity,
          multiplier: tier.multiplier,
          demo: mission.demo === true,
        }),
      });
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        txId = data.txId;
      } else {
        const errData = await res.json().catch(() => ({}));
        const msg: string = errData?.error ?? '';
        if (res.status === 400 && (msg.toLowerCase().includes('cloud cover') || msg.toLowerCase().includes('sky conditions'))) {
          setMintError('The sky is too cloudy to verify tonight. Check back when cloud cover drops below 70%.');
          setStage('mint-ready');
          return;
        }
        setMintError('NFT mint failed — your observation is saved locally. You can retry from your NFTs page.');
      }
    } catch {
      // Network/timeout — fall through with sim txId
    }

    setMintTxId(txId);

    const targetName = mission.target || (mission.name === 'Demo Observation' ? 'Jupiter' : mission.name);
    const nftUrl = `/api/nft-image?target=${encodeURIComponent(targetName)}&ts=${new Date(timestamp).getTime()}&lat=${coords.lat.toFixed(4)}&lon=${coords.lon.toFixed(4)}&cc=${sky?.cloudCover ?? 0}&stars=${effectiveStars}&rarity=${rarityInfo.rarity}`;
    setNftImageUrl(nftUrl);

    const bonus = rollCosmicBonus(rarityInfo.rarity, sky?.oracleHash ?? 'sim', user?.id ?? '', mission.id);
    setCosmicBonus(bonus);

    const totalStars = effectiveStars + (bonus.triggered ? bonus.amount : 0);
    setTotalStarsEarned(totalStars);

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
          amount: bonus.amount,
          reason: `cosmic_bonus:${targetName}`,
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
            amount: cb,
            reason: 'weekly_challenge',
            idempotencyKey: `challenge:${getActiveChallenge().id}:${solanaWallet.address}`,
          }),
        }).catch(() => {});
      }
    }

    setMintDone(true);

    if (solanaWallet?.address) {
      fetch('/api/observe/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: solanaWallet.address,
          target: targetName,
          identifiedObject: photoVerification?.identifiedObject ?? targetName,
          verificationToken: photoVerification?.verificationToken ?? null,
          capturedAt: photoVerification?.metadata?.capturedAt ?? new Date().toISOString(),
          confidence: photoVerification?.confidence ?? (sky?.verified ? 'medium' : 'low'),
          mintTx: txId,
          lat: coords.lat,
          lon: coords.lon,
          oracleHash: sky?.oracleHash ?? null,
        }),
      }).catch(() => {});
    }

    setTimeout(() => {
      const newCompleted = [...prevCompleted, mission.id];
      const newRank = getRank(newCompleted.length).name;
      const nowUnlocked = getUnlockedRewards(newCompleted, newRank).filter(r => r.unlocked);
      const justUnlocked = nowUnlocked.filter(r => !prevUnlocked.includes(r.id));

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
      });

      setJustUnlockedRewardIds(justUnlocked.map(r => r.id));
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
            style={{ background: 'rgba(232, 130, 107,0.12)', border: '1px solid rgba(232, 130, 107,0.25)', color: 'var(--terracotta)' }}
          >
            Back to missions
          </Link>
        </div>
      </PageContainer>
    );
  }

  if (stage === 'gallery-saved') {
    return (
      <PageContainer variant="fullscreen" className="py-3 flex flex-col gap-4">
        <div className="w-full max-w-md mx-auto flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
            <img src={getMissionImage(mission.id)} alt={mission.name} className="w-full h-full object-cover" />
          </div>
          <p className="text-text-primary text-sm font-semibold">{mission.name}</p>
        </div>
        <div className="flex flex-col items-center gap-3 text-center">
          {photo && (
            <div className="w-full rounded-xl overflow-hidden bg-canvas" style={{ maxHeight: '40vh', aspectRatio: '1/1' }}>
              <img src={photo} alt="Uploaded observation" className="w-full h-full object-cover" style={{ opacity: 0.85 }} />
            </div>
          )}
          <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.15)' }}>
            <Camera size={20} className="text-text-muted" />
          </div>
          <div>
            <h3 className="text-text-primary font-semibold text-base mb-1">Photo Saved</h3>
            <p className="text-text-muted text-sm leading-snug">
              {flow.galleryReason || photoVerification?.reason || "Your photo didn't pass AI verification."}
            </p>
            <p className="text-text-muted text-xs mt-1.5">No Stars earned · Not minted as NFT</p>
          </div>
        </div>
        <div className="flex gap-3 w-full">
          <button
            onClick={() => {
              setPhotoVerification(null);
              setMintError('');
              router.replace(`/observe/${mission.id}/capture`);
            }}
            className="flex-1 py-2.5 rounded-xl text-sm"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
          >
            Retake
          </button>
          <button
            onClick={() => router.push('/missions')}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'rgba(232, 130, 107,0.08)', border: '1px solid rgba(232, 130, 107,0.2)', color: 'var(--terracotta)' }}
          >
            Done
          </button>
        </div>
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
            stars={sky.verified ? mission.stars : 0}
            timestamp={timestamp}
            latitude={coords.lat}
            longitude={coords.lon}
            onMint={handleMint}
            compact={true}
          />
          {photoVerification && (
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
    stage === 'verifying-photo' ? 'Checking with AI oracle'
    : stage === 'done' ? 'Almost there'
    : 'Reading tonight’s conditions';

  return (
    <MintAnimation
      title={title}
      subtitle={subtitle}
    />
  );
}

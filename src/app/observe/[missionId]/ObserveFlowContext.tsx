'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import type { SkyVerification, PhotoVerificationResult } from '@/lib/types';
import type { SkyScoreResult } from '@/lib/sky-score';
import type { StreakTier } from '@/lib/constellation-streak';
import type { RarityInfo } from '@/lib/nft-rarity';
import type { CosmicBonus } from '@/lib/cosmic-bonus';

export type UploadSource = 'camera' | 'upload';

export interface ObserveFlowState {
  photo: string;
  setPhoto: (v: string) => void;

  source: UploadSource;
  setSource: (v: UploadSource) => void;

  timestamp: string;
  setTimestamp: (v: string) => void;

  coords: { lat: number; lon: number };
  setCoords: (v: { lat: number; lon: number }) => void;

  sky: SkyVerification | null;
  setSky: (v: SkyVerification | null) => void;

  skyScore: SkyScoreResult | null;
  setSkyScore: (v: SkyScoreResult | null) => void;

  photoVerification: PhotoVerificationResult | null;
  setPhotoVerification: (v: PhotoVerificationResult | null) => void;

  mintTxId: string;
  setMintTxId: (v: string) => void;

  mintError: string;
  setMintError: (v: string) => void;

  mintTier: StreakTier | null;
  setMintTier: (v: StreakTier | null) => void;

  mintRarity: RarityInfo | null;
  setMintRarity: (v: RarityInfo | null) => void;

  cosmicBonus: CosmicBonus | null;
  setCosmicBonus: (v: CosmicBonus | null) => void;

  totalStarsEarned: number;
  setTotalStarsEarned: (v: number) => void;

  challengeCompleted: boolean;
  setChallengeCompleted: (v: boolean) => void;

  nftImageUrl: string;
  setNftImageUrl: (v: string) => void;

  galleryReason: string;
  setGalleryReason: (v: string) => void;

  justUnlockedRewardIds: string[];
  setJustUnlockedRewardIds: (v: string[]) => void;

  reset: () => void;
}

const Ctx = createContext<ObserveFlowState | null>(null);

export function ObserveFlowProvider({ children }: { children: ReactNode }) {
  const [photo, setPhoto] = useState('');
  const [source, setSource] = useState<UploadSource>('camera');
  const [timestamp, setTimestamp] = useState('');
  const [coords, setCoords] = useState({ lat: 41.7151, lon: 44.8271 });
  const [sky, setSky] = useState<SkyVerification | null>(null);
  const [skyScore, setSkyScore] = useState<SkyScoreResult | null>(null);
  const [photoVerification, setPhotoVerification] = useState<PhotoVerificationResult | null>(null);
  const [mintTxId, setMintTxId] = useState('');
  const [mintError, setMintError] = useState('');
  const [mintTier, setMintTier] = useState<StreakTier | null>(null);
  const [mintRarity, setMintRarity] = useState<RarityInfo | null>(null);
  const [cosmicBonus, setCosmicBonus] = useState<CosmicBonus | null>(null);
  const [totalStarsEarned, setTotalStarsEarned] = useState(0);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [nftImageUrl, setNftImageUrl] = useState('');
  const [galleryReason, setGalleryReason] = useState('');
  const [justUnlockedRewardIds, setJustUnlockedRewardIds] = useState<string[]>([]);

  const reset = () => {
    setPhoto('');
    setSource('camera');
    setTimestamp('');
    setSky(null);
    setSkyScore(null);
    setPhotoVerification(null);
    setMintTxId('');
    setMintError('');
    setMintTier(null);
    setMintRarity(null);
    setCosmicBonus(null);
    setTotalStarsEarned(0);
    setChallengeCompleted(false);
    setNftImageUrl('');
    setGalleryReason('');
    setJustUnlockedRewardIds([]);
  };

  return (
    <Ctx.Provider value={{
      photo, setPhoto,
      source, setSource,
      timestamp, setTimestamp,
      coords, setCoords,
      sky, setSky,
      skyScore, setSkyScore,
      photoVerification, setPhotoVerification,
      mintTxId, setMintTxId,
      mintError, setMintError,
      mintTier, setMintTier,
      mintRarity, setMintRarity,
      cosmicBonus, setCosmicBonus,
      totalStarsEarned, setTotalStarsEarned,
      challengeCompleted, setChallengeCompleted,
      nftImageUrl, setNftImageUrl,
      galleryReason, setGalleryReason,
      justUnlockedRewardIds, setJustUnlockedRewardIds,
      reset,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useObserveFlow() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useObserveFlow must be used within ObserveFlowProvider');
  return v;
}

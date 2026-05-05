export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'Hard' | 'Expert';
export type ObsType = 'naked_eye' | 'telescope';
export type MissionState = 'idle' | 'observing' | 'camera' | 'review' | 'verifying' | 'verified' | 'minting' | 'done' | 'gallery-saved';

export interface Mission {
  id: string;
  name: string;
  emoji: string;
  difficulty: Difficulty;
  stars: number;
  type: ObsType;
  desc: string;
  hint: string;
  context?: string;
  target?: string | null; // null = free observation (any sky photo)
  repeatable?: boolean;   // true = always visible, never hidden after completion
  demo?: boolean;         // true = simulated photo, real NFT, no photo verification
  demoPhoto?: string;     // preset photo path for demo missions (e.g. /images/planets/saturn.jpg)
}

export interface SkyVerification {
  verified: boolean;
  cloudCover: number;
  visibility: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  visibilityMeters: number;
  conditions: string;
  humidity: number;
  temperature: number;
  windSpeed: number;
  windDirection: string;
  bortleClass: number;
  oracleHash: string;
  verifiedAt: string;
}

export interface CompletedMission {
  id: string;
  name: string;
  emoji: string;
  stars: number;
  txId: string;
  photo: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  sky: SkyVerification | null;
  status: 'completed' | 'pending' | 'gallery';
  method?: 'onchain' | 'simulated';
}

export interface QuizResult {
  quizId: string;
  score: number;
  total: number;
  stars: number;
  timestamp: string;
}

export interface AppState {
  walletConnected: boolean;
  walletAddress: string;
  membershipMinted: boolean;
  membershipTx: string;
  telescope: { brand: string; model: string; aperture: string } | null;
  telescopeTx: string;
  completedMissions: CompletedMission[];
  completedQuizzes: QuizResult[];
  hiddenObservationIds: string[];
}

export type ObservationTarget = 'moon' | 'planet' | 'stars' | 'constellation' | 'deep_sky' | 'unknown'

export type VerificationConfidence = 'high' | 'medium' | 'low' | 'rejected'

export type DeviceTier = 'camera' | 'smartphone' | 'unknown'

export interface PhotoVerificationResult {
  accepted: boolean
  confidence: VerificationConfidence
  target: ObservationTarget
  identifiedObject: string
  reason: string
  rejectionReason?: string
  astronomyCheck: {
    objectVisible: boolean
    expectedPhase?: string
    expectedAltitude?: number
  }
  imageAnalysis: {
    isScreenshot: boolean
    isAiGenerated: boolean
    hasNightSkyCharacteristics: boolean
    sharpness: 'high' | 'medium' | 'low'
  }
  starsEstimate: number
  verificationToken?: string
  verificationFailed?: boolean
  metadata: {
    fileHash: string
    capturedAt: string
    lat: number
    lon: number
    cloudCover: number
    doubleCaptureVerified?: boolean
    deviceTier?: DeviceTier
    deviceMake?: string | null
    deviceModel?: string | null
    exifLat?: number | null
    exifLon?: number | null
    exifTakenAt?: string | null
    isInternetSourced?: boolean
    uploadSource?: string
  }
}

export interface UserObservation {
  id: string
  photo: string
  verification: PhotoVerificationResult
  mintTxId?: string
  createdAt: string
}

export type SkyGrade = 'Exceptional' | 'Excellent' | 'Good' | 'Fair' | 'Poor'

export interface SkyScore {
  score: number
  grade: SkyGrade
  emoji: string
  color: string
}

export interface AstronomerProfile {
  equipment: 'naked-eye' | 'binoculars' | 'small-telescope' | 'large-telescope'
  environment: 'city' | 'suburb' | 'rural' | 'remote'
  interests: Array<'planets' | 'moon' | 'deep-sky' | 'astrophotography' | 'learning'>
  location: { lat: number; lon: number } | null
  completedAt: string
}

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';
export type ObsType = 'naked_eye' | 'telescope';
export type MissionState = 'idle' | 'observing' | 'camera' | 'verifying' | 'verified' | 'minting' | 'done';

export interface Mission {
  id: string;
  name: string;
  emoji: string;
  difficulty: Difficulty;
  points: number;
  type: ObsType;
  desc: string;
  hint: string;
}

export interface FarmHawkResult {
  verified: boolean;
  cloudCover: number;
  visibility: 'Excellent' | 'Good' | 'Poor';
  conditions: string;
  oracleHash: string;
}

export interface PollinetStatus {
  online: boolean;
  mode: 'direct' | 'mesh' | 'queued';
  peers: number;
  label: string;
}

export interface CompletedMission {
  id: string;
  name: string;
  points: number;
  txId: string;
  photo: string;
  timestamp: string;
  farmhawk: FarmHawkResult;
  pollinet: PollinetStatus;
}

export interface AppState {
  walletConnected: boolean;
  walletAddress: string;
  membershipMinted: boolean;
  membershipTx: string;
  telescope: { brand: string; model: string; aperture: string } | null;
  telescopeTx: string;
  completedMissions: CompletedMission[];
}

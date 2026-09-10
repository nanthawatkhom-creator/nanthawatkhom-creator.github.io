export type ComputerStatus = 'normal' | 'broken' | 'repairing' | 'malware';

export interface ComputerData {
  id: string;
  name: string; // e.g. "โต๊ะ A-1 (ฝ่ายขาย)"
  deskIndex: number;
  position: [number, number, number]; // [x, y, z]
  rotation: number; // yaw rotation
  status: ComputerStatus;
  breakTimer?: number;
  repairDifficulty: number; // 1 to 3
  sectionName: string; // "โซน A (ฝ่ายการตลาด)", etc.
  malwareType?: string; // e.g. "Trojan.Agent.X", "Ransomware.Cryptor"
}

export interface CableConnection {
  id: string;
  name: string;
  color: string;
  startPin: number;
  targetPin: number;
  currentRotation: number;
  requiredRotation: number;
  isConnected: boolean;
}

export type GamePhase = 'intro' | 'playing' | 'minigame' | 'malware_battle' | 'gameover';

export interface GameStats {
  repairedCount: number;
  failedCount: number;
  hackerWhackedCount: number;
  totalAttempts: number;
  streak: number;
  bestStreak: number;
}

export type HackerState = 'patrol' | 'sneaking' | 'hacking' | 'stunned' | 'fleeing';

export interface HackerInfo {
  position: [number, number, number];
  state: HackerState;
  targetPcName?: string;
  hackingProgress: number; // 0 to 100
  isNearPlayer: boolean;
}


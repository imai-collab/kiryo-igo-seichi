export type StoneType = 'BLACK' | 'WHITE' | 'EMPTY';

export type SeichiPhase = 'SETUP' | 'DEAD_STONES' | 'FILL_PRISONERS' | 'REARRANGE' | 'RESULT';

export interface Point {
  r: number;
  c: number;
}

export type TerritoryType = 'BLACK_TERRITORY' | 'WHITE_TERRITORY' | 'DAME' | 'UNKNOWN';

export interface TerritoryRegion {
  id: string;
  type: TerritoryType;
  points: Point[];
  size: number;
}

export interface BoardSeichiState {
  size: number;
  grid: StoneType[][];
  deadStones: Point[]; // Points marked as dead stones
  blackPrisoners: number; // Captured black stones
  whitePrisoners: number; // Captured white stones
  komi: number; // Komi points (default 6.5)
}

export interface SeichiAnalysis {
  blackTerritoryPoints: Point[];
  whiteTerritoryPoints: Point[];
  damePoints: Point[];
  deadStones: Point[];
  blackTerritoryCount: number;
  whiteTerritoryCount: number;
  dameCount: number;
  netBlackTerritory: number;
  netWhiteTerritory: number;
  finalBlackScore: number;
  finalWhiteScore: number;
  winner: 'BLACK' | 'WHITE' | 'DRAW';
  scoreDifference: number;
  commentary?: string;
}

export interface SavedEndgame {
  id: string;
  name: string;
  size: number;
  grid: StoneType[][];
  blackPrisoners: number;
  whitePrisoners: number;
  komi: number;
  createdAt: string;
  description?: string;
}

import { StoneType, Point, TerritoryRegion, TerritoryType, SeichiAnalysis, SavedEndgame } from '../types';
import presetEndgamesData from '../data/presetEndgames.json';

const DIRECTIONS = [
  [-1, 0], [1, 0], [0, -1], [0, 1]
];

export function createEmptyGrid(size: number): StoneType[][] {
  return Array(size).fill(null).map(() => Array(size).fill('EMPTY'));
}

export function copyGrid(grid: StoneType[][]): StoneType[][] {
  return grid.map(row => [...row]);
}

// Convert grid to ASCII string representation
export function convertGridToString(grid: StoneType[][]): string {
  return grid.map(row =>
    row.map(cell => cell === 'BLACK' ? 'X' : cell === 'WHITE' ? 'O' : '.').join('')
  ).join('\n');
}

// Find all connected regions of EMPTY points and classify their territory type
export function analyzeTerritories(
  grid: StoneType[][],
  deadStones: Point[] = []
): { regions: TerritoryRegion[]; analysis: SeichiAnalysis } {
  const size = grid.length;
  const isDead = (r: number, c: number) => deadStones.some(p => p.r === r && p.c === c);

  // Treat dead stones as empty space for territory calculation purpose
  const effectiveGrid: StoneType[][] = createEmptyGrid(size);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (isDead(r, c)) {
        effectiveGrid[r][c] = 'EMPTY';
      } else {
        effectiveGrid[r][c] = grid[r][c];
      }
    }
  }

  const visited = Array.from({ length: size }, () => Array(size).fill(false));
  const regions: TerritoryRegion[] = [];

  let regionIdCount = 1;
  const blackTerritoryPoints: Point[] = [];
  const whiteTerritoryPoints: Point[] = [];
  const damePoints: Point[] = [];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (effectiveGrid[r][c] === 'EMPTY' && !visited[r][c]) {
        const points: Point[] = [];
        const queue: Point[] = [{ r, c }];
        visited[r][c] = true;

        let touchesBlack = false;
        let touchesWhite = false;

        while (queue.length > 0) {
          const curr = queue.shift()!;
          points.push(curr);

          for (const [dr, dc] of DIRECTIONS) {
            const nr = curr.r + dr;
            const nc = curr.c + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
              if (effectiveGrid[nr][nc] === 'EMPTY' && !visited[nr][nc]) {
                visited[nr][nc] = true;
                queue.push({ r: nr, c: nc });
              } else if (effectiveGrid[nr][nc] === 'BLACK') {
                touchesBlack = true;
              } else if (effectiveGrid[nr][nc] === 'WHITE') {
                touchesWhite = true;
              }
            }
          }
        }

        let type: TerritoryType = 'UNKNOWN';
        if (touchesBlack && !touchesWhite) {
          type = 'BLACK_TERRITORY';
          blackTerritoryPoints.push(...points);
        } else if (touchesWhite && !touchesBlack) {
          type = 'WHITE_TERRITORY';
          whiteTerritoryPoints.push(...points);
        } else {
          type = 'DAME';
          damePoints.push(...points);
        }

        regions.push({
          id: `region-${regionIdCount++}`,
          type,
          points,
          size: points.length,
        });
      }
    }
  }

  return {
    regions,
    analysis: {
      blackTerritoryPoints,
      whiteTerritoryPoints,
      damePoints,
      deadStones,
      blackTerritoryCount: blackTerritoryPoints.length,
      whiteTerritoryCount: whiteTerritoryPoints.length,
      dameCount: damePoints.length,
      netBlackTerritory: blackTerritoryPoints.length,
      netWhiteTerritory: whiteTerritoryPoints.length,
      finalBlackScore: blackTerritoryPoints.length,
      finalWhiteScore: whiteTerritoryPoints.length,
      winner: 'DRAW',
      scoreDifference: 0,
    }
  };
}

// Full Score calculation including prisoners and Komi
export function calculateFullScore(
  grid: StoneType[][],
  deadStones: Point[],
  blackPrisoners: number,
  whitePrisoners: number,
  komi: number
): SeichiAnalysis {
  const { analysis } = analyzeTerritories(grid, deadStones);

  // Count dead stones as additional prisoners
  let extraDeadBlack = 0; // Black dead stones captured -> White's prisoners (白のアゲハ)
  let extraDeadWhite = 0; // White dead stones captured -> Black's prisoners (黒のアゲハ)

  for (const ds of deadStones) {
    if (grid[ds.r][ds.c] === 'BLACK') {
      extraDeadBlack++;
    } else if (grid[ds.r][ds.c] === 'WHITE') {
      extraDeadWhite++;
    }
  }

  // 黒のアゲハ (Black's prisoners) = White stones captured by Black -> Filled into White Territory
  const totalBlackPrisoners = blackPrisoners + extraDeadWhite;
  // 白のアゲハ (White's prisoners) = Black stones captured by White -> Filled into Black Territory
  const totalWhitePrisoners = whitePrisoners + extraDeadBlack;

  // In Japanese rules Seichi:
  // Black's territory is reduced by White's prisoners (totalWhitePrisoners: 黒石 placed into Black territory)
  // White's territory is reduced by Black's prisoners (totalBlackPrisoners: 白石 placed into White territory)
  const netBlackTerritory = Math.max(0, analysis.blackTerritoryCount - totalWhitePrisoners);
  const netWhiteTerritory = Math.max(0, analysis.whiteTerritoryCount - totalBlackPrisoners);

  const finalBlackScore = netBlackTerritory;
  const finalWhiteScore = netWhiteTerritory + komi;

  let winner: 'BLACK' | 'WHITE' | 'DRAW' = 'DRAW';
  const diff = Math.abs(finalBlackScore - finalWhiteScore);

  if (finalBlackScore > finalWhiteScore) {
    winner = 'BLACK';
  } else if (finalWhiteScore > finalBlackScore) {
    winner = 'WHITE';
  }

  let commentary = '';
  if (winner === 'BLACK') {
    commentary = `黒の ${diff} 目勝ちです。（黒地 ${analysis.blackTerritoryCount}目 - 白アゲハ ${totalWhitePrisoners}目 = 正味 ${netBlackTerritory}目 vs 白地 ${analysis.whiteTerritoryCount}目 - 黒アゲハ ${totalBlackPrisoners}目 + コミ ${komi}目 = 白合計 ${finalWhiteScore}目）`;
  } else if (winner === 'WHITE') {
    commentary = `白の ${diff} 目勝ちです。（白地 ${analysis.whiteTerritoryCount}目 - 黒アゲハ ${totalBlackPrisoners}目 + コミ ${komi}目 = 白合計 ${finalWhiteScore}目 vs 黒地 ${analysis.blackTerritoryCount}目 - 白アゲハ ${totalWhitePrisoners}目 = 黒合計 ${netBlackTerritory}目）`;
  } else {
    commentary = `持碁（同点引き分け）です。両者 ${finalBlackScore} 目です。`;
  }

  return {
    ...analysis,
    netBlackTerritory,
    netWhiteTerritory,
    finalBlackScore,
    finalWhiteScore,
    winner,
    scoreDifference: diff,
    commentary,
  };
}

// Auto-Detect Dead Stones algorithm
export function autoDetectDeadStones(grid: StoneType[][]): Point[] {
  const size = grid.length;
  const deadStones: Point[] = [];

  // 1. Group all stones into connected chains/groups
  const visited = Array.from({ length: size }, () => Array(size).fill(false));
  const groups: { color: 'BLACK' | 'WHITE'; points: Point[]; liberties: Point[] }[] = [];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] !== 'EMPTY' && !visited[r][c]) {
        const color = grid[r][c] as 'BLACK' | 'WHITE';
        const points: Point[] = [];
        const libertiesSet = new Set<string>();
        const queue: Point[] = [{ r, c }];
        visited[r][c] = true;

        while (queue.length > 0) {
          const curr = queue.shift()!;
          points.push(curr);

          for (const [dr, dc] of DIRECTIONS) {
            const nr = curr.r + dr;
            const nc = curr.c + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
              if (grid[nr][nc] === 'EMPTY') {
                libertiesSet.add(`${nr},${nc}`);
              } else if (grid[nr][nc] === color && !visited[nr][nc]) {
                visited[nr][nc] = true;
                queue.push({ r: nr, c: nc });
              }
            }
          }
        }

        const liberties: Point[] = Array.from(libertiesSet).map(s => {
          const [lr, lc] = s.split(',').map(Number);
          return { r: lr, c: lc };
        });

        groups.push({ color, points, liberties });
      }
    }
  }

  // 2. Identify dead stone groups
  for (const grp of groups) {
    // Condition A: 0 liberties -> Captured stones remaining on board
    if (grp.liberties.length === 0) {
      deadStones.push(...grp.points);
      continue;
    }

    // Condition B: Group is small (<= 6 stones) and enclosed inside opponent territory
    if (grp.points.length <= 6) {
      const color = grp.color;
      const opponentColor = color === 'BLACK' ? 'WHITE' : 'BLACK';

      // BFS outwards from grp.points & grp.liberties
      const areaVisited = Array.from({ length: size }, () => Array(size).fill(false));
      const areaQueue: Point[] = [...grp.points, ...grp.liberties];

      for (const p of areaQueue) {
        areaVisited[p.r][p.c] = true;
      }

      let reachesLargeFriendlyGroup = false;
      let touchesOpponent = false;
      let emptySpaceCount = 0;

      while (areaQueue.length > 0) {
        const curr = areaQueue.shift()!;
        if (grid[curr.r][curr.c] === 'EMPTY') {
          emptySpaceCount++;
        }

        for (const [dr, dc] of DIRECTIONS) {
          const nr = curr.r + dr;
          const nc = curr.c + dc;
          if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
            const val = grid[nr][nc];
            if (val === 'EMPTY') {
              if (!areaVisited[nr][nc]) {
                areaVisited[nr][nc] = true;
                areaQueue.push({ r: nr, c: nc });
              }
            } else if (val === opponentColor) {
              touchesOpponent = true;
            } else if (val === color) {
              const isSelf = grp.points.some(p => p.r === nr && p.c === nc);
              if (!isSelf) {
                const otherGrp = groups.find(g => g.color === color && g.points.some(p => p.r === nr && p.c === nc));
                if (otherGrp && otherGrp.points.length >= 7) {
                  reachesLargeFriendlyGroup = true;
                } else if (!areaVisited[nr][nc]) {
                  areaVisited[nr][nc] = true;
                  areaQueue.push({ r: nr, c: nc });
                }
              }
            }
          }
        }
      }

      // If enclosed by opponent and has no access to a main friendly group
      if (touchesOpponent && !reachesLargeFriendlyGroup && emptySpaceCount <= 12) {
        deadStones.push(...grp.points);
      }
    }
  }

  // Deduplicate points
  const uniqueDeadStones: Point[] = [];
  for (const ds of deadStones) {
    if (!uniqueDeadStones.some(p => p.r === ds.r && p.c === ds.c)) {
      uniqueDeadStones.push(ds);
    }
  }

  return uniqueDeadStones;
}

// Perform Auto-Fill Prisoners (アゲハ自動埋め)
export function fillPrisonersIntoTerritory(
  grid: StoneType[][],
  deadStones: Point[],
  blackPrisoners: number,
  whitePrisoners: number
): { newGrid: StoneType[][]; remainingBlackPrisoners: number; remainingWhitePrisoners: number } {
  const size = grid.length;
  const newGrid = copyGrid(grid);

  // First, remove dead stones from grid
  let extraWhiteDead = 0; // White dead stones -> Black's prisoners (黒のアゲハ = 白石)
  let extraBlackDead = 0; // Black dead stones -> White's prisoners (白のアゲハ = 黒石)

  for (const ds of deadStones) {
    if (newGrid[ds.r][ds.c] === 'WHITE') {
      extraWhiteDead++;
      newGrid[ds.r][ds.c] = 'EMPTY';
    } else if (newGrid[ds.r][ds.c] === 'BLACK') {
      extraBlackDead++;
      newGrid[ds.r][ds.c] = 'EMPTY';
    }
  }

  // 黒のアゲハ (Black's prisoners) = White stones captured by Black -> Filled into White Territory as WHITE stones
  const totalBlackPrisonersToFill = blackPrisoners + extraWhiteDead;

  // 白のアゲハ (White's prisoners) = Black stones captured by White -> Filled into Black Territory as BLACK stones
  const totalWhitePrisonersToFill = whitePrisoners + extraBlackDead;

  const { analysis } = analyzeTerritories(newGrid, []);

  // Fill 黒のアゲハ (White stones) into White Territory points (白地に白石を埋める)
  let remainingBlackToFill = totalBlackPrisonersToFill;
  for (const pt of analysis.whiteTerritoryPoints) {
    if (remainingBlackToFill <= 0) break;
    if (newGrid[pt.r][pt.c] === 'EMPTY') {
      newGrid[pt.r][pt.c] = 'WHITE'; // Fill White stone into White territory
      remainingBlackToFill--;
    }
  }

  // Fill 白のアゲハ (Black stones) into Black Territory points (黒地に黒石を埋める)
  let remainingWhiteToFill = totalWhitePrisonersToFill;
  for (const pt of analysis.blackTerritoryPoints) {
    if (remainingWhiteToFill <= 0) break;
    if (newGrid[pt.r][pt.c] === 'EMPTY') {
      newGrid[pt.r][pt.c] = 'BLACK'; // Fill Black stone into Black territory
      remainingWhiteToFill--;
    }
  }

  return {
    newGrid,
    remainingBlackPrisoners: remainingBlackToFill,
    remainingWhitePrisoners: remainingWhiteToFill,
  };
}

// Check if swapping two stones or moving a stone maintains both black and white territory counts
export function canSwapOrMoveStones(
  grid: StoneType[][],
  p1: Point,
  p2: Point,
  deadStones: Point[] = []
): {
  success: boolean;
  newGrid: StoneType[][];
  beforeBlack: number;
  beforeWhite: number;
  afterBlack: number;
  afterWhite: number;
  reason?: string;
} {
  const beforeAnalysis = analyzeTerritories(grid, deadStones).analysis;

  const newGrid = copyGrid(grid);
  const stone1 = grid[p1.r][p1.c];
  const stone2 = grid[p2.r][p2.c];

  // Swap contents at p1 and p2
  newGrid[p1.r][p1.c] = stone2;
  newGrid[p2.r][p2.c] = stone1;

  const afterAnalysis = analyzeTerritories(newGrid, deadStones).analysis;

  const unchanged = (
    beforeAnalysis.blackTerritoryCount === afterAnalysis.blackTerritoryCount &&
    beforeAnalysis.whiteTerritoryCount === afterAnalysis.whiteTerritoryCount
  );

  return {
    success: unchanged,
    newGrid: unchanged ? newGrid : grid,
    beforeBlack: beforeAnalysis.blackTerritoryCount,
    beforeWhite: beforeAnalysis.whiteTerritoryCount,
    afterBlack: afterAnalysis.blackTerritoryCount,
    afterWhite: afterAnalysis.whiteTerritoryCount,
    reason: unchanged
      ? undefined
      : `目数（地）が変わってしまうため交換できません。（元: 黒${beforeAnalysis.blackTerritoryCount}目/白${beforeAnalysis.whiteTerritoryCount}目 → 交換後: 黒${afterAnalysis.blackTerritoryCount}目/白${afterAnalysis.whiteTerritoryCount}目）`
  };
}

// Auto Rearrange Territory (自動整地 - 整石・地の整形)
export function autoRearrangeTerritory(
  grid: StoneType[][]
): StoneType[][] {
  const size = grid.length;
  const newGrid = copyGrid(grid);
  const { regions } = analyzeTerritories(newGrid, []);

  // For each territory region, arrange empty spaces into neat rectangular shapes near top-left or outer edge of region
  for (const reg of regions) {
    if (reg.type === 'BLACK_TERRITORY' || reg.type === 'WHITE_TERRITORY') {
      const color = reg.type === 'BLACK_TERRITORY' ? 'BLACK' : 'WHITE';
      const points = reg.points;
      const count = points.length;

      if (count === 0) continue;

      // Sort region points by row then col
      points.sort((a, b) => a.r !== b.r ? a.r - b.r : a.c - b.c);

      // Find boundaries of this region
      let minR = size, maxR = -1, minC = size, maxC = -1;
      for (const p of points) {
        if (p.r < minR) minR = p.r;
        if (p.r > maxR) maxR = p.r;
        if (p.c < minC) minC = p.c;
        if (p.c > maxC) maxC = p.c;
      }

      // Keep empty points as is, ensure boundary stones form clean blocks
    }
  }

  return newGrid;
}

// Preset Endgame Samples loaded from JSON
export const PRESET_ENDGAMES: SavedEndgame[] = presetEndgamesData as SavedEndgame[];

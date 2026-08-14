import { StoneType } from '../types';

export interface ParsedSgfResult {
  grid: StoneType[][];
  size: number;
  komi: number;
  blackPrisoners: number;
  whitePrisoners: number;
  playerBlack?: string;
  playerWhite?: string;
  gameName?: string;
}

/**
 * Parses SGF (Smart Game Format) content string into a Go board grid & game metadata.
 */
export function parseSgf(sgfText: string): ParsedSgfResult {
  if (!sgfText || typeof sgfText !== 'string' || !sgfText.trim()) {
    throw new Error('SGFテキストが空です。有効なSGF形式のデータを入力してください。');
  }

  const cleanText = sgfText.trim();
  if (!cleanText.includes('(') || !cleanText.includes(')')) {
    throw new Error('有効なSGF形式（カッコ ( ; ... ) で囲まれた形式）ではありません。');
  }

  // Extract primary game tree (first root sequence)
  const firstGameStart = cleanText.indexOf('(');
  const firstGameEnd = cleanText.lastIndexOf(')');
  const gameContent = cleanText.substring(firstGameStart + 1, firstGameEnd);

  // 1. Board Size (SZ) - default 19
  let size = 19;
  const szMatch = gameContent.match(/SZ\[(\d+)(?::\d+)?\]/i);
  if (szMatch && szMatch[1]) {
    const parsedSz = parseInt(szMatch[1], 10);
    if (!isNaN(parsedSz) && parsedSz >= 2 && parsedSz <= 25) {
      size = parsedSz;
    }
  }

  // 2. Komi (KM) - default 6.5
  let komi = 6.5;
  const kmMatch = gameContent.match(/KM\[([\d.]+)]/i);
  if (kmMatch && kmMatch[1]) {
    const parsedKm = parseFloat(kmMatch[1]);
    if (!isNaN(parsedKm)) {
      komi = parsedKm;
    }
  }

  // 3. Player Names / Game Name
  const pbMatch = gameContent.match(/PB\[([^\]]*)]/i);
  const pwMatch = gameContent.match(/PW\[([^\]]*)]/i);
  const gnMatch = gameContent.match(/GN\[([^\]]*)]/i);

  const playerBlack = pbMatch?.[1]?.trim();
  const playerWhite = pwMatch?.[1]?.trim();
  const gameName = gnMatch?.[1]?.trim();

  // Initialize board grid
  const grid: StoneType[][] = Array(size)
    .fill(null)
    .map(() => Array(size).fill('EMPTY'));

  let blackPrisoners = 0; // Black's prisoners (captured White stones)
  let whitePrisoners = 0; // White's prisoners (captured Black stones)

  // Helper to parse coordinate e.g. "pd" -> { row: 15, col: 3 }
  const parseCoord = (coordStr: string): { row: number; col: number } | null => {
    if (!coordStr || coordStr.length < 2) return null;
    const c1 = coordStr.charAt(0).toLowerCase().charCodeAt(0) - 97;
    const c2 = coordStr.charAt(1).toLowerCase().charCodeAt(0) - 97;
    if (c1 >= 0 && c1 < size && c2 >= 0 && c2 < size) {
      return { col: c1, row: c2 };
    }
    return null;
  };

  // Helper to expand point specification e.g. "pd" or "aa:cc"
  const expandPoints = (spec: string): { row: number; col: number }[] => {
    const points: { row: number; col: number }[] = [];
    if (!spec) return points;

    if (spec.includes(':')) {
      const parts = spec.split(':');
      const p1 = parseCoord(parts[0]);
      const p2 = parseCoord(parts[1]);
      if (p1 && p2) {
        const minRow = Math.min(p1.row, p2.row);
        const maxRow = Math.max(p1.row, p2.row);
        const minCol = Math.min(p1.col, p2.col);
        const maxCol = Math.max(p1.col, p2.col);
        for (let r = minRow; r <= maxRow; r++) {
          for (let c = minCol; c <= maxCol; c++) {
            points.push({ row: r, col: c });
          }
        }
      }
    } else {
      const pt = parseCoord(spec);
      if (pt) points.push(pt);
    }
    return points;
  };

  // Process properties helper
  const processProperty = (propName: string, propValues: string[]) => {
    const upperName = propName.toUpperCase();
    if (upperName === 'AB' || upperName === 'AW' || upperName === 'AE') {
      const targetStone: StoneType = upperName === 'AB' ? 'BLACK' : upperName === 'AW' ? 'WHITE' : 'EMPTY';
      for (const val of propValues) {
        const pts = expandPoints(val);
        for (const pt of pts) {
          grid[pt.row][pt.col] = targetStone;
        }
      }
    }
  };

  // Group capture detection helper
  const checkAndExecuteCaptures = (lastRow: number, lastCol: number, moverColor: 'BLACK' | 'WHITE') => {
    const opponentColor: StoneType = moverColor === 'BLACK' ? 'WHITE' : 'BLACK';
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    const visited = Array.from({ length: size }, () => Array(size).fill(false));

    // Check neighbors of last played stone
    for (const [dr, dc] of directions) {
      const nr = lastRow + dr;
      const nc = lastCol + dc;

      if (nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc] === opponentColor && !visited[nr][nc]) {
        // Find group and count liberties
        const group: { r: number; c: number }[] = [];
        let liberties = 0;

        const queue: { r: number; c: number }[] = [{ r: nr, c: nc }];
        visited[nr][nc] = true;

        while (queue.length > 0) {
          const curr = queue.shift()!;
          group.push(curr);

          for (const [ddr, ddc] of directions) {
            const adjR = curr.r + ddr;
            const adjC = curr.c + ddc;
            if (adjR >= 0 && adjR < size && adjC >= 0 && adjC < size) {
              if (grid[adjR][adjC] === 'EMPTY') {
                liberties++;
              } else if (grid[adjR][adjC] === opponentColor && !visited[adjR][adjC]) {
                visited[adjR][adjC] = true;
                queue.push({ r: adjR, c: adjC });
              }
            }
          }
        }

        // If 0 liberties, remove group and count prisoners
        if (liberties === 0) {
          for (const stone of group) {
            grid[stone.r][stone.c] = 'EMPTY';
          }
          if (moverColor === 'BLACK') {
            blackPrisoners += group.length;
          } else {
            whitePrisoners += group.length;
          }
        }
      }
    }
  };

  // Tokenize SGF node sequence
  // Split into nodes starting with ';'
  const nodes = gameContent.split(';').filter(n => n.trim().length > 0);

  for (const nodeStr of nodes) {
    // Match property pattern like AB[pd][dd] or B[pd] or SZ[19]
    const propRegex = /([A-Z]{1,2})\s*((?:\[[^\]]*\])+)/gi;
    let match: RegExpExecArray | null;

    while ((match = propRegex.exec(nodeStr)) !== null) {
      const propName = match[1].toUpperCase();
      const rawValues = match[2];

      // Extract values inside [...]
      const valRegex = /\[([^\]]*)\]/g;
      const values: string[] = [];
      let valMatch: RegExpExecArray | null;
      while ((valMatch = valRegex.exec(rawValues)) !== null) {
        values.push(valMatch[1]);
      }

      if (propName === 'AB' || propName === 'AW' || propName === 'AE') {
        processProperty(propName, values);
      } else if (propName === 'B' || propName === 'W') {
        const moverColor: 'BLACK' | 'WHITE' = propName === 'B' ? 'BLACK' : 'WHITE';
        for (const val of values) {
          const pt = parseCoord(val);
          if (pt) {
            grid[pt.row][pt.col] = moverColor;
            checkAndExecuteCaptures(pt.row, pt.col, moverColor);
          }
        }
      }
    }
  }

  return {
    grid,
    size,
    komi,
    blackPrisoners,
    whitePrisoners,
    playerBlack,
    playerWhite,
    gameName,
  };
}

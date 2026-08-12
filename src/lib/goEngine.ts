export interface LocalEvaluationResult {
  reasoning: string;
  status: 'ALIVE' | 'DEAD' | 'UNSETTLED';
  bestMove?: { row: number; col: number };
}

interface Point {
  r: number;
  c: number;
}

interface Group {
  color: 'X' | 'O';
  stones: Point[];
  liberties: Point[];
}

const DIRECTIONS = [
  [-1, 0], [1, 0], [0, -1], [0, 1]
];

// Helper to parse board and get all groups with their liberties
function getGroups(grid: string[][]): { blackGroups: Group[]; whiteGroups: Group[] } {
  const rows = grid.length;
  const cols = grid[0].length;
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));

  const blackGroups: Group[] = [];
  const whiteGroups: Group[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const color = grid[r][c];
      if ((color === 'X' || color === 'O') && !visited[r][c]) {
        const stones: Point[] = [];
        const libertySet = new Set<string>();
        const queue: Point[] = [{ r, c }];
        visited[r][c] = true;

        while (queue.length > 0) {
          const curr = queue.shift()!;
          stones.push(curr);

          for (const [dr, dc] of DIRECTIONS) {
            const nr = curr.r + dr;
            const nc = curr.c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
              if (grid[nr][nc] === '.') {
                libertySet.add(`${nr},${nc}`);
              } else if (grid[nr][nc] === color && !visited[nr][nc]) {
                visited[nr][nc] = true;
                queue.push({ r: nr, c: nc });
              }
            }
          }
        }

        const liberties: Point[] = Array.from(libertySet).map(s => {
          const [lr, lc] = s.split(',').map(Number);
          return { r: lr, c: lc };
        });

        const group: Group = { color: color as 'X' | 'O', stones, liberties };
        if (color === 'X') blackGroups.push(group);
        else whiteGroups.push(group);
      }
    }
  }

  return { blackGroups, whiteGroups };
}

// Simulate placing a stone on grid and resolving captures
export function simulateMove(grid: string[][], r: number, c: number, color: 'X' | 'O'): { newGrid: string[][]; capturedCount: number; isValid: boolean } {
  const rows = grid.length;
  const cols = grid[0].length;
  
  if (grid[r][c] !== '.') {
    return { newGrid: grid, capturedCount: 0, isValid: false };
  }

  const nextGrid = grid.map(row => [...row]);
  nextGrid[r][c] = color;

  const opponentColor = color === 'X' ? 'O' : 'X';
  let capturedCount = 0;

  const { blackGroups, whiteGroups } = getGroups(nextGrid);
  const opponentGroups = opponentColor === 'X' ? blackGroups : whiteGroups;

  for (const group of opponentGroups) {
    if (group.liberties.length === 0) {
      for (const stone of group.stones) {
        nextGrid[stone.r][stone.c] = '.';
        capturedCount++;
      }
    }
  }

  const { blackGroups: myBlack, whiteGroups: myWhite } = getGroups(nextGrid);
  const myGroups = color === 'X' ? myBlack : myWhite;
  const playedGroup = myGroups.find(g => g.stones.some(s => s.r === r && s.c === c));

  if (!playedGroup || playedGroup.liberties.length === 0) {
    if (capturedCount === 0) {
      return { newGrid: grid, capturedCount: 0, isValid: false };
    }
  }

  return { newGrid: nextGrid, capturedCount, isValid: true };
}

// Public helper for interactive play mode with StoneType[][]
export type StoneType = 'BLACK' | 'WHITE' | 'EMPTY';

export function executeMoveOnGrid(
  grid: StoneType[][],
  r: number,
  c: number,
  turn: 'BLACK' | 'WHITE'
): { newGrid: StoneType[][]; capturedCount: number; isValid: boolean; reason?: string } {
  const charGrid = grid.map(row => row.map(cell => cell === 'BLACK' ? 'X' : cell === 'WHITE' ? 'O' : '.'));
  const colorChar = turn === 'BLACK' ? 'X' : 'O';

  const sim = simulateMove(charGrid, r, c, colorChar);

  if (!sim.isValid) {
    return {
      newGrid: grid,
      capturedCount: 0,
      isValid: false,
      reason: grid[r][c] !== 'EMPTY' ? "すでに石が置かれています。" : "自殺手（自分の呼吸点がなくなる着手）は打てません。"
    };
  }

  const newGrid: StoneType[][] = sim.newGrid.map(row =>
    row.map(cell => cell === 'X' ? 'BLACK' : cell === 'O' ? 'WHITE' : 'EMPTY')
  );

  return {
    newGrid,
    capturedCount: sim.capturedCount,
    isValid: true
  };
}

// Find empty territories surrounded by White ('O')
function getWhiteTerritories(grid: string[][]): { regions: Point[][]; totalEyesEstimate: number } {
  const rows = grid.length;
  const cols = grid[0].length;
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const regions: Point[][] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === '.' && !visited[r][c]) {
        const cells: Point[] = [];
        const queue: Point[] = [{ r, c }];
        visited[r][c] = true;
        let touchesBlack = false;

        while (queue.length > 0) {
          const curr = queue.shift()!;
          cells.push(curr);

          for (const [dr, dc] of DIRECTIONS) {
            const nr = curr.r + dr;
            const nc = curr.c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
              if (grid[nr][nc] === '.' && !visited[nr][nc]) {
                visited[nr][nc] = true;
                queue.push({ r: nr, c: nc });
              } else if (grid[nr][nc] === 'X') {
                touchesBlack = true;
              }
            }
          }
        }

        // Territory surrounded purely by White (no living Black boundary stone)
        if (!touchesBlack) {
          regions.push(cells);
        }
      }
    }
  }

  let totalEyesEstimate = 0;
  for (const reg of regions) {
    if (reg.length === 1 || reg.length === 2) {
      totalEyesEstimate += 1;
    } else if (reg.length === 3) {
      totalEyesEstimate += 1.5; // 3-space eye (三目中手): depends on key point
    } else if (reg.length >= 4) {
      totalEyesEstimate += 2; // 4+ space eye (直四/板六 etc.): unconditionally ALIVE
    }
  }

  return { regions, totalEyesEstimate };
}

// Evaluate whether WHITE will live ('ALIVE'), die ('DEAD'), or is 'UNSETTLED'
export function evaluateGoBoardLocally(boardState: string): LocalEvaluationResult {
  const lines = boardState.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const rows = lines.length;
  if (rows === 0) {
    return {
      reasoning: "盤面データが空です。石を配置してください。",
      status: 'UNSETTLED'
    };
  }
  const cols = lines[0].length;
  const grid: string[][] = lines.map(line => line.split(''));

  const { blackGroups, whiteGroups } = getGroups(grid);

  if (whiteGroups.length === 0) {
    return {
      reasoning: "盤上に白石が配置されていません。判定対象となる白石を配置してください。",
      status: 'UNSETTLED'
    };
  }

  // 1. Check if any White group is ALREADY captured (0 liberties)
  const deadAlreadyGroup = whiteGroups.find(g => g.liberties.length === 0);
  if (deadAlreadyGroup) {
    return {
      reasoning: `【判定：白死（取られる）】\n・呼吸点（ダメ）が0の白石（${deadAlreadyGroup.stones.length}子）が存在します。\n・この白石はすでに捕獲されている状態です。`,
      status: 'DEAD'
    };
  }

  // Check White's territory and eye space
  const { regions: whiteTerritories, totalEyesEstimate } = getWhiteTerritories(grid);

  // If White has 2+ distinct eyes or a large eye territory (>= 4 space eye like 直四/板六)
  if (totalEyesEstimate >= 2 || whiteTerritories.some(reg => reg.length >= 4)) {
    return {
      reasoning: `【判定：白生き（取られない）】\n・白石は十分な眼スペース（${whiteTerritories.map(r => r.length + '目の領域').join('、')}）を確保しています。\n・黒から打たれても、白は適切に応じることで独立した2眼を完成させ「生き」となります。`,
      status: 'ALIVE'
    };
  }

  // 2. Check if Black has a 1-move DIRECT CAPTURE of White stones
  let directCaptureMove: { r: number; c: number; captured: number; reason: string } | null = null;
  
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === '.') {
        const simB = simulateMove(grid, r, c, 'X');
        if (simB.isValid && simB.capturedCount > 0) {
          if (!directCaptureMove || simB.capturedCount > directCaptureMove.captured) {
            directCaptureMove = {
              r,
              c,
              captured: simB.capturedCount,
              reason: `黒が (${r + 1}行, ${c + 1}列) に打つことで、白石 ${simB.capturedCount} 子を即座に捕獲できます。`
            };
          }
        }
      }
    }
  }

  if (directCaptureMove) {
    return {
      status: 'DEAD',
      reasoning: `【判定：白死（取られる）】\n・【黒番の最善攻め手】: ${directCaptureMove.r + 1}行 ${directCaptureMove.c + 1}列 (座標: ${directCaptureMove.r + 1}-${directCaptureMove.c + 1})\n・${directCaptureMove.reason}\n・黒番でこの急所に打たれると、白石は逃れることができず捕獲（死）となります。`,
      bestMove: { row: directCaptureMove.r, col: directCaptureMove.c }
    };
  }

  // 3. Check if White is in Atari (1 liberty remaining) and cannot escape
  const atariWhiteGroup = whiteGroups.find(g => g.liberties.length === 1);
  if (atariWhiteGroup) {
    const lib = atariWhiteGroup.liberties[0];
    const simB = simulateMove(grid, lib.r, lib.c, 'X');
    if (simB.isValid && simB.capturedCount > 0) {
      return {
        status: 'DEAD',
        reasoning: `【判定：白死（取られる）】\n・【黒番の最善攻め手】: ${lib.r + 1}行 ${lib.c + 1}列 (座標: ${lib.r + 1}-${lib.c + 1})\n・白石はアタリ（残りダメ1）の状態です。\n・黒が (${lib.r + 1}行, ${lib.c + 1}列) に打つことで白 ${simB.capturedCount} 子を即座に捕獲できます。`,
        bestMove: { row: lib.r, col: lib.c }
      };
    }
  }

  // 4. If White living/dying status is not 100% unconditional 1-move kill -> UNSETTLED (不明/未確定)
  return {
    status: 'UNSETTLED',
    reasoning: `【判定：不明（未確定・攻防次第）】\n・白に一定のスペースやダメがありますが、完全な2眼の確定には至っていません。\n・黒の攻め手と白の受け方、手番の組み合わせによって「生き」と「死に」が変化する未確定な場面です。`
  };
}

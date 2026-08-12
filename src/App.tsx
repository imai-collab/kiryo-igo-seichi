import React, { useState, useEffect, useMemo } from 'react';
import { GoBoard } from './components/GoBoard';
import { SeichiControlPanel } from './components/SeichiControlPanel';
import { ScoreCard } from './components/ScoreCard';
import { SavedEndgames } from './components/SavedEndgames';
import { BoardImageUploader } from './components/BoardImageUploader';
import {
  StoneType,
  SeichiPhase,
  Point,
  SeichiAnalysis,
  SavedEndgame
} from './types';
import {
  createEmptyGrid,
  copyGrid,
  analyzeTerritories,
  calculateFullScore,
  autoDetectDeadStones,
  fillPrisonersIntoTerritory,
  autoRearrangeTerritory,
  canSwapOrMoveStones,
  PRESET_ENDGAMES
} from './lib/goSeichiEngine';
import { Sparkles, HelpCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [boardSize, setBoardSize] = useState<number>(PRESET_ENDGAMES[0].size);
  const [grid, setGrid] = useState<StoneType[][]>(() => PRESET_ENDGAMES[0].grid.map(r => [...r]));
  const [phase, setPhase] = useState<SeichiPhase>('SETUP');
  const [currentTool, setCurrentTool] = useState<'BLACK' | 'WHITE' | 'ERASER' | 'DEAD_STONE'>('BLACK');
  
  const [deadStones, setDeadStones] = useState<Point[]>([]);
  const [blackPrisoners, setBlackPrisoners] = useState<number>(PRESET_ENDGAMES[0].blackPrisoners);
  const [whitePrisoners, setWhitePrisoners] = useState<number>(PRESET_ENDGAMES[0].whitePrisoners);
  const [komi, setKomi] = useState<number>(PRESET_ENDGAMES[0].komi);

  const [selectedStonePoint, setSelectedStonePoint] = useState<Point | null>(null);
  const [rearrangeStatus, setRearrangeStatus] = useState<{ type: 'success' | 'warning' | 'error' | 'info'; message: string } | null>(null);
  const [isAnalyzingAI, setIsAnalyzingAI] = useState<boolean>(false);
  const [aiCommentary, setAiCommentary] = useState<string | null>(null);

  // Compute live territory regions and analysis
  const territoryAnalysis = useMemo(() => {
    return analyzeTerritories(grid, deadStones);
  }, [grid, deadStones]);

  const fullScoreAnalysis = useMemo<SeichiAnalysis>(() => {
    const res = calculateFullScore(grid, deadStones, blackPrisoners, whitePrisoners, komi);
    if (aiCommentary) {
      res.commentary = aiCommentary;
    }
    return res;
  }, [grid, deadStones, blackPrisoners, whitePrisoners, komi, aiCommentary]);

  // Load a preset or saved endgame
  const handleLoadEndgame = (endgame: SavedEndgame) => {
    setBoardSize(endgame.size);
    setGrid(endgame.grid.map(r => [...r]));
    setBlackPrisoners(endgame.blackPrisoners);
    setWhitePrisoners(endgame.whitePrisoners);
    setKomi(endgame.komi);
    setDeadStones([]);
    setPhase('SETUP');
    setSelectedStonePoint(null);
    setAiCommentary(null);
  };

  // Handle board image parsed by Gemini Multimodal AI
  const handleBoardParsedFromImage = (
    parsedGrid: StoneType[][],
    parsedSize: number,
    detectedPrisoners?: { black: number; white: number }
  ) => {
    setBoardSize(parsedSize);
    setGrid(parsedGrid.map(r => [...r]));
    if (detectedPrisoners) {
      if (detectedPrisoners.black > 0) setBlackPrisoners(detectedPrisoners.black);
      if (detectedPrisoners.white > 0) setWhitePrisoners(detectedPrisoners.white);
    }
    setDeadStones([]);
    setPhase('SETUP');
    setSelectedStonePoint(null);
    setAiCommentary(null);
  };

  // Change Board Size
  const handleSizeChange = (newSize: number) => {
    setBoardSize(newSize);
    setGrid(createEmptyGrid(newSize));
    setDeadStones([]);
    setPhase('SETUP');
    setSelectedStonePoint(null);
    setAiCommentary(null);
  };

  // Reset Board completely
  const handleResetBoard = () => {
    setGrid(createEmptyGrid(boardSize));
    setDeadStones([]);
    setBlackPrisoners(0);
    setWhitePrisoners(0);
    setPhase('SETUP');
    setSelectedStonePoint(null);
    setAiCommentary(null);
  };

  // Handle intersection clicks based on active Phase
  const handleIntersectionClick = (row: number, col: number) => {
    if (phase === 'SETUP') {
      const newGrid = copyGrid(grid);
      if (currentTool === 'ERASER') {
        newGrid[row][col] = 'EMPTY';
      } else {
        newGrid[row][col] = currentTool;
      }
      setGrid(newGrid);

    } else if (phase === 'DEAD_STONES') {
      // Toggle dead stone
      if (grid[row][col] !== 'EMPTY') {
        const exists = deadStones.some(p => p.r === row && p.c === col);
        if (exists) {
          setDeadStones(deadStones.filter(p => !(p.r === row && p.c === col)));
        } else {
          setDeadStones([...deadStones, { r: row, c: col }]);
        }
      }

    } else if (phase === 'FILL_PRISONERS') {
      // Click empty spot to place prisoner stone manually into matching territory
      if (grid[row][col] === 'EMPTY') {
        const newGrid = copyGrid(grid);
        const isBlackTerritory = territoryAnalysis.regions.some(
          r => r.type === 'BLACK_TERRITORY' && r.points.some(p => p.r === row && p.c === col)
        );
        const isWhiteTerritory = territoryAnalysis.regions.some(
          r => r.type === 'WHITE_TERRITORY' && r.points.some(p => p.r === row && p.c === col)
        );

        if (isBlackTerritory) {
          newGrid[row][col] = 'BLACK'; // Place Black prisoner stone into Black territory
          if (blackPrisoners > 0) setBlackPrisoners(prev => Math.max(0, prev - 1));
        } else if (isWhiteTerritory) {
          newGrid[row][col] = 'WHITE'; // Place White prisoner stone into White territory
          if (whitePrisoners > 0) setWhitePrisoners(prev => Math.max(0, prev - 1));
        } else {
          newGrid[row][col] = currentTool === 'ERASER' ? 'EMPTY' : currentTool;
        }
        setGrid(newGrid);
      }

    } else if (phase === 'REARRANGE') {
      if (selectedStonePoint) {
        if (selectedStonePoint.r === row && selectedStonePoint.c === col) {
          // Re-clicked selected stone -> cancel selection
          setSelectedStonePoint(null);
          setRearrangeStatus(null);
        } else {
          const p1 = selectedStonePoint;
          const p2 = { r: row, c: col };
          const isTargetOccupied = grid[p2.r][p2.c] !== 'EMPTY';

          const res = canSwapOrMoveStones(grid, p1, p2, deadStones);

          if (isTargetOccupied) {
            // Swap attempt between two stones
            const color1 = grid[p1.r][p1.c] === 'BLACK' ? '黒石' : '白石';
            const color2 = grid[p2.r][p2.c] === 'BLACK' ? '黒石' : '白石';

            if (res.success) {
              setGrid(res.newGrid);
              setSelectedStonePoint(null);
              setRearrangeStatus({
                type: 'success',
                message: `${color1}(${p1.r + 1},${p1.c + 1}) と ${color2}(${p2.r + 1},${p2.c + 1}) の位置を入れ替えました！（黒地:${res.afterBlack}目 / 白地:${res.afterWhite}目でそれぞれ変わっていません）`
              });
            } else {
              // Swap alters territory count -> prevent swap, switch selection to clicked stone
              setSelectedStonePoint(p2);
              setRearrangeStatus({
                type: 'error',
                message: res.reason || 'この2石の位置を交換すると目数が変わってしまうため出来ません。選択位置を新しい石に切り替えました。'
              });
            }
          } else {
            // Move stone to empty space
            if (res.success) {
              setGrid(res.newGrid);
              setSelectedStonePoint(null);
              setRearrangeStatus({
                type: 'success',
                message: `石を (${p2.r + 1}, ${p2.c + 1}) へ移動しました。（黒地:${res.afterBlack}目 / 白地:${res.afterWhite}目で維持）`
              });
            } else {
              // Move stone even if territory changes, but warn user
              const newGrid = copyGrid(grid);
              const movingStoneColor = newGrid[p1.r][p1.c];
              newGrid[p1.r][p1.c] = 'EMPTY';
              newGrid[p2.r][p2.c] = movingStoneColor;
              setGrid(newGrid);
              setSelectedStonePoint(null);
              setRearrangeStatus({
                type: 'warning',
                message: `石を (${p2.r + 1}, ${p2.c + 1}) に移動しました。（注意: 地の目数が変わりました 黒地:${res.afterBlack}目 / 白地:${res.afterWhite}目）`
              });
            }
          }
        }
      } else {
        if (grid[row][col] !== 'EMPTY') {
          setSelectedStonePoint({ r: row, c: col });
          const color = grid[row][col] === 'BLACK' ? '黒石' : '白石';
          setRearrangeStatus({
            type: 'info',
            message: `${color} (${row + 1}, ${col + 1}) を選択しました。移動先の空点、または入れ替えたい相手の石を選択してください。`
          });
        }
      }
    }
  };

  // Auto-Detect Dead Stones
  const handleAutoDetectDeadStones = () => {
    const detected = autoDetectDeadStones(grid);
    setDeadStones(detected);
  };

  // Auto-Fill Prisoners into Territory
  const handleAutoFillPrisoners = () => {
    const filled = fillPrisonersIntoTerritory(grid, deadStones, blackPrisoners, whitePrisoners);
    setGrid(filled.newGrid);
    setDeadStones([]); // Dead stones were converted and placed as prisoners
    setBlackPrisoners(filled.remainingBlackPrisoners);
    setWhitePrisoners(filled.remainingWhitePrisoners);
  };

  // Auto Rearrange Territory
  const handleAutoRearrangeTerritory = () => {
    const rearranged = autoRearrangeTerritory(grid);
    setGrid(rearranged);
  };

  // Request AI Commentary via Gemini API
  const handleAnalyzeWithAI = async () => {
    setIsAnalyzingAI(true);
    try {
      const response = await fetch('/api/analyze-seichi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grid,
          deadStones,
          blackPrisoners,
          whitePrisoners,
          komi
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze with AI');
      }

      if (data.commentary) {
        setAiCommentary(data.commentary);
      }
    } catch (err: any) {
      console.error("AI Analysis error:", err);
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100/80 text-neutral-900 flex flex-col items-center py-8 px-4 font-sans">
      <div className="max-w-5xl w-full flex flex-col items-center gap-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold border border-amber-200 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            囲碁 整地・地計算シミュレーター
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900">
            囲碁の整地（Seichi）＆ 目数集計
          </h1>
          <p className="text-neutral-600 max-w-xl mx-auto text-xs sm:text-sm">
            終局図を自由につくり、<span className="font-bold text-amber-900">「死に石指定 → アゲハ埋め → 地の整形 → 目数集計」</span>の手順で日本の正式な整地プロセスを体験・学習できます。
          </p>
        </div>

        {/* Prominent Image Reader Card Banner */}
        <BoardImageUploader
          variant="card"
          boardSize={boardSize}
          onBoardParsed={handleBoardParsedFromImage}
        />

        {/* Presets & Custom Saved Endgames */}
        <SavedEndgames
          currentGrid={grid}
          boardSize={boardSize}
          blackPrisoners={blackPrisoners}
          whitePrisoners={whitePrisoners}
          komi={komi}
          onLoadEndgame={handleLoadEndgame}
          onBoardParsedImage={handleBoardParsedFromImage}
        />

        {/* Main Interface Layout */}
        <div className="flex flex-col lg:flex-row gap-8 items-start w-full justify-center">
          
          {/* Go Board Column */}
          <div className="flex flex-col items-center gap-4 w-full lg:w-auto">
            <GoBoard
              size={boardSize}
              grid={grid}
              deadStones={deadStones}
              territoryRegions={territoryAnalysis.regions}
              phase={phase}
              currentTool={currentTool}
              selectedStonePoint={selectedStonePoint}
              onIntersectionClick={handleIntersectionClick}
            />

            <div className="text-[11px] text-neutral-500 text-center space-y-1">
              {phase === 'SETUP' && <p>※盤面をクリックして石の配置・削除を行います。</p>}
              {phase === 'DEAD_STONES' && <p>※盤上の石をクリックすると「死に石（×）」に切り替わります。</p>}
              {phase === 'FILL_PRISONERS' && <p>※空点をつつくとアゲハ石を手動設置できます。</p>}
              {phase === 'REARRANGE' && <p>※石を選択して移動、または相手の石を選択して「目数が変わらない石の入れ替え（交換）」ができます。</p>}
            </div>
          </div>

          {/* Controls & Scoring Column */}
          <div className="flex-1 w-full space-y-6">
            
            {/* Step-by-Step Wizard Controls */}
            <SeichiControlPanel
              phase={phase}
              currentTool={currentTool}
              boardSize={boardSize}
              komi={komi}
              blackPrisoners={blackPrisoners}
              whitePrisoners={whitePrisoners}
              deadStonesCount={deadStones.length}
              isAnalyzing={isAnalyzingAI}
              rearrangeStatus={rearrangeStatus}
              onToolChange={setCurrentTool}
              onBoardParsedImage={handleBoardParsedFromImage}
              onSizeChange={handleSizeChange}
              onKomiChange={setKomi}
              onPrisonerChange={(b, w) => {
                setBlackPrisoners(b);
                setWhitePrisoners(w);
              }}
              onPhaseChange={setPhase}
              onAutoDetectDeadStones={handleAutoDetectDeadStones}
              onAutoFillPrisoners={handleAutoFillPrisoners}
              onAutoRearrangeTerritory={handleAutoRearrangeTerritory}
              onResetBoard={handleResetBoard}
            />

            {/* Score Card / Result Panel */}
            <ScoreCard
              analysis={fullScoreAnalysis}
              komi={komi}
              blackPrisoners={blackPrisoners}
              whitePrisoners={whitePrisoners}
              deadStonesCount={deadStones.length}
              isAnalyzingAI={isAnalyzingAI}
              onAnalyzeWithAI={handleAnalyzeWithAI}
            />

          </div>

        </div>

      </div>
    </div>
  );
}

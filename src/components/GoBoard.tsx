import React from 'react';
import { StoneType, Point, TerritoryRegion, SeichiPhase } from '../types';
import { X, Sparkles } from 'lucide-react';

interface GoBoardProps {
  size: number;
  grid: StoneType[][];
  deadStones: Point[];
  territoryRegions?: TerritoryRegion[];
  phase: SeichiPhase;
  currentTool: 'BLACK' | 'WHITE' | 'ERASER' | 'DEAD_STONE';
  selectedStonePoint?: Point | null;
  onIntersectionClick: (row: number, col: number) => void;
}

export const GoBoard: React.FC<GoBoardProps> = ({
  size,
  grid,
  deadStones,
  territoryRegions = [],
  phase,
  currentTool,
  selectedStonePoint,
  onIntersectionClick
}) => {
  const squares = Array.from({ length: size - 1 });
  const points = Array.from({ length: size });

  // Dynamically calculate cell size based on board size so 19x19 matches 13x13 total physical width
  const cellSize = size === 19 ? 1.833 : 2.75; // 18 * 1.833 = ~33rem, matching 12 * 2.75 = 33rem

  const isDead = (r: number, c: number) =>
    deadStones.some(p => p.r === r && p.c === c);

  // Map each intersection point to its territory type if available
  const getTerritoryTypeAt = (r: number, c: number) => {
    if (grid[r][c] !== 'EMPTY' && !isDead(r, c)) return null;
    for (const reg of territoryRegions) {
      if (reg.points.some(p => p.r === r && p.c === c)) {
        return reg.type;
      }
    }
    return null;
  };

  return (
    <div className="flex flex-col items-center select-none">
      {/* Top Column Labels (1, 2, 3...) */}
      <div 
        className={`flex font-semibold text-neutral-600 mb-1 ${
          size === 19 ? 'text-[9px] pl-5' : 'text-xs pl-7'
        }`}
        style={{ width: `${(size - 1) * cellSize + (size === 19 ? 2.5 : 3.5)}rem` }}
      >
        {points.map((_, col) => (
          <div key={`col-label-${col}`} className="flex-1 text-center font-mono">
            {col + 1}
          </div>
        ))}
      </div>

      <div className="flex items-center">
        {/* Left Row Labels (1, 2, 3...) */}
        <div 
          className={`flex flex-col font-semibold text-neutral-600 mr-2 py-1 ${
            size === 19 ? 'text-[9px]' : 'text-xs'
          }`}
          style={{ height: `${(size - 1) * cellSize + cellSize}rem` }}
        >
          {points.map((_, row) => (
            <div key={`row-label-${row}`} className="flex-1 flex items-center justify-center font-mono">
              {row + 1}
            </div>
          ))}
        </div>

        {/* Go Board Outer Box with Realistic Wood Grain Styling */}
        <div className={`relative inline-block bg-[#DCB35C] shadow-2xl rounded-sm border-2 border-[#8C6D31] transition-all ${
          size === 19 ? 'p-3.5' : 'p-5'
        }`}>
          
          {/* Grid lines container */}
          <div 
            className="relative" 
            style={{ 
              width: `${(size - 1) * cellSize}rem`, 
              height: `${(size - 1) * cellSize}rem` 
            }}
          >
            {/* Draw the squares grid */}
            <div 
              className="absolute inset-0 grid" 
              style={{ 
                gridTemplateColumns: `repeat(${size - 1}, 1fr)`, 
                gridTemplateRows: `repeat(${size - 1}, 1fr)` 
              }}
            >
              {squares.map((_, row) =>
                squares.map((_, col) => (
                  <div 
                    key={`square-${row}-${col}`} 
                    className="border border-black/75" 
                  />
                ))
              )}
            </div>

            {/* Draw star points (hoshi) */}
            {renderStarPoints(size, cellSize)}

            {/* Draw intersections, stones, territory highlights & badges */}
            <div 
              className="absolute inset-0 z-10" 
              style={{ transform: `translate(-${cellSize / 2}rem, -${cellSize / 2}rem)` }}
            >
              {points.map((_, row) =>
                points.map((_, col) => {
                  const stone = grid[row][col];
                  const dead = isDead(row, col);
                  const territory = getTerritoryTypeAt(row, col);
                  const isSelected = selectedStonePoint && selectedStonePoint.r === row && selectedStonePoint.c === col;

                  return (
                    <div
                      key={`point-${row}-${col}`}
                      className="absolute flex items-center justify-center cursor-pointer group transition-transform active:scale-95"
                      style={{
                        width: `${cellSize}rem`,
                        height: `${cellSize}rem`,
                        left: `${col * cellSize}rem`,
                        top: `${row * cellSize}rem`,
                      }}
                      onClick={() => onIntersectionClick(row, col)}
                    >
                      {/* Hover ring */}
                      <div className="absolute inset-0 rounded-full group-hover:bg-black/15 transition-colors m-0.5" />

                      {/* Territory Highlights (Black Territory, White Territory, Dame) */}
                      {phase !== 'SETUP' && stone === 'EMPTY' && (
                        <>
                          {territory === 'BLACK_TERRITORY' && (
                            <div className="absolute inset-0.5 bg-blue-500/25 rounded-md border border-blue-400/50 flex items-center justify-center shadow-inner animate-fade-in">
                              <span className={`${size === 19 ? 'text-[7px]' : 'text-[10px]'} font-bold text-blue-900 opacity-80`}>黒地</span>
                            </div>
                          )}
                          {territory === 'WHITE_TERRITORY' && (
                            <div className="absolute inset-0.5 bg-rose-500/25 rounded-md border border-rose-400/50 flex items-center justify-center shadow-inner animate-fade-in">
                              <span className={`${size === 19 ? 'text-[7px]' : 'text-[10px]'} font-bold text-rose-900 opacity-80`}>白地</span>
                            </div>
                          )}
                          {territory === 'DAME' && (
                            <div className="absolute inset-1 bg-neutral-400/30 rounded-full border border-neutral-500/40 flex items-center justify-center">
                              <span className={`${size === 19 ? 'text-[6.5px]' : 'text-[9px]'} font-medium text-neutral-700`}>ダメ</span>
                            </div>
                          )}
                        </>
                      )}

                      {/* Black Stone */}
                      {stone === 'BLACK' && (
                        <div 
                          className={`w-[88%] h-[88%] rounded-full bg-gradient-to-br from-neutral-700 via-neutral-900 to-black shadow-md z-10 flex items-center justify-center relative transition-all ${
                            dead ? 'opacity-40 grayscale' : ''
                          } ${isSelected ? 'ring-2 ring-amber-400 scale-105' : ''}`}
                        >
                          {/* Gloss highlight */}
                          <div className="absolute top-0.5 left-1 w-1.5 h-1 rounded-full bg-white/20 blur-[0.5px]" />
                          
                          {/* Dead stone badge */}
                          {dead && (
                            <div className="bg-red-600 text-white rounded-full p-0.5 shadow-md z-20 animate-bounce">
                              <X className={`${size === 19 ? 'w-2.5 h-2.5' : 'w-4 h-4'} stroke-[3]`} />
                            </div>
                          )}
                        </div>
                      )}

                      {/* White Stone */}
                      {stone === 'WHITE' && (
                        <div 
                          className={`w-[88%] h-[88%] rounded-full bg-gradient-to-br from-white via-neutral-100 to-neutral-300 shadow-xs border border-neutral-400/80 z-10 flex items-center justify-center relative transition-all ${
                            dead ? 'opacity-40 grayscale' : ''
                          } ${isSelected ? 'ring-2 ring-amber-400 scale-105' : ''}`}
                        >
                          {/* Gloss highlight */}
                          <div className="absolute top-0.5 left-1 w-1.5 h-1 rounded-full bg-white/80 blur-[0.5px]" />
                          
                          {/* Dead stone badge */}
                          {dead && (
                            <div className="bg-red-600 text-white rounded-full p-0.5 shadow-md z-20 animate-bounce">
                              <X className={`${size === 19 ? 'w-2.5 h-2.5' : 'w-4 h-4'} stroke-[3]`} />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Tool cursor feedback when hovering over empty space */}
                      {stone === 'EMPTY' && phase === 'SETUP' && (
                        <div className="opacity-0 group-hover:opacity-40 transition-opacity pointer-events-none">
                          {currentTool === 'BLACK' && (
                            <div className={`${size === 19 ? 'w-4 h-4' : 'w-6 h-6'} rounded-full bg-black`} />
                          )}
                          {currentTool === 'WHITE' && (
                            <div className={`${size === 19 ? 'w-4 h-4' : 'w-6 h-6'} rounded-full bg-white border border-gray-400`} />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function renderStarPoints(size: number, cellSize: number) {
  let starPoints: { r: number; c: number }[] = [];
  if (size === 9) {
    starPoints = [
      { r: 2, c: 2 }, { r: 2, c: 6 },
      { r: 4, c: 4 },
      { r: 6, c: 2 }, { r: 6, c: 6 },
    ];
  } else if (size === 13) {
    starPoints = [
      { r: 3, c: 3 }, { r: 3, c: 9 },
      { r: 6, c: 6 },
      { r: 9, c: 3 }, { r: 9, c: 9 },
    ];
  } else if (size === 19) {
    starPoints = [
      { r: 3, c: 3 }, { r: 3, c: 9 }, { r: 3, c: 15 },
      { r: 9, c: 3 }, { r: 9, c: 9 }, { r: 9, c: 15 },
      { r: 15, c: 3 }, { r: 15, c: 9 }, { r: 15, c: 15 },
    ];
  }

  return starPoints.map((pt, i) => (
    <div
      key={`star-${i}`}
      className={`absolute bg-black rounded-full z-0 ${size === 19 ? 'w-1.5 h-1.5' : 'w-2 h-2'}`}
      style={{
        left: `${pt.c * cellSize}rem`,
        top: `${pt.r * cellSize}rem`,
        transform: 'translate(-50%, -50%)'
      }}
    />
  ));
}

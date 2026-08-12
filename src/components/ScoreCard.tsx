import React from 'react';
import { SeichiAnalysis } from '../types';
import { Trophy, Calculator, Sparkles, AlertCircle, Award, ArrowDownRight } from 'lucide-react';

interface ScoreCardProps {
  analysis: SeichiAnalysis;
  komi: number;
  blackPrisoners: number;
  whitePrisoners: number;
  deadStonesCount: number;
  isAnalyzingAI: boolean;
  onAnalyzeWithAI: () => void;
}

export const ScoreCard: React.FC<ScoreCardProps> = ({
  analysis,
  komi,
  blackPrisoners,
  whitePrisoners,
  deadStonesCount,
  isAnalyzingAI,
  onAnalyzeWithAI
}) => {
  const isBlackWinner = analysis.winner === 'BLACK';
  const isWhiteWinner = analysis.winner === 'WHITE';

  return (
    <div className="w-full bg-gradient-to-br from-white via-amber-50/30 to-orange-50/20 rounded-2xl border border-amber-200/80 shadow-lg p-6 space-y-6">
      
      {/* Winner Header Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
            <Trophy className="w-8 h-8 text-amber-100" />
          </div>
          <div>
            <span className="text-xs font-semibold text-amber-100 uppercase tracking-wider">終局集計結果</span>
            <h2 className="text-2xl font-extrabold tracking-tight">
              {isBlackWinner && `黒の ${analysis.scoreDifference} 目勝ち`}
              {isWhiteWinner && `白の ${analysis.scoreDifference} 目勝ち`}
              {analysis.winner === 'DRAW' && '持碁（引き分け）'}
            </h2>
          </div>
        </div>

        <button
          onClick={onAnalyzeWithAI}
          disabled={isAnalyzingAI}
          className="px-4 py-2.5 bg-white text-amber-900 font-bold text-xs rounded-xl shadow-lg hover:bg-amber-50 transition-all flex items-center gap-2 shrink-0 disabled:opacity-50"
        >
          <Sparkles className={`w-4 h-4 text-amber-600 ${isAnalyzingAI ? 'animate-spin' : ''}`} />
          {isAnalyzingAI ? 'AI整地解説を生成中...' : 'AI整地解説を見る'}
        </button>
      </div>

      {/* Main Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Black Score Box */}
        <div className={`p-5 rounded-2xl border transition-all ${
          isBlackWinner ? 'bg-neutral-900 text-white border-neutral-800 shadow-md ring-2 ring-neutral-700' : 'bg-neutral-50 text-neutral-800 border-neutral-200'
        }`}>
          <div className="flex items-center justify-between mb-3 border-b border-neutral-200/30 pb-2">
            <span className="font-bold text-base flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-black border border-neutral-500" />
              黒の地（Black Territory）
            </span>
            {isBlackWinner && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-neutral-950 text-[11px] font-bold">
                勝利 (WIN)
              </span>
            )}
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="opacity-75">1. 盤上の元の黒地:</span>
              <strong className="font-mono text-sm">{analysis.blackTerritoryCount} 目</strong>
            </div>
            <div className="flex justify-between text-rose-400">
              <span className="opacity-75">2. 埋め込んだ黒アゲハ (黒石):</span>
              <strong className="font-mono text-sm">- {blackPrisoners} 目</strong>
            </div>
            <hr className="border-neutral-200/20 my-1" />
            <div className="flex justify-between items-baseline pt-1">
              <span className="font-bold text-sm">正味の黒地計:</span>
              <span className="text-2xl font-black font-mono text-amber-400">
                {analysis.netBlackTerritory} <span className="text-xs font-normal">目</span>
              </span>
            </div>
          </div>
        </div>

        {/* White Score Box */}
        <div className={`p-5 rounded-2xl border transition-all ${
          isWhiteWinner ? 'bg-neutral-900 text-white border-neutral-800 shadow-md ring-2 ring-neutral-700' : 'bg-neutral-50 text-neutral-800 border-neutral-200'
        }`}>
          <div className="flex items-center justify-between mb-3 border-b border-neutral-200/30 pb-2">
            <span className="font-bold text-base flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-white border border-neutral-400 shadow-inner" />
              白の地（White Territory）
            </span>
            {isWhiteWinner && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-neutral-950 text-[11px] font-bold">
                勝利 (WIN)
              </span>
            )}
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="opacity-75">1. 盤上の元の白地:</span>
              <strong className="font-mono text-sm">{analysis.whiteTerritoryCount} 目</strong>
            </div>
            <div className="flex justify-between text-rose-400">
              <span className="opacity-75">2. 埋め込んだ白アゲハ (白石):</span>
              <strong className="font-mono text-sm">- {whitePrisoners} 目</strong>
            </div>
            <div className="flex justify-between text-emerald-400">
              <span className="opacity-75">3. コミ加算:</span>
              <strong className="font-mono text-sm">+ {komi} 目</strong>
            </div>
            <hr className="border-neutral-200/20 my-1" />
            <div className="flex justify-between items-baseline pt-1">
              <span className="font-bold text-sm">正味の白地計（コミ込）:</span>
              <span className="text-2xl font-black font-mono text-amber-400">
                {analysis.finalWhiteScore} <span className="text-xs font-normal">目</span>
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* AI Commentary Section */}
      {analysis.commentary && (
        <div className="bg-amber-50/80 rounded-xl p-4 border border-amber-200/90 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
            <Sparkles className="w-4 h-4 text-amber-600" />
            プロ棋士AIの整地＆結果解説
          </div>
          <p className="text-xs text-neutral-800 leading-relaxed whitespace-pre-wrap">
            {analysis.commentary}
          </p>
        </div>
      )}

    </div>
  );
};

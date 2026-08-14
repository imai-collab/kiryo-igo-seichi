import React from 'react';
import { SeichiPhase, StoneType } from '../types';
import {
  Circle,
  Eraser,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Skull,
  Grid,
  CheckCircle2,
  ListOrdered,
  HelpCircle,
  AlertCircle,
  ArrowLeftRight,
  Camera
} from 'lucide-react';
import { BoardImageUploader } from './BoardImageUploader';

interface SeichiControlPanelProps {
  phase: SeichiPhase;
  currentTool: 'BLACK' | 'WHITE' | 'ERASER' | 'DEAD_STONE';
  boardSize: number;
  komi: number;
  blackPrisoners: number;
  whitePrisoners: number;
  deadStonesCount: number;
  dameCount?: number;
  isAnalyzing: boolean;
  rearrangeStatus?: { type: 'success' | 'warning' | 'error' | 'info'; message: string } | null;
  onToolChange: (tool: 'BLACK' | 'WHITE' | 'ERASER' | 'DEAD_STONE') => void;
  onBoardParsedImage?: (grid: StoneType[][], parsedSize: number, detectedPrisoners?: { black: number; white: number }) => void;
  onSizeChange: (size: number) => void;
  onKomiChange: (komi: number) => void;
  onPrisonerChange: (blackPrisoners: number, whitePrisoners: number) => void;
  onPhaseChange: (phase: SeichiPhase) => void;
  onAutoDetectDeadStones: () => void;
  onAutoFillPrisoners: () => void;
  onAutoRearrangeTerritory: () => void;
  onResetBoard: () => void;
}

export const SeichiControlPanel: React.FC<SeichiControlPanelProps> = ({
  phase,
  currentTool,
  boardSize,
  komi,
  blackPrisoners,
  whitePrisoners,
  deadStonesCount,
  dameCount = 0,
  isAnalyzing,
  rearrangeStatus,
  onToolChange,
  onBoardParsedImage,
  onSizeChange,
  onKomiChange,
  onPrisonerChange,
  onPhaseChange,
  onAutoDetectDeadStones,
  onAutoFillPrisoners,
  onAutoRearrangeTerritory,
  onResetBoard,
}) => {
  const STEPS: { key: SeichiPhase; number: number; label: string; desc: string }[] = [
    { key: 'SETUP', number: 1, label: '終局図配置', desc: '終局状態の石を配置' },
    { key: 'DEAD_STONES', number: 2, label: '死に石指定', desc: '盤上の地の中の死石を取り除き' },
    { key: 'FILL_PRISONERS', number: 3, label: 'アゲハ埋め', desc: '相手の地にアゲハ（ハマ）を埋める' },
    { key: 'REARRANGE', number: 4, label: '整地（整形）', desc: '地を5目・10目の四角形に整石' },
    { key: 'RESULT', number: 5, label: '地計算・勝敗', desc: '目数の集計と結果判定' },
  ];

  const currentStepIndex = STEPS.findIndex(s => s.key === phase);

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-neutral-200/80 p-5 space-y-6">
      
      {/* Step Stepper Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-800 flex items-center gap-2">
            <ListOrdered className="w-5 h-5 text-amber-600" />
            整地手順（Seichi Workflow）
          </h2>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            ステップ {currentStepIndex + 1} / {STEPS.length}
          </span>
        </div>

        {/* Stepper buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
          {STEPS.map((step, idx) => {
            const isActive = phase === step.key;
            const isPassed = idx < currentStepIndex;

            return (
              <button
                key={step.key}
                onClick={() => onPhaseChange(step.key)}
                className={`flex flex-col items-start p-2.5 rounded-xl text-left border transition-all ${
                  isActive
                    ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-300'
                    : isPassed
                    ? 'bg-amber-50/80 text-amber-950 border-amber-200 hover:bg-amber-100'
                    : 'bg-neutral-50 text-neutral-500 border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${
                    isActive ? 'bg-white text-amber-700' : isPassed ? 'bg-amber-200 text-amber-800' : 'bg-neutral-200 text-neutral-600'
                  }`}>
                    {step.number}
                  </span>
                  {isPassed && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
                </div>
                <span className="text-xs font-bold mt-1.5 line-clamp-1">{step.label}</span>
                <span className={`text-[10px] mt-0.5 line-clamp-1 ${isActive ? 'text-amber-100' : 'text-neutral-400'}`}>
                  {step.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <hr className="border-neutral-100" />

      {/* PHASE 1: SETUP CONTROLS */}
      {phase === 'SETUP' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-neutral-50 p-3.5 rounded-xl border border-neutral-200/60">
            {/* Board Size Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-700">碁盤サイズ:</span>
              <div className="flex bg-neutral-200/70 p-1 rounded-lg">
                {[9, 13, 19].map((size) => (
                  <button
                    key={size}
                    onClick={() => onSizeChange(size)}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                      boardSize === size
                        ? 'bg-white text-neutral-900 shadow-sm'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    {size}×{size}
                  </button>
                ))}
              </div>
            </div>

            {/* Komi Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-700">コミ:</span>
              <div className="flex bg-neutral-200/70 p-1 rounded-lg">
                {[6.5, 0.5, 0].map((k) => (
                  <button
                    key={k}
                    onClick={() => onKomiChange(k)}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                      komi === k
                        ? 'bg-white text-neutral-900 shadow-sm'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    {k}目
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons: Image Reader & Reset */}
            <div className="flex items-center gap-2 ml-auto">
              {onBoardParsedImage && (
                <BoardImageUploader
                  variant="inline"
                  boardSize={boardSize}
                  onBoardParsed={onBoardParsedImage}
                />
              )}
              <button
                onClick={onResetBoard}
                className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                盤面クリア
              </button>
            </div>
          </div>

          {/* Tools & Prisoner Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Stone Placement Tool Palette */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-700">配置ツール:</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToolChange('BLACK')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                    currentTool === 'BLACK'
                      ? 'bg-neutral-900 text-white border-neutral-900 ring-2 ring-neutral-400 shadow-sm'
                      : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  <div className="w-3.5 h-3.5 rounded-full bg-black border border-neutral-600" />
                  黒石を配置
                </button>

                <button
                  onClick={() => onToolChange('WHITE')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                    currentTool === 'WHITE'
                      ? 'bg-neutral-100 text-neutral-900 border-neutral-400 ring-2 ring-neutral-300 shadow-sm'
                      : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  <div className="w-3.5 h-3.5 rounded-full bg-white border border-neutral-400 shadow-inner" />
                  白石を配置
                </button>

                <button
                  onClick={() => onToolChange('ERASER')}
                  className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                    currentTool === 'ERASER'
                      ? 'bg-rose-500 text-white border-rose-600 ring-2 ring-rose-300 shadow-sm'
                      : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  <Eraser className="w-4 h-4" />
                  消しゴム
                </button>
              </div>
            </div>

            {/* Captured Stone Count Inputs */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-700">対局中の持ちアゲハ（ハマ）:</label>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-neutral-50 p-2 rounded-xl border border-neutral-200 flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-700 flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-black" />
                    黒アゲハ:
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={blackPrisoners}
                    onChange={(e) => onPrisonerChange(parseInt(e.target.value) || 0, whitePrisoners)}
                    className="w-12 text-center text-xs font-bold bg-white border border-neutral-300 rounded-md py-1"
                  />
                </div>

                <div className="flex-1 bg-neutral-50 p-2 rounded-xl border border-neutral-200 flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-700 flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-white border border-neutral-400" />
                    白アゲハ:
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={whitePrisoners}
                    onChange={(e) => onPrisonerChange(blackPrisoners, parseInt(e.target.value) || 0)}
                    className="w-12 text-center text-xs font-bold bg-white border border-neutral-300 rounded-md py-1"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => onPhaseChange('DEAD_STONES')}
              className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2 hover:scale-[1.02]"
            >
              終局図を確定し、死に石指定へ進む
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* PHASE 2: DEAD STONES */}
      {phase === 'DEAD_STONES' && (
        <div className="space-y-4 animate-fade-in bg-amber-50/50 p-4 rounded-xl border border-amber-200/80">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-amber-950 flex items-center gap-1.5">
                <Skull className="w-4 h-4 text-red-600" />
                ステップ 2：盤上に残った死に石の取り除き指定
              </h3>
              <p className="text-xs text-amber-800/90 mt-0.5">
                敵陣の中で生きる見込みのない石を盤上で直接クリックして死に石（×）に設定してください。
              </p>
            </div>

            <button
              onClick={onAutoDetectDeadStones}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI 死に石自動判定
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white p-3 rounded-lg border border-amber-200 text-xs">
            <div className="flex items-center justify-between font-semibold text-neutral-700 pr-1">
              <span>指定中の死に石: <strong className="text-red-600 text-sm font-bold">{deadStonesCount}</strong> 子</span>
              <span className="text-[11px] text-neutral-500">（アゲハに加算）</span>
            </div>
            <div className="flex items-center justify-between font-semibold bg-amber-100/90 px-2.5 py-1.5 rounded-md border border-amber-300">
              <span className="flex items-center gap-1.5 text-amber-950">
                <span className="w-3 h-3 rounded bg-gradient-to-br from-yellow-300 to-amber-500 border border-amber-600 inline-block animate-pulse shadow-xs" />
                ダメ（公点）:
              </span>
              <span className="text-amber-950 font-extrabold">{dameCount} 点 <span className="text-[10px] font-bold text-amber-800">（目立つ黄色で強調表示中）</span></span>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => onPhaseChange('SETUP')}
              className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs rounded-xl transition-colors"
            >
              戻る（終局図再編集）
            </button>

            <button
              onClick={() => onPhaseChange('FILL_PRISONERS')}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              アゲハ埋め（整地）へ進む
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* PHASE 3: FILL PRISONERS */}
      {phase === 'FILL_PRISONERS' && (
        <div className="space-y-4 animate-fade-in bg-blue-50/50 p-4 rounded-xl border border-blue-200/80">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-blue-950 flex items-center gap-1.5">
                <Grid className="w-4 h-4 text-blue-600" />
                ステップ 3：アゲハ（ハマ）を地に埋める
              </h3>
              <p className="text-xs text-blue-800/90 mt-0.5">
                黒のアゲハ（白石）を白地に、白のアゲハ（黒石）を黒地の空点に埋めて地の計算を単純化します。
              </p>
            </div>

            <button
              onClick={onAutoFillPrisoners}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              1タップでアゲハを自動埋め
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-blue-200 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-white border border-neutral-400" />
              <span className="text-neutral-700">黒のアゲハ（白石） → 白地の空点へ埋め込み</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-black" />
              <span className="text-neutral-700">白のアゲハ（黒石） → 黒地の空点へ埋め込み</span>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => onPhaseChange('DEAD_STONES')}
              className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs rounded-xl transition-colors"
            >
              戻る
            </button>

            <button
              onClick={() => onPhaseChange('REARRANGE')}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              整地（地の整形）へ進む
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* PHASE 4: REARRANGE */}
      {phase === 'REARRANGE' && (
        <div className="space-y-4 animate-fade-in bg-purple-50/50 p-4 rounded-xl border border-purple-200/80">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-purple-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600" />
                ステップ 4：地を5目・10目の分かりやすい四角形に整地
              </h3>
              <p className="text-xs text-purple-800/90 mt-0.5">
                境界線の石を移動・交換して地を綺麗な四角形（2×5=10目など）にまとめます。
              </p>
            </div>

            <button
              onClick={onAutoRearrangeTerritory}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              自動整形・きれいな地にまとめる
            </button>
          </div>

          <div className="bg-white/80 p-3 rounded-lg border border-purple-200 text-xs text-purple-900 flex items-start gap-2">
            <ArrowLeftRight className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block text-purple-950">黒石と白石の入れ替え（交互選択）について:</strong>
              盤上の石（黒石または白石）を選択したあと、別の石を選択すると、お互いの地（目数）が変わらない場合に限り、2つの石の位置を入れ替える（交換する）ことができます。
            </div>
          </div>

          {rearrangeStatus && (
            <div className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 border shadow-sm transition-all ${
              rearrangeStatus.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                : rearrangeStatus.type === 'error'
                ? 'bg-rose-50 text-rose-900 border-rose-300'
                : rearrangeStatus.type === 'warning'
                ? 'bg-amber-50 text-amber-900 border-amber-300'
                : 'bg-purple-100 text-purple-900 border-purple-300'
            }`}>
              {rearrangeStatus.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
              {rearrangeStatus.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              {rearrangeStatus.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />}
              {rearrangeStatus.type === 'info' && <ArrowLeftRight className="w-4 h-4 text-purple-600 shrink-0" />}
              <span>{rearrangeStatus.message}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => onPhaseChange('FILL_PRISONERS')}
              className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs rounded-xl transition-colors"
            >
              戻る
            </button>

            <button
              onClick={() => onPhaseChange('RESULT')}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              集計・結果判定を表示する
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* PHASE 5: RESULT */}
      {phase === 'RESULT' && (
        <div className="space-y-4 animate-fade-in bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/80">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-1.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ステップ 5：集計完了・勝敗判定
            </h3>

            <button
              onClick={() => onPhaseChange('SETUP')}
              className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors"
            >
              最初からやり直す
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

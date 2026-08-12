import React, { useState, useEffect } from 'react';
import { SavedProblem, StoneType } from '../types';
import { BookmarkPlus, FolderOpen, Trash2, Download, Upload, Check, Play, X, Plus, Sparkles, LayoutGrid } from 'lucide-react';

interface SavedProblemsProps {
  currentGrid: StoneType[][];
  boardSize: number;
  onLoadProblem: (problem: SavedProblem) => void;
  onShowMessage: (msg: string) => void;
}

const STORAGE_KEY = 'go_tsumego_saved_problems';

export const SavedProblems: React.FC<SavedProblemsProps> = ({
  currentGrid,
  boardSize,
  onLoadProblem,
  onShowMessage,
}) => {
  const [savedProblems, setSavedProblems] = useState<SavedProblem[]>([]);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [problemName, setProblemName] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [isStockListOpen, setIsStockListOpen] = useState(false);
  const [filterSize, setFilterSize] = useState<number | 'ALL'>('ALL');

  // Load saved problems from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSavedProblems(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load saved problems from localStorage:', e);
    }
  }, []);

  // Save to localStorage helper
  const persistProblems = (problems: SavedProblem[]) => {
    setSavedProblems(problems);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(problems));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  };

  // Count stones in grid
  const countStones = (grid: StoneType[][]) => {
    let black = 0;
    let white = 0;
    grid.forEach(row => {
      row.forEach(cell => {
        if (cell === 'BLACK') black++;
        if (cell === 'WHITE') white++;
      });
    });
    return { black, white };
  };

  // Save current board as a new problem
  const handleSaveCurrentBoard = () => {
    const counts = countStones(currentGrid);
    if (counts.black === 0 && counts.white === 0) {
      onShowMessage("盤面に石が置かれていません。石を配置してから登録してください。");
      return;
    }

    const defaultTitle = `詰碁場面 #${savedProblems.length + 1} (${boardSize}路盤)`;
    setProblemName(defaultTitle);
    setProblemDescription('');
    setIsSaveModalOpen(true);
  };

  const confirmSaveProblem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemName.trim()) return;

    const newProblem: SavedProblem = {
      id: `prob_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: problemName.trim(),
      description: problemDescription.trim(),
      size: boardSize,
      grid: currentGrid.map(r => [...r]),
      createdAt: new Date().toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    const updated = [newProblem, ...savedProblems];
    persistProblems(updated);

    setIsSaveModalOpen(false);
    setIsStockListOpen(true);
    onShowMessage(`場面「${newProblem.name}」を登録ストックに保存しました！`);
  };

  // Delete problem
  const handleDeleteProblem = (id: string, name: string) => {
    if (window.confirm(`登録場面「${name}」を削除してもよろしいですか？`)) {
      const updated = savedProblems.filter(p => p.id !== id);
      persistProblems(updated);
      onShowMessage(`場面「${name}」を削除しました。`);
    }
  };

  // Export JSON backup
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(savedProblems, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `go_tsumego_stock_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON backup
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          const combined = [...parsed, ...savedProblems];
          // Remove duplicates by id
          const uniqueMap = new Map();
          combined.forEach(item => {
            if (item.id && item.grid && item.name) {
              uniqueMap.set(item.id, item);
            }
          });
          const newList = Array.from(uniqueMap.values());
          persistProblems(newList);
          onShowMessage(`${parsed.length}件の場面を読み込みインポートしました！`);
        }
      } catch (err) {
        alert("JSONファイルの形式が正しくありません。");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const filteredProblems = savedProblems.filter(p => {
    if (filterSize === 'ALL') return true;
    return p.size === filterSize;
  });

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Top Action Bar for Registering and Managing Stock */}
      <div className="flex flex-wrap items-center justify-between bg-white p-3 px-4 rounded-xl shadow-sm border border-neutral-200 gap-3">
        <div className="flex items-center gap-2 text-neutral-800 font-bold text-sm">
          <BookmarkPlus className="w-5 h-5 text-indigo-600" />
          <span>場面ストック管理</span>
          <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-0.5 rounded-full font-bold">
            {savedProblems.length}件 保存中
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveCurrentBoard}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm px-3.5 py-2 rounded-lg shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            現在の場面を登録
          </button>

          <button
            onClick={() => setIsStockListOpen(!isStockListOpen)}
            className={`flex items-center gap-1.5 font-semibold text-xs sm:text-sm px-3.5 py-2 rounded-lg transition-all border ${
              isStockListOpen
                ? 'bg-neutral-800 text-white border-neutral-800'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border-neutral-300'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            ストック一覧 {isStockListOpen ? 'を閉じる' : 'を見る'}
          </button>
        </div>
      </div>

      {/* Stock List Modal or Panel */}
      {isStockListOpen && (
        <div className="bg-white rounded-2xl shadow-lg border border-neutral-200 p-5 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex flex-wrap items-center justify-between pb-3 mb-4 border-b border-neutral-200 gap-3">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-indigo-600" />
              <h2 className="font-bold text-neutral-800 text-base">登録場面一覧 (自動永久保存)</h2>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500 font-medium">絞り込み:</span>
              <div className="flex bg-neutral-100 p-0.5 rounded-lg border border-neutral-200 text-xs">
                <button
                  onClick={() => setFilterSize('ALL')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    filterSize === 'ALL' ? 'bg-white text-indigo-700 shadow-sm font-bold' : 'text-neutral-600'
                  }`}
                >
                  すべて
                </button>
                <button
                  onClick={() => setFilterSize(9)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    filterSize === 9 ? 'bg-white text-indigo-700 shadow-sm font-bold' : 'text-neutral-600'
                  }`}
                >
                  9路
                </button>
                <button
                  onClick={() => setFilterSize(13)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    filterSize === 13 ? 'bg-white text-indigo-700 shadow-sm font-bold' : 'text-neutral-600'
                  }`}
                >
                  13路
                </button>
                <button
                  onClick={() => setFilterSize(19)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    filterSize === 19 ? 'bg-white text-indigo-700 shadow-sm font-bold' : 'text-neutral-600'
                  }`}
                >
                  19路
                </button>
              </div>
            </div>
          </div>

          {/* List of problems */}
          {filteredProblems.length === 0 ? (
            <div className="text-center py-8 text-neutral-400 flex flex-col items-center gap-2">
              <LayoutGrid className="w-8 h-8 text-neutral-300" />
              <p className="text-sm">登録されている場面はありません。</p>
              <p className="text-xs text-neutral-400">「現在の場面を登録」ボタンを押すと何個でもここにストック保存できます。</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
              {filteredProblems.map((problem) => {
                const counts = countStones(problem.grid);
                return (
                  <div
                    key={problem.id}
                    className="bg-neutral-50 hover:bg-indigo-50/50 border border-neutral-200 hover:border-indigo-300 rounded-xl p-3.5 flex flex-col justify-between transition-all group shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-neutral-800 text-sm truncate max-w-[200px]" title={problem.name}>
                          {problem.name}
                        </span>
                        <span className="text-[10px] bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded-md font-semibold">
                          {problem.size}路盤
                        </span>
                      </div>

                      {problem.description && (
                        <p className="text-xs text-neutral-500 mb-2 line-clamp-1">{problem.description}</p>
                      )}

                      <div className="flex items-center gap-3 text-xs text-neutral-500 mb-3">
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-black inline-block" />
                          黒 {counts.black}子
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-white border border-neutral-400 inline-block" />
                          白 {counts.white}子
                        </span>
                        <span className="text-[10px] text-neutral-400 ml-auto">{problem.createdAt}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-200/80">
                      <button
                        onClick={() => {
                          onLoadProblem(problem);
                          onShowMessage(`場面「${problem.name}」を盤面に呼び出しました。`);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-1.5 px-3 rounded-lg shadow-sm transition-colors"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        盤面に読み込む
                      </button>

                      <button
                        onClick={() => handleDeleteProblem(problem.id, problem.name)}
                        className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Export / Import footer */}
          <div className="mt-4 pt-3 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
            <span>※データはブラウザのLocalStorageに永続保存されます。</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportJSON}
                disabled={savedProblems.length === 0}
                className="flex items-center gap-1 text-neutral-600 hover:text-indigo-600 disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5" />
                バックアップ保存 (JSON)
              </button>
              <span>|</span>
              <label className="flex items-center gap-1 text-neutral-600 hover:text-indigo-600 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                復元 (JSON)
                <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Save Problem Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-neutral-200 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-neutral-800 text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                場面をストック登録
              </h3>
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={confirmSaveProblem} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  場面タイトル <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={problemName}
                  onChange={(e) => setProblemName(e.target.value)}
                  placeholder="例: 詰碁基礎 #1"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  メモ・解説 (任意)
                </label>
                <textarea
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  placeholder="例: 黒先で白の眼を潰す問題"
                  rows={2}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 text-xs text-neutral-600 flex justify-between">
                <span>碁盤サイズ: <strong>{boardSize}路盤</strong></span>
                <span>石の数: <strong>黒 {countStones(currentGrid).black}子 / 白 {countStones(currentGrid).white}子</strong></span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-lg"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm"
                >
                  登録保存する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

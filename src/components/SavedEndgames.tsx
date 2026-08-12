import React, { useState, useEffect } from 'react';
import { SavedEndgame, StoneType } from '../types';
import { PRESET_ENDGAMES } from '../lib/goSeichiEngine';
import { Bookmark, Plus, Trash2, Play, Grid, Layers, Sparkles } from 'lucide-react';
import { BoardImageUploader } from './BoardImageUploader';

interface SavedEndgamesProps {
  currentGrid: StoneType[][];
  boardSize: number;
  blackPrisoners: number;
  whitePrisoners: number;
  komi: number;
  onLoadEndgame: (endgame: SavedEndgame) => void;
  onBoardParsedImage?: (grid: StoneType[][], parsedSize: number, detectedPrisoners?: { black: number; white: number }) => void;
}

const STORAGE_KEY = 'go_seichi_saved_endgames_v1';
const DELETED_PRESETS_KEY = 'go_seichi_deleted_presets_v1';

export const SavedEndgames: React.FC<SavedEndgamesProps> = ({
  currentGrid,
  boardSize,
  blackPrisoners,
  whitePrisoners,
  komi,
  onLoadEndgame,
  onBoardParsedImage,
}) => {
  const [userSaved, setUserSaved] = useState<SavedEndgame[]>([]);
  const [deletedPresetIds, setDeletedPresetIds] = useState<string[]>([]);
  const [saveName, setSaveName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUserSaved(JSON.parse(stored));
      }
      const storedDeletedPresets = localStorage.getItem(DELETED_PRESETS_KEY);
      if (storedDeletedPresets) {
        setDeletedPresetIds(JSON.parse(storedDeletedPresets));
      }
    } catch (e) {
      console.error("Failed to load saved endgames from localStorage", e);
    }
  }, []);

  const handleSaveCurrent = () => {
    if (!saveName.trim()) return;

    const newEndgame: SavedEndgame = {
      id: `user-${Date.now()}`,
      name: saveName.trim(),
      size: boardSize,
      grid: currentGrid.map(r => [...r]),
      blackPrisoners,
      whitePrisoners,
      komi,
      createdAt: new Date().toLocaleDateString('ja-JP'),
    };

    const updated = [newEndgame, ...userSaved];
    setUserSaved(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save to localStorage", e);
    }

    setSaveName('');
    setIsSaving(false);
  };

  const handleDeleteUserSaved = (id: string) => {
    const updated = userSaved.filter(item => item.id !== id);
    setUserSaved(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to delete from localStorage", e);
    }
  };

  const handleDeletePreset = (id: string) => {
    const updated = [...deletedPresetIds, id];
    setDeletedPresetIds(updated);
    try {
      localStorage.setItem(DELETED_PRESETS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save deleted presets to localStorage", e);
    }
  };

  const handleRestorePresets = () => {
    setDeletedPresetIds([]);
    try {
      localStorage.removeItem(DELETED_PRESETS_KEY);
    } catch (e) {
      console.error("Failed to restore presets", e);
    }
  };

  const activePresets = PRESET_ENDGAMES.filter(p => !deletedPresetIds.includes(p.id));

  return (
    <div className="w-full bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-sm space-y-4">
      {/* Header action bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-neutral-800 flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-amber-600" />
            終局図サンプル＆保存リスト
          </h3>
          {deletedPresetIds.length > 0 && (
            <button
              onClick={handleRestorePresets}
              className="text-[11px] text-amber-700 hover:text-amber-900 underline font-medium"
            >
              初期サンプルを復元
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onBoardParsedImage && (
            <BoardImageUploader
              variant="inline"
              boardSize={boardSize}
              onBoardParsed={onBoardParsedImage}
            />
          )}

          {!isSaving ? (
            <button
              onClick={() => setIsSaving(true)}
              className="px-3 py-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              今の盤面を保存
            </button>
          ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="終局図の名前..."
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              className="px-2.5 py-1 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <button
              onClick={handleSaveCurrent}
              className="px-2.5 py-1 bg-amber-600 text-white rounded-md text-xs font-bold hover:bg-amber-700"
            >
              保存
            </button>
            <button
              onClick={() => setIsSaving(false)}
              className="px-2 py-1 text-xs text-neutral-500 hover:text-neutral-800"
            >
              キャンセル
            </button>
          </div>
        )}
        </div>
      </div>

      {/* Preset List */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {activePresets.map((preset) => (
          <div
            key={preset.id}
            className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 hover:border-amber-400 transition-all flex flex-col justify-between gap-2 relative group"
          >
            <div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-neutral-900 line-clamp-1">{preset.name}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                    {preset.size}×{preset.size}
                  </span>
                  <button
                    onClick={() => handleDeletePreset(preset.id)}
                    className="text-neutral-400 hover:text-red-600 p-1 rounded-md hover:bg-neutral-200/50 transition-colors"
                    title="サンプルを削除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2">
                {preset.description}
              </p>
            </div>

            <button
              onClick={() => onLoadEndgame(preset)}
              className="w-full py-1.5 bg-white hover:bg-amber-50 text-amber-900 border border-neutral-200 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 mt-1 shadow-2xs"
            >
              <Play className="w-3 h-3 text-amber-600 fill-amber-600" />
              この終局図を読み込む
            </button>
          </div>
        ))}

        {/* Custom User Saved Items */}
        {userSaved.map((item) => (
          <div
            key={item.id}
            className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 hover:border-amber-400 transition-all flex flex-col justify-between gap-2"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-950 line-clamp-1">{item.name}</span>
                <button
                  onClick={() => handleDeleteUserSaved(item.id)}
                  className="text-neutral-400 hover:text-red-600 p-0.5"
                  title="削除"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-[10px] text-neutral-400">{item.createdAt}</span>
            </div>

            <button
              onClick={() => onLoadEndgame(item)}
              className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 mt-1"
            >
              <Play className="w-3 h-3 fill-white" />
              読み込む
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

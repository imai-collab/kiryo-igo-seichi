import React, { useState, useEffect, useRef } from 'react';
import { SavedEndgame, StoneType } from '../types';
import { PRESET_ENDGAMES } from '../lib/goSeichiEngine';
import { Bookmark, Plus, Trash2, Play, Grid, Layers, Sparkles, Download, Upload } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Export all saved items (and active presets) to JSON file
  const handleExportJSON = () => {
    const activePresets = PRESET_ENDGAMES.filter(p => !deletedPresetIds.includes(p.id));
    const allItems = [...userSaved, ...activePresets];
    if (allItems.length === 0) {
      alert("保存されている終局図データがありません。");
      return;
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allItems, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `go_endgame_list_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export a single item
  const handleExportSingleItem = (item: SavedEndgame) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(item, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    const safeName = item.name.replace(/[/\\?%*:|"<>]/g, '_');
    downloadAnchor.setAttribute("download", `endgame_${safeName}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON file
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        const itemsToImport: any[] = Array.isArray(parsed) ? parsed : [parsed];

        const validItems: SavedEndgame[] = [];
        for (const item of itemsToImport) {
          if (item && typeof item === 'object' && Array.isArray(item.grid) && item.grid.length > 0) {
            validItems.push({
              id: `imported-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              name: item.name || '外部読込データ',
              size: item.size || item.grid.length,
              grid: item.grid,
              blackPrisoners: typeof item.blackPrisoners === 'number' ? item.blackPrisoners : 0,
              whitePrisoners: typeof item.whitePrisoners === 'number' ? item.whitePrisoners : 0,
              komi: typeof item.komi === 'number' ? item.komi : 6.5,
              createdAt: item.createdAt || new Date().toLocaleDateString('ja-JP'),
              description: item.description,
            });
          }
        }

        if (validItems.length === 0) {
          alert('有効な終局図データが見つかりませんでした。正しいJSONファイルを選択してください。');
          return;
        }

        const updatedUserSaved = [...validItems, ...userSaved];
        setUserSaved(updatedUserSaved);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUserSaved));
        alert(`${validItems.length} 件の終局図データを読み込み、保存リストに追加しました。`);
      } catch (err) {
        console.error("Failed to parse JSON file", err);
        alert('ファイルの読み込みに失敗しました。JSONフォーマットをご確認ください。');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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

        <div className="flex items-center gap-2 flex-wrap">
          {/* File Export/Import Buttons */}
          <button
            onClick={handleExportJSON}
            className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 border border-neutral-200"
            title="リスト全体をJSONファイルとして保存"
          >
            <Download className="w-3.5 h-3.5" />
            ファイル出力
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 border border-neutral-200"
            title="JSONファイルからリストを読み込む"
          >
            <Upload className="w-3.5 h-3.5" />
            ファイル読み込み
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportJSON}
            className="hidden"
          />

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
                    onClick={() => handleExportSingleItem(preset)}
                    className="text-neutral-400 hover:text-amber-600 p-1 rounded-md hover:bg-neutral-200/50 transition-colors"
                    title="この終局図をJSONファイルで書き出す"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
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
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleExportSingleItem(item)}
                    className="text-neutral-400 hover:text-amber-700 p-0.5"
                    title="この終局図をJSONファイルで書き出す"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteUserSaved(item.id)}
                    className="text-neutral-400 hover:text-red-600 p-0.5"
                    title="削除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
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


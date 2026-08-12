import React, { useState, useRef } from 'react';
import { StoneType } from '../types';
import { PRESET_ENDGAMES } from '../lib/goSeichiEngine';
import { Upload, Image as ImageIcon, Sparkles, AlertCircle, Loader2, X, Camera, Play } from 'lucide-react';

interface BoardImageUploaderProps {
  boardSize?: number;
  variant?: 'button' | 'card' | 'inline';
  onBoardParsed: (grid: StoneType[][], parsedSize: number, detectedPrisoners?: { black: number; white: number }) => void;
}

export const BoardImageUploader: React.FC<BoardImageUploaderProps> = ({
  boardSize = 9,
  variant = 'button',
  onBoardParsed,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetSize, setTargetSize] = useState<number>(boardSize);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isImageFile = (file: File) => {
    if (file.type && file.type.startsWith('image/')) return true;
    return /\.(png|jpe?g|webp|gif|bmp|heic)$/i.test(file.name);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isImageFile(file)) {
      setError('画像ファイル（PNG, JPG, WEBPなど）を選択してください。');
      return;
    }

    setSelectedFile(file);
    setError(null);

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && isImageFile(file)) {
      setSelectedFile(file);
      setError(null);
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else if (file) {
      setError('画像ファイル（PNG, JPG, WEBPなど）を選択してください。');
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!selectedFile || !previewUrl) return;

    setIsProcessing(true);
    setError(null);

    try {
      const parts = previewUrl.split(',');
      const base64Data = parts[1];

      // Extract MIME type from data URI or selected file
      let mimeType = selectedFile.type;
      if (!mimeType || !mimeType.startsWith('image/')) {
        const match = parts[0].match(/data:(image\/[a-zA-Z0-9.-]+);base64/);
        if (match && match[1]) {
          mimeType = match[1];
        } else if (/\.(png)$/i.test(selectedFile.name)) {
          mimeType = 'image/png';
        } else {
          mimeType = 'image/jpeg';
        }
      }

      const response = await fetch('/api/parse-board-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Data,
          mimeType,
          size: targetSize,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '画像の解析に失敗しました。');
      }

      if (data.grid && Array.isArray(data.grid)) {
        onBoardParsed(
          data.grid,
          data.size || targetSize,
          data.detectedPrisoners || { black: 0, white: 0 }
        );
        setIsOpen(false);
        setSelectedFile(null);
        setPreviewUrl(null);
      } else {
        throw new Error('有効な碁盤データを検出できませんでした。');
      }
    } catch (err: any) {
      console.error('Board image parsing error:', err);
      setError(err.message || '画像の認識中にエラーが発生しました。');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* Trigger Button or Card */}
      {variant === 'card' ? (
        <div
          onClick={() => setIsOpen(true)}
          className="w-full p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border-2 border-dashed border-amber-400 hover:border-amber-600 rounded-2xl cursor-pointer transition-all flex items-center justify-between group shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-amber-600 to-amber-700 text-white rounded-xl shadow-md group-hover:scale-105 transition-transform">
              <Camera className="w-6 h-6" />
            </div>
            <div className="text-left">
              <h4 className="text-sm font-bold text-amber-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                画像を読み込む（碁盤の自動解析）
              </h4>
              <p className="text-xs text-amber-900/80 mt-0.5">
                碁盤の写真やスクリーンショットをAIが解析し、黒石・白石の配置を全自動復元します
              </p>
            </div>
          </div>

          <button className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all shrink-0">
            画像を読み込む
          </button>
        </div>
      ) : variant === 'inline' ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all flex items-center gap-1.5 hover:scale-[1.02]"
        >
          <Camera className="w-4 h-4 text-amber-200" />
          画像を読み込む
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 hover:scale-[1.02]"
        >
          <Camera className="w-4 h-4 text-amber-200" />
          画像を読み込む
        </button>
      )}

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 relative space-y-5">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-3 border-neutral-100">
              <div>
                <h3 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-amber-600" />
                  終局図画像のAI読み取り
                </h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  ネット囲碁アプリ等の終局図スクショをAIが識別し、黒石・白石・盤面サイズを全自動復元します
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setSelectedFile(null);
                  setPreviewUrl(null);
                  setError(null);
                }}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Board Size Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-700">優先盤面サイズ (AI自動判定):</label>
                <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 font-medium">
                  画像から自動判定されます
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 bg-neutral-100 p-1.5 rounded-xl">
                {[19, 13, 9].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setTargetSize(s)}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                      targetSize === s ? 'bg-amber-600 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    {s}×{s} 路盤 {s === 19 ? '(標準)' : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Upload Drag & Drop Area */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                previewUrl
                  ? 'border-amber-500 bg-amber-50/30'
                  : 'border-neutral-300 hover:border-amber-400 bg-neutral-50/50 hover:bg-amber-50/10'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              {previewUrl ? (
                <div className="relative max-h-48 overflow-hidden rounded-lg border border-neutral-200">
                  <img src={previewUrl} alt="Go Board Preview" className="max-h-48 object-contain rounded-lg" />
                  <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md backdrop-blur-xs">
                    クリックして画像を変更
                  </span>
                </div>
              ) : (
                <>
                  <div className="p-3 bg-amber-100/70 text-amber-800 rounded-full">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-neutral-800">
                    ここに画像をドラッグ＆ドロップ
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    またはクリックしてファイル（写真・スクショ）を選択
                  </p>
                </>
              )}
            </div>

            {/* Sample Quick Load Banner */}
            <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-amber-950 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  サンプル19路盤（添付画像）をテスト読み込み:
                </span>
                <p className="text-[10px] text-amber-800">
                  ファイルを選択せずに、添付された19路盤終局図の石配置を即時読み込みます
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const samplePreset = PRESET_ENDGAMES.find(p => p.id === 'preset-19x19-sample') || PRESET_ENDGAMES[0];
                  onBoardParsed(samplePreset.grid, samplePreset.size, {
                    black: samplePreset.blackPrisoners,
                    white: samplePreset.whitePrisoners,
                  });
                  setIsOpen(false);
                  setSelectedFile(null);
                  setPreviewUrl(null);
                  setError(null);
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-xs transition-all shrink-0 flex items-center gap-1 hover:scale-105"
              >
                <Play className="w-3 h-3 fill-white" />
                サンプル適用
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setSelectedFile(null);
                  setPreviewUrl(null);
                  setError(null);
                }}
                className="px-4 py-2 text-xs font-bold text-neutral-600 hover:text-neutral-900 rounded-xl"
              >
                キャンセル
              </button>

              <button
                type="button"
                onClick={handleUploadAndAnalyze}
                disabled={!selectedFile || isProcessing}
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 hover:scale-[1.02]"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    AIが画像を解析中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-200" />
                    画像を読み込んで配置する
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

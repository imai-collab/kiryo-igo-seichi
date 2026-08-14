import React, { useState, useRef } from 'react';
import { StoneType } from '../types';
import { parseSgf, ParsedSgfResult } from '../lib/sgfParser';
import { PRESET_ENDGAMES } from '../lib/goSeichiEngine';
import {
  Upload,
  Camera,
  Sparkles,
  AlertCircle,
  Loader2,
  X,
  Play,
  FileText,
  Clipboard,
  CheckCircle2
} from 'lucide-react';

interface BoardImageUploaderProps {
  boardSize?: number;
  variant?: 'button' | 'card' | 'inline';
  onBoardParsed: (
    grid: StoneType[][],
    parsedSize: number,
    detectedPrisoners?: { black: number; white: number },
    komi?: number
  ) => void;
}

export const BoardImageUploader: React.FC<BoardImageUploaderProps> = ({
  boardSize = 19,
  variant = 'button',
  onBoardParsed,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'sgf_file' | 'sgf_paste' | 'image'>('sgf_file');

  // SGF File state
  const [selectedSgfFile, setSelectedSgfFile] = useState<File | null>(null);
  const [sgfParsedPreview, setSgfParsedPreview] = useState<ParsedSgfResult | null>(null);

  // SGF Text Paste state
  const [sgfText, setSgfText] = useState<string>('');

  // Image Upload state
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [targetImageSize, setTargetImageSize] = useState<number>(boardSize);

  // Common error state
  const [error, setError] = useState<string | null>(null);

  const sgfFileInputRef = useRef<HTMLInputElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  // --- SGF File Handlers ---
  const handleSgfFileSelect = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.sgf') && file.type !== 'text/plain') {
      setError('SGFファイル（.sgf）を選択してください。');
      return;
    }

    setSelectedSgfFile(file);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseSgf(text);
        setSgfParsedPreview(parsed);
      } catch (err: any) {
        setSgfParsedPreview(null);
        setError(err.message || 'SGFファイルの解析に失敗しました。');
      }
    };
    reader.readAsText(file);
  };

  const handleSgfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleSgfFileSelect(file);
  };

  const handleSgfFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleSgfFileSelect(file);
  };

  const handleLoadSgfFile = () => {
    if (!sgfParsedPreview) {
      setError('有効なSGFファイルを選択してください。');
      return;
    }
    onBoardParsed(
      sgfParsedPreview.grid,
      sgfParsedPreview.size,
      { black: sgfParsedPreview.blackPrisoners, white: sgfParsedPreview.whitePrisoners },
      sgfParsedPreview.komi
    );
    resetAndCloseModal();
  };

  // --- SGF Paste Handlers ---
  const handleLoadSgfText = () => {
    if (!sgfText.trim()) {
      setError('SGFテキストを入力または貼り付けてください。');
      return;
    }

    try {
      setError(null);
      const parsed = parseSgf(sgfText);
      onBoardParsed(
        parsed.grid,
        parsed.size,
        { black: parsed.blackPrisoners, white: parsed.whitePrisoners },
        parsed.komi
      );
      resetAndCloseModal();
    } catch (err: any) {
      setError(err.message || '入力されたSGFテキストの解釈に失敗しました。');
    }
  };

  // Sample SGF Paste Generator
  const insertSampleSgf = (size: 19 | 9) => {
    if (size === 19) {
      const sample19 = `(;GM[1]FF[4]CA[UTF-8]SZ[19]KM[6.5]PB[黒番]PW[白番]GN[19路盤 終局サンプル]
AB[pd][dd][dp][pp][cd][ed][ec][fc][fd][gc][gd][hc][hd][ic][id]
AW[qd][oc][dq][qo][ce][de][df][ee][ef][fe][ff][ge][gf][he][hf]
;B[pq];W[qq];B[pr];W[qr];B[or];W[qp];B[po];W[pn];B[on];W[pm]
)`;
      setSgfText(sample19);
    } else {
      const sample9 = `(;GM[1]FF[4]CA[UTF-8]SZ[9]KM[6.5]PB[黒番]PW[白番]GN[9路盤 終局サンプル]
AB[cc][cd][ce][dc][ec][fc][fb]
AW[dd][de][df][ee][fe][ge][gd]
)`;
      setSgfText(sample9);
    }
    setError(null);
  };

  // --- Image Upload Handlers ---
  const isImageFile = (file: File) => {
    if (file.type && file.type.startsWith('image/')) return true;
    return /\.(png|jpe?g|webp|gif|bmp|heic)$/i.test(file.name);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isImageFile(file)) {
      setError('画像ファイル（PNG, JPG, WEBPなど）を選択してください。');
      return;
    }

    setSelectedImageFile(file);
    setError(null);

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && isImageFile(file)) {
      setSelectedImageFile(file);
      setError(null);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else if (file) {
      setError('画像ファイル（PNG, JPG, WEBPなど）を選択してください。');
    }
  };

  const handleUploadAndAnalyzeImage = async () => {
    if (!selectedImageFile || !imagePreviewUrl) return;

    setIsProcessingImage(true);
    setError(null);

    try {
      const parts = imagePreviewUrl.split(',');
      const base64Data = parts[1];

      let mimeType = selectedImageFile.type;
      if (!mimeType || !mimeType.startsWith('image/')) {
        const match = parts[0].match(/data:(image\/[a-zA-Z0-9.-]+);base64/);
        if (match && match[1]) {
          mimeType = match[1];
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
          size: targetImageSize,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '画像の解析に失敗しました。');
      }

      if (data.grid && Array.isArray(data.grid)) {
        onBoardParsed(
          data.grid,
          data.size || targetImageSize,
          data.detectedPrisoners || { black: 0, white: 0 }
        );
        resetAndCloseModal();
      } else {
        throw new Error('有効な碁盤データを検出できませんでした。');
      }
    } catch (err: any) {
      console.error('Board image parsing error:', err);
      setError(err.message || '画像の認識中にエラーが発生しました。');
    } finally {
      setIsProcessingImage(false);
    }
  };

  const resetAndCloseModal = () => {
    setIsOpen(false);
    setSelectedSgfFile(null);
    setSgfParsedPreview(null);
    setSgfText('');
    setSelectedImageFile(null);
    setImagePreviewUrl(null);
    setError(null);
  };

  return (
    <>
      {/* Trigger Component (Card / Inline / Button) */}
      {variant === 'card' ? (
        <div
          onClick={() => setIsOpen(true)}
          className="w-full p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border-2 border-dashed border-amber-400 hover:border-amber-600 rounded-2xl cursor-pointer transition-all flex items-center justify-between group shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-amber-600 to-amber-700 text-white rounded-xl shadow-md group-hover:scale-105 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <div className="text-left">
              <h4 className="text-sm font-bold text-amber-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                SGF読み込み / 画像読み込み（盤面自動復元）
              </h4>
              <p className="text-xs text-amber-900/80 mt-0.5">
                SGFファイル(.sgf)のアップロード、SGFテキストの貼り付け、または画像AI認識から盤面を一発読み込みできます
              </p>
            </div>
          </div>

          <button className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all shrink-0">
            データを読み込む
          </button>
        </div>
      ) : variant === 'inline' ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all flex items-center gap-1.5 hover:scale-[1.02]"
        >
          <FileText className="w-4 h-4 text-amber-200" />
          SGF / 盤面読み込み
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 hover:scale-[1.02]"
        >
          <FileText className="w-4 h-4 text-amber-200" />
          SGF / 盤面読み込み
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
                  <FileText className="w-5 h-5 text-amber-600" />
                  盤面・終局図データの読み込み
                </h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  SGFファイル・SGFテキスト・碁盤画像から盤面とアゲハを自動解析・配置します
                </p>
              </div>
              <button
                type="button"
                onClick={resetAndCloseModal}
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Selector Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-neutral-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => { setActiveTab('sgf_file'); setError(null); }}
                className={`py-2 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'sgf_file'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                SGFファイル
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('sgf_paste'); setError(null); }}
                className={`py-2 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'sgf_paste'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
                }`}
              >
                <Clipboard className="w-3.5 h-3.5" />
                SGFテキスト貼り付け
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('image'); setError(null); }}
                className={`py-2 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'image'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                画像AI解析
              </button>
            </div>

            {/* --- TAB 1: SGF FILE UPLOAD --- */}
            {activeTab === 'sgf_file' && (
              <div className="space-y-4">
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleSgfFileDrop}
                  onClick={() => sgfFileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                    selectedSgfFile
                      ? 'border-amber-500 bg-amber-50/40'
                      : 'border-neutral-300 hover:border-amber-400 bg-neutral-50/50 hover:bg-amber-50/10'
                  }`}
                >
                  <input
                    ref={sgfFileInputRef}
                    type="file"
                    accept=".sgf,text/plain"
                    className="hidden"
                    onChange={handleSgfFileChange}
                  />

                  <div className="p-3 bg-amber-100/80 text-amber-800 rounded-full">
                    <Upload className="w-6 h-6" />
                  </div>

                  {selectedSgfFile ? (
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-amber-950 flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        {selectedSgfFile.name}
                      </p>
                      <p className="text-[11px] text-neutral-500">
                        クリックまたはドラッグ＆ドロップで別のSGFファイルに変更
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs font-bold text-neutral-800">
                        ここにSGFファイル（.sgf）をドラッグ＆ドロップ
                      </p>
                      <p className="text-[11px] text-neutral-500">
                        またはクリックしてPCからSGFファイルを選択
                      </p>
                    </>
                  )}
                </div>

                {/* SGF Parsed Metadata Preview */}
                {sgfParsedPreview && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold text-amber-950">
                      <span>解析プレビュー:</span>
                      <span className="bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded text-[11px]">
                        {sgfParsedPreview.size}×{sgfParsedPreview.size} 路盤
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-neutral-700 text-[11px]">
                      <div>・コミ: {sgfParsedPreview.komi} 目</div>
                      <div>・アゲハ: 白 {sgfParsedPreview.blackPrisoners} / 黒 {sgfParsedPreview.whitePrisoners}</div>
                      {sgfParsedPreview.playerBlack && <div>・黒番: {sgfParsedPreview.playerBlack}</div>}
                      {sgfParsedPreview.playerWhite && <div>・白番: {sgfParsedPreview.playerWhite}</div>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* --- TAB 2: SGF TEXT PASTE --- */}
            {activeTab === 'sgf_paste' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-700">SGF形式テキストを入力 / 貼り付け:</label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => insertSampleSgf(19)}
                      className="text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-semibold transition-all"
                    >
                      19路サンプル
                    </button>
                    <button
                      type="button"
                      onClick={() => insertSampleSgf(9)}
                      className="text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-semibold transition-all"
                    >
                      9路サンプル
                    </button>
                  </div>
                </div>

                <textarea
                  rows={6}
                  value={sgfText}
                  onChange={(e) => setSgfText(e.target.value)}
                  placeholder="(;GM[1]FF[4]SZ[19]KM[6.5]AB[pd][dd][dp]AW[qd][oc]...)"
                  className="w-full p-3 font-mono text-xs bg-neutral-50 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
                />
              </div>
            )}

            {/* --- TAB 3: IMAGE AI PARSING --- */}
            {activeTab === 'image' && (
              <div className="space-y-4">
                {/* Board size hint selector */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-neutral-700">優先盤面サイズ (AI自動判定):</label>
                  </div>
                  <div className="grid grid-cols-3 gap-2 bg-neutral-100 p-1.5 rounded-xl">
                    {[19, 13, 9].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setTargetImageSize(s)}
                        className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                          targetImageSize === s ? 'bg-amber-600 text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                        }`}
                      >
                        {s}×{s} 路盤
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleImageDrop}
                  onClick={() => imageFileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                    imagePreviewUrl
                      ? 'border-amber-500 bg-amber-50/30'
                      : 'border-neutral-300 hover:border-amber-400 bg-neutral-50/50 hover:bg-amber-50/10'
                  }`}
                >
                  <input
                    ref={imageFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageFileChange}
                  />

                  {imagePreviewUrl ? (
                    <div className="relative max-h-40 overflow-hidden rounded-lg border border-neutral-200">
                      <img src={imagePreviewUrl} alt="Go Board Preview" className="max-h-40 object-contain rounded-lg" />
                    </div>
                  ) : (
                    <>
                      <div className="p-2.5 bg-amber-100/70 text-amber-800 rounded-full">
                        <Camera className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-neutral-800">
                        ここに画像をドラッグ＆ドロップ
                      </p>
                      <p className="text-[11px] text-neutral-500">
                        またはクリックして終局図写真・スクショを選択
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Error Message Alert */}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Modal Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={resetAndCloseModal}
                className="px-4 py-2 text-xs font-bold text-neutral-600 hover:text-neutral-900 rounded-xl"
              >
                キャンセル
              </button>

              {activeTab === 'sgf_file' && (
                <button
                  type="button"
                  onClick={handleLoadSgfFile}
                  disabled={!selectedSgfFile || !sgfParsedPreview}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 hover:scale-[1.02]"
                >
                  <Play className="w-4 h-4 text-amber-200 fill-amber-200" />
                  SGFファイルを読み込んで配置
                </button>
              )}

              {activeTab === 'sgf_paste' && (
                <button
                  type="button"
                  onClick={handleLoadSgfText}
                  disabled={!sgfText.trim()}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 hover:scale-[1.02]"
                >
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  SGFテキストから読み込む
                </button>
              )}

              {activeTab === 'image' && (
                <button
                  type="button"
                  onClick={handleUploadAndAnalyzeImage}
                  disabled={!selectedImageFile || isProcessingImage}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50 hover:scale-[1.02]"
                >
                  {isProcessingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      AIが画像を解析中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-200" />
                      画像から配置する
                    </>
                  )}
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
};

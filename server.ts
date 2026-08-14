import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { calculateFullScore } from "./src/lib/goSeichiEngine";
import { StoneType, Point } from "./src/types";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "25mb" }));

  // API route to parse Go board image using Gemini multimodal AI
  app.post("/api/parse-board-image", async (req, res) => {
    try {
      let { image, mimeType = "image/jpeg", size = 9 } = req.body;

      if (!image) {
        return res.status(400).json({ error: "画像のデータ（base64）が見つかりません。" });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY がサーバーに設定されていません。" });
      }

      // Normalize mimeType for Gemini API
      if (!mimeType || typeof mimeType !== "string" || !mimeType.startsWith("image/")) {
        mimeType = "image/jpeg";
      } else if (mimeType === "image/jpg") {
        mimeType = "image/jpeg";
      }

      const requestedSize = Number(size) || 19;
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const prompt = `
あなたはプロの囲碁画像認識AIです。
添付された画像（囲碁対局アプリのスクリーンショット、終局図、写真など）を解析し、黒石・白石・空点の配置を判定してください。

【解析手順】
1. まず画像内の碁盤の実際の路数（19x19, 13x13, 9x9 など）を線の本数や全体構造から自動判定し、"boardSize" (数値) として設定してください。（ユーザー指定の参考値: ${requestedSize}路盤）
2. 上から順に各行（0行目〜boardSize - 1行目）について、左から右（0列目〜boardSize - 1列目）の各交点の状態を次の1文字で表した文字列（長さ boardSize）の配列 "rows" を作成してください：
   - 'B' : 黒石がある交点
   - 'W' : 白石がある交点（中央に丸印・番号・マーカーが重ね描画されている白石も 'W' です）
   - '.' : 石がない交点（空点、地、木目、星の点）

【出力形式 (JSONのみ)】
{
  "boardSize": 19,
  "rows": [
    "....B.W...........",
    "BBB.WWW.B.........",
    ... (boardSize 行分)
  ]
}
`;

      const candidateModels = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-3.1-pro-preview"];
      let aiResponse = null;
      let lastErrorMsg = "";

      for (const modelName of candidateModels) {
        try {
          aiResponse = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: "user",
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: image,
                    },
                  },
                ],
              },
            ],
            config: {
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          });
          if (aiResponse && aiResponse.text) {
            break;
          }
        } catch (err: any) {
          console.warn(`Model ${modelName} image parsing failed:`, err.message || err);
          lastErrorMsg = err.message || String(err);
        }
      }

      if (!aiResponse || !aiResponse.text) {
        throw new Error(`Gemini AIによる画像解析に失敗しました (${lastErrorMsg || "応答なし"})。画像をもう一度お確かめください。`);
      }

      let parsedData: any = {};
      try {
        let cleanText = aiResponse.text.trim();
        if (cleanText.startsWith("```")) {
          cleanText = cleanText.replace(/^```(json)?\n?/, "").replace(/\n?```$/, "");
        }
        parsedData = JSON.parse(cleanText);
      } catch (e) {
        console.error("Failed to parse Gemini raw response:", aiResponse?.text);
      }

      // Determine final board size (prefer AI detected size, default to requested or 19)
      let finalSize = Number(parsedData.boardSize) || requestedSize;
      if (![9, 13, 19].includes(finalSize)) {
        if (finalSize >= 16) finalSize = 19;
        else if (finalSize >= 11) finalSize = 13;
        else finalSize = 9;
      }

      let grid: string[][] = [];

      if (parsedData.rows && Array.isArray(parsedData.rows)) {
        grid = parsedData.rows.map((rowStr: string) => {
          const cells: string[] = [];
          for (let i = 0; i < finalSize; i++) {
            const ch = (rowStr[i] || '.').toUpperCase();
            if (ch === 'B' || ch === 'X' || ch === '1') {
              cells.push('BLACK');
            } else if (ch === 'W' || ch === 'O' || ch === '2') {
              cells.push('WHITE');
            } else {
              cells.push('EMPTY');
            }
          }
          return cells;
        });
      } else if (parsedData.grid && Array.isArray(parsedData.grid)) {
        grid = parsedData.grid.map((row: any) => {
          if (!Array.isArray(row)) return Array(finalSize).fill('EMPTY');
          return row.map((cell: any) => {
            const val = String(cell).toUpperCase();
            if (val === 'BLACK' || val === 'B' || val === 'X') return 'BLACK';
            if (val === 'WHITE' || val === 'W' || val === 'O') return 'WHITE';
            return 'EMPTY';
          });
        });
      }

      // Ensure dimensions fit finalSize
      if (grid.length < finalSize) {
        while (grid.length < finalSize) {
          grid.push(Array(finalSize).fill('EMPTY'));
        }
      }
      grid = grid.slice(0, finalSize).map(row => {
        if (row.length < finalSize) {
          return [...row, ...Array(finalSize - row.length).fill('EMPTY')];
        }
        return row.slice(0, finalSize);
      });

      return res.json({
        size: finalSize,
        grid,
        detectedPrisoners: parsedData.detectedPrisoners || { black: 0, white: 0 },
      });

    } catch (error: any) {
      console.error("Parse board image error:", error);
      res.status(500).json({ error: error.message || "画像からの盤面読み込み処理に失敗しました。" });
    }
  });

  // API route for Seichi Analysis & AI Commentary
  app.post("/api/analyze-seichi", async (req, res) => {
    try {
      const { grid, deadStones = [], blackPrisoners = 0, whitePrisoners = 0, komi = 6.5 } = req.body;

      if (!grid || !Array.isArray(grid)) {
        return res.status(400).json({ error: "Valid grid array is required." });
      }

      // Calculate score using local Go Seichi engine
      const scoreResult = calculateFullScore(
        grid as StoneType[][],
        deadStones as Point[],
        Number(blackPrisoners),
        Number(whitePrisoners),
        Number(komi)
      );

      // AI Commentary via Gemini if key is provided
      let aiCommentary = scoreResult.commentary;

      if (process.env.GEMINI_API_KEY) {
        try {
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

          const gridString = grid.map((row: StoneType[]) =>
            row.map(cell => cell === 'BLACK' ? 'X' : cell === 'WHITE' ? 'O' : '.').join('')
          ).join('\n');

          const prompt = `
あなたは日本棋院所属のプロ棋士兼、囲碁の「整地（せいち）・地計算」の専門指導者です。
ユーザーが作成した終局図の整地結果について、分かりやすく丁寧な日本語で整地手順と勝敗の解説を行ってください。

【終局図データ】
盤面（X=黒石, O=白石, .=目/空点）:
${gridString}

【整地集計データ】
- 黒地 (元の空点): ${scoreResult.blackTerritoryCount} 目
- 白地 (元の空点): ${scoreResult.whiteTerritoryCount} 目
- 死に石 (盤上に残った死石): ${deadStones.length} 個
- 黒のアゲハ (黒が捕獲した白石): ${blackPrisoners} 子 (白地の空点埋め用)
- 白のアゲハ (白が捕獲した黒石): ${whitePrisoners} 子 (黒地の空点埋め用)
- コミ: ${komi} 目
- 計算結果: 正味黒地 ${scoreResult.netBlackTerritory} 目 vs 正味白地+コミ ${scoreResult.finalWhiteScore} 目
- 勝敗: ${scoreResult.winner === 'BLACK' ? `黒の ${scoreResult.scoreDifference} 目勝ち` : scoreResult.winner === 'WHITE' ? `白の ${scoreResult.scoreDifference} 目勝ち` : '持碁（引き分け）'}

【解説の指示】
1. 整地の基本手順（死に石の取り除き → アゲハを相手の地に埋める［黒のアゲハ（白石）は白地に、白のアゲハ（黒石）は黒地に埋める］ → 地を5目・10目の四角形に整地する）に沿って、なぜこの勝敗結果になったかを初心者に分かりやすく説明してください。
2. 整地で計算ミスを防ぐためのワンポイントアドバイス（例：地を四角形にまとめるコツやアゲハ計算のポイント）を1言添えてください。

JSON形式で返答してください:
{
  "commentary": "整地解説とワンポイントアドバイスを含む文章"
}
`;

          const candidateModels = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-3.1-pro-preview"];
          let aiResponse = null;

          for (const modelName of candidateModels) {
            try {
              aiResponse = await ai.models.generateContent({
                model: modelName,
                contents: prompt,
                config: {
                  responseMimeType: "application/json",
                  temperature: 0.2,
                },
              });
              if (aiResponse && aiResponse.text) {
                break;
              }
            } catch (err: any) {
              console.warn(`Model ${modelName} failed:`, err.message);
            }
          }

          if (aiResponse && aiResponse.text) {
            const parsed = JSON.parse(aiResponse.text);
            if (parsed.commentary) {
              aiCommentary = parsed.commentary;
            }
          }
        } catch (geminiError: any) {
          console.warn("Gemini API call failed, using local engine output:", geminiError.message);
        }
      }

      return res.json({
        ...scoreResult,
        commentary: aiCommentary
      });

    } catch (error: any) {
      console.error("Seichi analysis error:", error);
      res.status(500).json({ error: error.message || "Failed to analyze seichi." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

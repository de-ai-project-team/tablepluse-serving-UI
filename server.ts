import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper for live dashboard data
function getDashboardPayload() {
  const nowISO = new Date().toISOString();
  return {
    store_id: "STORE-001",
    store_name: "테스트 매장 (강남점)",
    generated_at: nowISO,
    sales: {
      today_order_count: 122,
      today_sales_amount: 1936700,
      recent_order_count_5m: 8,
      updated_at: new Date(Date.now() - 60000).toISOString()
    },
    menus: [
      { menu_id: "MENU-001", menu_name: "치킨파스타", quantity_sold: 67, order_count: 57, sales_amount: 938000 },
      { menu_id: "MENU-002", menu_name: "스테이크 샐러드", quantity_sold: 42, order_count: 38, sales_amount: 756000 },
      { menu_id: "MENU-003", menu_name: "아보카도 명란 비빔밥", quantity_sold: 29, order_count: 27, sales_amount: 377000 },
      { menu_id: "MENU-004", menu_name: "연어 포케 샐러드", quantity_sold: 18, order_count: 16, sales_amount: 288000 },
      { menu_id: "MENU-005", menu_name: "마르가리타 피자", quantity_sold: 12, order_count: 12, sales_amount: 216000 }
    ],
    ingredients: [
      {
        ingredient_id: "ING-001",
        ingredient_name: "닭가슴살",
        unit: "g",
        data_quality: "ok",
        current_quantity: 24800.0,
        consumption_rate_per_hour: 3100.0,
        recent_consumption_quantity_1h: 3100.0,
        expected_depletion_at: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
        last_receipt_at: null,
        stockout_risk: "HIGH",
        updated_at: nowISO,
        recommended_quantity: 15000.0,
        recommended_order_at: new Date(Date.now() + 90 * 60 * 1000).toISOString()
      },
      {
        ingredient_id: "ING-002",
        ingredient_name: "소고기 등심",
        unit: "g",
        data_quality: "degraded",
        current_quantity: null,
        consumption_rate_per_hour: 1800.0,
        recent_consumption_quantity_1h: 1800.0,
        expected_depletion_at: new Date(Date.now() + 2.5 * 3600 * 1000).toISOString(),
        last_receipt_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
        stockout_risk: "CRITICAL",
        updated_at: nowISO,
        recommended_quantity: 12000.0,
        recommended_order_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
      },
      {
        ingredient_id: "ING-003",
        ingredient_name: "후레쉬 아보카도",
        unit: "g",
        data_quality: "ok",
        current_quantity: 8200.0,
        consumption_rate_per_hour: 900.0,
        recent_consumption_quantity_1h: 900.0,
        expected_depletion_at: new Date(Date.now() + 9 * 3600 * 1000).toISOString(),
        last_receipt_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        stockout_risk: "NORMAL",
        updated_at: nowISO
      },
      {
        ingredient_id: "ING-004",
        ingredient_name: "모짜렐라 치즈",
        unit: "g",
        data_quality: "ok",
        current_quantity: 0.0,
        consumption_rate_per_hour: 1200.0,
        recent_consumption_quantity_1h: 1200.0,
        expected_depletion_at: null,
        last_receipt_at: null,
        stockout_risk: "OUT_OF_STOCK",
        updated_at: nowISO,
        recommended_quantity: 10000.0,
        recommended_order_at: new Date(Date.now() - 10 * 60 * 1000).toISOString()
      },
      {
        ingredient_id: "ING-005",
        ingredient_name: "양상추 / 베이비채소",
        unit: "g",
        data_quality: "ok",
        current_quantity: 35000.0,
        consumption_rate_per_hour: 500.0,
        recent_consumption_quantity_1h: 500.0,
        expected_depletion_at: new Date(Date.now() + 20 * 3600 * 1000).toISOString(),
        last_receipt_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
        stockout_risk: "NORMAL",
        updated_at: nowISO
      }
    ],
    reorder: [
      { ingredient_name: "소고기 등심", unit: "g", recommended_quantity: 12000.0, recommended_order_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() },
      { ingredient_name: "닭가슴살", unit: "g", recommended_quantity: 15000.0, recommended_order_at: new Date(Date.now() + 90 * 60 * 1000).toISOString() },
      { ingredient_name: "모짜렐라 치즈", unit: "g", recommended_quantity: 10000.0, recommended_order_at: new Date(Date.now() - 10 * 60 * 1000).toISOString() }
    ],
    _meta: {
      ingredients_settled: 4,
      ingredients_total: 5
    }
  };
}

// API Routes
app.get("/api/dashboard", async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  try {
    const apiRes = await fetch("https://hrz0tl7gn6.execute-api.ca-central-1.amazonaws.com/api/dashboard", {
      headers: {
        "Cache-Control": "no-store"
      }
    });
    if (!apiRes.ok) {
      throw new Error(`External API status: ${apiRes.status}`);
    }
    const data = await apiRes.json();
    res.json(data);
  } catch (err: any) {
    console.error("Dashboard proxy error:", err);
    res.status(502).json({
      error: "dashboard_unavailable",
      hint: err?.message || "Failed to fetch from external API"
    });
  }
});

app.post("/api/ask", async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: "question is required" });
    }

    if (question.length > 500) {
      return res.status(400).json({ error: "question is too long (max 500 characters)" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Fallback or 502 if AI service is not configured
      return res.status(502).json({
        error: "bedrock_unavailable",
        hint: "GEMINI_API_KEY is not configured on the server."
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-3.8-flash';

    const systemInstruction = `당신은 TABLEPULSE 음식점 점주용 AI 비서입니다. 현재 매장 재고(닭가슴살, 소고기 등심, 모짜렐라 치즈 등), 메뉴별 판매량(치킨파스타, 스테이크 샐러드 등), 매출 데이터에 대해 친절하고 정확하게 한국어로 답변해주세요.`;

    const response = await ai.models.generateContent({
      model,
      contents: question,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    const answer = response.text || "요청하신 내용을 처리하는 중 답변을 생성하지 못했습니다.";

    return res.json({
      question,
      answer,
      intent: { type: "point", metric: "inventory" },
      source: "inventory_db"
    });
  } catch (err: any) {
    console.error("API /api/ask error:", err);
    return res.status(502).json({
      error: "bedrock_unavailable",
      hint: err?.message || "AI service encountered an error."
    });
  }
});

async function startServer() {
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

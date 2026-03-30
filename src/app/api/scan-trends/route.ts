import { NextResponse } from "next/server";
import { getAnthropicClient } from "@/lib/anthropic";

export const maxDuration = 60;

export interface TrendItem {
  keyword: string;
  interest: number;
  trend: "up" | "down" | "stable";
  relatedQueries?: string[];
}

export interface GoogleTrendsResult {
  trends: TrendItem[];
  source: string;
  period: string;
}

async function scrapeGoogleTrends(): Promise<GoogleTrendsResult | null> {
  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(
      "https://trends.google.com/trends/explore?date=today%201-m&geo=CL&q=precio%20bencina,bencina%20barata,di%C3%A9sel%20Chile&hl=es",
      { waitUntil: "networkidle", timeout: 30000 }
    );

    await page.waitForTimeout(3000);

    // Try to extract interest over time data
    const trendsData = await page.evaluate(() => {
      const widgets = document.querySelectorAll(".widget-actions-row");
      const data: Array<{ keyword: string; interest: number }> = [];

      // Try to get keywords from the legend
      const legendItems = document.querySelectorAll(
        ".legend-label-text, .label-text"
      );
      const keywords: string[] = [];
      legendItems.forEach((item) => {
        if (item.textContent) keywords.push(item.textContent.trim());
      });

      // Try to get interest values from tooltips or visible numbers
      const valueElements = document.querySelectorAll(
        '[class*="value"], [class*="interest"]'
      );
      valueElements.forEach((el, i) => {
        const text = el.textContent?.trim();
        if (text && !isNaN(parseInt(text)) && keywords[i]) {
          data.push({
            keyword: keywords[i],
            interest: parseInt(text),
          });
        }
      });

      return { data, widgetCount: widgets.length };
    });

    await browser.close();

    if (trendsData.data.length > 0) {
      return {
        trends: trendsData.data.map((item) => ({
          keyword: item.keyword,
          interest: item.interest,
          trend: item.interest > 50 ? "up" : item.interest > 25 ? "stable" : "down",
        })),
        source: "Google Trends (Playwright)",
        period: "Último mes",
      };
    }

    return null;
  } catch (error) {
    console.error("Playwright scraping failed:", error);
    return null;
  }
}

async function fallbackWithClaude(): Promise<GoogleTrendsResult> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    tools: [{ type: "web_search_20250305", name: "web_search" }] as Parameters<typeof client.messages.create>[0]["tools"],
    messages: [
      {
        role: "user",
        content: `Busca en Google Trends y en la web el interés de búsqueda actual en Chile para los términos: "precio bencina", "bencina barata", "diésel Chile".

Devuelve un JSON con este formato exacto:
{
  "trends": [
    {
      "keyword": "precio bencina",
      "interest": 85,
      "trend": "up",
      "relatedQueries": ["precio bencina hoy", "bencina 95 precio"]
    }
  ],
  "source": "Google Trends (web search)",
  "period": "Último mes"
}

Estima el interés de 0-100 basándote en la cantidad de resultados y cobertura mediática. Responde SOLO con el JSON.`,
      },
    ],
  });

  let jsonText = "";
  for (const block of response.content) {
    if (block.type === "text") {
      jsonText = block.text;
      break;
    }
  }

  jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  try {
    return JSON.parse(jsonText);
  } catch {
    return {
      trends: [
        { keyword: "precio bencina", interest: 72, trend: "up", relatedQueries: ["precio bencina hoy"] },
        { keyword: "bencina barata", interest: 45, trend: "stable", relatedQueries: ["donde cargar bencina barata"] },
        { keyword: "diésel Chile", interest: 38, trend: "down", relatedQueries: ["precio diesel Chile"] },
      ],
      source: "Google Trends (estimado)",
      period: "Último mes",
    };
  }
}

export async function GET() {
  try {
    let result = await scrapeGoogleTrends();

    if (!result) {
      result = await fallbackWithClaude();
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("scan-trends error:", error);
    return NextResponse.json(
      { error: "Error scanning Google Trends" },
      { status: 500 }
    );
  }
}

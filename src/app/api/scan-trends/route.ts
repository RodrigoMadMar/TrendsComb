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

async function fetchWithClaude(): Promise<GoogleTrendsResult> {
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
    const result = await fetchWithClaude();
    return NextResponse.json(result);
  } catch (error) {
    console.error("scan-trends error:", error);
    return NextResponse.json(
      { error: "Error scanning Google Trends" },
      { status: 500 }
    );
  }
}

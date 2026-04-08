import { NextResponse } from "next/server";
import { getAnthropicClient } from "@/lib/anthropic";

export const maxDuration = 60;

export interface BrandPulseItem {
  brand: string;
  interest: number;
  trend: "up" | "down" | "stable";
  color: string;
}

export interface BrandPulseResult {
  brands: BrandPulseItem[];
  source: string;
  period: string;
}

async function fetchWithClaude(): Promise<BrandPulseResult> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    tools: [{ type: "web_search_20250305", name: "web_search" }] as Parameters<typeof client.messages.create>[0]["tools"],
    messages: [
      {
        role: "user",
        content: `Busca el interés de búsqueda en Google Trends Chile para las marcas de combustible: Copec, Shell Chile, Aramco Chile. Compara su presencia digital y cobertura mediática.

Devuelve un JSON con este formato exacto:
{
  "brands": [
    {
      "brand": "Copec",
      "interest": 85,
      "trend": "up",
      "color": "#F59E0B"
    },
    {
      "brand": "Shell Chile",
      "interest": 45,
      "trend": "stable",
      "color": "#FFD500"
    },
    {
      "brand": "Aramco Chile",
      "interest": 25,
      "trend": "down",
      "color": "#009639"
    }
  ],
  "source": "Google Trends (web search)",
  "period": "Último mes"
}

Estima los valores de interés (0-100) basándote en cobertura mediática y presencia digital. Responde SOLO con el JSON.`,
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
      brands: [
        { brand: "Copec", interest: 85, trend: "up", color: "#F59E0B" },
        { brand: "Shell Chile", interest: 45, trend: "stable", color: "#FFD500" },
        { brand: "Aramco Chile", interest: 25, trend: "down", color: "#009639" },
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
    console.error("brand-pulse error:", error);
    return NextResponse.json(
      { error: "Error fetching brand pulse" },
      { status: 500 }
    );
  }
}

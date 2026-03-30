import { NextResponse } from "next/server";
import { getAnthropicClient } from "@/lib/anthropic";

export const maxDuration = 60;

export interface XTrend {
  title: string;
  source: string;
  sourceIcon: string;
  category: "Precio" | "Reclamo" | "Competencia" | "Regulatorio" | "General";
  summary: string;
  sentiment: "positivo" | "negativo" | "neutro";
}

export async function GET() {
  try {
    const client = getAnthropicClient();

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 2048,
      tools: [{ type: "web_search_20250305", name: "web_search" }] as Parameters<typeof client.messages.create>[0]["tools"],
      messages: [
        {
          role: "user",
          content: `Busca en X (Twitter) y en la web las tendencias actuales sobre combustible en Chile. Busca específicamente:
1. "bencina Chile Twitter tendencia hoy"
2. "precio combustible Chile X trending"
3. "Copec Twitter menciones"
4. "estación de servicio Chile reclamos X"
5. "alza bencina Chile reacciones"

Devuelve un JSON válido con un array de objetos con esta estructura exacta (máximo 8 tendencias):
[
  {
    "title": "título de la tendencia",
    "source": "X Trending",
    "sourceIcon": "𝕏",
    "category": "Precio" | "Reclamo" | "Competencia" | "Regulatorio" | "General",
    "summary": "resumen de 1-2 frases",
    "sentiment": "positivo" | "negativo" | "neutro"
  }
]

Responde SOLO con el JSON, sin texto adicional.`,
        },
      ],
    });

    // Extract text from response
    let jsonText = "";
    for (const block of response.content) {
      if (block.type === "text") {
        jsonText = block.text;
        break;
      }
    }

    // Clean up markdown code blocks if present
    jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let trends: XTrend[] = [];
    try {
      trends = JSON.parse(jsonText);
    } catch {
      // If parsing fails, return empty array with error info
      trends = [
        {
          title: "Error al obtener tendencias",
          source: "X Trending",
          sourceIcon: "𝕏",
          category: "General",
          summary: "No se pudieron obtener las tendencias en este momento.",
          sentiment: "neutro",
        },
      ];
    }

    return NextResponse.json(trends);
  } catch (error) {
    console.error("scan-x error:", error);
    return NextResponse.json(
      { error: "Error scanning X trends" },
      { status: 500 }
    );
  }
}

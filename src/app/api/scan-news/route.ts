import { NextResponse } from "next/server";
import { getAnthropicClient } from "@/lib/anthropic";

export const maxDuration = 60;

export interface NewsItem {
  title: string;
  source: string;
  sourceIcon: string;
  category: "MEPCO" | "Impuestos" | "ENAP" | "Subsidio" | "Regulación";
  summary: string;
  impact: "positivo" | "negativo" | "neutro";
  urgency: "alta" | "media" | "baja";
}

export async function GET() {
  try {
    const client = getAnthropicClient();

    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 2048,
      tools: [{ type: "web_search_20250305", name: "web_search" }] as Parameters<typeof client.messages.create>[0]["tools"],
      messages: [
        {
          role: "user",
          content: `Busca noticias sobre regulación de combustible en Chile publicadas ÚNICAMENTE en la última semana (del ${formatDate(weekAgo)} al ${formatDate(today)}). No incluyas noticias más antiguas.

Busca específicamente:
1. "MEPCO Chile ${formatDate(today)}"
2. "precio paridad combustible ENAP semana"
3. "impuesto específico combustible Chile ${today.getFullYear()}"
4. "subsidio bencina Chile"
5. "regulación combustible Chile noticias recientes"

IMPORTANTE: Solo incluye noticias de los últimos 7 días. Si no encuentras noticias recientes de esta semana, devuelve un array vacío [].

Estas noticias son valiosas porque cambios regulatorios generan oportunidades de comunicación para Copec.

Devuelve un JSON válido con un array de objetos (máximo 6 noticias):
[
  {
    "title": "titular de la noticia",
    "source": "Regulatorio",
    "sourceIcon": "⚖️",
    "category": "MEPCO" | "Impuestos" | "ENAP" | "Subsidio" | "Regulación",
    "summary": "resumen de 1-2 frases explicando el impacto para Copec y sus clientes",
    "impact": "positivo" | "negativo" | "neutro",
    "urgency": "alta" | "media" | "baja"
  }
]

Responde SOLO con el JSON, sin texto adicional.`,
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

    let news: NewsItem[] = [];
    try {
      news = JSON.parse(jsonText);
    } catch {
      news = [
        {
          title: "Error al obtener noticias regulatorias",
          source: "Regulatorio",
          sourceIcon: "⚖️",
          category: "Regulación",
          summary: "No se pudieron obtener las noticias en este momento.",
          impact: "neutro",
          urgency: "baja",
        },
      ];
    }

    return NextResponse.json(news);
  } catch (error) {
    console.error("scan-news error:", error);
    return NextResponse.json(
      { error: "Error scanning regulatory news" },
      { status: 500 }
    );
  }
}

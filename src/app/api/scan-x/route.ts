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
  commercialAngle: string;
}

export async function GET() {
  try {
    const client = getAnthropicClient();

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 3000,
      tools: [{ type: "web_search_20250305", name: "web_search" }] as Parameters<typeof client.messages.create>[0]["tools"],
      messages: [
        {
          role: "user",
          content: `Necesito que consultes https://trends24.in/chile/ para obtener las tendencias actuales en Chile (trending topics de X/Twitter).

Paso 1: Visita https://trends24.in/chile/ y extrae los trending topics actuales de Chile.

Paso 2: De esas tendencias, identifica SOLAMENTE las que tengan potencial comercial para campañas de marketing de Copec (estaciones de combustible en Chile). Busca tendencias que:
- Se puedan conectar con movilidad, viajes, carretera, fin de semana, feriados
- Tengan que ver con clima, temporadas, eventos deportivos, cultura pop que se pueda vincular a combustible/auto
- Mencionen precios, economía, ahorro (oportunidad para comunicar promos)
- Sean virales y positivas que permitan newsjacking creativo

EXCLUYE completamente:
- Tendencias negativas sobre combustible, contaminación o medioambiente negativo
- Reclamos o crisis de cualquier marca de combustible
- Temas políticos divisivos
- Cualquier cosa que pueda dañar la reputación de Copec si se asocian
- Tragedias, accidentes, violencia

Paso 3: Para cada tendencia seleccionada, sugiere brevemente cómo Copec podría aprovecharla comercialmente.

Devuelve un JSON válido con un array de objetos (máximo 8 tendencias con potencial comercial):
[
  {
    "title": "nombre del trending topic",
    "source": "trends24.in/chile",
    "sourceIcon": "𝕏",
    "category": "Precio" | "Competencia" | "Regulatorio" | "General",
    "summary": "por qué esta tendencia es relevante comercialmente para Copec",
    "sentiment": "positivo" | "neutro",
    "commercialAngle": "idea concreta de cómo Copec puede aprovechar esta tendencia en una campaña"
  }
]

IMPORTANTE: No incluyas categoría "Reclamo". Solo tendencias con sentiment "positivo" o "neutro". El campo commercialAngle debe tener una idea concreta y accionable.

Responde SOLO con el JSON, sin texto adicional.`,
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

    let trends: XTrend[] = [];
    try {
      trends = JSON.parse(jsonText);
      // Safety filter: remove any negative sentiment that slipped through
      trends = trends.filter((t) => t.sentiment !== "negativo");
    } catch {
      trends = [
        {
          title: "Error al obtener tendencias",
          source: "trends24.in/chile",
          sourceIcon: "𝕏",
          category: "General",
          summary: "No se pudieron obtener las tendencias en este momento.",
          sentiment: "neutro",
          commercialAngle: "",
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

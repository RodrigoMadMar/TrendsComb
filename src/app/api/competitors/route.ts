import { NextResponse } from "next/server";
import { getAnthropicClient } from "@/lib/anthropic";
import { COMPETITORS } from "@/lib/constants";

export const maxDuration = 90;

export interface CompetitorAd {
  copy: string;
  type: "imagen" | "video" | "carrusel" | "texto";
  cta: string;
  platforms: string[];
}

export interface CompetitorData {
  name: string;
  color: string;
  activityLevel: "alta" | "media" | "baja";
  currentPromos: string[];
  messaging: string;
  ads: CompetitorAd[];
  lastUpdated: string;
}

async function getFullCompetitorIntel(
  competitorName: string,
  facebookUrl: string,
  metaAdsUrl: string
): Promise<Omit<CompetitorData, "name" | "color" | "lastUpdated">> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 3000,
    tools: [{ type: "web_search_20250305", name: "web_search" }] as Parameters<typeof client.messages.create>[0]["tools"],
    messages: [
      {
        role: "user",
        content: `Necesito inteligencia competitiva sobre "${competitorName}" (estación de combustible en Chile).

Realiza MÚLTIPLES búsquedas web:

1. Busca "${competitorName} promoción combustible Chile 2026"
2. Busca "${competitorName} campaña publicitaria redes sociales Chile"
3. Busca "${competitorName} facebook ads anuncios Chile"
4. Busca "${competitorName} instagram publicidad Chile"
5. Visita la página de Facebook: ${facebookUrl}
6. Busca en Meta Ads Library: ${metaAdsUrl}

Con TODA la información encontrada, devuelve un JSON así:
{
  "activityLevel": "alta" | "media" | "baja",
  "currentPromos": ["promo 1", "promo 2"],
  "messaging": "posicionamiento principal en 1-2 frases",
  "ads": [
    {
      "copy": "texto del anuncio (máx 200 chars)",
      "type": "imagen" | "video" | "carrusel" | "texto",
      "cta": "call to action",
      "platforms": ["Facebook", "Instagram"]
    }
  ]
}

IMPORTANTE: Incluye en "ads" TODOS los anuncios que encuentres (máx 5). Si no encuentras, pon [].
Responde SOLO con el JSON.`,
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
    const parsed = JSON.parse(jsonText);
    return {
      activityLevel: parsed.activityLevel || "media",
      currentPromos: Array.isArray(parsed.currentPromos) ? parsed.currentPromos : [],
      messaging: parsed.messaging || "Sin información disponible",
      ads: Array.isArray(parsed.ads) ? parsed.ads : [],
    };
  } catch {
    return {
      activityLevel: "media",
      currentPromos: ["Sin información disponible"],
      messaging: "No se pudo obtener información reciente.",
      ads: [],
    };
  }
}

export async function GET() {
  try {
    const results: CompetitorData[] = await Promise.all(
      COMPETITORS.map(async (competitor) => {
        const intel = await getFullCompetitorIntel(
          competitor.name,
          competitor.facebook,
          competitor.metaAdsLibrary
        );

        return {
          name: competitor.name,
          color: competitor.color,
          activityLevel: intel.activityLevel,
          currentPromos: intel.currentPromos,
          messaging: intel.messaging,
          ads: intel.ads,
          lastUpdated: new Date().toISOString(),
        };
      })
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error("competitors error:", error);
    return NextResponse.json(
      { error: "Error scanning competitors" },
      { status: 500 }
    );
  }
}

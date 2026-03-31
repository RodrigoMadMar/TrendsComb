import { NextResponse } from "next/server";
import { getAnthropicClient } from "@/lib/anthropic";
import { COMPETITORS } from "@/lib/constants";

export const maxDuration = 90;

export interface CompetitorAd {
  copy: string;
  type: "imagen" | "video" | "carrusel" | "texto";
  cta: string;
  platforms: string[];
  screenshot?: string;
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
        content: `Necesito inteligencia competitiva completa sobre "${competitorName}" (estación de combustible en Chile).

Realiza MÚLTIPLES búsquedas web para encontrar:

1. PROMOCIONES ACTIVAS: Busca "${competitorName} promoción" y "${competitorName} descuento combustible Chile 2026"
2. PUBLICIDAD EN REDES: Busca "${competitorName} publicidad Facebook" y "${competitorName} Instagram ads Chile". También visita su página de Facebook: ${facebookUrl} y busca posts recientes con anuncios.
3. ANUNCIOS EN META: Busca "site:facebook.com/ads/library ${competitorName}" y "${competitorName} meta ads library Chile anuncios activos 2026". La URL de su biblioteca de anuncios es: ${metaAdsUrl}
4. CAMPAÑAS RECIENTES: Busca "${competitorName} campaña marketing Chile 2026"

Con toda la información recopilada, devuelve un JSON con este formato exacto:
{
  "activityLevel": "alta" | "media" | "baja",
  "currentPromos": ["descripción de promo 1", "descripción de promo 2"],
  "messaging": "resumen de su mensaje/posicionamiento principal actual en 1-2 frases",
  "ads": [
    {
      "copy": "texto/copy del anuncio encontrado (máx 200 chars)",
      "type": "imagen" | "video" | "carrusel" | "texto",
      "cta": "call to action del anuncio",
      "platforms": ["Facebook", "Instagram"]
    }
  ]
}

IMPORTANTE:
- En "ads" incluye todos los anuncios que hayas encontrado (máximo 5). Si encontraste ads en Meta Ads Library, Facebook o Instagram, inclúyelos.
- Si no encuentras anuncios específicos, pon un array vacío [].
- En "currentPromos" incluye cualquier promoción activa que encuentres.
- "activityLevel" debe reflejar cuánta actividad publicitaria tiene actualmente.

Responde SOLO con el JSON, sin texto adicional.`,
      },
    ],
  });

  // Grab the LAST text block (after all web_search tool results)
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
      currentPromos: parsed.currentPromos || [],
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

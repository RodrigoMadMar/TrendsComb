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

async function getMetaAdsViaClaude(
  competitorName: string,
  metaAdsUrl: string
): Promise<CompetitorAd[]> {
  try {
    const client = getAnthropicClient();

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 2048,
      tools: [{ type: "web_search_20250305", name: "web_search" }] as Parameters<typeof client.messages.create>[0]["tools"],
      messages: [
        {
          role: "user",
          content: `Busca los anuncios activos de ${competitorName} en la Meta Ads Library (biblioteca de anuncios de Facebook/Instagram).

URL directa de su biblioteca: ${metaAdsUrl}

También busca:
1. "${competitorName} facebook ads library anuncios activos"
2. "${competitorName} publicidad Facebook Instagram Chile 2026"
3. "${competitorName} campaña publicitaria redes sociales Chile"

Para cada anuncio activo que encuentres, extrae:
- El texto/copy del anuncio
- El tipo (imagen, video, carrusel, texto)
- El call-to-action (CTA)
- Las plataformas donde aparece (Facebook, Instagram, Messenger, Audience Network)

Devuelve un JSON válido con un array de objetos (máximo 4 anuncios):
[
  {
    "copy": "texto del anuncio (máx 200 chars)",
    "type": "imagen" | "video" | "carrusel" | "texto",
    "cta": "texto del botón CTA",
    "platforms": ["Facebook", "Instagram"]
  }
]

Si no encuentras anuncios activos, devuelve un array vacío [].
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

    try {
      const ads = JSON.parse(jsonText);
      return Array.isArray(ads) ? ads : [];
    } catch {
      return [];
    }
  } catch (error) {
    console.error(`Meta Ads search failed for ${competitorName}:`, error);
    return [];
  }
}

async function getCompetitorInfoFromClaude(
  competitorName: string
): Promise<{ activityLevel: "alta" | "media" | "baja"; currentPromos: string[]; messaging: string }> {
  const client = getAnthropicClient();

  const searches: Record<string, string[]> = {
    "Shell Chile": [
      "Shell Chile promoción bencina 2026",
      "Shell Chile campaña publicitaria",
    ],
    "Aramco Estaciones Chile": [
      "Aramco estaciones Chile combustible",
      "Aramco Chile promoción",
    ],
  };

  const searchTerms = searches[competitorName] || [`${competitorName} promoción combustible Chile`];

  const response = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    tools: [{ type: "web_search_20250305", name: "web_search" }] as Parameters<typeof client.messages.create>[0]["tools"],
    messages: [
      {
        role: "user",
        content: `Busca información sobre la actividad reciente de ${competitorName} en Chile. Busca: ${searchTerms.join(", ")}.

Devuelve un JSON con este formato exacto:
{
  "activityLevel": "alta" | "media" | "baja",
  "currentPromos": ["descripción de promo 1", "descripción de promo 2"],
  "messaging": "resumen de su mensaje principal actual en 1-2 frases"
}

Responde SOLO con el JSON.`,
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
      activityLevel: "media",
      currentPromos: ["Sin información disponible"],
      messaging: "No se pudo obtener información reciente.",
    };
  }
}

export async function GET() {
  try {
    const results: CompetitorData[] = await Promise.all(
      COMPETITORS.map(async (competitor) => {
        const [claudeInfo, ads] = await Promise.all([
          getCompetitorInfoFromClaude(competitor.name),
          getMetaAdsViaClaude(competitor.name, competitor.metaAdsLibrary),
        ]);

        return {
          name: competitor.name,
          color: competitor.color,
          activityLevel: claudeInfo.activityLevel,
          currentPromos: claudeInfo.currentPromos,
          messaging: claudeInfo.messaging,
          ads,
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

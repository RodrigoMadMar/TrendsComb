import { NextResponse } from "next/server";
import { getAnthropicClient } from "@/lib/anthropic";
import { SCORING_SYSTEM_PROMPT } from "@/lib/constants";

export const maxDuration = 90;

export interface ScoredTrend {
  trend: string;
  type: "PRECIO" | "REGULATORIO" | "COMPETENCIA" | "ESTACIONAL" | "VIRAL";
  window: string;
  effort: "S" | "M" | "L";
  scores: {
    relevance: number;
    virality: number;
    brandFit: number;
  };
  proposals: Array<{
    title: string;
    copy: string;
    channel: string;
    cta: string;
  }>;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { xTrends, googleTrends, news, competitors, brandPulse } = body;

    const client = getAnthropicClient();

    const context = `
## Datos de monitoreo actuales:

### Tendencias X / Twitter:
${JSON.stringify(xTrends || [], null, 2)}

### Google Trends Combustible:
${JSON.stringify(googleTrends || {}, null, 2)}

### Noticias Regulatorias:
${JSON.stringify(news || [], null, 2)}

### Actividad Competencia:
${JSON.stringify(competitors || [], null, 2)}

### Pulso de Marca:
${JSON.stringify(brandPulse || {}, null, 2)}

Analiza todos estos datos y genera el scoring de oportunidades para Copec.
Identifica las 5-8 tendencias más relevantes y genera propuestas de campaña.
Responde SOLO con el JSON array.`;

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 4096,
      system: SCORING_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: context,
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

    let scored: ScoredTrend[] = [];
    try {
      scored = JSON.parse(jsonText);
    } catch {
      scored = [];
    }

    // Sort by average score descending
    scored.sort((a, b) => {
      const avgA = (a.scores.relevance + a.scores.virality + a.scores.brandFit) / 3;
      const avgB = (b.scores.relevance + b.scores.virality + b.scores.brandFit) / 3;
      return avgB - avgA;
    });

    return NextResponse.json(scored);
  } catch (error) {
    console.error("score error:", error);
    return NextResponse.json(
      { error: "Error scoring trends" },
      { status: 500 }
    );
  }
}

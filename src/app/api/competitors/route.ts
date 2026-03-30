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

async function scrapeMetaAds(
  url: string,
  competitorName: string
): Promise<CompetitorAd[]> {
  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();

    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(4000);

    // Extract ad data
    const ads = await page.evaluate(() => {
      const adCards = document.querySelectorAll(
        '[class*="ad-card"], [class*="AdCard"], [class*="ad_card"]'
      );
      const results: Array<{
        copy: string;
        type: string;
        cta: string;
        platforms: string[];
      }> = [];

      adCards.forEach((card, index) => {
        if (index >= 3) return;
        const copyEl = card.querySelector(
          '[class*="body"], [class*="copy"], p, span'
        );
        const ctaEl = card.querySelector(
          '[class*="cta"], [class*="action"], button'
        );
        const copy = copyEl?.textContent?.trim() || "";
        const cta = ctaEl?.textContent?.trim() || "Ver más";

        if (copy) {
          results.push({
            copy: copy.substring(0, 200),
            type: "imagen",
            cta,
            platforms: ["Facebook", "Instagram"],
          });
        }
      });

      return results;
    });

    // Take screenshots of individual ads
    const adsWithScreenshots: CompetitorAd[] = [];
    const adElements = await page.$$(
      '[class*="ad-card"], [class*="AdCard"], [class*="ad_card"]'
    );

    for (let i = 0; i < Math.min(adElements.length, 2); i++) {
      const element = adElements[i];
      try {
        const screenshot = await element.screenshot({ type: "png" });
        const base64 = Buffer.from(screenshot).toString("base64");
        const adBase = ads[i] || {
          copy: `Ad ${i + 1} de ${competitorName}`,
          type: "imagen" as CompetitorAd["type"],
          cta: "Ver más",
          platforms: ["Facebook", "Instagram"],
        };
        adsWithScreenshots.push({
          ...adBase,
          type: (adBase.type as CompetitorAd["type"]) || "imagen",
          screenshot: `data:image/png;base64,${base64}`,
        });
      } catch {
        if (ads[i]) {
          adsWithScreenshots.push(ads[i] as CompetitorAd);
        }
      }
    }

    await browser.close();
    return adsWithScreenshots;
  } catch (error) {
    console.error(`Meta Ads scraping failed for ${competitorName}:`, error);
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
          scrapeMetaAds(competitor.metaAdsLibrary, competitor.name),
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

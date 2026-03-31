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

// ─── Playwright: Screenshot Meta Ads Library ────────────────────────────────
async function scrapeMetaAdsScreenshots(
  url: string,
  competitorName: string
): Promise<CompetitorAd[]> {
  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      locale: "es-CL",
    });
    const page = await context.newPage();

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    // Wait for dynamic React content to render
    await page.waitForTimeout(6000);

    // Close any cookie/login modals that Facebook may show
    try {
      const closeBtn = page.locator('[aria-label="Close"], [aria-label="Cerrar"], [data-testid="cookie-policy-manage-dialog-accept-button"]');
      if (await closeBtn.first().isVisible({ timeout: 2000 })) {
        await closeBtn.first().click();
        await page.waitForTimeout(1000);
      }
    } catch { /* no modal */ }

    // Strategy: find ad containers using multiple selector approaches
    const adSelectors = [
      // Known structural selectors for Meta Ads Library
      'div[class*="x1dr75xp"]',
      'div[role="article"]',
      // Generic: divs that contain "Active" or "Activo" status text
      'div:has(> div:has-text("Active")), div:has(> div:has-text("Activo"))',
    ];

    const ads: CompetitorAd[] = [];

    // Try to find individual ad cards
    for (const selector of adSelectors) {
      try {
        const cards = page.locator(selector);
        const count = await cards.count();
        if (count === 0) continue;

        for (let i = 0; i < Math.min(count, 3); i++) {
          try {
            const card = cards.nth(i);
            if (!(await card.isVisible({ timeout: 1000 }))) continue;

            const screenshot = await card.screenshot({ type: "png", timeout: 5000 });
            const base64 = Buffer.from(screenshot).toString("base64");

            // Try to extract text content from the card
            const textContent = await card.textContent().catch(() => "") || "";
            const copy = textContent.substring(0, 200).trim();

            ads.push({
              copy: copy || `Anuncio ${i + 1} de ${competitorName}`,
              type: "imagen",
              cta: "Ver más",
              platforms: ["Facebook", "Instagram"],
              screenshot: `data:image/png;base64,${base64}`,
            });
          } catch { /* skip this card */ }
        }

        if (ads.length > 0) break; // Found ads, stop trying selectors
      } catch { /* try next selector */ }
    }

    // Fallback: if no individual cards found, screenshot the whole ads section
    if (ads.length === 0) {
      try {
        // Scroll down a bit to skip header
        await page.evaluate(() => window.scrollBy(0, 300));
        await page.waitForTimeout(1000);

        const screenshot = await page.screenshot({
          type: "png",
          clip: { x: 0, y: 0, width: 1280, height: 900 },
        });
        const base64 = Buffer.from(screenshot).toString("base64");

        ads.push({
          copy: `Vista de biblioteca de anuncios de ${competitorName}`,
          type: "imagen",
          cta: "Ver en Meta Ads Library",
          platforms: ["Facebook", "Instagram"],
          screenshot: `data:image/png;base64,${base64}`,
        });
      } catch { /* even viewport screenshot failed */ }
    }

    await browser.close();
    return ads;
  } catch (error) {
    console.error(`Meta Ads scraping failed for ${competitorName}:`, error);
    return [];
  }
}

// ─── Claude: Competitor promos & messaging ──────────────────────────────────
async function getCompetitorInfoFromClaude(
  competitorName: string,
  facebookUrl: string
): Promise<{ activityLevel: "alta" | "media" | "baja"; currentPromos: string[]; messaging: string }> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1500,
    tools: [{ type: "web_search_20250305", name: "web_search" }] as Parameters<typeof client.messages.create>[0]["tools"],
    messages: [
      {
        role: "user",
        content: `Busca información reciente sobre "${competitorName}" (estación de combustible en Chile).

Busca:
1. "${competitorName} promoción combustible Chile 2026"
2. "${competitorName} campaña publicitaria redes sociales"
3. Visita ${facebookUrl} para ver actividad reciente

Devuelve un JSON con este formato exacto:
{
  "activityLevel": "alta" | "media" | "baja",
  "currentPromos": ["descripción de promo 1", "descripción de promo 2"],
  "messaging": "resumen de su posicionamiento/mensaje principal actual en 1-2 frases"
}

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
        // Run Claude intel + Playwright screenshots in parallel
        const [claudeInfo, screenshotAds] = await Promise.all([
          getCompetitorInfoFromClaude(competitor.name, competitor.facebook),
          scrapeMetaAdsScreenshots(competitor.metaAdsLibrary, competitor.name),
        ]);

        return {
          name: competitor.name,
          color: competitor.color,
          activityLevel: claudeInfo.activityLevel,
          currentPromos: claudeInfo.currentPromos,
          messaging: claudeInfo.messaging,
          ads: screenshotAds,
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

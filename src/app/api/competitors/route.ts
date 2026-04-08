// src/app/api/competitors/route.ts
// Scrapes Meta Ads Library → extracts individual ad URLs → screenshots each ad
// Uses: Browserless /function API (Puppeteer) + Claude web_search for context
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export const maxDuration = 120; // Vercel timeout (Pro plan)

const anthropic = new Anthropic();
const BROWSERLESS_TOKEN = process.env.BROWSERLESS_API_KEY || "";
const BROWSERLESS_URL = "https://production-sfo.browserless.io";
const ADS_PER_COMPETITOR = 3;

// ── Competitor config ──────────────────────────────────────────────
const COMPETITORS = [
  {
    name: "Shell Chile",
    searchTerms: "Shell Chile",
    metaQuery: "Shell Chile",
  },
  {
    name: "Aramco Estaciones Chile",
    searchTerms: "Aramco estaciones Chile",
    metaQuery: "Aramco Chile",
  },
];

// ── Step 1: Use Browserless /function to extract ad snapshot URLs ──
async function extractAdUrls(
  query: string
): Promise<
  Array<{ snapshotUrl: string; pageUrl: string; body: string; pageName: string }>
> {
  const metaAdsUrl = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=CL&q=${encodeURIComponent(
    query
  )}&sort_data[direction]=desc&sort_data[mode]=relevancy_monthly_grouped`;

  const puppeteerCode = `
export default async ({ page, context }) => {
  const maxAds = context.maxAds;

  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  await page.goto(context.url, { waitUntil: 'networkidle2', timeout: 45000 });

  await page.waitForSelector('[class*="ad"]', { timeout: 15000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 3000));

  const ads = await page.evaluate((max) => {
    const results = [];
    const adIdPattern = /[?&]id=(\\d+)/;
    const seenIds = new Set();

    const adArchiveLinks = Array.from(
      document.querySelectorAll('a[href*="/ads/library/?id="]')
    );

    for (const link of adArchiveLinks) {
      if (results.length >= max) break;
      const href = link.getAttribute('href') || '';
      const match = href.match(adIdPattern);
      if (match && !seenIds.has(match[1])) {
        seenIds.add(match[1]);
        const parent = link.closest('[class*="x1yztbdb"]') || link.parentElement?.parentElement?.parentElement;
        const bodyText = parent?.textContent?.substring(0, 300) || '';
        results.push({
          adId: match[1],
          href: href.startsWith('http') ? href : 'https://www.facebook.com' + href,
          body: bodyText.trim(),
        });
      }
    }

    if (results.length === 0) {
      const pageText = document.body.innerHTML;
      const idMatches = pageText.match(/ad_archive_id["\\s:=]+(\\d+)/g) || [];
      for (const m of idMatches) {
        if (results.length >= max) break;
        const id = m.match(/(\\d+)/)?.[1];
        if (id && !seenIds.has(id)) {
          seenIds.add(id);
          results.push({
            adId: id,
            href: 'https://www.facebook.com/ads/library/?id=' + id,
            body: '',
          });
        }
      }
    }

    return results.slice(0, max);
  }, maxAds);

  return {
    data: { ads, pageTitle: await page.title() },
    type: 'application/json',
  };
};
`;

  try {
    const response = await fetch(
      `${BROWSERLESS_URL}/function?token=${BROWSERLESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: puppeteerCode,
          context: { url: metaAdsUrl, maxAds: ADS_PER_COMPETITOR },
        }),
      }
    );

    if (!response.ok) {
      console.error(`Browserless /function error: ${response.status}`);
      return [];
    }

    const result = await response.json();
    const ads = result?.ads || result?.data?.ads || [];

    return ads.map(
      (ad: { adId: string; href: string; body: string }) => ({
        snapshotUrl: `https://www.facebook.com/ads/archive/render_ad/?id=${ad.adId}&access_token=`,
        pageUrl: ad.href,
        body: ad.body,
        pageName: query,
      })
    );
  } catch (error) {
    console.error("extractAdUrls error:", error);
    return [];
  }
}

// ── Step 2: Screenshot an individual ad page ───────────────────────
async function screenshotAd(adPageUrl: string): Promise<string | null> {
  if (!BROWSERLESS_TOKEN) return null;

  try {
    const response = await fetch(
      `${BROWSERLESS_URL}/screenshot?token=${BROWSERLESS_TOKEN}`,
      {
        method: "POST",
        headers: {
          "Cache-Control": "no-cache",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: adPageUrl,
          gotoOptions: {
            waitUntil: "networkidle2",
            timeout: 30000,
          },
          options: {
            type: "png",
            fullPage: false,
          },
          viewport: {
            width: 540,
            height: 960,
            deviceScaleFactor: 2,
          },
          waitForTimeout: 4000,
          bestAttempt: true,
        }),
      }
    );

    if (!response.ok) {
      console.error(`Screenshot error for ${adPageUrl}: ${response.status}`);
      return null;
    }

    const imageBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(imageBuffer).toString("base64");
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error("screenshotAd error:", error);
    return null;
  }
}

// ── Step 3: Claude analysis for extra context ──────────────────────
async function analyzeCompetitorWithClaude(competitorName: string) {
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      tools: [{ type: "web_search_20250305", name: "web_search" }] as Parameters<typeof anthropic.messages.create>[0]["tools"],
      messages: [
        {
          role: "user",
          content: `Busca campañas y promociones recientes de "${competitorName}" en Chile (combustible, gasolina, bencina).
Responde SOLO en JSON válido sin markdown:
{
  "promos": ["lista de promos activas"],
  "summary": "resumen de 2-3 líneas de su actividad publicitaria reciente",
  "channels": ["canales donde están activos: Facebook, Instagram, TV, vía pública, etc."]
}`,
        },
      ],
    });

    let text = "";
    for (const block of response.content) {
      if (block.type === "text") text += block.text;
    }
    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return { promos: [], summary: "No se pudo analizar", channels: [] };
  }
}

// ── Orchestrator per competitor ────────────────────────────────────
async function processCompetitor(competitor: (typeof COMPETITORS)[0]) {
  const [adUrls, claudeAnalysis] = await Promise.all([
    extractAdUrls(competitor.metaQuery),
    analyzeCompetitorWithClaude(competitor.name),
  ]);

  const adsWithScreenshots = await Promise.all(
    adUrls.slice(0, ADS_PER_COMPETITOR).map(async (ad) => {
      const screenshot = await screenshotAd(ad.pageUrl);
      return {
        adUrl: ad.pageUrl,
        snapshotUrl: ad.snapshotUrl,
        bodyPreview: ad.body.slice(0, 200),
        screenshot,
      };
    })
  );

  return {
    competitor: competitor.name,
    ads: adsWithScreenshots,
    analysis: claudeAnalysis,
    metaAdsLibraryUrl: `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=CL&q=${encodeURIComponent(
      competitor.metaQuery
    )}`,
    totalAdsFound: adUrls.length,
    scannedAt: new Date().toISOString(),
  };
}

// ── API Route Handler ──────────────────────────────────────────────
export async function POST() {
  if (!BROWSERLESS_TOKEN) {
    return NextResponse.json(
      { success: false, error: "BROWSERLESS_API_KEY no configurada" },
      { status: 500 }
    );
  }

  try {
    const results = await Promise.all(COMPETITORS.map(processCompetitor));

    return NextResponse.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Competitors scan error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error escaneando competencia",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}

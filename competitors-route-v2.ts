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
// This runs Puppeteer code on Browserless' remote Chrome:
// 1. Navigates to Meta Ads Library search page
// 2. Waits for ad cards to render
// 3. Extracts the individual ad_snapshot_url from each ad's "See ad details" link
// 4. Also grabs ad body text + page name for context
async function extractAdUrls(
  query: string
): Promise<
  Array<{ snapshotUrl: string; pageUrl: string; body: string; pageName: string }>
> {
  const metaAdsUrl = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=CL&q=${encodeURIComponent(
    query
  )}&sort_data[direction]=desc&sort_data[mode]=relevancy_monthly_grouped`;

  // Puppeteer code that runs on the remote Browserless browser
  const puppeteerCode = `
export default async ({ page, context }) => {
  const maxAds = context.maxAds;
  
  // Set a realistic viewport and user-agent
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );
  
  await page.goto(context.url, { waitUntil: 'networkidle2', timeout: 45000 });
  
  // Wait for the ad results container to appear
  await page.waitForSelector('[class*="ad"]', { timeout: 15000 }).catch(() => {});
  
  // Give extra time for lazy-loaded ads
  await new Promise(r => setTimeout(r, 3000));
  
  // Extract ad data from the rendered page
  const ads = await page.evaluate((max) => {
    const results = [];
    
    // Meta Ads Library renders ads in divs with links to /ads/archive/render_ad/
    // We look for all links that point to the ad snapshot
    const allLinks = Array.from(document.querySelectorAll('a[href*="facebook.com/ads/library"]'));
    const adCards = document.querySelectorAll('[role="article"], [class*="xrvj5dj"], div[class*="x1yztbdb"]');
    
    // Strategy 1: Find snapshot URLs from "See ad details" or "Ver detalles" links
    const snapshotLinks = Array.from(
      document.querySelectorAll('a[href*="/ads/archive/render_ad/"], a[href*="ad_snapshot_url"]')
    );
    
    // Strategy 2: Find ad cards and extract their content + the "see details" link
    // Meta Ads Library uses deeply nested divs — we look for the ad containers
    const containers = document.querySelectorAll(
      'div[class*="x1dr59a3"], div[class*="xrvj5dj"], [data-testid*="ad"]'
    );
    
    // Strategy 3: Just grab all the ad-related links on the page
    const adArchiveLinks = Array.from(
      document.querySelectorAll('a[href*="/ads/library/?id="]')
    );
    
    // Collect ad IDs from the page URL patterns
    const adIdPattern = /[?&]id=(\\d+)/;
    const seenIds = new Set();
    
    for (const link of adArchiveLinks) {
      if (results.length >= max) break;
      const href = link.getAttribute('href') || '';
      const match = href.match(adIdPattern);
      if (match && !seenIds.has(match[1])) {
        seenIds.add(match[1]);
        // Find the closest parent that contains ad text
        const parent = link.closest('[class*="x1yztbdb"]') || link.parentElement?.parentElement?.parentElement;
        const bodyText = parent?.textContent?.substring(0, 300) || '';
        results.push({
          adId: match[1],
          href: href.startsWith('http') ? href : 'https://www.facebook.com' + href,
          body: bodyText.trim(),
        });
      }
    }
    
    // If we didn't find individual ad links, try extracting ad IDs from the page content
    if (results.length === 0) {
      const pageText = document.body.innerHTML;
      const idMatches = pageText.match(/ad_archive_id["\s:=]+(\d+)/g) || [];
      for (const m of idMatches) {
        if (results.length >= max) break;
        const id = m.match(/(\d+)/)?.[1];
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
          // Wait for the ad content to render
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
      tools: [{ type: "web_search_20250305", name: "web_search" }],
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
  // Run extraction + Claude analysis in parallel
  const [adUrls, claudeAnalysis] = await Promise.all([
    extractAdUrls(competitor.metaQuery),
    analyzeCompetitorWithClaude(competitor.name),
  ]);

  // Screenshot each individual ad (parallel, max 3)
  const adsWithScreenshots = await Promise.all(
    adUrls.slice(0, ADS_PER_COMPETITOR).map(async (ad) => {
      const screenshot = await screenshotAd(ad.pageUrl);
      return {
        adUrl: ad.pageUrl,
        snapshotUrl: ad.snapshotUrl,
        bodyPreview: ad.body.slice(0, 200),
        screenshot, // base64 PNG or null
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
    // Process competitors in parallel
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

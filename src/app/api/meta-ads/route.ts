import { NextResponse } from "next/server";

export const maxDuration = 30;

export interface MetaAd {
  adArchiveId: string;
  pageName: string;
  pageId: string;
  copy: string;
  ctaText: string;
  format: "imagen" | "video" | "carrusel";
  platforms: string[];
  imageUrl?: string;
  videoUrl?: string;
  videoPreviewUrl?: string;
  adLibraryUrl: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface MetaAdsData {
  pageName: string;
  pageId: string;
  ads: MetaAd[];
  totalAds: number;
}

function getApifyMetaAdsUrl(): string {
  const datasetId = process.env.APIFY_META_ADS_DATASET_ID;
  const token = process.env.APIFY_API_TOKEN;
  if (!token || !datasetId) {
    throw new Error("APIFY_API_TOKEN and APIFY_META_ADS_DATASET_ID must be set");
  }
  return `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}`;
}

export async function GET() {
  try {
    const res = await fetch(getApifyMetaAdsUrl(), { next: { revalidate: 300 } });
    if (!res.ok) {
      throw new Error(`Apify API returned ${res.status}`);
    }

    const rawAds: Array<Record<string, unknown>> = await res.json();

    // Group ads by page
    const byPage = new Map<string, MetaAd[]>();
    const pageNames = new Map<string, string>();

    for (const raw of rawAds) {
      const snapshot = (raw.snapshot as Record<string, unknown>) || {};
      const pageId = (raw.page_id as string) || "";
      const pageName = (raw.page_name as string) || (snapshot.page_name as string) || "Unknown";

      if (!byPage.has(pageId)) {
        byPage.set(pageId, []);
        pageNames.set(pageId, pageName);
      }

      // Determine format
      const displayFormat = (snapshot.display_format as string) || "IMAGE";
      let format: MetaAd["format"] = "imagen";
      if (displayFormat === "VIDEO") format = "video";
      else if (displayFormat === "CAROUSEL" || displayFormat === "DCO") format = "carrusel";

      // Extract image URL
      const images = (snapshot.images as Array<Record<string, unknown>>) || [];
      const imageUrl = images.length > 0
        ? (images[0].original_image_url as string) || (images[0].resized_image_url as string) || ""
        : "";

      // Extract video URL and preview
      const videos = (snapshot.videos as Array<Record<string, unknown>>) || [];
      const videoUrl = videos.length > 0
        ? (videos[0].video_sd_url as string) || (videos[0].video_hd_url as string) || ""
        : "";
      const videoPreviewUrl = videos.length > 0
        ? (videos[0].video_preview_image_url as string) || ""
        : "";

      // Extract body text
      const body = (snapshot.body as Record<string, unknown>) || {};
      const copy = (body.text as string) || "";

      // Extract platforms
      const publisherPlatform = (raw.publisher_platform as string[]) || [];
      const platforms = publisherPlatform.map((p: string) =>
        p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
      );

      byPage.get(pageId)!.push({
        adArchiveId: (raw.ad_archive_id as string) || "",
        pageName,
        pageId,
        copy: copy.substring(0, 300),
        ctaText: (snapshot.cta_text as string) || "",
        format,
        platforms: platforms.length > 0 ? platforms : ["Facebook"],
        imageUrl: imageUrl || undefined,
        videoUrl: videoUrl || undefined,
        videoPreviewUrl: videoPreviewUrl || undefined,
        adLibraryUrl: (raw.ad_library_url as string) || "",
        startDate: (raw.start_date_formatted as string) || "",
        endDate: (raw.end_date_formatted as string) || "",
        isActive: (raw.is_active as boolean) ?? true,
      });
    }

    const results: MetaAdsData[] = [];
    for (const [pageId, ads] of byPage) {
      results.push({
        pageName: pageNames.get(pageId) || "Unknown",
        pageId,
        ads: ads.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()),
        totalAds: (rawAds.find((r) => (r.page_id as string) === pageId)?.total as number) || ads.length,
      });
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("meta-ads error:", error);
    return NextResponse.json(
      { error: "Error fetching Meta Ads data from Apify" },
      { status: 500 }
    );
  }
}

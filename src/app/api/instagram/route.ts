import { NextResponse } from "next/server";

export const maxDuration = 30;

export interface InstagramPost {
  id: string;
  type: string;
  shortCode: string;
  caption: string;
  url: string;
  commentsCount: number;
  likesCount: number;
  videoViewCount?: number;
  videoPlayCount?: number;
  timestamp: string;
  displayUrl: string;
  videoUrl?: string;
  thumbnailUrl: string;
  ownerFullName: string;
  ownerUsername: string;
  productType: string;
  latestComments: Array<{
    text: string;
    ownerUsername: string;
    timestamp: string;
    likesCount: number;
  }>;
}

export interface InstagramData {
  account: string;
  posts: InstagramPost[];
  totalLikes: number;
  totalComments: number;
  totalViews: number;
  avgEngagement: number;
}

function getApifyDatasetUrl(): string {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    throw new Error("APIFY_API_TOKEN is not set in environment variables");
  }
  return `https://api.apify.com/v2/datasets/CA0yHlceUjjmPGdaM/items?token=${token}`;
}

export async function GET() {
  try {
    const res = await fetch(getApifyDatasetUrl(), { next: { revalidate: 300 } });
    if (!res.ok) {
      throw new Error(`Apify API returned ${res.status}`);
    }

    const rawPosts: Array<Record<string, unknown>> = await res.json();

    // Group posts by owner account
    const byAccount = new Map<string, InstagramPost[]>();

    for (const post of rawPosts) {
      const username = (post.ownerUsername as string) || "unknown";
      if (!byAccount.has(username)) {
        byAccount.set(username, []);
      }

      const shortCode = (post.shortCode as string) || "";
      const rawDisplayUrl = (post.displayUrl as string) || "";
      const rawVideoUrl = (post.videoUrl as string) || "";

      // Proxy CDN URLs through our server to avoid hotlinking blocks
      const thumbnailUrl = rawDisplayUrl
        ? `/api/proxy-image?url=${encodeURIComponent(rawDisplayUrl)}`
        : "";
      const videoUrl = rawVideoUrl
        ? `/api/proxy-image?url=${encodeURIComponent(rawVideoUrl)}`
        : undefined;

      byAccount.get(username)!.push({
        id: post.id as string,
        type: post.type as string,
        shortCode,
        caption: ((post.caption as string) || "").substring(0, 300),
        url: post.url as string,
        commentsCount: (post.commentsCount as number) || 0,
        likesCount: (post.likesCount as number) || 0,
        videoViewCount: (post.videoViewCount as number) || undefined,
        videoPlayCount: (post.videoPlayCount as number) || undefined,
        timestamp: post.timestamp as string,
        displayUrl: rawDisplayUrl,
        videoUrl,
        thumbnailUrl,
        ownerFullName: post.ownerFullName as string,
        ownerUsername: username,
        productType: (post.productType as string) || "post",
        latestComments: ((post.latestComments as Array<Record<string, unknown>>) || [])
          .slice(0, 3)
          .map((c) => ({
            text: ((c.text as string) || "").substring(0, 200),
            ownerUsername: (c.ownerUsername as string) || "",
            timestamp: (c.timestamp as string) || "",
            likesCount: (c.likesCount as number) || 0,
          })),
      });
    }

    const results: InstagramData[] = [];

    for (const [account, posts] of byAccount) {
      const sortedPosts = posts.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      const totalLikes = posts.reduce((s, p) => s + p.likesCount, 0);
      const totalComments = posts.reduce((s, p) => s + p.commentsCount, 0);
      const totalViews = posts.reduce((s, p) => s + (p.videoPlayCount || p.videoViewCount || 0), 0);
      const avgEngagement = posts.length > 0
        ? Math.round((totalLikes + totalComments) / posts.length)
        : 0;

      results.push({
        account,
        posts: sortedPosts,
        totalLikes,
        totalComments,
        totalViews,
        avgEngagement,
      });
    }

    // Sort by total engagement descending
    results.sort((a, b) => (b.totalLikes + b.totalComments) - (a.totalLikes + a.totalComments));

    return NextResponse.json(results);
  } catch (error) {
    console.error("instagram error:", error);
    return NextResponse.json(
      { error: "Error fetching Instagram data from Apify" },
      { status: 500 }
    );
  }
}

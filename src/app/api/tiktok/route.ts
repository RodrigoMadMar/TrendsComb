import { NextResponse } from "next/server";

export const maxDuration = 30;

export interface TikTokPost {
  id: string;
  text: string;
  webVideoUrl: string;
  videoUrl: string;
  coverUrl: string;
  diggCount: number;
  shareCount: number;
  commentCount: number;
  playCount: number;
  createTime: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  musicTitle: string;
}

export interface TikTokData {
  account: string;
  accountName: string;
  posts: TikTokPost[];
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalViews: number;
  avgEngagement: number;
}

function getApifyTikTokUrl(): string {
  const datasetId = process.env.APIFY_TIKTOK_DATASET_ID;
  const token = process.env.APIFY_API_TOKEN;
  if (!token || !datasetId) {
    throw new Error("APIFY_API_TOKEN and APIFY_TIKTOK_DATASET_ID must be set");
  }
  return `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}`;
}

export async function GET() {
  try {
    const res = await fetch(getApifyTikTokUrl(), { next: { revalidate: 300 } });
    if (!res.ok) {
      throw new Error(`Apify API returned ${res.status}`);
    }

    const rawPosts: Array<Record<string, unknown>> = await res.json();

    // Group posts by author
    const byAccount = new Map<string, TikTokPost[]>();
    const accountNames = new Map<string, string>();
    const accountAvatars = new Map<string, string>();

    for (const post of rawPosts) {
      // Apify TikTok scraper can have different field names depending on the actor
      const username =
        (post.authorMeta as Record<string, unknown>)?.name as string ||
        (post.authorMeta as Record<string, unknown>)?.nickName as string ||
        post.authorName as string ||
        post.author as string ||
        "unknown";

      const displayName =
        (post.authorMeta as Record<string, unknown>)?.nickName as string ||
        (post.authorMeta as Record<string, unknown>)?.name as string ||
        post.authorName as string ||
        username;

      const avatar =
        (post.authorMeta as Record<string, unknown>)?.avatar as string ||
        post.authorAvatar as string ||
        "";

      if (!byAccount.has(username)) {
        byAccount.set(username, []);
        accountNames.set(username, displayName);
        accountAvatars.set(username, avatar);
      }

      const videoUrl =
        post.videoUrl as string ||
        (post.videoMeta as Record<string, unknown>)?.downloadAddr as string ||
        "";

      const coverUrl =
        (post.videoMeta as Record<string, unknown>)?.coverUrl as string ||
        post.coverUrl as string ||
        post.cover as string ||
        "";

      const webVideoUrl =
        post.webVideoUrl as string ||
        post.url as string ||
        `https://www.tiktok.com/@${username}/video/${post.id}`;

      const createTimeRaw = post.createTime || post.createTimeISO || post.timestamp;
      let createTime: string;
      if (typeof createTimeRaw === "number") {
        createTime = new Date(createTimeRaw * 1000).toISOString();
      } else {
        createTime = (createTimeRaw as string) || new Date().toISOString();
      }

      byAccount.get(username)!.push({
        id: (post.id as string) || "",
        text: ((post.text as string) || (post.desc as string) || "").substring(0, 300),
        webVideoUrl,
        videoUrl,
        coverUrl,
        diggCount: (post.diggCount as number) || (post.likes as number) || 0,
        shareCount: (post.shareCount as number) || (post.shares as number) || 0,
        commentCount: (post.commentCount as number) || (post.comments as number) || 0,
        playCount: (post.playCount as number) || (post.plays as number) || 0,
        createTime,
        authorName: displayName,
        authorUsername: username,
        authorAvatar: avatar,
        musicTitle:
          (post.musicMeta as Record<string, unknown>)?.musicName as string ||
          post.musicTitle as string ||
          "",
      });
    }

    const results: TikTokData[] = [];

    for (const [account, posts] of byAccount) {
      const sortedPosts = posts.sort(
        (a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
      );

      const totalLikes = posts.reduce((s, p) => s + p.diggCount, 0);
      const totalComments = posts.reduce((s, p) => s + p.commentCount, 0);
      const totalShares = posts.reduce((s, p) => s + p.shareCount, 0);
      const totalViews = posts.reduce((s, p) => s + p.playCount, 0);
      const avgEngagement =
        posts.length > 0
          ? Math.round((totalLikes + totalComments + totalShares) / posts.length)
          : 0;

      results.push({
        account,
        accountName: accountNames.get(account) || account,
        posts: sortedPosts,
        totalLikes,
        totalComments,
        totalShares,
        totalViews,
        avgEngagement,
      });
    }

    results.sort((a, b) => b.totalViews - a.totalViews);

    return NextResponse.json(results);
  } catch (error) {
    console.error("tiktok error:", error);
    return NextResponse.json(
      { error: "Error fetching TikTok data from Apify" },
      { status: 500 }
    );
  }
}

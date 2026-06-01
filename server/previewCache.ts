/**
 * Preview image cache (Round 7.24)
 * - Download thumbnail from Meta API (small image, ~20-50KB)
 * - Upload to S3 via storagePut → /manus-storage/...
 * - Refresh if older than 7 days
 *
 * Note: We don't resize because Meta's thumbnail_url already returns a small
 * preview (~96x96 to 192x192). Adding sharp would require native deps.
 */
import { storagePut } from "./storage";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export type CacheResult = {
  url: string;
  cachedAt: Date;
} | null;

/**
 * Decide whether the cached preview is still fresh (< 7 days).
 * Pure function — easy to unit test.
 */
export function isPreviewFresh(cachedAt: Date | null | undefined, now = new Date()): boolean {
  if (!cachedAt) return false;
  const ts = cachedAt instanceof Date ? cachedAt.getTime() : new Date(cachedAt).getTime();
  if (!Number.isFinite(ts)) return false;
  return now.getTime() - ts < SEVEN_DAYS_MS;
}

/**
 * Download thumbnail bytes from Meta and store in S3.
 * Returns the public /manus-storage/... URL, or null if download fails.
 *
 * - adId: used as cache key (one cache per ad)
 * - thumbnailUrl: Meta CDN URL (signed, expires in ~hours)
 */
export async function cacheAdPreview(
  adId: string,
  thumbnailUrl: string | null | undefined,
): Promise<CacheResult> {
  if (!thumbnailUrl) return null;
  try {
    const resp = await fetch(thumbnailUrl);
    if (!resp.ok) {
      console.warn(`[previewCache] failed to download adId=${adId} status=${resp.status}`);
      return null;
    }
    const ab = await resp.arrayBuffer();
    const buf = Buffer.from(ab);
    // basic sanity: skip if empty or too large (>2MB)
    if (buf.length === 0 || buf.length > 2 * 1024 * 1024) {
      console.warn(`[previewCache] skip adId=${adId} bad size=${buf.length}`);
      return null;
    }
    const contentType = resp.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png") ? "png" : "jpg";
    const { url } = await storagePut(`ad-previews/${adId}.${ext}`, buf, contentType);
    return { url, cachedAt: new Date() };
  } catch (e) {
    console.warn(`[previewCache] error adId=${adId}:`, (e as Error).message);
    return null;
  }
}

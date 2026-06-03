/**
 * Meta Marketing API client (Graph v22.0)
 * Handles: insights, campaigns/adsets/ads, daily breakdowns
 *
 * NOTE: This module is NOT for live API calls in dev preview without
 * real tokens. It will gracefully return empty arrays when token is invalid.
 * All errors are caught and logged so the dashboard never crashes.
 */

const META_API_VERSION = "v22.0";
const META_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

export type MetaDateRange = {
  since: string; // YYYY-MM-DD
  until: string; // YYYY-MM-DD
};

export type AccountInsight = {
  spend: number;
  messaging_conversations_started_7d: number;
  purchases: number;
  purchase_value: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  reach: number;
};

export type AdsetInsight = {
  adset_id: string;
  adset_name: string;
  campaign_id: string;
  campaign_name: string;
  daily_budget?: number;
  status?: string;
  effective_status?: string;
  spend: number;
  messaging: number;
  purchases: number;
  purchase_value: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  reach: number;
};

export type DailyInsight = {
  date: string; // YYYY-MM-DD
  spend: number;
  messaging: number;
  purchases: number;
  purchase_value: number;
  impressions: number;
  clicks: number;
};

export type AdInsight = {
  ad_id: string;
  ad_name: string;
  adset_id: string;
  thumbnail_url?: string;
  spend: number;
  messaging: number;
  purchases: number;
  purchase_value: number;
  impressions: number;
  clicks: number;
  ctr: number;
};

const EMPTY_ACCOUNT_INSIGHT: AccountInsight = {
  spend: 0,
  messaging_conversations_started_7d: 0,
  purchases: 0,
  purchase_value: 0,
  impressions: 0,
  clicks: 0,
  ctr: 0,
  cpm: 0,
  reach: 0,
};

function parseNum(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function extractAction(actions: any[] | undefined, type: string): number {
  if (!actions) return 0;
  const found = actions.find((a: any) => a.action_type === type);
  return parseNum(found?.value);
}

function extractMessaging(actions: any[] | undefined): number {
  if (!actions) return 0;
  // Try several common action types
  const types = [
    "onsite_conversion.messaging_conversation_started_7d",
    "onsite_conversion.total_messaging_connection",
    "messaging_conversation_started_7d",
  ];
  for (const t of types) {
    const v = extractAction(actions, t);
    if (v > 0) return v;
  }
  return 0;
}

/**
 * Round 7.36 — Orders & Revenue ใช้ omni_purchase ตัวเดียว
 * (Meta รวม offsite_conversion.fb_pixel_purchase ไว้ใน omni_purchase แล้ว)
 * การบวก purchase + omni_purchase + fb_pixel_purchase พร้อมกันทำให้ double count
 * fallback ไป purchase ถ้าไม่มี omni_purchase (บัญชีเก่า/บาง schema)
 */
export function extractPurchases(actions: any[] | undefined): number {
  if (!actions) return 0;
  const omni = extractAction(actions, "omni_purchase");
  if (omni > 0) return omni;
  const purchase = extractAction(actions, "purchase");
  if (purchase > 0) return purchase;
  return extractAction(actions, "offsite_conversion.fb_pixel_purchase");
}

function extractPurchaseValue(actionValues: any[] | undefined): number {
  if (!actionValues) return 0;
  const omni = extractAction(actionValues, "omni_purchase");
  if (omni > 0) return omni;
  const purchase = extractAction(actionValues, "purchase");
  if (purchase > 0) return purchase;
  return extractAction(actionValues, "offsite_conversion.fb_pixel_purchase");
}

/**
 * Round 7.36 — ต้นทุนต่อ action จาก cost_per_action_type (list<AdsActionStats>)
 * ใช้กับ "ค่าคลิก" = ต้นทุนต่อการเริ่มสนทนา (messaging conversation started)
 * คืน null ถ้าไม่พบ (จะได้ไม่แสดงแทน 0)
 */
function extractCostPerAction(
  costPerActionType: any[] | undefined,
  preferredTypes: string[],
): number | null {
  if (!costPerActionType || !Array.isArray(costPerActionType)) return null;
  for (const t of preferredTypes) {
    const found = costPerActionType.find((a: any) => a.action_type === t);
    if (found && parseNum(found.value) > 0) return parseNum(found.value);
  }
  return null;
}

export function extractCostPerMessage(costPerActionType: any[] | undefined): number | null {
  return extractCostPerAction(costPerActionType, [
    "onsite_conversion.messaging_conversation_started_7d",
    "onsite_conversion.total_messaging_connection",
    "messaging_conversation_started_7d",
  ]);
}

/**
 * Round 7.36 — ROAS ดึงจาก purchase_roas (list<AdsActionStats>) โดยตรง
 * เลือก omni_purchase ก่อน fallback type อื่น
 * คืน null ถ้าไม่มี (ปล่อยให้ frontend แสดง —)
 */
export function extractPurchaseRoas(purchaseRoas: any[] | undefined): number | null {
  if (!purchaseRoas || !Array.isArray(purchaseRoas)) return null;
  const types = ["omni_purchase", "purchase", "offsite_conversion.fb_pixel_purchase"];
  for (const t of types) {
    const found = purchaseRoas.find((a: any) => a.action_type === t);
    if (found && parseNum(found.value) > 0) return parseNum(found.value);
  }
  // บางบัญชี purchase_roas มีแค่ element เดียวไม่ระบุ action_type
  const first = purchaseRoas[0];
  if (first && parseNum(first.value) > 0) return parseNum(first.value);
  return null;
}

async function metaFetch<T = any>(
  url: string,
  accessToken: string,
): Promise<T | null> {
  try {
    const sep = url.includes("?") ? "&" : "?";
    const res = await fetch(`${url}${sep}access_token=${encodeURIComponent(accessToken)}`, {
      method: "GET",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`[MetaAPI] ${res.status}: ${text.slice(0, 200)}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    console.warn("[MetaAPI] fetch failed:", (e as Error).message);
    return null;
  }
}

export function dateRangeFromPreset(
  preset: "today" | "yesterday" | "3d" | "7d" | "14d" | "30d",
): MetaDateRange {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  if (preset === "today") {
    const t = fmt(today);
    return { since: t, until: t };
  }
  if (preset === "yesterday") {
    const y = new Date(today);
    y.setDate(today.getDate() - 1);
    const ys = fmt(y);
    return { since: ys, until: ys };
  }

  const map: Record<string, number> = { "3d": 3, "7d": 7, "14d": 14, "30d": 30 };
  const days = map[preset] ?? 7;
  const since = new Date(today);
  since.setDate(today.getDate() - days + 1);
  return { since: fmt(since), until: fmt(today) };
}

export async function fetchAccountInsight(
  adAccountId: string,
  accessToken: string,
  dateRange: MetaDateRange,
): Promise<AccountInsight> {
  const fields = [
    "spend",
    "impressions",
    "clicks",
    "ctr",
    "cpm",
    "reach",
    "actions",
    "action_values",
  ].join(",");
  const params = new URLSearchParams({
    fields,
    time_range: JSON.stringify(dateRange),
    level: "account",
  });
  const url = `${META_BASE}/${adAccountId}/insights?${params.toString()}`;
  const res = await metaFetch<{ data: any[] }>(url, accessToken);
  if (!res || !res.data || res.data.length === 0) return EMPTY_ACCOUNT_INSIGHT;
  const r = res.data[0];
  return {
    spend: parseNum(r.spend),
    messaging_conversations_started_7d: extractMessaging(r.actions),
    purchases: extractPurchases(r.actions),
    purchase_value: extractPurchaseValue(r.action_values),
    impressions: parseNum(r.impressions),
    clicks: parseNum(r.clicks),
    ctr: parseNum(r.ctr),
    cpm: parseNum(r.cpm),
    reach: parseNum(r.reach),
  };
}

export async function fetchAdsetInsights(
  adAccountId: string,
  accessToken: string,
  dateRange: MetaDateRange,
): Promise<AdsetInsight[]> {
  const fields = [
    "adset_id",
    "adset_name",
    "campaign_id",
    "campaign_name",
    "spend",
    "impressions",
    "clicks",
    "ctr",
    "cpm",
    "reach",
    "actions",
    "action_values",
  ].join(",");
  const params = new URLSearchParams({
    fields,
    time_range: JSON.stringify(dateRange),
    level: "adset",
    limit: "200",
  });
  const url = `${META_BASE}/${adAccountId}/insights?${params.toString()}`;
  const res = await metaFetch<{ data: any[] }>(url, accessToken);
  if (!res || !res.data) return [];
  return res.data.map((r: any) => ({
    adset_id: r.adset_id,
    adset_name: r.adset_name,
    campaign_id: r.campaign_id,
    campaign_name: r.campaign_name,
    spend: parseNum(r.spend),
    messaging: extractMessaging(r.actions),
    purchases: extractPurchases(r.actions),
    purchase_value: extractPurchaseValue(r.action_values),
    impressions: parseNum(r.impressions),
    clicks: parseNum(r.clicks),
    ctr: parseNum(r.ctr),
    cpm: parseNum(r.cpm),
    reach: parseNum(r.reach),
  }));
}

export async function fetchAdsetDailyInsights(
  adAccountId: string,
  adsetId: string,
  accessToken: string,
  dateRange: MetaDateRange,
): Promise<DailyInsight[]> {
  const fields = ["spend", "impressions", "clicks", "actions", "action_values"].join(",");
  const params = new URLSearchParams({
    fields,
    time_range: JSON.stringify(dateRange),
    time_increment: "1",
    filtering: JSON.stringify([{ field: "adset.id", operator: "IN", value: [adsetId] }]),
  });
  const url = `${META_BASE}/${adAccountId}/insights?${params.toString()}`;
  const res = await metaFetch<{ data: any[] }>(url, accessToken);
  if (!res || !res.data) return [];
  return res.data.map((r: any) => ({
    date: r.date_start,
    spend: parseNum(r.spend),
    messaging: extractMessaging(r.actions),
    purchases: extractPurchases(r.actions),
    purchase_value: extractPurchaseValue(r.action_values),
    impressions: parseNum(r.impressions),
    clicks: parseNum(r.clicks),
  }));
}

export async function fetchAccountDailyInsights(
  adAccountId: string,
  accessToken: string,
  dateRange: MetaDateRange,
): Promise<DailyInsight[]> {
  const fields = ["spend", "impressions", "clicks", "actions", "action_values"].join(",");
  const params = new URLSearchParams({
    fields,
    time_range: JSON.stringify(dateRange),
    time_increment: "1",
    level: "account",
  });
  const url = `${META_BASE}/${adAccountId}/insights?${params.toString()}`;
  const res = await metaFetch<{ data: any[] }>(url, accessToken);
  if (!res || !res.data) return [];
  return res.data.map((r: any) => ({
    date: r.date_start,
    spend: parseNum(r.spend),
    messaging: extractMessaging(r.actions),
    purchases: extractPurchases(r.actions),
    purchase_value: extractPurchaseValue(r.action_values),
    impressions: parseNum(r.impressions),
    clicks: parseNum(r.clicks),
  }));
}

export async function fetchAdsForAdset(
  adAccountId: string,
  adsetId: string,
  accessToken: string,
  dateRange: MetaDateRange,
): Promise<AdInsight[]> {
  const fields = [
    "ad_id",
    "ad_name",
    "adset_id",
    "spend",
    "impressions",
    "clicks",
    "ctr",
    "actions",
    "action_values",
  ].join(",");
  const params = new URLSearchParams({
    fields,
    time_range: JSON.stringify(dateRange),
    level: "ad",
    filtering: JSON.stringify([{ field: "adset.id", operator: "IN", value: [adsetId] }]),
    limit: "100",
  });
  const url = `${META_BASE}/${adAccountId}/insights?${params.toString()}`;
  const res = await metaFetch<{ data: any[] }>(url, accessToken);
  if (!res || !res.data) return [];
  return res.data.map((r: any) => ({
    ad_id: r.ad_id,
    ad_name: r.ad_name,
    adset_id: r.adset_id,
    spend: parseNum(r.spend),
    messaging: extractMessaging(r.actions),
    purchases: extractPurchases(r.actions),
    purchase_value: extractPurchaseValue(r.action_values),
    impressions: parseNum(r.impressions),
    clicks: parseNum(r.clicks),
    ctr: parseNum(r.ctr),
  }));
}

export async function validateToken(adAccountId: string, accessToken: string): Promise<boolean> {
  const url = `${META_BASE}/${adAccountId}?fields=id,name`;
  const res = await metaFetch<{ id: string }>(url, accessToken);
  return res !== null && !!res.id;
}

/**
 * Hourly insights breakdown (24 buckets per day, 0-23).
 * Returns rows with `date` (YYYY-MM-DD) and `hour` (0-23).
 * Used for Live Activity Hero + Hourly Heatmap.
 */
export type HourlyInsight = {
  date: string;
  hour: number; // 0..23
  spend: number;
  messaging: number;
  impressions: number;
  clicks: number;
};

export async function fetchAccountHourlyInsights(
  adAccountId: string,
  accessToken: string,
  dateRange: MetaDateRange,
): Promise<HourlyInsight[]> {
  const fields = ["spend", "impressions", "clicks", "actions"].join(",");
  const params = new URLSearchParams({
    fields,
    time_range: JSON.stringify(dateRange),
    breakdowns: "hourly_stats_aggregated_by_advertiser_time_zone",
    level: "account",
  });
  const url = `${META_BASE}/${adAccountId}/insights?${params.toString()}`;
  const res = await metaFetch<{ data: any[] }>(url, accessToken);
  if (!res || !res.data) return [];
  return res.data.map((r: any) => {
    // hourly_stats_aggregated_by_advertiser_time_zone returns e.g. "14:00:00 - 14:59:59"
    const hourStr: string = r.hourly_stats_aggregated_by_advertiser_time_zone || "00:00:00 - 00:59:59";
    const hour = parseInt(hourStr.slice(0, 2), 10) || 0;
    return {
      date: r.date_start,
      hour,
      spend: parseNum(r.spend),
      messaging: extractMessaging(r.actions),
      impressions: parseNum(r.impressions),
      clicks: parseNum(r.clicks),
    };
  });
}


/**
 * ── Token Test ──────────────────────────────────────────────────────
 * ตรวจสถานะ Access Token + Ad Account แบบลึก เรียกใช้ใน /accounts
 * คืน raw error ของ Meta + คำแปลภาษาไทย + คำแนะนำในการแก้
 */

export type MetaErrorCategory =
  | "ok"
  | "token_expired"
  | "token_invalid"
  | "app_blocked"
  | "permission_missing"
  | "rate_limit"
  | "account_disabled"
  | "account_not_found"
  | "network_error"
  | "unknown";

export type TokenTestResult = {
  ok: boolean;
  category: MetaErrorCategory;
  title: string; // หัวข้อภาษาไทย
  message: string; // คำอธิบายภาษาไทย
  suggestion: string; // คำแนะนำการแก้
  // ข้อมูลฝั่ง Meta (เมื่อสำเร็จ)
  meId?: string;
  meName?: string;
  accountName?: string;
  accountStatus?: number;
  accountStatusLabel?: string;
  disableReason?: number;
  // ข้อมูล raw error (เมื่อล้มเหลว)
  rawError?: {
    message: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
    error_user_title?: string;
    error_user_msg?: string;
  };
  httpStatus?: number;
  testedAt: number; // ms epoch
};

/** Meta account_status mapping (จาก Marketing API doc) */
const ACCOUNT_STATUS_LABEL: Record<number, string> = {
  1: "ใช้งานอยู่ (ACTIVE)",
  2: "ปิดใช้งาน (DISABLED)",
  3: "ยังไม่ได้ใช้ครั้งแรก (UNSETTLED)",
  7: "อยู่ระหว่างตรวจสอบ (PENDING_RISK_REVIEW)",
  8: "ปิดเพื่อตรวจสอบ (PENDING_SETTLEMENT)",
  9: "อยู่ระหว่างชำระเงิน (IN_GRACE_PERIOD)",
  100: "ยังไม่ได้ตรวจสอบครั้งแรก (PENDING_CLOSURE)",
  101: "ปิดถาวร (CLOSED)",
  102: "รอตรวจสอบใหม่ (PENDING_REVIEW)",
  201: "เกินวงเงิน (ANY_ACTIVE)",
  202: "ปิดบัญชี (ANY_CLOSED)",
};

/**
 * แปลง error object ของ Meta เป็น category + ข้อความภาษาไทย
 * ใช้ทั้งใน accounts.testToken และทดสอบใน vitest
 */
export function classifyMetaError(
  err: { message?: string; type?: string; code?: number; error_subcode?: number } | null,
  httpStatus?: number,
): { category: MetaErrorCategory; title: string; message: string; suggestion: string } {
  if (!err) {
    return {
      category: "network_error",
      title: "เชื่อมต่อ Meta ไม่สำเร็จ",
      message: "ระบบไม่สามารถเรียก Graph API ของ Meta ได้ในตอนนี้",
      suggestion: "ลองใหม่อีกครั้งในอีก 1-2 นาที หากยังไม่หายให้ตรวจสอบเครือข่ายและสถานะของ Meta",
    };
  }
  const code = err.code ?? 0;
  const sub = err.error_subcode ?? 0;
  const msg = (err.message ?? "").toLowerCase();

  // Token หมดอายุ / ถูกเพิกถอน
  if (code === 190) {
    if (sub === 463 || msg.includes("expired"))
      return {
        category: "token_expired",
        title: "Access Token หมดอายุ",
        message: "Token ที่บันทึกไว้หมดอายุแล้ว ระบบจึงไม่สามารถดึงข้อมูลจาก Meta ได้",
        suggestion: "ออก Token ใหม่จาก Graph API Explorer หรือ Business System User แล้วกลับมาแก้ไขที่หน้านี้",
      };
    if (sub === 460 || msg.includes("changed") || msg.includes("password"))
      return {
        category: "token_invalid",
        title: "Token ใช้ไม่ได้ (เปลี่ยนรหัสผ่าน)",
        message: "ผู้ใช้เจ้าของ Token เปลี่ยนรหัสผ่านหรือออกจากระบบ ทำให้ Token ถูกยกเลิกอัตโนมัติ",
        suggestion: "ออก Token ใหม่จากบัญชีเจ้าของ แล้วอัปเดตในหน้านี้",
      };
    return {
      category: "token_invalid",
      title: "Access Token ใช้งานไม่ได้",
      message: "Meta แจ้งว่า Token ถูกเพิกถอนหรือไม่ถูกต้อง (code 190)",
      suggestion: "ออก Token ใหม่จากบัญชีที่มีสิทธิ์เข้าถึง Ads Account แล้วอัปเดตในหน้านี้",
    };
  }

  // App ถูกบล็อก / สิทธิ์ไม่พอ
  if (code === 200) {
    if (msg.includes("api access blocked") || msg.includes("blocked"))
      return {
        category: "app_blocked",
        title: "Meta บล็อกการเข้าถึง API",
        message:
          "Meta บล็อกแอปที่ออก Token นี้ มักเกิดจากแอปถูกระงับ (Restricted/Disabled) หรือยังไม่ได้ยืนยัน Business",
        suggestion:
          "เข้า developers.facebook.com/apps เลือกแอป → ดู banner คำเตือน → ทำตามที่ Meta แจ้ง (ยืนยัน Business / App Review) หรือใช้ Token จากแอปอื่น",
      };
    return {
      category: "permission_missing",
      title: "สิทธิ์ไม่เพียงพอ",
      message: "Token นี้ไม่มี permission ที่จำเป็น (เช่น ads_read หรือ ads_management)",
      suggestion: "ออก Token ใหม่โดยขอ scope ads_read + ads_management หรือเพิ่มสิทธิ์ใน Business Settings",
    };
  }

  // Rate limit
  if (code === 4 || code === 17 || code === 32 || code === 613)
    return {
      category: "rate_limit",
      title: "ถูกจำกัดอัตราการเรียก (Rate Limit)",
      message: "เรียก API ถี่เกินไป Meta จึงชะลอการตอบกลับชั่วคราว",
      suggestion: "รอประมาณ 5-15 นาที แล้วลองใหม่ ระบบจะดึงข้อมูลรอบต่อไปอัตโนมัติ",
    };

  // Account not found / ID ผิด
  if (code === 100)
    return {
      category: "account_not_found",
      title: "หาบัญชีไม่เจอ",
      message: "Meta แจ้งว่า Ad Account ID ที่ระบุไม่มีอยู่จริง หรือ Token ไม่มีสิทธิ์เข้าถึงบัญชีนี้",
      suggestion: "ตรวจรูปแบบ Ad Account ID (ต้องขึ้นต้นด้วย act_ตามด้วยตัวเลข) และสิทธิ์การเข้าถึง",
    };

  // Account disabled
  if (msg.includes("disabled") || msg.includes("ad account") && msg.includes("blocked"))
    return {
      category: "account_disabled",
      title: "บัญชีโฆษณาถูกระงับ",
      message: "Meta ระงับการใช้งานบัญชีโฆษณานี้ ไม่สามารถดึงข้อมูลหรือยิงโฆษณาได้",
      suggestion: "เข้า Business Manager เพื่อยื่นอุทธรณ์ตามขั้นตอนที่ Meta แจ้ง",
    };

  // Default
  return {
    category: "unknown",
    title: `Meta ตอบกลับด้วยข้อผิดพลาด (${httpStatus ?? "?"})`,
    message: err.message ?? "ไม่ทราบสาเหตุ",
    suggestion: "ลองทดสอบใหม่อีกครั้ง หากยังเจอข้อความเดิม ส่ง fbtrace_id ให้ผู้ดูแลตรวจสอบ",
  };
}

/**
 * เรียก Graph API จริงเพื่อทดสอบ token + ad account
 * - GET /me?fields=id,name → ตรวจ token ใช้งานได้ไหม
 * - GET /{actId}?fields=name,account_status,disable_reason → ตรวจสิทธิ์ + สถานะบัญชี
 * คืน TokenTestResult ที่ FE แสดงต่อได้
 */
export async function testAdAccountToken(
  adAccountId: string,
  accessToken: string,
): Promise<TokenTestResult> {
  const testedAt = Date.now();

  // ── Step 1: /me ─────────────────────────────────────────────
  const meUrl = `${META_BASE}/me?fields=id,name&access_token=${encodeURIComponent(accessToken)}`;
  let meHttp = 0;
  let meErr: any = null;
  let meBody: any = null;
  try {
    const res = await fetch(meUrl);
    meHttp = res.status;
    meBody = await res.json().catch(() => null);
    if (!res.ok) meErr = meBody?.error ?? { message: `HTTP ${res.status}` };
  } catch (e) {
    const cls = classifyMetaError(null);
    return {
      ok: false,
      ...cls,
      httpStatus: 0,
      rawError: { message: (e as Error).message },
      testedAt,
    };
  }

  if (meErr) {
    const cls = classifyMetaError(meErr, meHttp);
    return { ok: false, ...cls, httpStatus: meHttp, rawError: meErr, testedAt };
  }

  // ── Step 2: /{actId} ────────────────────────────────────────
  const actUrl = `${META_BASE}/${adAccountId}?fields=name,account_status,disable_reason&access_token=${encodeURIComponent(accessToken)}`;
  let actHttp = 0;
  let actErr: any = null;
  let actBody: any = null;
  try {
    const res = await fetch(actUrl);
    actHttp = res.status;
    actBody = await res.json().catch(() => null);
    if (!res.ok) actErr = actBody?.error ?? { message: `HTTP ${res.status}` };
  } catch (e) {
    const cls = classifyMetaError(null);
    return {
      ok: false,
      ...cls,
      httpStatus: 0,
      rawError: { message: (e as Error).message },
      meId: meBody?.id,
      meName: meBody?.name,
      testedAt,
    };
  }

  if (actErr) {
    const cls = classifyMetaError(actErr, actHttp);
    return {
      ok: false,
      ...cls,
      httpStatus: actHttp,
      rawError: actErr,
      meId: meBody?.id,
      meName: meBody?.name,
      testedAt,
    };
  }

  const accountStatus = parseNum(actBody?.account_status);
  const disableReason = parseNum(actBody?.disable_reason);
  const statusLabel = ACCOUNT_STATUS_LABEL[accountStatus] ?? `ไม่ทราบสถานะ (${accountStatus})`;
  const isActive = accountStatus === 1;

  return {
    ok: isActive,
    category: isActive ? "ok" : "account_disabled",
    title: isActive ? "Token ใช้งานได้ปกติ" : `บัญชีโฆษณาไม่อยู่ในสถานะ ACTIVE`,
    message: isActive
      ? `เรียก Graph API สำเร็จ — ดึงข้อมูลจากบัญชี "${actBody?.name}" ได้ตามปกติ`
      : `บัญชีอยู่ในสถานะ: ${statusLabel}${disableReason ? ` (เหตุผล: ${disableReason})` : ""}`,
    suggestion: isActive
      ? "ระบบสามารถดึง KPI/Insights ของบัญชีนี้ได้ตามปกติ"
      : "เข้า Business Manager เพื่อตรวจสอบเหตุผลและยื่นอุทธรณ์ตามขั้นตอนของ Meta",
    meId: meBody?.id,
    meName: meBody?.name,
    accountName: actBody?.name,
    accountStatus,
    accountStatusLabel: statusLabel,
    disableReason,
    httpStatus: actHttp,
    testedAt,
  };
}


/* ---------- Business Manager Auto-Discovery (Round 7.23) ---------- */

export type BMConnectionResult = {
  ok: boolean;
  category: MetaErrorCategory | "ok";
  title: string;
  message: string;
  suggestion: string;
  bmId?: string;
  bmName?: string;
  meId?: string;
  meName?: string;
  httpStatus?: number;
  rawError?: unknown;
  testedAt: number;
};

export type DiscoveredAccount = {
  bmAdAccountId: string; // Meta adAccount id เช่น "act_1234"
  name: string;
  accountStatus: number;
  accountStatusLabel: string;
  ownership: "owned" | "client";
  currency?: string;
  timezone?: string;
};

export type BMDiscoveryResult = {
  ok: boolean;
  category: MetaErrorCategory | "ok";
  title: string;
  message: string;
  suggestion: string;
  bmId?: string;
  bmName?: string;
  ownedAccounts: DiscoveredAccount[];
  clientAccounts: DiscoveredAccount[];
  totalCount: number;
  httpStatus?: number;
  rawError?: unknown;
  discoveredAt: number;
};

/**
 * ทดสอบ token + BM แค่ 2 endpoint เร็ว ๆ:
 *  - GET /me?fields=id,name (ตรวจ token)
 *  - GET /{bm_id}?fields=id,name (ตรวจ BM ใช้งานได้ + Token เข้าถึงได้)
 */
export async function testBMConnection(
  bmId: string,
  accessToken: string,
): Promise<BMConnectionResult> {
  const testedAt = Date.now();

  // /me
  const meUrl = `${META_BASE}/me?fields=id,name&access_token=${encodeURIComponent(accessToken)}`;
  let meBody: any = null;
  let meHttp = 0;
  try {
    const r = await fetch(meUrl);
    meHttp = r.status;
    meBody = await r.json().catch(() => null);
    if (!r.ok) {
      const err = meBody?.error ?? { message: `HTTP ${r.status}` };
      const cls = classifyMetaError(err, meHttp);
      return { ok: false, ...cls, httpStatus: meHttp, rawError: err, testedAt };
    }
  } catch (e) {
    const cls = classifyMetaError(null);
    return {
      ok: false,
      ...cls,
      httpStatus: 0,
      rawError: { message: (e as Error).message },
      testedAt,
    };
  }

  // /{bm_id}
  const bmUrl = `${META_BASE}/${bmId}?fields=id,name&access_token=${encodeURIComponent(accessToken)}`;
  let bmBody: any = null;
  let bmHttp = 0;
  try {
    const r = await fetch(bmUrl);
    bmHttp = r.status;
    bmBody = await r.json().catch(() => null);
    if (!r.ok) {
      const err = bmBody?.error ?? { message: `HTTP ${r.status}` };
      const cls = classifyMetaError(err, bmHttp);
      return {
        ok: false,
        ...cls,
        httpStatus: bmHttp,
        rawError: err,
        meId: meBody?.id,
        meName: meBody?.name,
        testedAt,
      };
    }
  } catch (e) {
    const cls = classifyMetaError(null);
    return {
      ok: false,
      ...cls,
      httpStatus: 0,
      rawError: { message: (e as Error).message },
      meId: meBody?.id,
      meName: meBody?.name,
      testedAt,
    };
  }

  return {
    ok: true,
    category: "ok",
    title: "เชื่อมต่อ Business Manager สำเร็จ",
    message: `ระบบดึง BM "${bmBody?.name}" ผ่าน Token ของ ${meBody?.name ?? "ผู้ใช้นี้"} ได้`,
    suggestion: "ไปขั้นถัดไปเพื่อ discover บัญชีโฆษณาทั้งหมดใน BM นี้",
    bmId: bmBody?.id,
    bmName: bmBody?.name,
    meId: meBody?.id,
    meName: meBody?.name,
    httpStatus: bmHttp,
    testedAt,
  };
}

/** ดึงทุกหน้าจาก paged endpoint ของ Graph */
async function fetchAllPages(initialUrl: string, maxPages = 20): Promise<any[]> {
  const out: any[] = [];
  let url: string | null = initialUrl;
  let pages = 0;
  while (url && pages < maxPages) {
    const r = await fetch(url);
    const body: any = await r.json().catch(() => null);
    if (!r.ok) {
      const err = body?.error ?? { message: `HTTP ${r.status}` };
      throw Object.assign(new Error(err.message ?? "fetch failed"), {
        metaError: err,
        httpStatus: r.status,
      });
    }
    if (Array.isArray(body?.data)) out.push(...body.data);
    url = body?.paging?.next ?? null;
    pages += 1;
  }
  return out;
}

const ACCOUNT_FIELDS = "id,name,account_status,currency,timezone_name";

function mapDiscovered(raw: any, ownership: "owned" | "client"): DiscoveredAccount {
  const status = parseNum(raw?.account_status);
  return {
    bmAdAccountId: raw?.id ?? "",
    name: raw?.name ?? "(ไม่มีชื่อ)",
    accountStatus: status,
    accountStatusLabel: ACCOUNT_STATUS_LABEL[status] ?? `ไม่ทราบสถานะ (${status})`,
    ownership,
    currency: raw?.currency,
    timezone: raw?.timezone_name,
  };
}

/**
 * Discover ทุกบัญชีใน BM:
 *  - /{bm_id}/owned_ad_accounts
 *  - /{bm_id}/client_ad_accounts
 */
export async function discoverBMAccounts(
  bmId: string,
  accessToken: string,
): Promise<BMDiscoveryResult> {
  const discoveredAt = Date.now();
  const tokenParam = `access_token=${encodeURIComponent(accessToken)}`;

  // ตรวจ BM + token ก่อน
  const conn = await testBMConnection(bmId, accessToken);
  if (!conn.ok) {
    return {
      ok: false,
      category: conn.category,
      title: conn.title,
      message: conn.message,
      suggestion: conn.suggestion,
      bmId: conn.bmId,
      bmName: conn.bmName,
      ownedAccounts: [],
      clientAccounts: [],
      totalCount: 0,
      httpStatus: conn.httpStatus,
      rawError: conn.rawError,
      discoveredAt,
    };
  }

  let owned: any[] = [];
  let client: any[] = [];
  try {
    const ownedUrl = `${META_BASE}/${bmId}/owned_ad_accounts?fields=${ACCOUNT_FIELDS}&limit=100&${tokenParam}`;
    const clientUrl = `${META_BASE}/${bmId}/client_ad_accounts?fields=${ACCOUNT_FIELDS}&limit=100&${tokenParam}`;
    [owned, client] = await Promise.all([fetchAllPages(ownedUrl), fetchAllPages(clientUrl)]);
  } catch (e: any) {
    const err = e?.metaError ?? { message: e?.message ?? "unknown" };
    const cls = classifyMetaError(err, e?.httpStatus);
    return {
      ok: false,
      ...cls,
      bmId: conn.bmId,
      bmName: conn.bmName,
      ownedAccounts: [],
      clientAccounts: [],
      totalCount: 0,
      httpStatus: e?.httpStatus,
      rawError: err,
      discoveredAt,
    };
  }

  const ownedAccounts = owned.map((r) => mapDiscovered(r, "owned"));
  const clientAccounts = client.map((r) => mapDiscovered(r, "client"));
  const totalCount = ownedAccounts.length + clientAccounts.length;

  return {
    ok: true,
    category: "ok",
    title: `พบบัญชีโฆษณาทั้งหมด ${totalCount} บัญชี`,
    message: `Owned ${ownedAccounts.length} · Client ${clientAccounts.length} ใน BM "${conn.bmName}"`,
    suggestion: "เลือกบัญชีที่ต้องการดึงเข้าระบบในขั้นถัดไป",
    bmId: conn.bmId,
    bmName: conn.bmName,
    ownedAccounts,
    clientAccounts,
    totalCount,
    httpStatus: 200,
    discoveredAt,
  };
}


/* ============================================================
 * Round 7.24 — Deep Ads Analysis (ad-day grain)
 * ============================================================ */

export type AdDailyInsight = {
  ad_id: string;
  ad_name: string;
  adset_id: string;
  adset_name: string;
  campaign_id: string;
  campaign_name: string;
  date: string; // YYYY-MM-DD
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  messages: number;
  purchases: number; // จำนวนการซื้อ (omni_purchase) จาก Meta
  purchase_value: number; // ค่าคอนเวอร์ชั่นการซื้อ (omni_purchase value) จาก Meta
  reach: number; // การเข้าถึง (reach) จาก Meta
  cost_per_message: number | null; // ต้นทุนต่อการเริ่มสนทนา (cost_per_action_type) จาก Meta
  purchase_roas: number | null; // ROAS (purchase_roas) จาก Meta โดยตรง
};

/**
 * Fetch ad-level daily insights from Meta Marketing API
 * level=ad + time_increment=1 (1 row per ad × date)
 * - returns empty array if API error
 */
export async function fetchAdInsightsDaily(
  adAccountId: string,
  accessToken: string,
  dateRange: MetaDateRange,
): Promise<AdDailyInsight[]> {
  const fields = [
    "ad_id",
    "ad_name",
    "adset_id",
    "adset_name",
    "campaign_id",
    "campaign_name",
    "spend",
    "impressions",
    "clicks",
    "ctr",
    "reach",
    "actions",
    "action_values",
    "cost_per_action_type",
    "purchase_roas",
    "date_start",
  ].join(",");
  const params = new URLSearchParams({
    fields,
    time_range: JSON.stringify(dateRange),
    level: "ad",
    time_increment: "1",
    limit: "500",
  });
  const url = `${META_BASE}/${adAccountId}/insights?${params.toString()}`;
  const res = await metaFetch<{ data: any[] }>(url, accessToken);
  if (!res || !res.data) return [];
  return res.data.map((r: any) => ({
    ad_id: r.ad_id,
    ad_name: r.ad_name,
    adset_id: r.adset_id,
    adset_name: r.adset_name,
    campaign_id: r.campaign_id,
    campaign_name: r.campaign_name,
    date: r.date_start,
    spend: parseNum(r.spend),
    impressions: parseNum(r.impressions),
    clicks: parseNum(r.clicks),
    ctr: parseNum(r.ctr),
    messages: extractMessaging(r.actions),
    purchases: extractPurchases(r.actions),
    purchase_value: extractPurchaseValue(r.action_values),
    reach: parseNum(r.reach),
    cost_per_message: extractCostPerMessage(r.cost_per_action_type),
    purchase_roas: extractPurchaseRoas(r.purchase_roas),
  }));
}

/**
 * Fetch ad creative thumbnail (preview) URL.
 * Returns thumbnail_url (small) — caller should download + resize + cache to S3.
 */
export async function fetchAdPreviewThumb(
  adId: string,
  accessToken: string,
): Promise<{ thumbnailUrl: string | null; pageId: string | null } | null> {
  const fields = "creative{thumbnail_url,effective_object_story_id,object_story_spec}";
  const url = `${META_BASE}/${adId}?fields=${encodeURIComponent(fields)}`;
  const res = await metaFetch<{ creative?: any }>(url, accessToken);
  if (!res || !res.creative) return null;
  const c = res.creative;
  const pageId =
    (c.effective_object_story_id as string | undefined)?.split("_")[0] ||
    c.object_story_spec?.page_id ||
    null;
  return {
    thumbnailUrl: c.thumbnail_url || null,
    pageId,
  };
}

/**
 * Fetch page name by page_id (for pageName denormalization)
 */
export async function fetchPageName(
  pageId: string,
  accessToken: string,
): Promise<string | null> {
  const url = `${META_BASE}/${pageId}?fields=name`;
  const res = await metaFetch<{ name?: string }>(url, accessToken);
  return res?.name ?? null;
}

/**
 * Pure helper: pick a numeric budget value from a Meta adset/campaign object.
 * Priority: daily_budget > lifetime_budget. Meta returns budgets in cents.
 * Exported only for testing.
 */
export function extractBudgetFromMetaObject(obj: any): number | null {
  const daily = parseNum(obj?.daily_budget);
  if (daily > 0) return daily / 100;
  const lifetime = parseNum(obj?.lifetime_budget);
  if (lifetime > 0) return lifetime / 100;
  return null;
}

/**
 * Fetch budget map per adset + campaign for one ad account.
 *
 * - Returns numbers in baht (Meta stores in cents).
 * - Falls back from daily_budget → lifetime_budget so accounts using
 *   lifetime budgets are not all blank.
 * - Walks Meta paging up to a sensible maxPages so accounts with hundreds
 *   of adsets are not silently truncated.
 * - Includes auth token in URL because metaFetch's auth path needs the same
 *   token; this matches the pattern used elsewhere in this module.
 *
 * Returns: { adset: { [adsetId]: budgetBaht }, campaign: { [campaignId]: budgetBaht } }
 */
export async function fetchAdsetDailyBudgetMap(
  adAccountId: string,
  accessToken: string,
): Promise<{ adset: Record<string, number>; campaign: Record<string, number> }> {
  const result = {
    adset: {} as Record<string, number>,
    campaign: {} as Record<string, number>,
  };
  const fields = "id,daily_budget,lifetime_budget";

  // adsets (paged)
  try {
    const adsetUrl =
      `${META_BASE}/${adAccountId}/adsets?fields=${fields}` +
      `&limit=200&access_token=${encodeURIComponent(accessToken)}`;
    const adsetData = await fetchAllPages(adsetUrl, 25);
    for (const a of adsetData) {
      const v = extractBudgetFromMetaObject(a);
      if (v != null && v > 0) result.adset[a.id] = v;
    }
  } catch (err: any) {
    console.warn(
      `[MetaAPI] fetch adsets budget failed for ${adAccountId}: ${err?.message ?? err}`,
    );
  }

  // campaigns (CBO + lifetime fallback)
  try {
    const campUrl =
      `${META_BASE}/${adAccountId}/campaigns?fields=${fields}` +
      `&limit=200&access_token=${encodeURIComponent(accessToken)}`;
    const campData = await fetchAllPages(campUrl, 25);
    for (const c of campData) {
      const v = extractBudgetFromMetaObject(c);
      if (v != null && v > 0) result.campaign[c.id] = v;
    }
  } catch (err: any) {
    console.warn(
      `[MetaAPI] fetch campaigns budget failed for ${adAccountId}: ${err?.message ?? err}`,
    );
  }

  console.log(
    `[MetaAPI] budget map for ${adAccountId}: ` +
      `${Object.keys(result.adset).length} adsets, ` +
      `${Object.keys(result.campaign).length} campaigns`,
  );

  return result;
}


/* ============================================================
 * Round 7.35 — Campaign Status (WAIT / NEW / REJECT)
 * ============================================================ */

export type MetaCampaignStatus = {
  campaign_id: string;
  campaign_name: string;
  effective_status: string; // ACTIVE / PENDING_REVIEW / DISAPPROVED / WITH_ISSUES / PAUSED ...
};

/**
 * Fetch ALL campaigns (incl. spend=0) with their effective_status from the
 * Ad Management API (NOT insights — insights only returns ads that spent).
 *
 * - level=campaign on /{adAccountId}/campaigns
 * - effective_status reflects review/approval state from Meta
 * - paged (up to 25 pages) so big accounts are not truncated
 * - returns [] on error so caller never crashes
 */
export async function fetchCampaignStatuses(
  adAccountId: string,
  accessToken: string,
): Promise<MetaCampaignStatus[]> {
  const fields = "id,name,effective_status";
  const url =
    `${META_BASE}/${adAccountId}/campaigns?fields=${fields}` +
    `&limit=200&access_token=${encodeURIComponent(accessToken)}`;
  try {
    const rows = await fetchAllPages(url, 25);
    return rows
      .filter((r: any) => r && r.id)
      .map((r: any) => ({
        campaign_id: String(r.id),
        campaign_name: r.name ?? "",
        effective_status: String(r.effective_status ?? "UNKNOWN"),
      }));
  } catch (err: any) {
    console.warn(
      `[MetaAPI] fetchCampaignStatuses failed for ${adAccountId}: ${err?.message ?? err}`,
    );
    return [];
  }
}

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

function extractPurchases(actions: any[] | undefined): number {
  if (!actions) return 0;
  const types = ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"];
  let total = 0;
  for (const t of types) {
    total += extractAction(actions, t);
  }
  return total;
}

function extractPurchaseValue(actionValues: any[] | undefined): number {
  if (!actionValues) return 0;
  const types = ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"];
  let total = 0;
  for (const t of types) {
    total += extractAction(actionValues, t);
  }
  return total;
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
  preset: "1d" | "3d" | "7d" | "14d" | "30d",
): MetaDateRange {
  const today = new Date();
  const map: Record<string, number> = { "1d": 1, "3d": 3, "7d": 7, "14d": 14, "30d": 30 };
  const days = map[preset] ?? 7;
  const since = new Date(today);
  since.setDate(today.getDate() - days + 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
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

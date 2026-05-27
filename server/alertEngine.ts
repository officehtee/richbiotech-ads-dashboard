/**
 * Alert Engine — ตรวจ rule และส่งช่องทาง
 * ใช้กับ Heartbeat (POST /api/scheduled/checkAlerts) ทุก 3 ชม.
 *
 * Rule types (ทั้งหมดเป็น default ที่ระบบเปิดให้พร้อมใช้ — PRD 3.1):
 *  - roas_below          {thresholdRoas, scope}    ROAS ต่ำกว่าค่าที่กำหนด
 *  - spend_no_purchase   {minSpend}                ใช้งบเกิน X แต่ไม่มี purchase
 *  - cost_per_msg_above  {thresholdCost}           ต้นทุนต่อทักสูงเกิน
 *  - ctr_drop_pct        {dropPercent}             CTR ลดลงเทียบ 7 วันก่อน
 *  - spend_spike_pct     {spikePercent}            Spend พุ่งเทียบเฉลี่ย 7 วัน
 */

import {
  AlertChannel,
  AlertRule,
  InsertAlertEvent,
} from "../drizzle/schema";
import { getAccountsKpi } from "./aggregator";
import {
  createAlertEvent,
  findRecentEventByDedupe,
  listAlertChannels,
  listAlertRules,
} from "./db";

export const DEFAULT_RULES: Array<{
  ruleType: AlertRule["ruleType"];
  label: string;
  param: Record<string, unknown>;
  severity: "info" | "warning" | "critical";
}> = [
  {
    ruleType: "roas_below",
    label: "ROAS ต่ำกว่าเป้า (ROAS < 1.5)",
    param: { thresholdRoas: 1.5, scope: "account" },
    severity: "critical",
  },
  {
    ruleType: "spend_no_purchase",
    label: "ใช้งบเกิน 500฿ แต่ไม่มี Purchase",
    param: { minSpend: 500 },
    severity: "warning",
  },
  {
    ruleType: "cost_per_msg_above",
    label: "ต้นทุน/ทัก สูงเกิน 50฿",
    param: { thresholdCost: 50 },
    severity: "warning",
  },
  {
    ruleType: "ctr_drop_pct",
    label: "CTR ลดลงเทียบสัปดาห์ก่อน ≥ 30%",
    param: { dropPercent: 30 },
    severity: "info",
  },
  {
    ruleType: "spend_spike_pct",
    label: "Spend พุ่งเทียบเฉลี่ย 7 วัน ≥ 50%",
    param: { spikePercent: 50 },
    severity: "warning",
  },
];

export type EvaluationContext = {
  accountId: number;
  accountName: string;
  spend: number;
  purchases: number;
  roas: number;
  costPerMessage: number;
  ctr: number;
  ctrPrev?: number;
  spendAvg7?: number;
};

export type RuleTriggerResult = {
  ruleType: AlertRule["ruleType"];
  triggered: boolean;
  title: string;
  message: string;
  dedupeKey: string;
};

/** Pure: ตรวจกฎ 1 ข้อกับ context ของบัญชี 1 บัญชี — ใช้ทดสอบได้ง่าย */
export function evaluateRule(
  rule: Pick<AlertRule, "ruleType" | "label">,
  param: Record<string, any>,
  ctx: EvaluationContext,
): RuleTriggerResult {
  const base = {
    ruleType: rule.ruleType,
    dedupeKey: `${rule.ruleType}:${ctx.accountId}`,
  };
  switch (rule.ruleType) {
    case "roas_below": {
      const threshold = Number(param.thresholdRoas ?? 1.5);
      const triggered = ctx.spend > 0 && ctx.roas < threshold;
      return {
        ...base,
        triggered,
        title: `[${ctx.accountName}] ROAS ${ctx.roas.toFixed(2)} < เป้า ${threshold}`,
        message: `บัญชี ${ctx.accountName} มี ROAS = ${ctx.roas.toFixed(2)} ต่ำกว่าเกณฑ์ ${threshold} (ใช้งบ ${ctx.spend.toFixed(0)} ฿)`,
      };
    }
    case "spend_no_purchase": {
      const minSpend = Number(param.minSpend ?? 500);
      const triggered = ctx.spend >= minSpend && ctx.purchases === 0;
      return {
        ...base,
        triggered,
        title: `[${ctx.accountName}] ใช้งบ ${ctx.spend.toFixed(0)} ฿ แต่ไม่มี Purchase`,
        message: `บัญชี ${ctx.accountName} ใช้งบ ${ctx.spend.toFixed(0)} ฿ (≥ ${minSpend}) แต่ยังไม่มี Purchase เลย`,
      };
    }
    case "cost_per_msg_above": {
      const threshold = Number(param.thresholdCost ?? 50);
      const triggered = ctx.costPerMessage > threshold && ctx.spend > 0;
      return {
        ...base,
        triggered,
        title: `[${ctx.accountName}] ต้นทุน/ทัก ${ctx.costPerMessage.toFixed(2)} ฿ > ${threshold}`,
        message: `ต้นทุนต่อข้อความใน ${ctx.accountName} สูง ${ctx.costPerMessage.toFixed(2)} ฿ (เกณฑ์ ${threshold})`,
      };
    }
    case "ctr_drop_pct": {
      const drop = Number(param.dropPercent ?? 30);
      if (!ctx.ctrPrev || ctx.ctrPrev <= 0) {
        return { ...base, triggered: false, title: "", message: "" };
      }
      const change = ((ctx.ctr - ctx.ctrPrev) / ctx.ctrPrev) * 100;
      const triggered = change <= -drop;
      return {
        ...base,
        triggered,
        title: `[${ctx.accountName}] CTR ลด ${Math.abs(change).toFixed(1)}%`,
        message: `CTR ของ ${ctx.accountName} ลดจาก ${ctx.ctrPrev.toFixed(2)}% → ${ctx.ctr.toFixed(2)}% (เกณฑ์ลด ≥ ${drop}%)`,
      };
    }
    case "spend_spike_pct": {
      const spike = Number(param.spikePercent ?? 50);
      if (!ctx.spendAvg7 || ctx.spendAvg7 <= 0) {
        return { ...base, triggered: false, title: "", message: "" };
      }
      const change = ((ctx.spend - ctx.spendAvg7) / ctx.spendAvg7) * 100;
      const triggered = change >= spike;
      return {
        ...base,
        triggered,
        title: `[${ctx.accountName}] Spend พุ่ง +${change.toFixed(1)}%`,
        message: `Spend วันนี้ ${ctx.spend.toFixed(0)} ฿ vs ค่าเฉลี่ย 7 วัน ${ctx.spendAvg7.toFixed(0)} ฿ (เกณฑ์ ≥ ${spike}%)`,
      };
    }
    default:
      return { ...base, triggered: false, title: "", message: "" };
  }
}

/** ส่ง LINE Messaging API (multicast หรือ push) */
export async function sendLine(config: { accessToken: string; to: string }, text: string): Promise<boolean> {
  try {
    const r = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify({
        to: config.to,
        messages: [{ type: "text", text }],
      }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

/** ส่ง webhook (POST JSON) */
export async function sendWebhook(config: { url: string; secret?: string }, payload: unknown): Promise<boolean> {
  try {
    const r = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.secret ? { "X-Alert-Secret": config.secret } : {}),
      },
      body: JSON.stringify(payload),
    });
    return r.ok;
  } catch {
    return false;
  }
}

/** ส่งครบทุก channel ที่เปิดอยู่ */
export async function dispatchToChannels(
  channels: AlertChannel[],
  payload: { title: string; message: string; severity: string; context?: unknown },
): Promise<{ web: boolean; line: number; webhook: number; manus: boolean }> {
  let lineOk = 0;
  let webhookOk = 0;
  let manus = false;
  const text = `[${payload.severity.toUpperCase()}] ${payload.title}\n${payload.message}`;

  for (const ch of channels) {
    if (!ch.isEnabled) continue;
    try {
      const cfg = JSON.parse(ch.configJson || "{}");
      if (ch.channelType === "line" && cfg.accessToken && cfg.to) {
        if (await sendLine(cfg, text)) lineOk++;
      } else if (ch.channelType === "webhook" && cfg.url) {
        if (await sendWebhook(cfg, { ...payload })) webhookOk++;
      } else if (ch.channelType === "manus_owner") {
        const { notifyOwner } = await import("./_core/notification");
        manus = (await notifyOwner({ title: payload.title, content: payload.message })) || manus;
      }
      // email: skipped — not configured in this template
      // web: stored as alertEvent row (handled by caller)
    } catch (e) {
      console.error(`[alertEngine] channel ${ch.channelType} failed`, e);
    }
  }
  return { web: true, line: lineOk, webhook: webhookOk, manus };
}

/** ตรวจทุก rule × ทุก account ของ tenant แล้วสร้าง event + ส่ง channel */
export async function runAlertCheckForTenant(tenantId: number): Promise<{ triggered: number; skipped: number }> {
  const rules = await listAlertRules(tenantId);
  const channels = await listAlertChannels(tenantId);
  const enabledRules = rules.filter((r) => r.isEnabled);
  if (enabledRules.length === 0) return { triggered: 0, skipped: 0 };

  // ดึง snapshot 1 วัน + 7 วันก่อน เพื่อใช้กับ CTR drop / spend spike
  const todayKpi = await getAccountsKpi(tenantId, { preset: "3d" });
  const weekKpi = await getAccountsKpi(tenantId, { preset: "7d" });

  let triggered = 0;
  let skipped = 0;

  for (const acc of todayKpi) {
    const prev = weekKpi.find((a) => a.accountId === acc.accountId);
    const evalCtx: EvaluationContext = {
      accountId: acc.accountId,
      accountName: acc.nickname || acc.adAccountId,
      spend: acc.spend,
      purchases: acc.purchases,
      roas: acc.roas,
      costPerMessage: acc.costPerMessage,
      ctr: acc.ctr,
      ctrPrev: prev?.ctr,
      spendAvg7: prev ? prev.spend / 7 : undefined,
    };

    for (const rule of enabledRules) {
      const param = JSON.parse(rule.paramJson || "{}");
      const result = evaluateRule(rule, param, evalCtx);
      if (!result.triggered) continue;

      // dedupe ภายใน 12 ชั่วโมง
      const recent = await findRecentEventByDedupe(tenantId, result.dedupeKey, 12 * 3600 * 1000);
      if (recent) {
        skipped++;
        continue;
      }

      const insert: InsertAlertEvent = {
        userId: tenantId,
        ruleId: rule.id,
        ruleType: rule.ruleType,
        severity: rule.severity ?? "warning",
        title: result.title,
        message: result.message,
        contextJson: JSON.stringify({ accountId: acc.accountId, spend: acc.spend, roas: acc.roas }),
        isRead: false,
        dedupeKey: result.dedupeKey,
      };
      await createAlertEvent(insert);
      triggered++;
      await dispatchToChannels(channels, {
        title: result.title,
        message: result.message,
        severity: rule.severity ?? "warning",
      });
    }
  }
  return { triggered, skipped };
}

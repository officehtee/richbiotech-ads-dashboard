/**
 * Standalone Account Token Sync (Prompt B)
 * ----------------------------------------
 * เช็ก Token ของ "บัญชีเดี่ยว" (bmId = null) กับ Meta อัตโนมัติ แล้วอัปเดต tokenStatus
 *
 * หลักการ:
 * - ทำเฉพาะบัญชีเดี่ยว (bmId IS NULL, isActive=true) ของทุก tenant (global)
 * - บัญชีจาก BM ใช้สถานะจาก BM (จัดการใน Prompt A / bmSync) — ไม่แตะที่นี่
 * - ดึงทุกบัญชี isActive=true เสมอ (ไม่กรอง tokenStatus) เพื่อให้ token ที่เคยเสีย
 *   กลับมาเป็น active ได้เมื่อใช้ได้อีกครั้ง
 * - error ชั่วคราว (rate_limit/network_error/unknown) → คงสถานะเดิม ไม่เขียนทับ
 * - delay 300ms ระหว่างบัญชี (testAdAccountToken ยิง Meta 2 endpoints/บัญชี)
 * - แต่ละบัญชี wrap try/catch แยก (บัญชีหนึ่งล่มไม่ทำให้ทั้ง loop ล่ม)
 *
 * NOTE: Meta API ถูกบล็อกจาก Business Verification — sync จริงทำงานเมื่อ verify ผ่าน
 * แต่ logic + unit test (mock) พร้อมใช้ทันที
 */

import { listStandaloneActiveAccounts, updateAdAccountTokenStatus } from "./db";
import { testAdAccountToken, type MetaErrorCategory } from "./metaApi";
import type { AdAccountTokenStatus } from "../drizzle/schema";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Map Meta error category → tokenStatus ที่จะบันทึก
 * คืน null = "คงสถานะเดิม" (error ชั่วคราว — ห้ามเขียนทับ)
 */
export function mapCategoryToTokenStatus(
  category: MetaErrorCategory,
): AdAccountTokenStatus | null {
  switch (category) {
    case "ok":
      return "active";
    case "token_expired":
      return "token_expired";
    case "token_invalid":
      return "revoked";
    case "app_blocked":
    case "permission_missing":
    case "account_disabled":
      return "blocked";
    case "account_not_found":
      return "revoked";
    // error ชั่วคราว — คงสถานะเดิม (ห้ามเขียนทับ)
    case "rate_limit":
    case "network_error":
    case "unknown":
      return null;
    default: {
      // exhaustive guard: หากเพิ่ม category ใหม่ในอนาคต ให้ default เป็นคงสถานะเดิม
      return null;
    }
  }
}

export type StandaloneSyncSummary = {
  checked: number; // จำนวนบัญชีที่เช็ก
  changed: number; // จำนวนบัญชีที่เปลี่ยนสถานะ (มีการเรียก update)
  skipped: number; // จำนวนบัญชีที่คงสถานะเดิม (transient error)
  failed: number; // จำนวนบัญชีที่เกิด exception ระหว่างเช็ก
};

/**
 * Sync token ของบัญชีเดี่ยว
 * @param delayMs delay ระหว่างบัญชี (default 300ms — เท่ากับ deepAdsSync)
 * @param tenantId ถ้าระบุ → เฉพาะ workspace นั้น (ปุ่ม manual ของ owner); undefined → global (cron)
 */
export async function syncStandaloneAccounts(
  delayMs = 300,
  tenantId?: number,
): Promise<StandaloneSyncSummary> {
  const accounts = await listStandaloneActiveAccounts(tenantId);
  const summary: StandaloneSyncSummary = {
    checked: 0,
    changed: 0,
    skipped: 0,
    failed: 0,
  };

  console.log(`[standaloneSync] start — ${accounts.length} standalone account(s) to check`);

  for (let i = 0; i < accounts.length; i++) {
    const acc = accounts[i];
    try {
      const result = await testAdAccountToken(acc.adAccountId, acc.accessToken);
      const mapped = mapCategoryToTokenStatus(result.category);

      summary.checked++;

      if (mapped === null) {
        // error ชั่วคราว — คงสถานะเดิม
        summary.skipped++;
        console.log(
          `[standaloneSync] (${i + 1}/${accounts.length}) acct=${acc.adAccountId} ` +
            `category=${result.category} → keep current status (transient)`,
        );
      } else {
        await updateAdAccountTokenStatus(acc.id, mapped);
        summary.changed++;
        console.log(
          `[standaloneSync] (${i + 1}/${accounts.length}) acct=${acc.adAccountId} ` +
            `category=${result.category} → tokenStatus=${mapped}`,
        );
      }
    } catch (e) {
      summary.failed++;
      console.warn(
        `[standaloneSync] (${i + 1}/${accounts.length}) acct=${acc.adAccountId} ` +
          `failed: ${(e as Error).message}`,
      );
    }

    // เว้น delay ระหว่างบัญชี (กัน rate limit) — ไม่ delay หลังตัวสุดท้าย
    if (delayMs > 0 && i < accounts.length - 1) {
      await sleep(delayMs);
    }
  }

  console.log(
    `[standaloneSync] done — checked=${summary.checked} changed=${summary.changed} ` +
      `skipped=${summary.skipped} failed=${summary.failed}`,
  );

  return summary;
}

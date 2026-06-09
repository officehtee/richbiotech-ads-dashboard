import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Prompt B — Unit tests สำหรับ standalone account token sync
 * mock ./db + ./metaApi เพื่อทดสอบ logic โดยไม่ต้องเรียก Meta จริง
 *
 * ครอบคลุม:
 *  1. token ใช้ได้ → อัปเดตเป็น active
 *  2. token หมดอายุ → token_expired
 *  3. ถูกบล็อก (app_blocked/permission_missing/account_disabled) → blocked
 *  4. ถูกเพิกถอน (token_invalid/account_not_found) → revoked
 *  5. listStandaloneActiveAccounts ดึงเฉพาะ bmId=null + isActive=true (ตรวจที่ db helper)
 *  6. transient error (rate_limit/network_error/unknown) → คงสถานะเดิม (ไม่เรียก update)
 *  7. delay ระหว่างบัญชี + try/catch ต่อบัญชี (บัญชีหนึ่ง error ไม่ทำให้ loop ล่ม)
 */

type Acct = { id: number; accessToken: string; adAccountId: string };

const store: {
  standalone: Acct[];
  updates: Array<{ id: number; status: string }>;
} = { standalone: [], updates: [] };

// map adAccountId → category ที่ testAdAccountToken จะคืน (จำลอง response จาก Meta)
const categoryByAcct: Record<string, string> = {};

vi.mock("./db", async () => ({
  listStandaloneActiveAccounts: vi.fn(async () => store.standalone),
  updateAdAccountTokenStatus: vi.fn(async (id: number, status: string) => {
    store.updates.push({ id, status });
  }),
}));

vi.mock("./metaApi", async () => ({
  testAdAccountToken: vi.fn(async (adAccountId: string) => {
    const category = categoryByAcct[adAccountId] ?? "ok";
    if (category === "THROW") {
      throw new Error("simulated network throw");
    }
    return {
      ok: category === "ok",
      category,
      title: "t",
      message: "m",
      suggestion: "s",
    };
  }),
}));

import {
  syncStandaloneAccounts,
  mapCategoryToTokenStatus,
} from "./standaloneSync";
import { listStandaloneActiveAccounts, updateAdAccountTokenStatus } from "./db";

function reset() {
  store.standalone = [];
  store.updates = [];
  for (const k of Object.keys(categoryByAcct)) delete categoryByAcct[k];
  vi.clearAllMocks();
}

beforeEach(reset);

describe("mapCategoryToTokenStatus", () => {
  it("maps ok → active", () => {
    expect(mapCategoryToTokenStatus("ok")).toBe("active");
  });
  it("maps token_expired → token_expired", () => {
    expect(mapCategoryToTokenStatus("token_expired")).toBe("token_expired");
  });
  it("maps token_invalid → revoked", () => {
    expect(mapCategoryToTokenStatus("token_invalid")).toBe("revoked");
  });
  it("maps account_not_found → revoked", () => {
    expect(mapCategoryToTokenStatus("account_not_found")).toBe("revoked");
  });
  it("maps app_blocked/permission_missing/account_disabled → blocked", () => {
    expect(mapCategoryToTokenStatus("app_blocked")).toBe("blocked");
    expect(mapCategoryToTokenStatus("permission_missing")).toBe("blocked");
    expect(mapCategoryToTokenStatus("account_disabled")).toBe("blocked");
  });
  it("maps transient errors → null (คงสถานะเดิม)", () => {
    expect(mapCategoryToTokenStatus("rate_limit")).toBeNull();
    expect(mapCategoryToTokenStatus("network_error")).toBeNull();
    expect(mapCategoryToTokenStatus("unknown")).toBeNull();
  });
});

describe("syncStandaloneAccounts", () => {
  it("1. token ใช้ได้ → อัปเดตเป็น active", async () => {
    store.standalone = [{ id: 1, accessToken: "tok", adAccountId: "act_ok" }];
    categoryByAcct["act_ok"] = "ok";

    const summary = await syncStandaloneAccounts(0);

    expect(updateAdAccountTokenStatus).toHaveBeenCalledWith(1, "active");
    expect(summary.checked).toBe(1);
    expect(summary.changed).toBe(1);
    expect(summary.skipped).toBe(0);
  });

  it("2. token หมดอายุ → token_expired", async () => {
    store.standalone = [{ id: 2, accessToken: "tok", adAccountId: "act_exp" }];
    categoryByAcct["act_exp"] = "token_expired";

    await syncStandaloneAccounts(0);

    expect(updateAdAccountTokenStatus).toHaveBeenCalledWith(2, "token_expired");
  });

  it("3. ถูกบล็อก → blocked", async () => {
    store.standalone = [
      { id: 3, accessToken: "tok", adAccountId: "act_app_blocked" },
      { id: 4, accessToken: "tok", adAccountId: "act_perm" },
      { id: 5, accessToken: "tok", adAccountId: "act_disabled" },
    ];
    categoryByAcct["act_app_blocked"] = "app_blocked";
    categoryByAcct["act_perm"] = "permission_missing";
    categoryByAcct["act_disabled"] = "account_disabled";

    await syncStandaloneAccounts(0);

    expect(updateAdAccountTokenStatus).toHaveBeenCalledWith(3, "blocked");
    expect(updateAdAccountTokenStatus).toHaveBeenCalledWith(4, "blocked");
    expect(updateAdAccountTokenStatus).toHaveBeenCalledWith(5, "blocked");
  });

  it("4. ถูกเพิกถอน → revoked", async () => {
    store.standalone = [
      { id: 6, accessToken: "tok", adAccountId: "act_invalid" },
      { id: 7, accessToken: "tok", adAccountId: "act_notfound" },
    ];
    categoryByAcct["act_invalid"] = "token_invalid";
    categoryByAcct["act_notfound"] = "account_not_found";

    await syncStandaloneAccounts(0);

    expect(updateAdAccountTokenStatus).toHaveBeenCalledWith(6, "revoked");
    expect(updateAdAccountTokenStatus).toHaveBeenCalledWith(7, "revoked");
  });

  it("6. transient error → คงสถานะเดิม (ไม่เรียก update)", async () => {
    store.standalone = [
      { id: 8, accessToken: "tok", adAccountId: "act_rate" },
      { id: 9, accessToken: "tok", adAccountId: "act_net" },
      { id: 10, accessToken: "tok", adAccountId: "act_unknown" },
    ];
    categoryByAcct["act_rate"] = "rate_limit";
    categoryByAcct["act_net"] = "network_error";
    categoryByAcct["act_unknown"] = "unknown";

    const summary = await syncStandaloneAccounts(0);

    expect(updateAdAccountTokenStatus).not.toHaveBeenCalled();
    expect(summary.checked).toBe(3);
    expect(summary.changed).toBe(0);
    expect(summary.skipped).toBe(3);
  });

  it("7. try/catch ต่อบัญชี — บัญชีหนึ่ง throw ไม่ทำให้ loop ล่ม", async () => {
    store.standalone = [
      { id: 11, accessToken: "tok", adAccountId: "act_throw" },
      { id: 12, accessToken: "tok", adAccountId: "act_ok2" },
    ];
    categoryByAcct["act_throw"] = "THROW";
    categoryByAcct["act_ok2"] = "ok";

    const summary = await syncStandaloneAccounts(0);

    // บัญชีที่ดีต้องยังถูกอัปเดต
    expect(updateAdAccountTokenStatus).toHaveBeenCalledWith(12, "active");
    expect(summary.failed).toBe(1);
    expect(summary.changed).toBe(1);
  });

  it("uses listStandaloneActiveAccounts as the source", async () => {
    store.standalone = [{ id: 13, accessToken: "tok", adAccountId: "act_ok3" }];
    categoryByAcct["act_ok3"] = "ok";

    await syncStandaloneAccounts(0);

    expect(listStandaloneActiveAccounts).toHaveBeenCalledTimes(1);
  });

  it("handles empty account list gracefully", async () => {
    store.standalone = [];
    const summary = await syncStandaloneAccounts(0);
    expect(summary.checked).toBe(0);
    expect(updateAdAccountTokenStatus).not.toHaveBeenCalled();
  });
});

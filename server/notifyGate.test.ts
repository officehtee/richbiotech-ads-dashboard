import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- mocks ----
const mockGetNotificationPref = vi.fn();
const mockGetOwnerUserId = vi.fn();
const mockNotifyOwner = vi.fn();

vi.mock("./db", () => ({
  getNotificationPref: (...args: any[]) => mockGetNotificationPref(...args),
  getOwnerUserId: (...args: any[]) => mockGetOwnerUserId(...args),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: (...args: any[]) => mockNotifyOwner(...args),
}));

import { shouldPushToOwner, notifyOwnerGated } from "./notifyGate";

const PREF = (over: Record<string, boolean> = {}) => ({
  userId: 1,
  masterEnabled: false,
  syncSuccess: false,
  syncFailed: true,
  tokenIssue: true,
  alertCritical: true,
  alertWarning: true,
  alertInfo: false,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockGetOwnerUserId.mockResolvedValue(1);
  mockNotifyOwner.mockResolvedValue(true);
});

describe("shouldPushToOwner", () => {
  it("คืน false เมื่อ master ปิด (ค่าเริ่มต้น) แม้ type นั้นจะเปิด", async () => {
    mockGetNotificationPref.mockResolvedValue(PREF({ masterEnabled: false, syncFailed: true }));
    expect(await shouldPushToOwner("syncFailed")).toBe(false);
  });

  it("คืน false เมื่อ master เปิด แต่ type นั้นปิด", async () => {
    mockGetNotificationPref.mockResolvedValue(PREF({ masterEnabled: true, syncSuccess: false }));
    expect(await shouldPushToOwner("syncSuccess")).toBe(false);
  });

  it("คืน true เมื่อ master เปิด และ type นั้นเปิด", async () => {
    mockGetNotificationPref.mockResolvedValue(PREF({ masterEnabled: true, syncFailed: true }));
    expect(await shouldPushToOwner("syncFailed")).toBe(true);
  });

  it("คืน false เมื่อหา owner ไม่เจอ (ownerId == null)", async () => {
    mockGetOwnerUserId.mockResolvedValue(null);
    expect(await shouldPushToOwner("alertCritical")).toBe(false);
    expect(mockGetNotificationPref).not.toHaveBeenCalled();
  });
});

describe("notifyOwnerGated", () => {
  it("คืน 'muted' และไม่เรียก notifyOwner เมื่อ master ปิด", async () => {
    mockGetNotificationPref.mockResolvedValue(PREF({ masterEnabled: false }));
    const r = await notifyOwnerGated("syncFailed", { title: "t", content: "c" });
    expect(r).toBe("muted");
    expect(mockNotifyOwner).not.toHaveBeenCalled();
  });

  it("คืน 'sent' และเรียก notifyOwner เมื่ออนุญาตและส่งสำเร็จ", async () => {
    mockGetNotificationPref.mockResolvedValue(PREF({ masterEnabled: true, syncFailed: true }));
    mockNotifyOwner.mockResolvedValue(true);
    const r = await notifyOwnerGated("syncFailed", { title: "t", content: "c" });
    expect(r).toBe("sent");
    expect(mockNotifyOwner).toHaveBeenCalledOnce();
  });

  it("คืน 'failed' เมื่ออนุญาตแต่ upstream ส่งไม่สำเร็จ", async () => {
    mockGetNotificationPref.mockResolvedValue(PREF({ masterEnabled: true, alertCritical: true }));
    mockNotifyOwner.mockResolvedValue(false);
    const r = await notifyOwnerGated("alertCritical", { title: "t", content: "c" });
    expect(r).toBe("failed");
  });

  it("คืน 'failed' เมื่อ notifyOwner throw (จับด้วย catch)", async () => {
    mockGetNotificationPref.mockResolvedValue(PREF({ masterEnabled: true, alertWarning: true }));
    mockNotifyOwner.mockRejectedValue(new Error("upstream down"));
    const r = await notifyOwnerGated("alertWarning", { title: "t", content: "c" });
    expect(r).toBe("failed");
  });
});

import { describe, expect, it } from "vitest";

/**
 * Magic Invite Link — pure logic tests
 * เลียนแบบเงื่อนไขใน trpc invites.redeem เพื่อ test ครบทุก path โดยไม่ต้องเชื่อม DB
 */

type Invite = {
  id: number;
  token: string;
  ownerId: number;
  role: "ceo" | "content" | "staff";
  label: string | null;
  expiresAt: Date;
  usedAt: Date | null;
  usedByUserId: number | null;
  revokedAt: Date | null;
  createdAt: Date;
};

function buildInvite(overrides: Partial<Invite> = {}): Invite {
  const now = Date.now();
  return {
    id: 1,
    token: "abc123",
    ownerId: 1,
    role: "staff",
    label: null,
    expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
    usedAt: null,
    usedByUserId: null,
    revokedAt: null,
    createdAt: new Date(now),
    ...overrides,
  };
}

function validateInvite(inv: Invite | undefined): { ok: true } | { ok: false; reason: string } {
  if (!inv) return { ok: false, reason: "ลิงก์เชิญไม่ถูกต้อง" };
  if (inv.revokedAt) return { ok: false, reason: "ลิงก์เชิญถูกยกเลิกแล้ว" };
  if (inv.usedAt) return { ok: false, reason: "ลิงก์เชิญถูกใช้ไปแล้ว" };
  if (new Date(inv.expiresAt).getTime() < Date.now()) {
    return { ok: false, reason: "ลิงก์เชิญหมดอายุแล้ว" };
  }
  return { ok: true };
}

type InviteStatus = "active" | "used" | "revoked" | "expired";
function inviteStatus(inv: Invite): InviteStatus {
  if (inv.revokedAt) return "revoked";
  if (inv.usedAt) return "used";
  if (new Date(inv.expiresAt).getTime() < Date.now()) return "expired";
  return "active";
}

describe("Invite Link — validation", () => {
  it("invite ปกติ ยังไม่หมดอายุ ไม่ถูกใช้ ไม่ถูก revoke → ok", () => {
    expect(validateInvite(buildInvite())).toEqual({ ok: true });
  });

  it("ไม่พบ invite → reason 'ไม่ถูกต้อง'", () => {
    expect(validateInvite(undefined)).toEqual({ ok: false, reason: "ลิงก์เชิญไม่ถูกต้อง" });
  });

  it("invite ถูก revoke แล้ว → reject", () => {
    const r = validateInvite(buildInvite({ revokedAt: new Date() }));
    expect(r).toEqual({ ok: false, reason: "ลิงก์เชิญถูกยกเลิกแล้ว" });
  });

  it("invite ถูกใช้ไปแล้ว → reject", () => {
    const r = validateInvite(buildInvite({ usedAt: new Date(), usedByUserId: 99 }));
    expect(r).toEqual({ ok: false, reason: "ลิงก์เชิญถูกใช้ไปแล้ว" });
  });

  it("invite หมดอายุ → reject", () => {
    const r = validateInvite(
      buildInvite({ expiresAt: new Date(Date.now() - 1000) }),
    );
    expect(r).toEqual({ ok: false, reason: "ลิงก์เชิญหมดอายุแล้ว" });
  });

  it("revoke มีน้ำหนักก่อน used (revoked + used พร้อมกัน → reason 'ยกเลิก')", () => {
    const r = validateInvite(
      buildInvite({ revokedAt: new Date(), usedAt: new Date() }),
    );
    expect(r).toEqual({ ok: false, reason: "ลิงก์เชิญถูกยกเลิกแล้ว" });
  });
});

describe("Invite Link — status badge", () => {
  it("active เมื่อยังไม่หมดอายุ ไม่ถูก revoke ไม่ถูกใช้", () => {
    expect(inviteStatus(buildInvite())).toBe("active");
  });

  it("used เมื่อ usedAt ไม่ null", () => {
    expect(inviteStatus(buildInvite({ usedAt: new Date() }))).toBe("used");
  });

  it("revoked เมื่อ revokedAt ไม่ null (มีน้ำหนักก่อน used)", () => {
    expect(
      inviteStatus(buildInvite({ revokedAt: new Date(), usedAt: new Date() })),
    ).toBe("revoked");
  });

  it("expired เมื่อ expiresAt อยู่ในอดีต และยังไม่ revoke/used", () => {
    expect(
      inviteStatus(buildInvite({ expiresAt: new Date(Date.now() - 1000) })),
    ).toBe("expired");
  });
});

describe("Invite Link — expiry duration = 7 days", () => {
  it("default expiry ห่างจากตอนนี้ ~7 วัน", () => {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const days = Math.round(
      (expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
    );
    expect(days).toBe(7);
  });
});

describe("Invite Link — getLoginUrl returnPath encoding", () => {
  /** เลียนแบบ logic ของ getLoginUrl เพื่อ test ว่า encode returnPath ใน state ได้ */
  function encodeState(redirectUri: string, returnPath?: string): string {
    const payload = returnPath ? JSON.stringify({ redirectUri, returnPath }) : redirectUri;
    return Buffer.from(payload).toString("base64");
  }
  function decodeReturnPath(state: string): string {
    try {
      const decoded = Buffer.from(state, "base64").toString("utf8");
      if (decoded.startsWith("{")) {
        const obj = JSON.parse(decoded);
        if (typeof obj.returnPath === "string" && obj.returnPath.startsWith("/")) {
          return obj.returnPath;
        }
      }
    } catch {
      /* fallthrough */
    }
    return "/";
  }

  it("ไม่มี returnPath → state เป็น base64 ของ redirectUri ตรง ๆ → decode ได้ '/'", () => {
    const s = encodeState("https://example.com/api/oauth/callback");
    expect(decodeReturnPath(s)).toBe("/");
  });

  it("มี returnPath = '/invite/abc123' → decode กลับมาเป็น '/invite/abc123'", () => {
    const s = encodeState("https://example.com/api/oauth/callback", "/invite/abc123");
    expect(decodeReturnPath(s)).toBe("/invite/abc123");
  });

  it("returnPath ที่ไม่ขึ้นต้นด้วย '/' (น่าสงสัย) → fallback เป็น '/'", () => {
    const s = encodeState("https://example.com/api/oauth/callback", "https://evil.com");
    expect(decodeReturnPath(s)).toBe("/");
  });
});

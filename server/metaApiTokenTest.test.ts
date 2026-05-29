import { describe, expect, it } from "vitest";
import { classifyMetaError } from "./metaApi";

describe("classifyMetaError — Meta error to Thai mapper", () => {
  it("handles null error as network_error", () => {
    const r = classifyMetaError(null);
    expect(r.category).toBe("network_error");
    expect(r.title).toMatch(/เชื่อมต่อ/);
    expect(r.suggestion).toBeTruthy();
  });

  it("maps code 190 + subcode 463 → token_expired", () => {
    const r = classifyMetaError(
      { code: 190, error_subcode: 463, message: "Session has expired", type: "OAuthException" },
      400,
    );
    expect(r.category).toBe("token_expired");
    expect(r.title).toMatch(/หมดอายุ/);
  });

  it("maps code 190 + subcode 460 → token_invalid (password changed)", () => {
    const r = classifyMetaError(
      { code: 190, error_subcode: 460, message: "The user changed the password", type: "OAuthException" },
      400,
    );
    expect(r.category).toBe("token_invalid");
    expect(r.title).toMatch(/รหัสผ่าน|ใช้ไม่ได้/);
  });

  it("maps generic code 190 → token_invalid", () => {
    const r = classifyMetaError({ code: 190, message: "Invalid OAuth access token" }, 400);
    expect(r.category).toBe("token_invalid");
  });

  it("maps code 200 + 'API access blocked' → app_blocked", () => {
    const r = classifyMetaError(
      {
        code: 200,
        message: "API access blocked.",
        type: "OAuthException",
      },
      400,
    );
    expect(r.category).toBe("app_blocked");
    expect(r.title).toMatch(/บล็อก/);
    expect(r.suggestion).toMatch(/developers\.facebook\.com|Business Verification|App Review/);
  });

  it("maps code 200 (generic) → permission_missing", () => {
    const r = classifyMetaError({ code: 200, message: "Insufficient permission" }, 400);
    expect(r.category).toBe("permission_missing");
  });

  it("maps code 4/17/32/613 → rate_limit", () => {
    for (const code of [4, 17, 32, 613]) {
      const r = classifyMetaError({ code, message: "rate" }, 400);
      expect(r.category, `code ${code}`).toBe("rate_limit");
    }
  });

  it("maps code 100 → account_not_found", () => {
    const r = classifyMetaError({ code: 100, message: "Unsupported get request" }, 400);
    expect(r.category).toBe("account_not_found");
    expect(r.suggestion).toMatch(/act_/);
  });

  it("maps message contains 'disabled' → account_disabled", () => {
    const r = classifyMetaError({ code: 270, message: "Ad account is disabled" }, 400);
    expect(r.category).toBe("account_disabled");
  });

  it("falls back to unknown when nothing matches", () => {
    const r = classifyMetaError({ code: 9999, message: "Strange one" }, 500);
    expect(r.category).toBe("unknown");
    expect(r.title).toContain("500");
  });

  it("always returns Thai-language title/message/suggestion", () => {
    const r = classifyMetaError({ code: 200, message: "API access blocked." }, 400);
    expect(r.title.length).toBeGreaterThan(3);
    expect(r.message.length).toBeGreaterThan(3);
    expect(r.suggestion.length).toBeGreaterThan(3);
  });
});

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..");

describe("Round 7.16 — Pack A: Dead-code removed (BUG-1 + BUG-4)", () => {
  const hub = fs.readFileSync(path.join(root, "client/src/pages/HubDashboard.tsx"), "utf8");

  it("ไม่เหลือ function _LiveActivityHero (dead code) ใน HubDashboard", () => {
    expect(hub).not.toMatch(/function\s+_LiveActivityHero\s*\(/);
  });

  it("ไม่เหลือ function _ConversionFunnel (dead code) ใน HubDashboard", () => {
    expect(hub).not.toMatch(/function\s+_ConversionFunnel\s*\(/);
  });

  it("ไม่มี <p>...<Skeleton .../>...</p> ใน HubDashboard อีกแล้ว (กัน hydration error)", () => {
    // จับ pattern <p ...> ... <Skeleton ... > ... </p> โดยห้ามมี element อื่นคั่นกลาง (</p>, <div, <Card, <ul, <table)
    const re =
      /<p\b[^>]*>(?:(?!<\/p>|<div|<Card|<ul|<ol|<table|<li)[\s\S]){0,400}<Skeleton\b[\s\S]{0,400}?<\/p>/g;
    const matches = hub.match(re);
    expect(matches).toBeNull();
  });
});

describe("Round 7.16 — Pack A: Sparkline guard (BUG-2)", () => {
  const sparkSrc = fs.readFileSync(
    path.join(root, "client/src/pages/PerformanceComparison.tsx"),
    "utf8",
  );

  it("Sparkline early-return เมื่อ data.length < 2 (กัน Recharts width(0) warning)", () => {
    expect(sparkSrc).toMatch(/data\.length\s*<\s*2/);
  });

  it("ResponsiveContainer ใช้ minWidth + minHeight เพื่อกัน 0×0 race", () => {
    expect(sparkSrc).toMatch(/minWidth=\{50\}/);
    expect(sparkSrc).toMatch(/minHeight=\{20\}/);
  });
});

describe("Round 7.16 — Pack B: Brand Polish (BUG-7 + BUG-8)", () => {
  const css = fs.readFileSync(path.join(root, "client/src/index.css"), "utf8");
  const html = fs.readFileSync(path.join(root, "client/index.html"), "utf8");

  it("--primary ถูกเปลี่ยนเป็นโทนสีส้ม (hue ~50) ทั้ง :root และ .dark", () => {
    // :root primary
    expect(css).toMatch(/--primary:\s*oklch\([^)]*\s50\)/);
    // มีอย่างน้อย 2 ครั้ง (root + dark)
    const matches = css.match(/--primary:\s*oklch\([^)]*\s50\)/g);
    expect(matches?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("ไม่มีค่า --primary แบบสีน้ำเงิน royal blue (hue 265) เหลืออยู่", () => {
    expect(css).not.toMatch(/--primary:\s*oklch\([^)]*\s265\)/);
  });

  it("client/index.html มี favicon ชี้ไปที่โลโก้ใน /manus-storage/", () => {
    expect(html).toMatch(/<link rel="icon"[^>]*\/manus-storage\/logo_/);
  });

  it("client/index.html มี OG meta + theme-color ส้ม", () => {
    expect(html).toMatch(/property="og:image"/);
    expect(html).toMatch(/property="og:title"/);
    expect(html).toMatch(/name="theme-color"\s+content="#f97316"/);
  });
});

describe("Round 7.16 — Pack C: Onboarding UX (BUG-5 + BUG-9)", () => {
  const onb = fs.readFileSync(path.join(root, "client/src/pages/Onboarding.tsx"), "utf8");
  const inv = fs.readFileSync(path.join(root, "client/src/pages/InviteRedeem.tsx"), "utf8");

  it("Onboarding แจ้งสถานะ pending ใน toast หลัง joinByCompanyCode", () => {
    expect(onb).toMatch(/Pending Approval|รออนุมัติ|กำหนดสิทธิ์/);
  });

  it("Onboarding ใช้โลโก้ R จริง ไม่ใช่ Sparkles แล้ว", () => {
    expect(onb).not.toMatch(/<Sparkles\s/);
    expect(onb).toMatch(/\/manus-storage\/logo_/);
  });

  it("InviteRedeem มีปุ่ม 'ไม่ใช่ฉัน' (logout + กลับมา invite)", () => {
    expect(inv).toMatch(/ไม่ใช่ฉัน/);
    expect(inv).toMatch(/logoutMutation\s*=\s*trpc\.auth\.logout\.useMutation/);
  });

  it("ปุ่ม 'ไม่ใช่ฉัน' มี disabled={logoutMutation.isPending} กัน double-click", () => {
    expect(inv).toMatch(/disabled=\{logoutMutation\.isPending\}/);
  });
});

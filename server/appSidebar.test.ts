import { describe, expect, it } from "vitest";

/**
 * AppSidebar contract tests
 *
 * AppSidebar เป็น pure presentational component ที่ render ตาม props
 * เทสต์นี้ตรวจ "กฎทอง 3 ข้อ" ที่เขียนไว้ใน docs/prompt-rebuild-sidebar.md:
 *  1. ทุก nav item สูง 36px (h-9)
 *  2. Section header เว้น 1 บรรทัด (36px) จาก menu ก่อนหน้า (ยกเว้นอันแรก)
 *  3. ไม่ใช้ position/transform/margin ติดลบ
 */

import * as fs from "fs";
import * as path from "path";

const SIDEBAR_PATH = path.join(
  __dirname,
  "..",
  "client",
  "src",
  "components",
  "AppSidebar.tsx",
);

function readSidebarSource(): string {
  return fs.readFileSync(SIDEBAR_PATH, "utf8");
}

describe("AppSidebar — กฎทอง 3 ข้อ", () => {
  it("ทุก nav item ใช้ h-9 (36px) เท่ากันเป๊ะ", () => {
    const src = readSidebarSource();
    // ปุ่ม nav item ต้องมี "h-9 w-full"
    expect(src).toMatch(/flex h-9 w-full items-center/);
  });

  it("Section header ใช้ h-5 (20px) — ไม่ใช่ความสูงพิเศษที่ทำให้ทับ", () => {
    const src = readSidebarSource();
    expect(src).toMatch(/h-5 flex items-center .*text-\[11px\]/);
  });

  it("ระหว่าง section มี spacer div h-9 (36px = 1 บรรทัดเต็ม) ยกเว้นอันแรก", () => {
    const src = readSidebarSource();
    expect(src).toMatch(/sectionIndex > 0/);
    expect(src).toMatch(/<div className="h-9 shrink-0"/);
  });

  it("Sidebar ไม่ใช้ shadcn Sidebar/SidebarGroup primitives", () => {
    const src = readSidebarSource();
    expect(src).not.toMatch(/from\s+["']@\/components\/ui\/sidebar["']/);
    expect(src).not.toMatch(/<SidebarGroup/);
    expect(src).not.toMatch(/<SidebarMenu[^B]/);
  });

  it("ไม่ใช้ negative margin บน element ใน sidebar", () => {
    const src = readSidebarSource();
    // ห้ามมี -mt- / -mb- / -ml- / -mr- ที่ class
    expect(src).not.toMatch(/className=["'][^"']*-m[tblr]?-/);
  });

  it("ไม่ใช้ inline style position/transform เพื่อ workaround", () => {
    const src = readSidebarSource();
    // ห้ามมี style={{ position: ... }} หรือ transform: 'none'
    expect(src).not.toMatch(/position:\s*["']static["']/);
    expect(src).not.toMatch(/transform:\s*["']none["']/);
  });

  it("Sidebar ใช้ aria attribute สำหรับ accessibility", () => {
    const src = readSidebarSource();
    expect(src).toMatch(/aria-current=\{isActive \? "page" : undefined\}/);
    expect(src).toMatch(/aria-label="Toggle navigation"/);
  });
});

describe("AppSidebar — Collapsed mode", () => {
  it("ตอน collapsed: ใช้ width 48px (icon-only)", () => {
    const src = readSidebarSource();
    expect(src).toMatch(/collapsed \? 48 :/);
  });

  it("ตอน collapsed: ซ่อน section header แต่ยังคง spacer + ปุ่ม", () => {
    const src = readSidebarSource();
    expect(src).toMatch(/!collapsed && \(/);
    expect(src).toMatch(/title=\{collapsed \? item\.label : undefined\}/);
  });

  it("Resize handle แสดงเฉพาะตอน !collapsed", () => {
    const src = readSidebarSource();
    expect(src).toMatch(/!collapsed && onResizeMouseDown/);
  });
});

describe("AppSidebar — Permanent dark theme + Richbiotech logo", () => {
  it("ใช้ bg-[#0f172a] (slate-900) เป็นพื้นหลัง sidebar ถาวร ไม่ขึ้นกับ theme", () => {
    const src = readSidebarSource();
    expect(src).toMatch(/bg-\[#0f172a\]/);
    expect(src).not.toMatch(/bg-sidebar\b/);
  });

  it("ใช้ text-white เป็นสีตัวอักษรหลัก ไม่ใช้ text-sidebar-foreground", () => {
    const src = readSidebarSource();
    expect(src).toMatch(/text-white\b/);
    expect(src).not.toMatch(/text-sidebar-foreground/);
  });

  it("border ใช้ border-slate-800 (ไม่ใช้ semantic token border)", () => {
    const src = readSidebarSource();
    expect(src).toMatch(/border-slate-800/);
  });

  it("Active item ใช้ bg-white/10 + text-white + ring-white/20", () => {
    const src = readSidebarSource();
    expect(src).toMatch(/bg-white\/10 text-white font-medium ring-1 ring-white\/20/);
  });

  it("Inactive item ใช้ text-slate-300 + hover:bg-white/5", () => {
    const src = readSidebarSource();
    expect(src).toMatch(/text-slate-300 hover:bg-white\/5 hover:text-white/);
  });

  it("ใช้โลโก้ Richbiotech (/manus-storage/logo_329a1fce.png) แทน Sparkles gradient div", () => {
    const src = readSidebarSource();
    expect(src).toMatch(/\/manus-storage\/logo_329a1fce\.png/);
    expect(src).not.toMatch(/from-\[#2563eb\] to-\[#1e40af\]/);
    expect(src).not.toMatch(/<Sparkles/);
  });

  it("ไม่ import Sparkles อีก (ใช้ <img> แทน)", () => {
    const src = readSidebarSource();
    expect(src).not.toMatch(/Sparkles/);
  });
});

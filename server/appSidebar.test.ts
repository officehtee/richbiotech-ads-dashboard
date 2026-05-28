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

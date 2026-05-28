import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..");

describe("Round 7.17 — KPI Card label ใหญ่ขึ้น (ห้ามใหญ่กว่าตัวเลขหลัก)", () => {
  const src = fs.readFileSync(path.join(root, "client/src/components/KpiCard.tsx"), "utf8");

  it("label ใช้ขนาด 14px font-bold (จากเดิม 11px)", () => {
    expect(src).toMatch(/text-\[14px\]\s+font-bold[^"]*uppercase[^"]*truncate/);
  });

  it("ตัวเลขหลัก (big number) ใช้ text-3xl เพื่อยังใหญ่กว่า label", () => {
    expect(src).toMatch(/text-3xl\s+font-bold/);
  });

  it("Sparkline ลดความสูงเป็น h-7 (จาก h-10) เพื่อให้พอที่กับ label ใหญ่", () => {
    expect(src).toMatch(/className="h-7 w-full"/);
    expect(src).toMatch(/SparklineCompact/);
  });
});

describe("Round 7.17 — GroupBreakdown แสดงตัวเลขจริงต่อกลุ่ม", () => {
  const src = fs.readFileSync(path.join(root, "client/src/pages/HubDashboard.tsx"), "utf8");

  it("ชื่อการ์ด 'แยกตามกลุ่มสินค้า' ใช้ text-lg font-bold (ใหญ่ขึ้นจาก text-base)", () => {
    expect(src).toMatch(/text-lg font-bold[^>]*>\s*<ShoppingCart[\s\S]*?แยกตามกลุ่มสินค้า/);
  });

  it("แต่ละกลุ่มแสดง value (Spend/ROAS) เป็นตัวเลขชัดเจน text-foreground (ไม่ใช่ text-white)", () => {
    expect(src).toMatch(/text-base font-bold text-foreground tabular-nums/);
    // ต้องไม่มี text-white บน value แล้ว
    const valSpan = src.match(/<span className="num text-base font-bold[^"]*">\{value\}/);
    expect(valSpan).not.toBeNull();
  });

  it("แสดงเปอร์เซ็นต์ในวงเล็บข้างตัวเลข (เช่น 'B1,396 (48.3%)')", () => {
    expect(src).toMatch(/\(\{pct\.toFixed\(1\)\}%\)/);
  });

  it("มี subValue (sub-line) แสดงข้อมูลเสริม — ROAS ตอนเลือก Spend หรือใช้จ่ายตอนเลือก ROAS", () => {
    expect(src).toMatch(/const subValue\s*=/);
    expect(src).toMatch(/`ROAS \$\{formatRoas\(g\.roas\)\}x`/);
    expect(src).toMatch(/\{subValue\}/);
  });
});

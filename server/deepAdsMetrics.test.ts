import { describe, it, expect } from "vitest";
import {
  computeDeepAdsDerived,
  manualCellBorderStyle,
} from "./deepAdsMetrics";

describe("computeDeepAdsDerived — Orders/ยอดขาย/ROAS จาก Meta", () => {
  it("คำนวณ roas = salesAmount/spend จากค่า Meta", () => {
    const d = computeDeepAdsDerived({
      spend: 100,
      messages: 10,
      clicks: 50,
      metaOrders: 4,
      metaSalesAmount: 250,
    });
    expect(d.orders).toBe(4);
    expect(d.salesAmount).toBe(250);
    expect(d.roas).toBeCloseTo(2.5, 5);
    expect(d.costPerOrder).toBeCloseTo(25, 5);
    expect(d.chatToOrderRate).toBeCloseTo(40, 5);
    expect(d.adsSpendPct).toBeCloseTo(40, 5);
  });

  it("roas เป็น null เมื่อไม่มียอดขายจาก Meta", () => {
    const d = computeDeepAdsDerived({
      spend: 100,
      messages: 5,
      clicks: 20,
      metaOrders: 0,
      metaSalesAmount: 0,
    });
    expect(d.roas).toBeNull();
    expect(d.costPerOrder).toBeNull();
    expect(d.adsSpendPct).toBeNull();
    expect(d.chatToOrderRate).toBe(0);
  });

  it("roas เป็น null เมื่อ spend = 0 (กัน div-by-zero)", () => {
    const d = computeDeepAdsDerived({
      spend: 0,
      messages: 0,
      clicks: 0,
      metaOrders: 2,
      metaSalesAmount: 100,
    });
    expect(d.roas).toBeNull();
    expect(d.costPerOrder).toBeCloseTo(0, 5); // spend 0 / orders 2 = 0
    expect(d.costPerClick).toBeNull();
    expect(d.costPerMessage).toBeNull();
  });

  it("จัดการ null/undefined อย่างปลอดภัย (ถือเป็น 0)", () => {
    const d = computeDeepAdsDerived({
      spend: null,
      messages: undefined,
      clicks: null,
      metaOrders: null,
      metaSalesAmount: undefined,
    });
    expect(d.orders).toBe(0);
    expect(d.salesAmount).toBe(0);
    expect(d.roas).toBeNull();
    expect(d.costPerOrder).toBeNull();
    expect(d.chatToOrderRate).toBeNull();
  });

  it("costPerClick / costPerMessage คำนวณถูกต้อง", () => {
    const d = computeDeepAdsDerived({
      spend: 200,
      messages: 8,
      clicks: 40,
      metaOrders: 5,
      metaSalesAmount: 500,
    });
    expect(d.costPerClick).toBeCloseTo(5, 5);
    expect(d.costPerMessage).toBeCloseTo(25, 5);
  });
});

describe("Round 7.36 — costPerMessage/roas ใช้ค่า Meta โดยตรง", () => {
  it("costPerMessage ใช้ metaCostPerMessage (cost_per_action_type) แทนการคำนวณ spend/messages", () => {
    const d = computeDeepAdsDerived({
      spend: 200,
      messages: 8, // ถ้าคำนวณเองจะได้ 25
      clicks: 40,
      metaOrders: 5,
      metaSalesAmount: 500,
      metaCostPerMessage: 33.5, // แต่ Meta ส่งมา 33.5 → ต้องใช้ตัวนี้
    });
    expect(d.costPerMessage).toBeCloseTo(33.5, 5);
  });

  it("roas ใช้ metaPurchaseRoas (purchase_roas) แทน salesAmount/spend", () => {
    const d = computeDeepAdsDerived({
      spend: 100,
      messages: 10,
      clicks: 50,
      metaOrders: 4,
      metaSalesAmount: 250, // คำนวณเองจะได้ 2.5
      metaPurchaseRoas: 0.61, // แต่ Meta ส่งมา 0.61 → ต้องใช้ตัวนี้
    });
    expect(d.roas).toBeCloseTo(0.61, 5);
  });

  it("fallback ไปคำนวณเองเมื่อ Meta ไม่ส่งค่า (null/0)", () => {
    const d = computeDeepAdsDerived({
      spend: 200,
      messages: 8,
      clicks: 40,
      metaOrders: 5,
      metaSalesAmount: 500,
      metaCostPerMessage: null,
      metaPurchaseRoas: 0,
    });
    expect(d.costPerMessage).toBeCloseTo(25, 5); // spend/messages
    expect(d.roas).toBeCloseTo(2.5, 5); // salesAmount/spend
  });
});

describe("manualCellBorderStyle — เส้นประ/เส้นทึบ", () => {
  it("มีค่าตัวเลข → solid", () => {
    expect(manualCellBorderStyle(100)).toBe("solid");
    expect(manualCellBorderStyle(0)).toBe("solid"); // 0 ถือว่ากรอกแล้ว
  });
  it("มีข้อความ → solid", () => {
    expect(manualCellBorderStyle("ทดสอบสเกล")).toBe("solid");
  });
  it("null / undefined → dashed", () => {
    expect(manualCellBorderStyle(null)).toBe("dashed");
    expect(manualCellBorderStyle(undefined)).toBe("dashed");
  });
  it("string ว่าง / เว้นวรรค → dashed", () => {
    expect(manualCellBorderStyle("")).toBe("dashed");
    expect(manualCellBorderStyle("   ")).toBe("dashed");
  });
});

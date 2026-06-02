/**
 * Pure helpers สำหรับคำนวณ derived metrics ของหน้า "วิเคราะห์แอดเชิงลึก"
 * Orders / ยอดขาย / ROAS ดึงจาก Meta อัตโนมัติ (metaOrders / metaSalesAmount)
 * แยกออกมาเป็น pure functions เพื่อให้ test ได้ง่าย (Round 7.34)
 */

export interface DeepAdsRawMetrics {
  spend: number | null | undefined;
  messages: number | null | undefined;
  clicks: number | null | undefined;
  metaOrders: number | null | undefined;
  metaSalesAmount: number | null | undefined;
}

export interface DeepAdsDerived {
  orders: number;
  salesAmount: number;
  costPerOrder: number | null;
  costPerClick: number | null;
  costPerMessage: number | null;
  chatToOrderRate: number | null;
  roas: number | null;
  adsSpendPct: number | null;
}

/**
 * คำนวณ derived metrics จากค่าดิบ (ค่าจาก Meta + spend/messages/clicks)
 * - orders, salesAmount มาจาก Meta (metaOrders / metaSalesAmount)
 * - roas = salesAmount / spend (เฉพาะเมื่อ spend>0 และ salesAmount>0)
 * - costPerOrder = spend / orders
 * - chatToOrderRate = orders / messages * 100
 * - adsSpendPct = spend / salesAmount * 100
 */
export function computeDeepAdsDerived(r: DeepAdsRawMetrics): DeepAdsDerived {
  const spend = r.spend ?? 0;
  const messages = r.messages ?? 0;
  const clicks = r.clicks ?? 0;
  const orders = r.metaOrders ?? 0;
  const salesAmount = r.metaSalesAmount ?? 0;
  return {
    orders,
    salesAmount,
    costPerOrder: orders > 0 ? spend / orders : null,
    costPerClick: clicks > 0 ? spend / clicks : null,
    costPerMessage: messages > 0 ? spend / messages : null,
    chatToOrderRate: messages > 0 ? (orders / messages) * 100 : null,
    roas: spend > 0 && salesAmount > 0 ? salesAmount / spend : null,
    adsSpendPct: salesAmount > 0 ? (spend / salesAmount) * 100 : null,
  };
}

/**
 * ตัดสินสไตล์กรอบของช่องกรอกมือ:
 * - มีค่าแล้ว → "solid" (เส้นทึบ)
 * - ว่าง (null/undefined/"") → "dashed" (เส้นประ)
 */
export function manualCellBorderStyle(
  value: number | string | null | undefined,
): "solid" | "dashed" {
  if (value == null) return "dashed";
  if (typeof value === "string" && value.trim() === "") return "dashed";
  return "solid";
}

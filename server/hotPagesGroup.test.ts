import { describe, expect, it } from "vitest";

/**
 * Hot Pages — รวมเพจซ้ำ (เพจเดียวกัน ยิงผ่านหลายบัญชี = 1 แถว)
 *
 * เลียนแบบ logic ใน getHubHotPages เพื่อ test ความถูกต้อง
 * โดยไม่ต้องเชื่อม Meta API
 */

type AccountSnapshot = {
  accountId: number;
  adAccountId: string;
  pageName: string;
  nickname: string | null;
  messagingToday: number;
  baseline: number;
};

type HotPageRow = {
  accountId: number;
  adAccountId: string;
  pageName: string;
  nickname: string | null;
  messagingToday: number;
  messagingBaseline: number;
  deltaPct: number;
  accountCount: number;
};

function groupHotPages(perAccount: AccountSnapshot[]): HotPageRow[] {
  type Bucket = {
    pageName: string;
    accountId: number;
    adAccountId: string;
    nicknames: string[];
    messagingToday: number;
    messagingBaseline: number;
    accountCount: number;
  };
  const byPage = new Map<string, Bucket>();
  for (const p of perAccount) {
    const key = p.pageName;
    const cur = byPage.get(key);
    if (!cur) {
      byPage.set(key, {
        pageName: p.pageName,
        accountId: p.accountId,
        adAccountId: p.adAccountId,
        nicknames: p.nickname ? [p.nickname] : [],
        messagingToday: p.messagingToday,
        messagingBaseline: p.baseline,
        accountCount: 1,
      });
    } else {
      cur.messagingToday += p.messagingToday;
      cur.messagingBaseline += p.baseline;
      cur.accountCount += 1;
      if (p.nickname && !cur.nicknames.includes(p.nickname)) cur.nicknames.push(p.nickname);
    }
  }
  return Array.from(byPage.values())
    .map((b) => ({
      accountId: b.accountId,
      adAccountId: b.adAccountId,
      pageName: b.pageName,
      nickname:
        b.accountCount > 1
          ? `${b.accountCount} บัญชี${b.nicknames.length > 0 ? " • " + b.nicknames.join(", ") : ""}`
          : b.nicknames[0] ?? null,
      messagingToday: b.messagingToday,
      messagingBaseline: b.messagingBaseline,
      deltaPct:
        b.messagingBaseline > 0
          ? ((b.messagingToday - b.messagingBaseline) / b.messagingBaseline) * 100
          : 0,
      accountCount: b.accountCount,
    }))
    .sort((a, b) => b.messagingToday - a.messagingToday)
    .slice(0, 5);
}

describe("Hot Pages — รวมเพจซ้ำ", () => {
  it("เพจเดียวกัน ยิงผ่าน 3 บัญชี → 1 แถว + รวมยอดทัก", () => {
    const rows = groupHotPages([
      { accountId: 1, adAccountId: "act_1", pageName: "ISURE PLUS", nickname: "Wonder Pearl", messagingToday: 0, baseline: 5 },
      { accountId: 2, adAccountId: "act_2", pageName: "ISURE PLUS", nickname: "Dilip Sonune", messagingToday: 4, baseline: 8 },
      { accountId: 3, adAccountId: "act_3", pageName: "ISURE PLUS", nickname: "Patthadon Phayaknet", messagingToday: 0, baseline: 6 },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].pageName).toBe("ISURE PLUS");
    expect(rows[0].messagingToday).toBe(4);
    expect(rows[0].messagingBaseline).toBe(19);
    expect(rows[0].accountCount).toBe(3);
  });

  it("เพจเดียวกัน หลายบัญชี → nickname แสดง 'N บัญชี • ชื่อเล่น'", () => {
    const rows = groupHotPages([
      { accountId: 1, adAccountId: "act_1", pageName: "ISURE PLUS", nickname: "Wonder Pearl", messagingToday: 0, baseline: 5 },
      { accountId: 2, adAccountId: "act_2", pageName: "ISURE PLUS", nickname: "Dilip Sonune", messagingToday: 4, baseline: 8 },
    ]);
    expect(rows[0].nickname).toContain("2 บัญชี");
    expect(rows[0].nickname).toContain("Wonder Pearl");
    expect(rows[0].nickname).toContain("Dilip Sonune");
  });

  it("เพจเดียว 1 บัญชี → nickname ใช้ของบัญชีนั้นตามเดิม", () => {
    const rows = groupHotPages([
      { accountId: 1, adAccountId: "act_1", pageName: "เจ้าขุน ฟิตพลังชาย", nickname: "Boatna Chatx", messagingToday: 18, baseline: 38 },
    ]);
    expect(rows[0].nickname).toBe("Boatna Chatx");
    expect(rows[0].accountCount).toBe(1);
  });

  it("หลายเพจที่ต่างกัน → ไม่ถูกรวม + เรียงตามยอดทัก desc", () => {
    const rows = groupHotPages([
      { accountId: 1, adAccountId: "act_1", pageName: "ISURE PLUS", nickname: "A", messagingToday: 4, baseline: 8 },
      { accountId: 2, adAccountId: "act_2", pageName: "เจ้าขุน", nickname: "B", messagingToday: 18, baseline: 38 },
      { accountId: 3, adAccountId: "act_3", pageName: "Other", nickname: "C", messagingToday: 1, baseline: 1 },
    ]);
    expect(rows.map((r) => r.pageName)).toEqual(["เจ้าขุน", "ISURE PLUS", "Other"]);
  });

  it("baseline = 0 → deltaPct = 0 ไม่ NaN/Infinity", () => {
    const rows = groupHotPages([
      { accountId: 1, adAccountId: "act_1", pageName: "ISURE PLUS", nickname: null, messagingToday: 4, baseline: 0 },
      { accountId: 2, adAccountId: "act_2", pageName: "ISURE PLUS", nickname: null, messagingToday: 0, baseline: 0 },
    ]);
    expect(rows[0].deltaPct).toBe(0);
    expect(Number.isFinite(rows[0].deltaPct)).toBe(true);
  });

  it("deltaPct คำนวณจาก messagingToday/baseline หลังรวมแล้ว", () => {
    const rows = groupHotPages([
      { accountId: 1, adAccountId: "act_1", pageName: "ISURE PLUS", nickname: null, messagingToday: 10, baseline: 10 },
      { accountId: 2, adAccountId: "act_2", pageName: "ISURE PLUS", nickname: null, messagingToday: 10, baseline: 10 },
    ]);
    // today=20, baseline=20 → 0%
    expect(rows[0].messagingToday).toBe(20);
    expect(rows[0].messagingBaseline).toBe(20);
    expect(rows[0].deltaPct).toBe(0);
  });

  it("จำกัด Top 5 — ถ้ามี 7 เพจ ส่งกลับ 5", () => {
    const input: AccountSnapshot[] = Array.from({ length: 7 }).map((_, i) => ({
      accountId: i + 1,
      adAccountId: `act_${i}`,
      pageName: `Page ${i}`,
      nickname: null,
      messagingToday: 10 - i,
      baseline: 5,
    }));
    const rows = groupHotPages(input);
    expect(rows).toHaveLength(5);
  });
});

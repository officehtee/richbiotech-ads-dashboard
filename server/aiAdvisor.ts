/**
 * AI Advisor (Round 3) — One-click expert recommendations.
 *
 * Five expert personas (no Audience Specialist):
 *   - performance_analyst
 *   - budget_optimizer
 *   - creative_strategist
 *   - risk_compliance
 *   - sales_conversion
 *
 * Scopes:
 *   - "workspace": all accounts in tenant
 *   - "account":   one ad account
 *   - "group":     one product group
 *
 * The router does NOT persist history per requirements (one-click, ephemeral).
 */
import { z } from "zod";
import type { AccountKpi, GroupKpi, AdsetRow, DateRangeInput } from "../shared/types";
import { invokeLLM } from "./_core/llm";
import {
  getAccountsKpi,
  getAdsetRows,
  getGroupsKpi,
} from "./aggregator";
import { protectedProcedure, router } from "./_core/trpc";
import { resolveWorkspaceUserId } from "./db";

export const EXPERT_ROLES = [
  "performance_analyst",
  "budget_optimizer",
  "creative_strategist",
  "risk_compliance",
  "sales_conversion",
] as const;
export type ExpertRole = (typeof EXPERT_ROLES)[number];

export const EXPERT_META: Record<
  ExpertRole,
  { label: string; emoji: string; tagline: string }
> = {
  performance_analyst: {
    label: "Performance Analyst",
    emoji: "📊",
    tagline: "วิเคราะห์ ROAS / CTR / Cost-per-Order รวบยอดสุขภาพแคมเปญ",
  },
  budget_optimizer: {
    label: "Budget Optimization Strategist",
    emoji: "💰",
    tagline: "แนะนำเพิ่ม/ลดงบรายตัวให้คุ้มสุด",
  },
  creative_strategist: {
    label: "Creative Strategist",
    emoji: "🎨",
    tagline: "อ่านชื่อแอด + metric เพื่อหา winning creative angle",
  },
  risk_compliance: {
    label: "Risk & Compliance Officer",
    emoji: "🛡️",
    tagline: "เตือนความเสี่ยง: ROAS ต่ำ, Spend สูงผิดปกติ, Cost-per-Msg พุ่ง",
  },
  sales_conversion: {
    label: "Sales Conversion Analyst",
    emoji: "🛒",
    tagline: "วิเคราะห์ funnel จากคนทัก → คนซื้อ ดูจุดรั่ว",
  },
};

const SYSTEM_PROMPTS: Record<ExpertRole, string> = {
  performance_analyst: `คุณคือ Performance Analyst สำหรับเอเจนซีโฆษณา Facebook Ads ภาษาไทย
จุดเน้น:
- วิเคราะห์ ROAS, CTR, Cost-per-Order, Cost-per-Msg ของแคมเปญ
- เปรียบเทียบกับเป้า (roasTarget) ของแต่ละบัญชี/กลุ่ม
- ระบุรายการที่ "เกินเป้า" และ "ต่ำกว่าเป้า" อย่างชัดเจน
- ให้ insight สั้น คม ใช้ bullet + heading markdown
- หลีกเลี่ยงคำว่า "อาจ", "น่าจะ" — ใช้ตัวเลขจริงทุกข้อ`,

  budget_optimizer: `คุณคือ Budget Optimization Strategist ภาษาไทย
จุดเน้น:
- แนะนำ "ตัวไหนเพิ่มงบ / ตัวไหนลดงบ / ตัวไหนปิด" จากข้อมูล ROAS + CTR + Spend
- ระบุเปอร์เซ็นต์ที่ควรปรับ (เช่น +20%, -30%)
- จัดอันดับลำดับความสำคัญที่ต้องทำก่อน
- ใช้ markdown bullet + heading
- เริ่มต้นด้วยสรุป 1 บรรทัด แล้วลงรายละเอียดเป็นตาราง markdown ถ้าเหมาะ`,

  creative_strategist: `คุณคือ Creative Strategist ภาษาไทย
จุดเน้น:
- อ่าน "ชื่อแอด/adsetName/campaignName" ร่วมกับ metric เพื่อจับ pattern ของ winning creative
- เช่น "ชื่อแอดที่มีคำว่า X มัก CTR สูง" / "มุมโฆษณาแบบ Y มี ROAS ดี"
- ห้ามวิเคราะห์รูป (ระบบไม่มีรูปให้ดู) — ใช้แค่ชื่อ + ตัวเลข
- เสนอ "creative angle ใหม่ที่ควรลอง" 2-3 ไอเดีย
- ใช้ markdown heading + bullet`,

  risk_compliance: `คุณคือ Risk & Compliance Officer ภาษาไทย
จุดเน้น:
- ระบุความเสี่ยง: ROAS ต่ำกว่า 1, Cost-per-Msg พุ่งผิดปกติ, Spend สูงแต่ purchase = 0
- เตือนแคมเปญที่ "ควรหยุดทันที"
- หลีกเลี่ยงคำว่า "อาจ" ใช้ "ควร" หรือ "ต้อง" พร้อมเหตุผลตัวเลข
- ใช้ markdown bullet พร้อม emoji ⚠️ 🛑 สำหรับระดับความรุนแรง`,

  sales_conversion: `คุณคือ Sales Conversion Analyst ภาษาไทย
จุดเน้น:
- วิเคราะห์ funnel: Impressions → Clicks → Messaging → Purchases
- คำนวณอัตราการแปลงระหว่างแต่ละขั้น
- ระบุจุดรั่วของ funnel
- ให้คำแนะนำเชิงปฏิบัติ เช่น "ปรับคำตอบแอดมิน", "ปรับ CTA"
- ใช้ markdown heading + bullet`,
};

function summarizeAccountKpi(a: AccountKpi): string {
  return [
    `บัญชี "${a.nickname ?? a.adAccountId}" (เป้า ROAS ${a.roasTarget.toFixed(2)}):`,
    `  Spend ฿${a.spend.toFixed(0)} | Revenue ฿${a.purchaseValue.toFixed(0)} | ROAS ${a.roas.toFixed(2)}`,
    `  ทัก ${a.messaging} | Orders ${a.purchases} | CTR ${a.ctr.toFixed(2)}%`,
    `  Cost/Msg ฿${a.costPerMessage.toFixed(2)} | Cost/Order ฿${a.costPerPurchase.toFixed(2)}`,
  ].join("\n");
}

function summarizeGroupKpi(g: GroupKpi): string {
  return [
    `กลุ่ม "${g.groupName}" (${g.accountCount} บัญชี, เป้า ROAS ${g.roasTarget.toFixed(2)}, threshold ${g.roasThreshold.toFixed(2)}):`,
    `  Spend ฿${g.spend.toFixed(0)} | Revenue ฿${g.purchaseValue.toFixed(0)} | ROAS ${g.roas.toFixed(2)}`,
    `  ทัก ${g.messaging} | Orders ${g.purchases} | CTR ${g.ctr.toFixed(2)}%`,
  ].join("\n");
}

function summarizeAdsetRow(a: AdsetRow): string {
  return [
    `  - [${a.adAccountId}] "${a.adsetName}" (แคมเปญ: ${a.campaignName})`,
    `    Spend ฿${a.spend.toFixed(0)} | ROAS ${a.roas.toFixed(2)} | CTR ${a.ctr.toFixed(2)}% | ทัก ${a.messaging} | Orders ${a.purchases}`,
  ].join("\n");
}

async function buildContext(
  tenantId: number,
  scope: ScopeInput,
  dateRange: DateRangeInput,
  includeAdsets: boolean,
): Promise<string> {
  const lines: string[] = [];
  if (scope.type === "account") {
    const accounts = await getAccountsKpi(tenantId, dateRange, [scope.accountId]);
    accounts.forEach((a) => lines.push(summarizeAccountKpi(a)));
    if (includeAdsets) {
      const ads = await getAdsetRows(tenantId, dateRange, [scope.accountId]);
      lines.push(`\n--- Adsets (${ads.length} รายการ) ---`);
      ads.slice(0, 40).forEach((a) => lines.push(summarizeAdsetRow(a)));
    }
  } else if (scope.type === "group") {
    const groups = await getGroupsKpi(tenantId, dateRange);
    const g = groups.find((x) => x.groupId === scope.groupId);
    if (g) lines.push(summarizeGroupKpi(g));
  } else {
    // workspace
    const groups = await getGroupsKpi(tenantId, dateRange);
    const accounts = await getAccountsKpi(tenantId, dateRange);
    lines.push("--- ภาพรวมกลุ่มสินค้า ---");
    groups.forEach((g) => lines.push(summarizeGroupKpi(g)));
    lines.push("\n--- ภาพรวมรายบัญชี ---");
    accounts.forEach((a) => lines.push(summarizeAccountKpi(a)));
    if (includeAdsets) {
      const ads = await getAdsetRows(tenantId, dateRange);
      lines.push(`\n--- Adset Top 30 by Spend ---`);
      ads
        .sort((x, y) => y.spend - x.spend)
        .slice(0, 30)
        .forEach((a) => lines.push(summarizeAdsetRow(a)));
    }
  }
  return lines.join("\n");
}

type ScopeInput =
  | { type: "workspace" }
  | { type: "account"; accountId: number }
  | { type: "group"; groupId: number };

const dateRangeInput = z.object({
  preset: z.enum(["today", "yesterday", "3d", "7d", "14d", "30d", "custom"]),
  since: z.string().optional(),
  until: z.string().optional(),
});

const scopeSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("workspace") }),
  z.object({ type: z.literal("account"), accountId: z.number() }),
  z.object({ type: z.literal("group"), groupId: z.number() }),
]);

export const aiRouter = router({
  /**
   * List the available expert personas + metadata for the UI.
   */
  experts: protectedProcedure.query(() =>
    EXPERT_ROLES.map((role) => ({ key: role, ...EXPERT_META[role] })),
  ),

  /**
   * One-click expert analysis. Returns a markdown string for the UI to render.
   */
  analyze: protectedProcedure
    .input(
      z.object({
        expert: z.enum(EXPERT_ROLES),
        scope: scopeSchema,
        dateRange: dateRangeInput,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tid = await resolveWorkspaceUserId(ctx.user.id, ctx.user.role, ctx.user.ownerId);
      const includeAdsets =
        input.expert === "creative_strategist" ||
        input.expert === "budget_optimizer" ||
        input.expert === "risk_compliance";

      const context = await buildContext(tid, input.scope, input.dateRange, includeAdsets);
      const system = SYSTEM_PROMPTS[input.expert];

      const userPrompt = [
        `กรุณาวิเคราะห์ข้อมูลด้านล่างนี้ (ช่วงเวลา: ${describeRange(input.dateRange)}):`,
        "",
        context || "(ไม่มีข้อมูลในช่วงเวลานี้)",
        "",
        "ตอบเป็นภาษาไทย ใช้ markdown มี heading + bullet ให้กระชับและนำไปใช้งานได้จริง",
      ].join("\n");

      const result = await invokeLLM({
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
      });
      const content = result.choices?.[0]?.message?.content;
      const text =
        typeof content === "string"
          ? content
          : Array.isArray(content)
            ? content
                .filter((c: any) => c.type === "text")
                .map((c: any) => c.text)
                .join("\n")
            : "";
      return {
        markdown: text || "_(ไม่สามารถสร้างคำแนะนำได้ในขณะนี้)_",
        expert: input.expert,
        scope: input.scope,
      };
    }),
});

function describeRange(r: DateRangeInput): string {
  if (r.preset === "custom" && r.since && r.until) return `${r.since} → ${r.until}`;
  if (r.preset === "today") return "วันนี้";
  if (r.preset === "yesterday") return "เมื่อวาน";
  return `${r.preset} ล่าสุด`;
}

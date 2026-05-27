import { describe, expect, it } from "vitest";
import { EXPERT_META, EXPERT_ROLES } from "./aiAdvisor";

describe("AI Advisor expert registry", () => {
  it("exposes exactly 5 expert roles (no Audience Specialist)", () => {
    expect(EXPERT_ROLES).toHaveLength(5);
  });

  it("includes the required experts from PRD §5.1d (Risk & Compliance = all)", () => {
    expect(EXPERT_ROLES).toEqual(
      expect.arrayContaining([
        "performance_analyst",
        "budget_optimizer",
        "creative_strategist",
        "risk_compliance",
        "sales_conversion",
      ]),
    );
  });

  it("does NOT include audience_specialist", () => {
    expect(EXPERT_ROLES).not.toContain("audience_specialist" as any);
  });

  it("provides label/emoji/tagline for every role", () => {
    EXPERT_ROLES.forEach((role) => {
      const meta = EXPERT_META[role];
      expect(meta).toBeDefined();
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.emoji.length).toBeGreaterThan(0);
      expect(meta.tagline.length).toBeGreaterThan(0);
    });
  });

  it("creative_strategist tagline references metric/ad name only (5.2a)", () => {
    // PRD 5.2 = (a) "ชื่อแอด + metric อย่างเดียว" — do simple keyword check
    const tagline = EXPERT_META.creative_strategist.tagline;
    expect(tagline).toMatch(/ชื่อแอด|metric/);
  });
});

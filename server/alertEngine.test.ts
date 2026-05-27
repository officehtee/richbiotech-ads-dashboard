import { describe, expect, it } from "vitest";
import { DEFAULT_RULES, evaluateRule, EvaluationContext } from "./alertEngine";

const baseCtx: EvaluationContext = {
  accountId: 1,
  accountName: "Test Account",
  spend: 1000,
  purchases: 5,
  roas: 2.5,
  costPerMessage: 20,
  ctr: 1.5,
  ctrPrev: 2.0,
  spendAvg7: 500,
};

describe("alertEngine.evaluateRule", () => {
  // -- ROAS below --
  it("roas_below triggers when ROAS < threshold", () => {
    const r = evaluateRule(
      { ruleType: "roas_below", label: "" },
      { thresholdRoas: 3 },
      { ...baseCtx, roas: 1.2 },
    );
    expect(r.triggered).toBe(true);
    expect(r.title).toMatch(/ROAS/);
  });
  it("roas_below does NOT trigger when spend is 0 (no data)", () => {
    const r = evaluateRule(
      { ruleType: "roas_below", label: "" },
      { thresholdRoas: 3 },
      { ...baseCtx, spend: 0, roas: 0 },
    );
    expect(r.triggered).toBe(false);
  });

  // -- Spend no purchase --
  it("spend_no_purchase triggers when spend >= min AND purchases == 0", () => {
    const r = evaluateRule(
      { ruleType: "spend_no_purchase", label: "" },
      { minSpend: 500 },
      { ...baseCtx, spend: 800, purchases: 0 },
    );
    expect(r.triggered).toBe(true);
  });
  it("spend_no_purchase does NOT trigger when purchases > 0", () => {
    const r = evaluateRule(
      { ruleType: "spend_no_purchase", label: "" },
      { minSpend: 500 },
      { ...baseCtx, spend: 800, purchases: 1 },
    );
    expect(r.triggered).toBe(false);
  });

  // -- Cost per message --
  it("cost_per_msg_above triggers when above threshold", () => {
    const r = evaluateRule(
      { ruleType: "cost_per_msg_above", label: "" },
      { thresholdCost: 50 },
      { ...baseCtx, costPerMessage: 75 },
    );
    expect(r.triggered).toBe(true);
  });

  // -- CTR drop --
  it("ctr_drop_pct triggers when CTR drops ≥ threshold %", () => {
    const r = evaluateRule(
      { ruleType: "ctr_drop_pct", label: "" },
      { dropPercent: 30 },
      { ...baseCtx, ctr: 1.0, ctrPrev: 2.0 }, // -50%
    );
    expect(r.triggered).toBe(true);
  });
  it("ctr_drop_pct does NOT trigger on small drop", () => {
    const r = evaluateRule(
      { ruleType: "ctr_drop_pct", label: "" },
      { dropPercent: 30 },
      { ...baseCtx, ctr: 1.9, ctrPrev: 2.0 }, // -5%
    );
    expect(r.triggered).toBe(false);
  });
  it("ctr_drop_pct skips when ctrPrev missing", () => {
    const r = evaluateRule(
      { ruleType: "ctr_drop_pct", label: "" },
      { dropPercent: 30 },
      { ...baseCtx, ctrPrev: undefined },
    );
    expect(r.triggered).toBe(false);
  });

  // -- Spend spike --
  it("spend_spike_pct triggers when spend spikes ≥ threshold %", () => {
    const r = evaluateRule(
      { ruleType: "spend_spike_pct", label: "" },
      { spikePercent: 50 },
      { ...baseCtx, spend: 1000, spendAvg7: 500 }, // +100%
    );
    expect(r.triggered).toBe(true);
  });

  it("dedupeKey includes accountId + ruleType for stable de-duplication", () => {
    const r = evaluateRule(
      { ruleType: "roas_below", label: "" },
      { thresholdRoas: 3 },
      { ...baseCtx, roas: 1, accountId: 42 },
    );
    expect(r.dedupeKey).toBe("roas_below:42");
  });
});

describe("alertEngine.DEFAULT_RULES", () => {
  it("includes all 5 default rule types (PRD 3.1)", () => {
    const types = DEFAULT_RULES.map((r) => r.ruleType);
    expect(types).toEqual(
      expect.arrayContaining([
        "roas_below",
        "spend_no_purchase",
        "cost_per_msg_above",
        "ctr_drop_pct",
        "spend_spike_pct",
      ]),
    );
    expect(DEFAULT_RULES).toHaveLength(5);
  });
  it("every default has label, param JSON, and severity", () => {
    DEFAULT_RULES.forEach((r) => {
      expect(r.label.length).toBeGreaterThan(0);
      expect(r.param).toBeTypeOf("object");
      expect(["info", "warning", "critical"]).toContain(r.severity);
    });
  });
});

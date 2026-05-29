import { describe, it, expect } from "vitest";
import {
  GETTING_STARTED,
  ROLE_GUIDES,
  ROLE_META,
  PAGE_GUIDES,
  GLOSSARY,
  FAQS,
  type HelpRole,
} from "../shared/help-content";

describe("Help Center content — structure & coverage", () => {
  it("ROLE_META has all 4 roles", () => {
    const roles: HelpRole[] = ["owner", "ceo", "content", "staff"];
    for (const r of roles) {
      expect(ROLE_META[r]).toBeDefined();
      expect(ROLE_META[r].emoji).toBeTruthy();
      expect(ROLE_META[r].label).toBeTruthy();
    }
  });

  it("ROLE_GUIDES covers all 4 roles", () => {
    const roles = ROLE_GUIDES.map((g) => g.role).sort();
    expect(roles).toEqual(["ceo", "content", "owner", "staff"]);
  });

  it("each role guide has whoYouAre, pagesUsed, dailyRoutine, metricsToWatch", () => {
    for (const g of ROLE_GUIDES) {
      expect(g.whoYouAre.length).toBeGreaterThan(10);
      expect(g.pagesUsed.length).toBeGreaterThan(0);
      expect(g.dailyRoutine.length).toBeGreaterThan(0);
      expect(g.metricsToWatch.length).toBeGreaterThan(0);
    }
  });

  // Batch 2 = รวม 22 หน้า (Batch 1: 3 + Batch 2: 19)
  it("PAGE_GUIDES has at least 19 pages (Batch 2)", () => {
    expect(PAGE_GUIDES.length).toBeGreaterThanOrEqual(19);
  });

  it("Batch 2 includes key analysis + scaling + commission + settings pages", () => {
    const ids = PAGE_GUIDES.map((p) => p.id);
    const required = [
      "leaderboard",
      "comparison",
      "ai-advisor",
      "alerts",
      "cohort",
      "ad-intelligence",
      "adset-detail",
      "ad-metric-benchmark",
      "smart-scaling",
      "share-links",
      "commission-table",
      "commission-dashboard",
      "commission-personal",
      "commission-settings",
      "accounts-settings",
      "groups-settings",
      "user-management",
      "profile",
    ];
    for (const id of required) {
      expect(ids, `missing page: ${id}`).toContain(id);
    }
  });

  it("PAGE_GUIDES — every page has unique id and 5-section schema", () => {
    const ids = new Set<string>();
    for (const p of PAGE_GUIDES) {
      expect(ids.has(p.id), `duplicate id: ${p.id}`).toBe(false);
      ids.add(p.id);
      expect(p.title).toBeTruthy();
      expect(p.path.startsWith("/")).toBe(true);
      expect(p.what.length).toBeGreaterThan(10);
      expect(p.who.length).toBeGreaterThan(0);
      // 5-section schema ใหม่
      expect(p.elements.length).toBeGreaterThan(0);
      expect(p.explanations.length).toBeGreaterThan(0);
      expect(p.useCases.length).toBeGreaterThan(0);
      expect(p.tips.length).toBeGreaterThan(0);
      // formulas optional แต่ tips ต้องมีอย่างน้อย 1
      for (const t of p.tips) {
        expect(["การใช้งาน", "การตัดสินใจ"]).toContain(t.type);
        expect(t.text.length).toBeGreaterThan(5);
      }
    }
  });

  it("Batch 1 includes Hub, Group Overview, Single Account", () => {
    const ids = PAGE_GUIDES.map((p) => p.id);
    expect(ids).toContain("hub");
    expect(ids).toContain("group-overview");
    expect(ids).toContain("single-dashboard");
  });

  it("Hub page has wireframe spots + ROAS formula", () => {
    const hub = PAGE_GUIDES.find((p) => p.id === "hub")!;
    expect(hub.wireSpots && hub.wireSpots.length).toBeGreaterThan(0);
    const roas = hub.formulas.find((f) => f.name.includes("ROAS"));
    expect(roas).toBeDefined();
    expect(roas!.formula.length).toBeGreaterThan(3);
  });

  it("owner has access to all batch-1 pages", () => {
    for (const p of PAGE_GUIDES) {
      expect(p.who, `owner missing on ${p.id}`).toContain("owner");
    }
  });

  it("GLOSSARY contains key terms (Batch 2 expanded)", () => {
    const terms = GLOSSARY.map((g) => g.term);
    expect(terms).toContain("ROAS");
    expect(terms).toContain("Spend");
    expect(terms).toContain("CTR");
    expect(terms).toContain("Auto-pilot Mode");
    expect(terms).toContain("Tier Rate");
    expect(terms).toContain("Benchmark Bands");
    expect(GLOSSARY.length).toBeGreaterThanOrEqual(25);
  });

  it("GLOSSARY entries all have non-empty meaning", () => {
    for (const g of GLOSSARY) {
      expect(g.meaning.length).toBeGreaterThan(2);
    }
  });

  it("FAQS has at least 10 entries with q + a (Batch 2 expanded)", () => {
    expect(FAQS.length).toBeGreaterThanOrEqual(10);
    for (const f of FAQS) {
      expect(f.q.length).toBeGreaterThan(5);
      expect(f.a.length).toBeGreaterThan(10);
    }
  });

  it("GETTING_STARTED has core fields + backward-compat aliases", () => {
    expect(GETTING_STARTED.what.length).toBeGreaterThan(20);
    expect(GETTING_STARTED.loginSteps.length).toBeGreaterThan(0);
    expect(GETTING_STARTED.layout.length).toBeGreaterThan(0);
    // aliases
    expect(GETTING_STARTED.layoutNotes.length).toBeGreaterThan(0);
    expect(GETTING_STARTED.personaDiffSummary.length).toBeGreaterThan(20);
  });
});

describe("Help Center search logic (new 5-section schema)", () => {
  function search(q: string) {
    const query = q.trim().toLowerCase();
    if (!query) return null;
    const pages = PAGE_GUIDES.filter(
      (p) =>
        p.title.toLowerCase().includes(query) ||
        p.what.toLowerCase().includes(query) ||
        p.elements.some((e) => e.item.toLowerCase().includes(query)) ||
        p.explanations.some(
          (e) =>
            e.item.toLowerCase().includes(query) ||
            e.meaning.toLowerCase().includes(query),
        ) ||
        p.formulas.some((f) => f.name.toLowerCase().includes(query)) ||
        p.tips.some((t) => t.text.toLowerCase().includes(query)),
    );
    const faqs = FAQS.filter(
      (f) =>
        f.q.toLowerCase().includes(query) ||
        f.a.toLowerCase().includes(query),
    );
    const glossary = GLOSSARY.filter(
      (g) =>
        g.term.toLowerCase().includes(query) ||
        g.meaning.toLowerCase().includes(query),
    );
    return { pages, faqs, glossary };
  }

  it("returns null for empty query", () => {
    expect(search("")).toBeNull();
    expect(search("   ")).toBeNull();
  });

  it("finds ROAS in glossary + pages (formula or explanation)", () => {
    const r = search("roas")!;
    expect(r.glossary.length).toBeGreaterThan(0);
    expect(r.pages.length).toBeGreaterThan(0);
  });

  it("returns empty arrays when nothing matches", () => {
    const r = search("zzzxxxqqq_no_match")!;
    expect(r.pages.length).toBe(0);
    expect(r.faqs.length).toBe(0);
    expect(r.glossary.length).toBe(0);
  });

  it("is case-insensitive", () => {
    const upper = search("ROAS")!;
    const lower = search("roas")!;
    expect(upper.glossary.length).toBe(lower.glossary.length);
  });
});

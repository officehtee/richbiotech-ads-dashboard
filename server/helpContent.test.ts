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

  it("PAGE_GUIDES has at least 19 pages", () => {
    expect(PAGE_GUIDES.length).toBeGreaterThanOrEqual(19);
  });

  it("PAGE_GUIDES — every page has unique id and required fields", () => {
    const ids = new Set<string>();
    for (const p of PAGE_GUIDES) {
      expect(ids.has(p.id), `duplicate id: ${p.id}`).toBe(false);
      ids.add(p.id);
      expect(p.title).toBeTruthy();
      expect(p.path.startsWith("/")).toBe(true);
      expect(p.what.length).toBeGreaterThan(10);
      expect(p.contains.length).toBeGreaterThan(0);
      expect(p.who.length).toBeGreaterThan(0);
      expect(p.tip.length).toBeGreaterThan(5);
    }
  });

  it("PAGE_GUIDES — every category appears at least once", () => {
    const categories = new Set(PAGE_GUIDES.map((p) => p.category));
    expect(categories.has("overview")).toBe(true);
    expect(categories.has("analysis")).toBe(true);
    expect(categories.has("scaling")).toBe(true);
    expect(categories.has("commission")).toBe(true);
    expect(categories.has("settings")).toBe(true);
  });

  it("PAGE_GUIDES includes all critical pages", () => {
    const ids = PAGE_GUIDES.map((p) => p.id);
    const required = [
      "hub",
      "group-overview",
      "single-dashboard",
      "leaderboard",
      "comparison",
      "ai-advisor",
      "ad-intelligence",
      "ad-metric-benchmark",
      "alerts",
      "cohort",
      "smart-scaling",
      "share-links",
      "commission-table",
      "commission-dashboard",
      "commission-personal",
      "commission-settings",
      "accounts",
      "groups",
      "users",
    ];
    for (const r of required) {
      expect(ids, `missing page: ${r}`).toContain(r);
    }
  });

  it("staff role has access to at least Hub + commission-personal", () => {
    const staffPages = PAGE_GUIDES.filter((p) => p.who.includes("staff"));
    const ids = staffPages.map((p) => p.id);
    expect(ids).toContain("hub");
    expect(ids).toContain("commission-personal");
  });

  it("owner has access to all pages", () => {
    for (const p of PAGE_GUIDES) {
      expect(p.who, `owner missing on ${p.id}`).toContain("owner");
    }
  });

  it("GLOSSARY contains key terms", () => {
    const terms = GLOSSARY.map((g) => g.term);
    expect(terms).toContain("ROAS");
    expect(terms).toContain("Spend");
    expect(terms).toContain("CTR");
    expect(terms).toContain("Adset");
    expect(terms).toContain("Cohort");
    expect(terms).toContain("Smart Scaling");
  });

  it("GLOSSARY entries all have non-empty meaning", () => {
    for (const g of GLOSSARY) {
      expect(g.meaning.length).toBeGreaterThan(2);
    }
  });

  it("FAQS has at least 5 entries with q + a", () => {
    expect(FAQS.length).toBeGreaterThanOrEqual(5);
    for (const f of FAQS) {
      expect(f.q.length).toBeGreaterThan(5);
      expect(f.a.length).toBeGreaterThan(10);
    }
  });

  it("GETTING_STARTED has core fields", () => {
    expect(GETTING_STARTED.what.length).toBeGreaterThan(20);
    expect(GETTING_STARTED.loginSteps.length).toBeGreaterThan(0);
    expect(GETTING_STARTED.layoutNotes.length).toBeGreaterThan(0);
    expect(GETTING_STARTED.personaDiff.length).toBeGreaterThan(20);
  });
});

describe("Help Center search logic", () => {
  // Simulate the same search behavior used in HelpCenter.tsx
  function search(q: string) {
    const query = q.trim().toLowerCase();
    if (!query) return null;
    const pages = PAGE_GUIDES.filter(
      (p) =>
        p.title.toLowerCase().includes(query) ||
        p.what.toLowerCase().includes(query) ||
        p.contains.some(
          (c) =>
            c.item.toLowerCase().includes(query) ||
            c.meaning.toLowerCase().includes(query),
        ),
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

  it("finds ROAS in glossary + pages", () => {
    const r = search("ROAS")!;
    expect(r.glossary.length).toBeGreaterThan(0);
    expect(r.pages.length).toBeGreaterThan(0);
  });

  it("finds คอม in commission-related content", () => {
    const r = search("คอม")!;
    expect(r.pages.length).toBeGreaterThan(0);
  });

  it("finds การแจ้งเตือน in pages", () => {
    const r = search("แจ้งเตือน")!;
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

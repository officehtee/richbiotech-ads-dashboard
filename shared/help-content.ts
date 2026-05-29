// shared/help-content.ts
// คู่มือ Help Center — ฉบับสมบูรณ์ (3 batches)
// Batch 1: โครงสร้าง + Getting Started + 3 หน้าแรก (Hub / Group / Single Account)
// Batch 2 (จะเพิ่ม): อีก 16 หน้า + Glossary + FAQ
// Batch 3 (จะเพิ่ม): Role Guide ใหม่ + cross-link

export type HelpRole = "owner" | "ceo" | "content" | "staff";

export const ROLE_META: Record<HelpRole, { emoji: string; label: string; description: string }> = {
  owner: { emoji: "👑", label: "เจ้าของ (Owner)", description: "ผู้สร้าง workspace มีสิทธิ์ทุกอย่าง" },
  ceo: { emoji: "💼", label: "CEO", description: "ผู้บริหารร่วม สิทธิ์เกือบเท่า Owner" },
  content: { emoji: "🎨", label: "คนยิงแอด (Content)", description: "ทีมครีเอทีฟ + วางแผนแอด" },
  staff: { emoji: "💬", label: "เซลส์ (Staff)", description: "พนักงานปิดการขาย" },
};

// ───────────────────────────────────────────────────────────────────
// Schema: หน้าใน "ส่วนที่ 1" — 5 หัวข้อต่อหน้า (องค์ประกอบ → คืออะไร → วิธีคิด+แสดงผล → วิธีใช้ → เคล็ดลับ)
// ───────────────────────────────────────────────────────────────────
export type ElementZone =
  | "ซ้ายบน"
  | "ขวาบน"
  | "บนสุด"
  | "กลางบน"
  | "กลางหน้า"
  | "ใต้ KPI"
  | "ซ้ายกลาง"
  | "ขวากลาง"
  | "ด้านล่าง"
  | "กลางล่าง"
  | "เต็มหน้า"
  | "Sidebar เสริม"
  | "ในการ์ดทุกใบ"
  | "ในการ์ดกราฟ";

/** ส่วนที่ 1: องค์ประกอบในหน้า — ทุก element ที่ปรากฏจริง */
export type PageElement = {
  /** เช่น "KPI Cards 5 ใบ", "ตารางบัญชีโฆษณา" */
  item: string;
  /** ตำแหน่งโดยประมาณบนหน้า */
  zone: ElementZone;
  /** ประเภท — ใช้สำหรับ icon สี/แตกหมวด */
  kind:
    | "toolbar"
    | "kpi"
    | "chart"
    | "table"
    | "filter"
    | "button"
    | "card"
    | "badge"
    | "panel"
    | "selector";
};

/** ส่วนที่ 2: แต่ละ element คืออะไร (อธิบายคนไม่รู้เรื่องอ่านได้) */
export type ElementExplanation = {
  /** อ้างชื่อตรงกับ item ในข้อ 1 */
  item: string;
  /** อธิบายความหมาย/หน้าที่ — เขียนแบบเข้าใจง่าย */
  meaning: string;
  /** จุดสังเกตเพิ่มเติม (สีอะไร แสดงตอนไหน) */
  note?: string;
};

/** ส่วนที่ 3: วิธีคิด + วิธีแสดงผล — สูตร, เกณฑ์สี, ตัวอย่าง, ขอบเขตข้อมูล, ความถี่อัปเดต */
export type MetricFormula = {
  /** เช่น "ROAS", "Cost/Msg", "Smart Scaling Score" */
  name: string;
  /** สูตรเขียนเป็นข้อความ — เช่น "รายได้ ÷ ค่าโฆษณา" */
  formula: string;
  /** เกณฑ์สี/สถานะ (โชว์เป็น chip รายเงื่อนไข) */
  colorRules?: { color: "green" | "amber" | "red" | "blue" | "violet" | "gray"; when: string }[];
  /** ตัวอย่างคำนวณจริง */
  example?: string;
  /** ที่มาข้อมูล (Meta API / DB / ผู้ใช้กรอก) */
  dataSource: string;
  /** ความถี่อัปเดต (refresh interval ที่ใช้จริง) */
  refresh: string;
};

/** ส่วนที่ 4: วิธีใช้ — Use cases รายข้อ + ขั้นตอน 1-2-3 */
export type UseCase = {
  /** หัวข้อ use case — เช่น "หาแอดที่เผางบ" */
  title: string;
  /** ขั้นตอน 1-2-3 ที่ทำตามได้ */
  steps: string[];
  /** ผลลัพธ์ที่ควรได้ */
  outcome?: string;
};

/** ส่วนที่ 5: เคล็ดลับ — ใช้งาน หรือ การตัดสินใจ */
export type Tip = {
  type: "การใช้งาน" | "การตัดสินใจ";
  text: string;
};

/** wireframe annotation (แทน screenshot จริงไปก่อน) */
export type WireSpot = {
  /** ตำแหน่ง 0-100 % ของกล่อง wireframe */
  x: number;
  y: number;
  label: string;
};

export type PageGuide = {
  id: string;
  title: string;
  path: string;
  category: "overview" | "analysis" | "scaling" | "commission" | "settings";
  /** คำอธิบายสั้น 1-2 ประโยค */
  what: string;
  /** เหมาะกับใคร */
  who: HelpRole[];
  /** layout key — frontend ใช้เลือก wireframe template */
  wireLayout?:
    | "hub"
    | "group-overview"
    | "single-dashboard"
    | "generic-list"
    | "generic-form";
  wireSpots?: WireSpot[];

  // 5 หัวข้อตามลำดับ
  elements: PageElement[];
  explanations: ElementExplanation[];
  formulas: MetricFormula[];
  useCases: UseCase[];
  tips: Tip[];

  /** สำหรับลิงก์ในส่วนที่ 2 (Role Guide) — ใช้แสดงเป็นปุ่ม "→ อ่านรายละเอียดหน้านี้" */
  shortLabel?: string;
};

// ───────────────────────────────────────────────────────────────────
// Getting Started — เริ่มต้นใช้งาน
// ───────────────────────────────────────────────────────────────────
export const GETTING_STARTED: {
  what: string;
  whyUse: string[];
  loginSteps: { step: string; detail: string }[];
  layout: { label: string; detail: string }[];
  personaDiff: { view: string; focus: string }[];
  readonly layoutNotes: { zone: string; purpose: string }[];
  readonly personaDiffSummary: string;
} = {
  what: "Richbiotech Ads Dashboard คือเครื่องมือดูภาพรวมแอดโฆษณา Facebook ทุกบัญชีในที่เดียว เห็น Spend / คนทัก / Orders / Revenue / ROAS ครบ พร้อม AI แนะนำการปรับงบ และคำนวณคอมมิชชั่นพนักงานอัตโนมัติ — ออกแบบมาให้เจ้าของกิจการ / CEO / คนยิงแอด / เซลส์ ใช้พร้อมกันได้ในแอปเดียว",

  whyUse: [
    "ดูทุกบัญชี Meta Ads ในจอเดียวแทนการสลับเปิดทีละบัญชี",
    "เห็น ROAS, Spend, รายได้ realtime พร้อมเปรียบเทียบกับเมื่อวาน / สัปดาห์ก่อน",
    "AI Smart Scaling แนะนำเพิ่ม/ลด/หยุดงบ adset รายตัว ไม่ต้องคิดเอง",
    "ระบบคอมมิชชั่นอัตโนมัติ + Lock Period ป้องกันยอดเปลี่ยนหลังปิดเดือน",
    "แชร์ลิงก์อ่านอย่างเดียวให้คนนอกระบบ ไม่ต้องออก user เพิ่ม",
  ],

  loginSteps: [
    {
      step: "เปิดลิงก์เว็บที่ได้รับ",
      detail: "ลิงก์หลักของ workspace จะอยู่ในรูป https://richbiotech-ads.manus.space",
    },
    {
      step: "กดปุ่ม \"เข้าสู่ระบบด้วย Manus\"",
      detail: "ใช้บัญชี Manus เพื่อยืนยันตัวตน — ปลอดภัย ไม่ต้องตั้งรหัสผ่านแยก",
    },
    {
      step: "ครั้งแรก: กรอก Company Code หรือเปิดลิงก์เชิญ",
      detail: "ถ้าได้ Magic Invite Link จาก Owner แล้ว ให้เปิดลิงก์นั้นโดยตรง ระบบจะกำหนด Role ให้ทันที — ถ้าไม่มี ให้กรอก Company Code ที่ Owner ให้มาในหน้า Onboarding",
    },
    {
      step: "รอ Owner กำหนด Role",
      detail: "หากเข้าด้วย Company Code Role เริ่มต้นจะเป็น \"pending\" — Owner ต้องเข้า \"จัดการผู้ใช้\" แล้วเปลี่ยน Role ให้ก่อนจึงจะเริ่มใช้งานได้",
    },
  ],

  layout: [
    {
      label: "Sidebar (เมนูซ้าย)",
      detail: "รวมทุกหน้าใช้งาน จัดเป็นกลุ่ม: ภาพรวม / วิเคราะห์ / ปรับงบ / คอมมิชชั่น / ตั้งค่า · ตรึงคงที่ scroll ไม่ขยับ · พื้นหลังสีเข้มถาวรเสมอ เพื่อให้คมชัด",
    },
    {
      label: "Topbar (แถบบน)",
      detail: "มีไอคอน 🔔 แจ้งเตือน · ❓ คู่มือ (Help Center) · ☀️/🌙 สลับธีม · 👤 โปรไฟล์",
    },
    {
      label: "Persona Toggle (สลับมุมมอง)",
      detail: "บน \"หน้าหลัก\" มีปุ่มสลับ Buyer (คนยิงแอด) ↔ Sales (เซลส์) — มุมมอง Sales จะเพิ่ม panel \"LIVE 1 ชม.ล่าสุด\" ขึ้นมาเพื่อกระตุ้นยอด",
    },
    {
      label: "Theme (Dark / Light / System)",
      detail: "สลับธีมได้ตามต้องการ — Sidebar เป็นสีเข้มเสมอ ไม่เปลี่ยนตามธีม",
    },
    {
      label: "Date Range pills",
      detail: "ทุกหน้าวิเคราะห์มี preset 1 วัน / 3 วัน / 7 วัน / 14 วัน / 30 วัน / กำหนดเอง — เปลี่ยนช่วงเวลาที่ใช้คำนวณ KPI ทุกใบในหน้านั้น",
    },
    {
      label: "Refresh button",
      detail: "ปุ่ม 🔄 ขวาบนของทุกหน้า กดเพื่อดึงข้อมูลล่าสุดจาก Meta ทันที (ปกติระบบ refresh เองทุก 5 นาที)",
    },
  ],

  personaDiff: [
    {
      view: "Buyer (คนยิงแอด)",
      focus: "เน้น KPI ภาพรวม + Smart Scaling + Top Ads + Group Breakdown — เหมาะตอนตัดสินใจปรับงบหรือเปลี่ยน creative",
    },
    {
      view: "Sales (เซลส์)",
      focus: "เพิ่ม panel \"LIVE 1 ชม.ล่าสุด\" — แสดงคนทักชั่วโมงนี้ vs ค่าเฉลี่ย 7 วันชั่วโมงเดียวกัน พร้อม urgency badge (พีค / กำลังขึ้น / ปกติ / เงียบ) เพื่อกระตุ้นการปิดการขาย",
    },
  ],

  // backward-compat aliases
  get layoutNotes() {
    return this.layout.map((l) => ({ zone: l.label, purpose: l.detail }));
  },
  get personaDiffSummary() {
    return this.personaDiff.map((p) => `${p.view}: ${p.focus}`).join(" \u2014 ");
  },
};

// ───────────────────────────────────────────────────────────────────
// ROLE_GUIDES — Batch 3 จะรื้อใหม่ละเอียด ตอนนี้ stub backward-compat
// ───────────────────────────────────────────────────────────────────
export type RoleGuide = {
  role: HelpRole;
  whoYouAre: string;
  pagesUsed: { page: string; purpose: string }[];
  dailyRoutine: string[];
  metricsToWatch: string[];
};

export const ROLE_GUIDES: RoleGuide[] = [
  {
    role: "owner",
    whoYouAre: "ผู้สร้าง workspace — มีสิทธิ์ทุกอย่าง รวมถึงตั้งค่าระบบ จัดการผู้ใช้ คอมมิชชั่น และ Lock Period",
    pagesUsed: [
      { page: "หน้าหลัก (Hub Dashboard)", purpose: "เริ่มวันตรวจ KPI รวม" },
      { page: "ภาพรวมกลุ่มสินค้า (Group Overview)", purpose: "เทียบผลงานระหว่างกลุ่ม" },
    ],
    dailyRoutine: [
      "เปิดหน้าหลักดู KPI ภาพรวมของวัน",
      "เช็ก AI Insight ถ้ามีจุดที่ต้องสนใจ",
      "ดูตารางบัญชีโฆษณาที่ status ต่ำกว่าเป้า",
    ],
    metricsToWatch: ["ROAS รวม", "Spend รวม", "Revenue", "จำนวน alerts"],
  },
  {
    role: "ceo",
    whoYouAre: "ผู้บริหารร่วม — สิทธิ์เกือบเท่า Owner ยกเว้นการลบ workspace และขับ Owner",
    pagesUsed: [
      { page: "หน้าหลัก (Hub Dashboard)", purpose: "ดูภาพรวม KPI ประจำวัน" },
      { page: "ภาพรวมกลุ่มสินค้า (Group Overview)", purpose: "ตัดสินใจระดับพอร์ต" },
    ],
    dailyRoutine: ["ดู KPI รวม + AI Insight", "สรุปผลรายสัปดาห์ตอนวันจันทร์"],
    metricsToWatch: ["ROAS รวม", "Revenue", "Spend"],
  },
  {
    role: "content",
    whoYouAre: "ทีมครีเอทีฟ และยิงแอด — ตัดสินใจเพิ่ม/ลดงบ adset รายตัว",
    pagesUsed: [
      { page: "แดชบอร์ดบัญชีเดี่ยว (Single Account)", purpose: "เจาะลึกรายบัญชี" },
      { page: "หน้าหลัก (Hub Dashboard)", purpose: "ดู Smart Scaling และ Top Ads" },
    ],
    dailyRoutine: [
      "เปิดหน้าหลัก เช็ก Smart Scaling และ Top Ads",
      "ปรับงบตามคำแนะนำ",
    ],
    metricsToWatch: ["ROAS", "CTR", "Cost/Msg", "Smart Scaling badges"],
  },
  {
    role: "staff",
    whoYouAre: "พนักงานปิดการขาย — ตอบแชต ปิดออเดอร์ รับคอมมิชชั่น",
    pagesUsed: [
      { page: "หน้าหลัก (Hub Dashboard)", purpose: "เช็ก LIVE 1 ชม. + urgency badge" },
    ],
    dailyRoutine: [
      "สลับ Persona เป็น Sales",
      "เฝ้า LIVE panel + Hourly Heatmap",
    ],
    metricsToWatch: ["คนทักชั่วโมงนี้", "Urgency badge"],
  },
];

// ───────────────────────────────────────────────────────────────────
// ส่วนที่ 1: PAGE_GUIDES — 19 หน้า (Batch 1 = 3 หน้า, Batch 2 = อีก 16)
// ───────────────────────────────────────────────────────────────────
export const PAGE_GUIDES: PageGuide[] = [
  // ════════════════════════════════════════════════════════════════
  // [Batch 1 · หน้า 1/3] หน้าหลัก (Hub Dashboard)
  // ════════════════════════════════════════════════════════════════
  {
    id: "hub",
    title: "หน้าหลัก (Hub Dashboard)",
    shortLabel: "หน้าหลัก",
    path: "/",
    category: "overview",
    what: "หน้าแรกที่เปิดมาเจอ — รวมทุก KPI ทุกบัญชีโฆษณาในจอเดียว ทั้งภาพรวมและ realtime พร้อมเครื่องมือช่วยตัดสินใจครบในที่เดียว",
    who: ["owner", "ceo", "content", "staff"],
    wireLayout: "hub",
    wireSpots: [
      { x: 4, y: 4, label: "Toolbar: Persona / บัญชี / Date pills / Refresh" },
      { x: 4, y: 18, label: "KPI 5 ใบ (Spend / คนทัก / Orders / Revenue / ROAS)" },
      { x: 4, y: 38, label: "AI Insight (ซ้าย 50%)" },
      { x: 54, y: 38, label: "เพจมาแรงวันนี้ (ขวา 50%)" },
      { x: 4, y: 54, label: "Hourly Heatmap 7×24 (เต็มหน้า)" },
      { x: 4, y: 70, label: "รายได้ vs ค่าโฆษณา (65%)" },
      { x: 70, y: 70, label: "แยกตามกลุ่มสินค้า (35%)" },
      { x: 4, y: 84, label: "Smart Scaling แนะนำ (50%)" },
      { x: 54, y: 84, label: "Top Performing Ads (50%)" },
      { x: 4, y: 94, label: "ตารางบัญชีโฆษณาทั้งหมด (เต็มหน้า)" },
    ],

    elements: [
      { item: "Persona Toggle (Buyer / Sales)", zone: "ซ้ายบน", kind: "toolbar" },
      { item: "Account Selector", zone: "ซ้ายบน", kind: "selector" },
      { item: "Date Range pills", zone: "ขวาบน", kind: "filter" },
      { item: "ปุ่ม Refresh", zone: "ขวาบน", kind: "button" },
      { item: "KPI Card: Spend", zone: "บนสุด", kind: "kpi" },
      { item: "KPI Card: คนทัก", zone: "บนสุด", kind: "kpi" },
      { item: "KPI Card: Orders", zone: "บนสุด", kind: "kpi" },
      { item: "KPI Card: Revenue", zone: "บนสุด", kind: "kpi" },
      { item: "KPI Card: ROAS", zone: "บนสุด", kind: "kpi" },
      { item: "LIVE 1 ชม.ล่าสุด (Sales view เท่านั้น)", zone: "ใต้ KPI", kind: "panel" },
      { item: "การ์ด AI Insight", zone: "ซ้ายกลาง", kind: "panel" },
      { item: "เพจมาแรงวันนี้ (Hot Pages Top 5)", zone: "ขวากลาง", kind: "panel" },
      { item: "Hourly Heatmap 7×24", zone: "กลางหน้า", kind: "chart" },
      { item: "กราฟ รายได้ vs ค่าโฆษณา (Area+Line 30 วัน)", zone: "ซ้ายกลาง", kind: "chart" },
      { item: "แยกตามกลุ่มสินค้า (Toggle Spend / ROAS)", zone: "ขวากลาง", kind: "panel" },
      { item: "Smart Scaling แนะนำ (Top 5 adset)", zone: "ซ้ายกลาง", kind: "panel" },
      { item: "Top Performing Ads (Top 5 ROAS)", zone: "ขวากลาง", kind: "panel" },
      { item: "ตารางบัญชีโฆษณาทั้งหมด (Sortable + Sparkline 14 วัน)", zone: "ด้านล่าง", kind: "table" },
    ],

    explanations: [
      {
        item: "Persona Toggle (Buyer / Sales)",
        meaning: "สลับมุมมองการแสดงผลให้ตรงกับงาน — Buyer = คนยิงแอด (เน้นปรับงบ), Sales = เซลส์ (เน้น realtime คนทัก)",
        note: "เลือกแล้วระบบจำไว้ในเครื่อง (localStorage) เปิดครั้งหน้ามาเป็นมุมมองเดิม",
      },
      {
        item: "Account Selector",
        meaning: "เลือกดูเฉพาะบัญชีเดียว หรือ \"ทุกบัญชี · N accounts\" เพื่อรวมทุกบัญชี",
        note: "เลือกบัญชีเดียวจะกระทบทุก KPI / กราฟในหน้านี้",
      },
      {
        item: "Date Range pills",
        meaning: "ช่วงเวลาที่ใช้คำนวณ KPI ทั้งหน้า — preset 1 / 3 / 7 / 14 / 30 วัน หรือ \"กำหนดเอง\" เลือกปฏิทินได้",
        note: "ค่าเริ่มต้น = 1 วัน (เน้น snapshot ของวันนี้)",
      },
      {
        item: "ปุ่ม Refresh",
        meaning: "กดเพื่อดึงข้อมูลล่าสุดจาก Meta Ads ทันที — ปกติระบบดึงเองทุก 5 นาที",
        note: "ระหว่างโหลดจะมีไอคอนหมุน",
      },
      {
        item: "KPI Card: Spend",
        meaning: "ยอดเงินที่จ่ายค่าโฆษณารวมทั้งช่วงเวลาที่เลือก",
        note: "พื้นหลัง gradient สีส้ม · มี sparkline 7 วัน + delta % เทียบงวดก่อน + จุดสีบอกสถานะ live · footer \"now ฿X/hr\" คือค่าเฉลี่ยรายชั่วโมงวันนี้",
      },
      {
        item: "KPI Card: คนทัก",
        meaning: "จำนวนคนทักแชทเข้ามาในเพจของบัญชีโฆษณาที่เลือก",
        note: "พื้นหลัง gradient สีน้ำเงิน · footer \"now N/hr\" = คนทักต่อชั่วโมงล่าสุด (อัปเดตทุก 1 นาที)",
      },
      {
        item: "KPI Card: Orders",
        meaning: "จำนวนคำสั่งซื้อที่เกิดจากแอด (Conversion event ของ Meta Pixel)",
        note: "พื้นหลัง gradient สีเขียวมรกต · footer แสดง AOV (ยอดเฉลี่ยต่อออเดอร์) ถ้ามี",
      },
      {
        item: "KPI Card: Revenue",
        meaning: "ยอดขายรวม (มูลค่าของออเดอร์ทั้งหมด)",
        note: "พื้นหลัง gradient สีทอง-อำพัน · footer \"vs target\" = % ที่เกิน/ขาดเป้าเทียบงวดก่อน",
      },
      {
        item: "KPI Card: ROAS",
        meaning: "อัตราผลตอบแทนจากค่าโฆษณา — จ่าย 1 บาทได้กลับมากี่บาท",
        note: "พื้นหลัง gradient สีม่วง · footer \"target 2.50\" = เป้าเริ่มต้น · \"peak X.XXx\" = ค่าสูงสุดในช่วง 7 วัน",
      },
      {
        item: "LIVE 1 ชม.ล่าสุด (Sales view เท่านั้น)",
        meaning: "แสดงคนทักในชั่วโมงล่าสุด + เทียบกับเฉลี่ย 7 วันชั่วโมงเดียวกัน + urgency badge เพื่อกระตุ้นยอด",
        note: "อัปเดตทุก 1 นาที · ขึ้นเฉพาะตอน Persona = Sales",
      },
      {
        item: "การ์ด AI Insight",
        meaning: "AI สรุปข้อสังเกตที่ควรให้ความสนใจวันนี้ 1-3 บรรทัด อิงจากตัวเลขจริงทั้งระบบ",
        note: "อัปเดตทุก 15 นาที · กดลิงก์ที่ท้ายการ์ดเพื่อไปหน้า AI Advisor ขอวิเคราะห์เชิงลึกต่อ",
      },
      {
        item: "เพจมาแรงวันนี้ (Hot Pages Top 5)",
        meaning: "Top 5 เพจที่มีคนทักเข้ามาเยอะที่สุดในวันนี้ + % เปลี่ยนเทียบเฉลี่ย",
        note: "ถ้าเพจเดียวกันอยู่ในหลายบัญชี ระบบรวมเป็น 1 แถวอัตโนมัติ (แสดง \"N บัญชี\")",
      },
      {
        item: "Hourly Heatmap 7×24",
        meaning: "ตารางคนทัก 7 วันย้อนหลัง × 24 ชั่วโมง — สีเข้ม = คนทักเยอะ",
        note: "ใช้หา \"ชั่วโมงทอง\" ของเพจ + วางแผนตารางตอบแชท",
      },
      {
        item: "กราฟ รายได้ vs ค่าโฆษณา (Area+Line 30 วัน)",
        meaning: "เทรนด์รายวันของรายได้ (area) เทียบกับค่าโฆษณา (line) ในรอบ 30 วันล่าสุด",
        note: "ใช้ดูว่ารายได้โตตามค่าโฆษณาหรือเปล่า · ไม่ผูกกับ Date Range pills (ล็อก 30 วันเสมอ)",
      },
      {
        item: "แยกตามกลุ่มสินค้า (Toggle Spend / ROAS)",
        meaning: "แสดงสัดส่วน Spend หรือ ROAS ของแต่ละกลุ่มสินค้า ในรูป progress bar + ตัวเลข %",
        note: "Toggle ด้านบนเลือกได้ว่าจะดู Spend (สัดส่วนงบ) หรือ ROAS (ประสิทธิภาพเทียบเป้า)",
      },
      {
        item: "Smart Scaling แนะนำ (Top 5 adset)",
        meaning: "AI แนะนำ 5 adset ที่ควรปรับงบวันนี้ — มี badge action + งบเดิม → งบใหม่",
        note: "กดปุ่ม \"→ ดูทั้งหมด\" เพื่อเข้าหน้า Smart Scaling แบบเต็ม",
      },
      {
        item: "Top Performing Ads (Top 5 ROAS)",
        meaning: "5 adset ที่ ROAS สูงสุดในช่วงเวลาที่เลือก + % delta เทียบงวดก่อน",
        note: "ตัดเฉพาะ adset ที่ Spend ≥ 100 บาท เพื่อกันสุ่ม",
      },
      {
        item: "ตารางบัญชีโฆษณาทั้งหมด",
        meaning: "ลิสต์ทุกบัญชีโฆษณาในระบบ + KPI หลัก + sparkline ROAS 14 วัน + status pill",
        note: "Sort คอลัมน์ใดก็ได้ · คลิกบัญชีเพื่อเข้าหน้า \"แดชบอร์ดเดี่ยว\"",
      },
    ],

    formulas: [
      {
        name: "ROAS (Return on Ad Spend)",
        formula: "ROAS = รายได้ ÷ ค่าโฆษณา",
        colorRules: [
          { color: "green", when: "ROAS ≥ เป้า (target)" },
          { color: "amber", when: "เป้า × 0.75 ≤ ROAS < เป้า" },
          { color: "red", when: "ROAS < เป้า × 0.75" },
        ],
        example: "จ่าย ฿1,000 ได้รายได้ ฿2,500 → ROAS = 2.50 · ถ้าเป้า 2.0 → สีเขียว",
        dataSource: "Meta Marketing API v22.0 (purchase_value / spend จาก insights)",
        refresh: "5 นาที (KPI Card) · กด Refresh เพื่อดึงสด",
      },
      {
        name: "Delta % (vs งวดก่อน)",
        formula: "Δ% = (ค่าล่าสุด − ค่าก่อนหน้า) ÷ ค่าก่อนหน้า × 100",
        colorRules: [
          { color: "green", when: "เพิ่ม + KPI เป็น up (รายได้/คนทัก/ROAS)" },
          { color: "green", when: "ลด + KPI เป็น down (Spend)" },
          { color: "red", when: "ทิศทางตรงข้าม" },
        ],
        example: "ROAS เมื่อวาน 2.0 → วันนี้ 2.5 → Δ +25% สีเขียว",
        dataSource: "คำนวณจาก sparkline 7 วันที่ดึงมาแสดง",
        refresh: "10 นาที",
      },
      {
        name: "Urgency Badge (LIVE panel)",
        formula: "ratio = คนทักชั่วโมงนี้ ÷ ค่าเฉลี่ยชั่วโมงเดียวกัน 7 วันก่อน",
        colorRules: [
          { color: "red", when: "ratio ≥ 1.5 → 🔥 พีคแล้ว" },
          { color: "amber", when: "1.2 ≤ ratio < 1.5 → 📈 กำลังขึ้น" },
          { color: "blue", when: "0.7 ≤ ratio < 1.2 → 🕐 ปกติ" },
          { color: "gray", when: "ratio < 0.7 → 🌙 เงียบ" },
        ],
        example: "ชั่วโมงนี้ 30 คน · ค่าเฉลี่ย 18 คน → ratio 1.67 → \"พีคแล้ว\"",
        dataSource: "Meta API + Database (cache 1 นาที)",
        refresh: "1 นาที",
      },
      {
        name: "Account Status Pill (ตารางบัญชี)",
        formula: "เทียบ ROAS กับ roasTarget ที่ตั้งในหน้า \"จัดการบัญชี\"",
        colorRules: [
          { color: "green", when: "ROAS ≥ target → \"ดี\"" },
          { color: "amber", when: "target × 0.7 ≤ ROAS < target → \"เฝ้าระวัง\"" },
          { color: "red", when: "ROAS < target × 0.7 → \"ต่ำกว่าเป้า\"" },
        ],
        example: "target 2.0 · ROAS 1.6 → 1.6 ≥ 2.0×0.7 (1.4) → สีเหลือง \"เฝ้าระวัง\"",
        dataSource: "Meta API + ค่า roasTarget จาก DB",
        refresh: "5 นาที",
      },
      {
        name: "AOV (Average Order Value)",
        formula: "AOV = รายได้ ÷ จำนวนออเดอร์",
        example: "รายได้ ฿15,000 / 30 ออเดอร์ → AOV = ฿500",
        dataSource: "Meta API (purchases / purchase_value)",
        refresh: "5 นาที",
      },
    ],

    useCases: [
      {
        title: "เช็กภาพรวมก่อนเริ่มวัน (เจ้าของ / CEO)",
        steps: [
          "เปิดหน้าหลัก ดู KPI 5 ใบบนสุดทันที — เลข + สี + delta",
          "ถ้า ROAS หรือ Revenue ลด > 20% → ดู AI Insight ทางซ้ายมือ เห็นสาเหตุที่ AI สังเกต",
          "เลื่อนลงดู \"แยกตามกลุ่มสินค้า\" — กลุ่มไหนทำให้รวมตก",
        ],
        outcome: "รู้ภาพรวม + จุดที่ต้องเข้าไปแก้ภายใน 30 วินาที",
      },
      {
        title: "หา adset ที่ต้องปรับงบวันนี้ (คนยิงแอด)",
        steps: [
          "เลื่อนลงไปที่ \"Smart Scaling แนะนำ\" ดูการ์ด 5 ใบ",
          "ดู badge: 🚀 เพิ่มมาก / ✅ เพิ่มน้อย / 👀 รอดู / 📉 ลดน้อย / ⛔ หยุด",
          "อ่าน \"From → To\" — งบเดิมกี่บาท → AI แนะนำเท่าไหร่",
          "กดปุ่ม \"→ ดูทั้งหมด\" เข้าหน้า Smart Scaling ถ้าต้องการดูเงื่อนไขเต็ม",
        ],
        outcome: "ได้รายชื่อ adset 5 ตัวพร้อม action ที่ทำต่อใน Meta Ads Manager",
      },
      {
        title: "จับชั่วโมงทอง / วางตารางตอบแชท (เซลส์)",
        steps: [
          "สลับ Persona เป็น \"Sales\"",
          "ดู panel \"LIVE 1 ชม.ล่าสุด\" — urgency badge บอกสถานะตอนนี้",
          "เลื่อนลงดู Hourly Heatmap 7×24 — ช่องสีเข้มคือชั่วโมงที่คนทักเยอะ",
          "หาแพตเทิร์น เช่น ทุกพุธ 19:00-21:00 พีค → จัดทีมเซลส์ standby ช่วงนั้น",
        ],
        outcome: "วางตารางทีมเซลส์ให้ตรงกับ peak hour ของแต่ละสัปดาห์",
      },
      {
        title: "เปรียบเทียบบัญชี / หาบัญชีที่ทำผลงานดี-แย่",
        steps: [
          "เลื่อนลงสุดที่ \"ตารางบัญชีโฆษณาทั้งหมด\"",
          "คลิกหัวคอลัมน์ ROAS เพื่อ sort จากสูงไปต่ำ",
          "ดู status pill: \"ดี\" / \"เฝ้าระวัง\" / \"ต่ำกว่าเป้า\"",
          "คลิกบัญชีที่อยู่ \"ต่ำกว่าเป้า\" เพื่อเข้าหน้า \"แดชบอร์ดเดี่ยว\" ดูรายละเอียด",
        ],
        outcome: "รู้ทันทีว่าบัญชีไหนทำได้ดี/ต้องแก้",
      },
      {
        title: "ดูเทรนด์รายได้ vs ค่าโฆษณา 30 วัน",
        steps: [
          "เลื่อนลงไปที่กราฟ \"รายได้ vs ค่าโฆษณา\"",
          "ดูว่าเส้นรายได้ (area) โตเร็วกว่าค่าโฆษณา (line) ไหม",
          "ถ้ารายได้แบนแต่ค่าโฆษณาขึ้น = ROAS ลด → ควรหยุดเพิ่มงบ",
        ],
        outcome: "เห็นความสัมพันธ์ระยะยาว ตัดสินใจขยาย/หดงบรวมในระดับเดือน",
      },
    ],

    tips: [
      {
        type: "การใช้งาน",
        text: "เปิดเป็นแท็บแรกของวัน ทุกเช้า 9:00 — Browser ตั้ง pin ไว้ก็ได้",
      },
      {
        type: "การใช้งาน",
        text: "คลิกบัญชีในตารางล่างสุดเพื่อเข้าหน้า \"แดชบอร์ดเดี่ยว\" ของบัญชีนั้นทันที — ไม่ต้องเปิด Account Selector แล้วเลือกใหม่",
      },
      {
        type: "การใช้งาน",
        text: "กดปุ่ม Refresh ถ้าตัวเลขดูไม่ตรง Meta Ads Manager — Meta API delay ได้ 30-180 นาที",
      },
      {
        type: "การตัดสินใจ",
        text: "ROAS การ์ดแดง (< target×0.75) ติดต่อกัน 3 วัน → เข้า Smart Scaling หยุด adset ที่กิน budget เยอะที่สุด",
      },
      {
        type: "การตัดสินใจ",
        text: "คนทักการ์ดขึ้น > 20% เทียบเมื่อวาน แต่ Orders การ์ดไม่ขึ้น → ปัญหาอยู่ที่ \"ตอบช้า\" หรือ \"คุยไม่ปิด\" ไม่ใช่ creative",
      },
      {
        type: "การตัดสินใจ",
        text: "Hourly Heatmap มีจุดเข้มชัด > 3 ชั่วโมงต่อวัน → เพิ่มทีมเซลส์ช่วงนั้น คุ้มกว่าเพิ่มงบโฆษณา",
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════
  // [Batch 1 · หน้า 2/3] ภาพรวมกลุ่มสินค้า (Group Overview)
  // ════════════════════════════════════════════════════════════════
  {
    id: "group-overview",
    title: "ภาพรวมกลุ่มสินค้า (Group Overview)",
    shortLabel: "ภาพรวมกลุ่มสินค้า",
    path: "/group-overview",
    category: "overview",
    what: "เปรียบเทียบผลงานระดับกลุ่มสินค้า (เช่น เจ้าขุน vs I SURE) — ใช้ตัดสินใจกระจายงบลงกลุ่มที่กำไรสูงกว่า",
    who: ["owner", "ceo", "content"],
    wireLayout: "group-overview",
    wireSpots: [
      { x: 4, y: 4, label: "Header + Date pills + ปุ่ม Export CSV + Refresh" },
      { x: 4, y: 18, label: "KPI 5 ใบ: กลุ่มทั้งหมด / Spend / คนทัก / Revenue / ROAS" },
      { x: 4, y: 50, label: "ตารางเปรียบเทียบกลุ่ม (8 คอลัมน์)" },
    ],

    elements: [
      { item: "หัวเรื่อง + คำอธิบาย", zone: "ซ้ายบน", kind: "panel" },
      { item: "Date Range pills", zone: "ขวาบน", kind: "filter" },
      { item: "ปุ่ม Export CSV", zone: "ขวาบน", kind: "button" },
      { item: "ปุ่ม Refresh", zone: "ขวาบน", kind: "button" },
      { item: "KPI: กลุ่มทั้งหมด", zone: "บนสุด", kind: "kpi" },
      { item: "KPI: Spend รวม", zone: "บนสุด", kind: "kpi" },
      { item: "KPI: คนทัก", zone: "บนสุด", kind: "kpi" },
      { item: "KPI: Revenue", zone: "บนสุด", kind: "kpi" },
      { item: "KPI: ROAS รวม", zone: "บนสุด", kind: "kpi" },
      { item: "ตารางเปรียบเทียบกลุ่ม (8 คอลัมน์)", zone: "กลางหน้า", kind: "table" },
    ],

    explanations: [
      {
        item: "หัวเรื่อง + คำอธิบาย",
        meaning: "ระบุชื่อหน้า \"ภาพรวมกลุ่มสินค้า\" + คำอธิบาย \"สรุปประสิทธิภาพแต่ละกลุ่มสินค้า\"",
      },
      {
        item: "Date Range pills",
        meaning: "เลือกช่วงเวลาที่ใช้คำนวณ KPI ทั้งหน้า — preset 1 / 3 / 7 / 14 / 30 / กำหนดเอง",
        note: "ค่าเริ่มต้น = 7 วัน",
      },
      {
        item: "ปุ่ม Export CSV",
        meaning: "ดาวน์โหลดตารางเป็นไฟล์ .csv (มี 10 คอลัมน์ + ชื่อไฟล์เป็นวันที่)",
        note: "ใช้ส่งรายงานต่อให้ทีมหรือนำเข้า Google Sheets",
      },
      {
        item: "ปุ่ม Refresh",
        meaning: "ดึงข้อมูลล่าสุดจาก Meta + คำนวณใหม่ทันที (ปกติ refresh ทุก 5 นาทีอัตโนมัติ)",
      },
      {
        item: "KPI: กลุ่มทั้งหมด",
        meaning: "จำนวนกลุ่มสินค้าทั้งหมดในระบบ (นับจากตาราง accountGroups)",
      },
      {
        item: "KPI: Spend รวม",
        meaning: "เงินที่จ่ายค่าโฆษณารวมทุกกลุ่มในช่วงเวลาที่เลือก",
      },
      {
        item: "KPI: คนทัก",
        meaning: "จำนวนคนทักรวมทุกกลุ่ม",
      },
      {
        item: "KPI: Revenue",
        meaning: "ยอดขายรวมทุกกลุ่ม (มูลค่าออเดอร์รวม)",
      },
      {
        item: "KPI: ROAS รวม",
        meaning: "Revenue รวม ÷ Spend รวม — ไม่ใช่ค่าเฉลี่ย ROAS ของแต่ละกลุ่ม",
        note: "ความต่างนี้สำคัญ: กลุ่มเล็ก ROAS สูงจะไม่ทำให้รวมสูงตาม",
      },
      {
        item: "ตารางเปรียบเทียบกลุ่ม (8 คอลัมน์)",
        meaning: "คอลัมน์: กลุ่ม / จำนวนบัญชี / Spend / ทัก / Orders / Revenue / ROAS / CTR",
        note: "เรียงตาม Spend จากมาก-น้อย โดย default · มี ROAS color (เขียว/เหลือง/แดง) ในคอลัมน์ ROAS",
      },
    ],

    formulas: [
      {
        name: "ROAS รวมต่อกลุ่ม",
        formula: "ROAS_group = Σ revenue ของทุกบัญชีในกลุ่ม ÷ Σ spend ของทุกบัญชีในกลุ่ม",
        colorRules: [
          { color: "green", when: "ROAS ≥ roasTarget ของกลุ่ม" },
          { color: "amber", when: "roasTarget × 0.75 ≤ ROAS < roasTarget" },
          { color: "red", when: "ROAS < roasTarget × 0.75" },
        ],
        example: "กลุ่ม A มี 3 บัญชี · spend รวม ฿30,000 · revenue ฿90,000 → ROAS = 3.00",
        dataSource: "Meta API (รวมจาก ad accounts ที่อยู่ในกลุ่ม) · roasTarget จาก DB (หน้า กลุ่มสินค้า)",
        refresh: "5 นาที",
      },
      {
        name: "CTR ต่อกลุ่ม",
        formula: "CTR = (Σ clicks ÷ Σ impressions) × 100",
        example: "1,500 clicks / 100,000 impressions = 1.5%",
        dataSource: "Meta API (impressions, clicks ของทุกแอดในกลุ่ม)",
        refresh: "5 นาที",
      },
      {
        name: "Cost/Msg ต่อกลุ่ม",
        formula: "Cost/Msg = Σ spend ÷ Σ messaging",
        example: "Spend ฿20,000 / 400 คนทัก = ฿50/คน",
        dataSource: "Meta API",
        refresh: "5 นาที",
      },
    ],

    useCases: [
      {
        title: "หากลุ่มที่กำไรดีที่สุด",
        steps: [
          "เลือก Date Range \"30 วัน\"",
          "ดูตาราง — sort คอลัมน์ ROAS จากสูงไปต่ำ (คลิกที่หัวคอลัมน์)",
          "ดูคอลัมน์ Spend ด้วย — กลุ่มที่ ROAS สูงแต่ Spend ต่ำ ยังขยายได้อีกเยอะ",
        ],
        outcome: "ระบุ \"พระเอก\" ของพอร์ตที่ควรกระจายงบเพิ่ม",
      },
      {
        title: "ตัดสินใจลดงบกลุ่มที่ไม่คุ้ม",
        steps: [
          "ดูแถวที่ ROAS แดง (< target×0.75)",
          "ดู Spend ในแถวเดียวกัน — สูงไหม?",
          "ถ้า Spend สูง + ROAS แดง = burn งบ → กดเข้าหน้า \"จัดการบัญชี\" หา ad accounts ในกลุ่มนี้ + เข้าไปลดงบใน Meta",
        ],
        outcome: "ลด burn rate ลง ก่อนถึงสิ้นเดือน",
      },
      {
        title: "ส่งรายงานกลุ่มสินค้ารายสัปดาห์",
        steps: [
          "เลือก Date Range \"7 วัน\"",
          "กด Export CSV — ได้ไฟล์ groups-YYYY-MM-DD.csv",
          "เปิดใน Google Sheets / Excel ทำรายงานต่อ",
        ],
        outcome: "ใช้ส่งรายงานให้ผู้บริหารทุกจันทร์",
      },
      {
        title: "ปรับ ROAS target ของกลุ่มให้ตรงเป้าจริง",
        steps: [
          "ดูแถวที่ ROAS สีเหลือง — เป็น \"เฝ้าระวัง\" จริงหรือเปล่า?",
          "ถ้ากำไรขั้นต้นจริงของกลุ่มนั้นทำให้ ROAS 1.8 ก็คุ้มแล้ว แต่ระบบบอก \"เฝ้าระวัง\" (target = 2.0) → ตั้ง target ผิด",
          "ไปหน้า \"กลุ่มสินค้า\" /groups · แก้ ROAS target ของกลุ่มนั้น",
        ],
        outcome: "ระบบเตือนแม่นยำขึ้น ไม่ตื่นตูมเกินจริง",
      },
    ],

    tips: [
      {
        type: "การใช้งาน",
        text: "ตั้งชื่อกลุ่มให้สั้น ชัด เช่น \"เจ้าขุน\", \"I SURE\" — เห็นในทุกหน้า",
      },
      {
        type: "การใช้งาน",
        text: "Export CSV ตอนสิ้นเดือนเก็บไว้เป็น snapshot ก่อนเริ่มเดือนใหม่",
      },
      {
        type: "การตัดสินใจ",
        text: "ROAS รวมที่นี่ ≠ ค่าเฉลี่ย ROAS ของแต่ละกลุ่ม — ถ้ามีกลุ่มใหญ่ที่ ROAS ต่ำ จะลากตัวเลขรวมลง แม้กลุ่มเล็กจะดี",
      },
      {
        type: "การตัดสินใจ",
        text: "กลุ่มที่ Spend < ฿1,000 ในช่วงที่เลือก → ตัวเลข ROAS อาจไม่น่าเชื่อถือ (sample เล็ก) ให้รอข้อมูลสะสมก่อนตัดสินใจ",
      },
      {
        type: "การตัดสินใจ",
        text: "ถ้าจะกระจายงบจากกลุ่ม A ไปกลุ่ม B → ดูว่ากลุ่ม B ยังมี \"ห้องว่าง\" (CTR ดี, Cost/Msg ต่ำ) ไหม ก่อนเพิ่ม — ไม่ใช่ทุกกลุ่มที่ขยายแล้ว ROAS ยังคงเดิม",
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════
  // [Batch 1 · หน้า 3/3] แดชบอร์ดบัญชีเดี่ยว (Single Account Dashboard)
  // ════════════════════════════════════════════════════════════════
  {
    id: "single-dashboard",
    title: "แดชบอร์ดบัญชีเดี่ยว (Single Account)",
    shortLabel: "แดชบอร์ดบัญชีเดี่ยว",
    path: "/dashboard",
    category: "overview",
    what: "เจาะดูบัญชีโฆษณาเดียว — ทั้ง KPI + เทรนด์ 14 วัน + สรุปรายวัน ใช้เมื่อต้องเข้าใจบัญชีเชิงลึก เช่น บัญชีงบเยอะที่สุดหรือบัญชีที่กำลังมีปัญหา",
    who: ["owner", "ceo", "content"],
    wireLayout: "single-dashboard",
    wireSpots: [
      { x: 4, y: 4, label: "Header + Account Selector + Date pills" },
      { x: 4, y: 18, label: "KPI 5 ใบ: Spend / คนทัก / Orders / Revenue / ROAS (+ เป้า)" },
      { x: 4, y: 40, label: "กราฟแนวโน้มรายวัน (Spend / Revenue / ROAS) — Multi-line 2 แกน" },
      { x: 4, y: 70, label: "ตารางสรุปรายวัน (6 คอลัมน์)" },
    ],

    elements: [
      { item: "Header + คำอธิบาย", zone: "ซ้ายบน", kind: "panel" },
      { item: "Account Selector (dropdown)", zone: "ขวาบน", kind: "selector" },
      { item: "Date Range pills", zone: "ขวาบน", kind: "filter" },
      { item: "KPI: Spend", zone: "บนสุด", kind: "kpi" },
      { item: "KPI: คนทัก", zone: "บนสุด", kind: "kpi" },
      { item: "KPI: Orders", zone: "บนสุด", kind: "kpi" },
      { item: "KPI: Revenue", zone: "บนสุด", kind: "kpi" },
      { item: "KPI: ROAS + เป้าใต้ตัวเลข", zone: "บนสุด", kind: "kpi" },
      { item: "กราฟแนวโน้มรายวัน (Multi-line)", zone: "กลางหน้า", kind: "chart" },
      { item: "ป้าย ROAS (สีตามสถานะ)", zone: "ในการ์ดกราฟ", kind: "badge" },
      { item: "ตารางสรุปรายวัน (6 คอลัมน์)", zone: "ด้านล่าง", kind: "table" },
    ],

    explanations: [
      {
        item: "Header + คำอธิบาย",
        meaning: "หัวเรื่อง \"แดชบอร์ดเดี่ยว\" — บอกชัดว่าคุณกำลังดูบัญชีเดียว ไม่ใช่ภาพรวม",
      },
      {
        item: "Account Selector (dropdown)",
        meaning: "เลือกบัญชีโฆษณาที่จะดู — แสดงเฉพาะบัญชีที่ active อยู่ในระบบ",
        note: "ระบบจำบัญชีที่เลือกล่าสุดไว้ในเครื่อง · ครั้งหน้ามาก็เปิดมาเป็นบัญชีเดิม",
      },
      {
        item: "Date Range pills",
        meaning: "ช่วงเวลาที่ใช้คำนวณ KPI + กราฟ + ตาราง",
        note: "ค่าเริ่มต้น = 14 วัน — เห็นเทรนด์ระยะกลางพอเหมาะ",
      },
      {
        item: "KPI: Spend",
        meaning: "ค่าโฆษณาที่บัญชีนี้จ่ายในช่วงเวลาที่เลือก",
      },
      {
        item: "KPI: คนทัก",
        meaning: "คนทักผ่านเพจของบัญชีนี้",
      },
      {
        item: "KPI: Orders",
        meaning: "จำนวนออเดอร์ที่บัญชีนี้สร้าง",
      },
      {
        item: "KPI: Revenue",
        meaning: "รายได้ที่บัญชีนี้สร้าง",
      },
      {
        item: "KPI: ROAS + เป้าใต้ตัวเลข",
        meaning: "ROAS ของบัญชี + แสดง \"เป้า X.X\" ใต้ตัวเลข เพื่อให้เทียบกับเป้าได้ทันที",
        note: "เป้า = roasTarget ของบัญชี (ตั้งใน /accounts) ถ้าไม่ตั้งจะ default = 2.0",
      },
      {
        item: "กราฟแนวโน้มรายวัน (Multi-line)",
        meaning: "เส้น 3 เส้นในกราฟเดียว: Spend (แดง) / Revenue (เขียว) / ROAS (น้ำเงิน) ใช้แกนซ้ายสำหรับเงิน + แกนขวาสำหรับ ROAS",
        note: "Hover เห็น tooltip บอกค่าทั้ง 3 ตัวพร้อมกัน",
      },
      {
        item: "ป้าย ROAS (สีตามสถานะ)",
        meaning: "แสดง ROAS ปัจจุบันมุมขวาบนของการ์ดกราฟ สีจะเปลี่ยนตามสถานะ (เขียว/เหลือง/แดง)",
        note: "ดู ROAS ของช่วงรวม ไม่ต้องเลื่อนขึ้นไปดูที่ KPI",
      },
      {
        item: "ตารางสรุปรายวัน (6 คอลัมน์)",
        meaning: "วันที่ / Spend / ทัก / Orders / Revenue / ROAS — ทุกแถวเป็น 1 วัน",
        note: "เห็นตัวเลขรายวันเป๊ะ ไม่ต้อง hover กราฟ — ใช้ copy/paste ทำรายงานได้",
      },
    ],

    formulas: [
      {
        name: "ROAS รายวัน",
        formula: "ROAS_day = revenue ของวันนั้น ÷ spend ของวันนั้น",
        colorRules: [
          { color: "green", when: "ROAS ≥ roasTarget ของบัญชี" },
          { color: "amber", when: "roasTarget × 0.75 ≤ ROAS < roasTarget" },
          { color: "red", when: "ROAS < roasTarget × 0.75" },
        ],
        example: "วันที่ 28 พ.ค. spend ฿2,000 revenue ฿5,400 → ROAS 2.70 (target 2.0 → สีเขียว)",
        dataSource: "Meta API (insights รายวัน)",
        refresh: "5 นาที",
      },
      {
        name: "ROAS รวม (KPI)",
        formula: "ROAS_total = Σ revenue / Σ spend ในช่วงที่เลือก",
        example: "Σ spend ฿20,000 · Σ revenue ฿50,000 → ROAS 2.50",
        dataSource: "Meta API",
        refresh: "5 นาที",
      },
      {
        name: "เป้า ROAS (roasTarget)",
        formula: "ดึงจาก DB ตาราง adAccounts.roasTarget — ตั้งในหน้า \"จัดการบัญชี\"",
        example: "เป้า 2.0 หมายถึง: จ่าย 1 บาท ต้องได้กลับ ≥ 2 บาทถึงคุ้ม",
        dataSource: "Database",
        refresh: "เปลี่ยนทันทีหลังบันทึก",
      },
    ],

    useCases: [
      {
        title: "ตรวจบัญชีที่ดูในตารางหน้าหลักแล้วน่าสงสัย",
        steps: [
          "จากหน้าหลัก คลิกชื่อบัญชีในตารางล่างสุด",
          "เปิดมาที่ Single Account ของบัญชีนั้นทันที (Account Selector ถูกตั้งให้แล้ว)",
          "ดู KPI + กราฟ 14 วัน หาช่วงที่ ROAS ดิ่ง",
          "เลื่อนลงดูตารางรายวัน — ระบุวันที่แน่นอนว่าเริ่มแย่ตั้งแต่วันไหน",
        ],
        outcome: "ระบุวันที่บัญชีเริ่มมีปัญหาเพื่อย้อนดู creative / settings",
      },
      {
        title: "Compare กราฟ 3 เส้นเพื่อหาสาเหตุ ROAS ตก",
        steps: [
          "ดูเส้นน้ำเงิน (ROAS) แกนขวา — มีจุดดิ่งวันไหน?",
          "ดูเส้นแดง (Spend) ในวันเดียวกัน — Spend ขึ้นไหม?",
          "ดูเส้นเขียว (Revenue) — Revenue ขึ้นตามไหม?",
          "ถ้า Spend ขึ้น แต่ Revenue ไม่ขึ้น = ขยายงบเร็วเกินไป creative ไม่ทัน → ลดงบกลับ",
          "ถ้า Spend คงเดิม Revenue ลด = audience ตันหรือ creative fatigue → เปลี่ยน creative",
        ],
        outcome: "วินิจฉัยสาเหตุ ROAS ตกได้แม่นยำ",
      },
      {
        title: "วางแผนงบบัญชีนี้สำหรับสัปดาห์หน้า",
        steps: [
          "เลือก Date Range \"14 วัน\"",
          "ดูค่าเฉลี่ย Spend/Revenue/ROAS จากกราฟและตาราง",
          "ถ้า ROAS เฉลี่ย > target × 1.2 → บัญชีนี้ \"มีห้องขยาย\" → เพิ่มงบสัปดาห์หน้า",
          "ถ้า ROAS เฉลี่ย < target × 0.8 → บัญชีนี้ \"อิ่มแล้ว\" → คงงบหรือพัก",
        ],
        outcome: "ตัดสินใจงบสัปดาห์หน้าโดยอิงข้อมูล 2 สัปดาห์ที่ผ่านมา",
      },
      {
        title: "ทำรายงานสรุปรายวันของบัญชีนี้",
        steps: [
          "เลือก Date Range ที่ต้องการ (เช่น 30 วัน)",
          "ตารางสรุปรายวันด้านล่างจะรีโหลดให้",
          "Copy ตารางไปวางใน Sheets / รายงาน",
        ],
        outcome: "ได้ตัวเลขรายวันใช้ในรายงานเดือน/ไตรมาส",
      },
    ],

    tips: [
      {
        type: "การใช้งาน",
        text: "Bookmark URL หลังเลือกบัญชีไว้ — Account Selector ถูกจำในเครื่อง เปิดครั้งหน้ามาเป็นบัญชีเดิม",
      },
      {
        type: "การใช้งาน",
        text: "Hover เส้นในกราฟค่อย ๆ ลากเมาส์ดูค่ารายวันแต่ละจุด — เร็วกว่าเลื่อนลงไปดูตาราง",
      },
      {
        type: "การตัดสินใจ",
        text: "ROAS วันแรกของแอดใหม่ มักผันผวน — รอ 3-5 วันแล้วค่อยตัดสินใจ ไม่ต้องตื่นเต้น",
      },
      {
        type: "การตัดสินใจ",
        text: "ถ้าเส้น Spend สูงขึ้นเรื่อย ๆ แต่เส้น Revenue แบน = scaling เกินจุดอิ่ม → ลดงบกลับมาที่ระดับเดิม + รอ ROAS ฟื้นก่อนค่อยลองใหม่",
      },
      {
        type: "การตัดสินใจ",
        text: "ก่อนปรับ roasTarget ใน /accounts ให้คิดจาก margin จริง: target = 1 ÷ (gross margin %) เช่น margin 30% → target ≥ 3.3",
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════
  // [Batch 2 จะเพิ่มอีก 16 หน้า ในรอบถัดไป]
  // ════════════════════════════════════════════════════════════════
];

// ───────────────────────────────────────────────────────────────────
// Glossary + FAQ — ของเดิม (Batch 2 จะขยายให้ครบ)
// ───────────────────────────────────────────────────────────────────
export const GLOSSARY: { term: string; meaning: string }[] = [
  { term: "Spend", meaning: "เงินที่จ่ายค่าโฆษณา (บาท)" },
  { term: "ROAS", meaning: "Return on Ad Spend — จ่าย 1 บาทได้กลับมากี่บาท เช่น ROAS 3 = จ่าย 1 ได้ 3" },
  { term: "ROAS target", meaning: "เป้า ROAS ที่ตั้งไว้สำหรับบัญชีหรือกลุ่ม ใช้แสดงสีเขียว/เหลือง/แดง" },
  { term: "คนทัก (Messaging)", meaning: "จำนวนคนทักแชทเข้ามาในเพจ" },
  { term: "ออเดอร์ (Orders / Purchases)", meaning: "จำนวนคำสั่งซื้อที่เกิดจากแอด" },
  { term: "รายได้ (Revenue / Purchase Value)", meaning: "ยอดขายรวม (บาท)" },
  { term: "AOV", meaning: "Average Order Value — รายได้ ÷ ออเดอร์" },
  { term: "CTR", meaning: "Click-Through Rate — clicks ÷ impressions × 100" },
  { term: "Cost/Msg", meaning: "ค่าใช้จ่ายต่อ 1 คนทัก = spend ÷ messaging" },
  { term: "Cost/Purchase", meaning: "ค่าใช้จ่ายต่อ 1 ออเดอร์ = spend ÷ orders" },
  { term: "Impressions", meaning: "จำนวนครั้งที่แอดถูกแสดง" },
  { term: "Clicks", meaning: "จำนวนครั้งที่มีคนคลิกแอด" },
  { term: "Adset", meaning: "ชุดโฆษณา — หนึ่ง adset มีหลาย ad ภายใน" },
  { term: "Cohort", meaning: "กลุ่มแอดที่เริ่มยิงในช่วงเดียวกัน ใช้วิเคราะห์อายุของแอด" },
  { term: "Smart Scaling", meaning: "ระบบ AI แนะนำการปรับงบรายวัน อิง score ที่คำนวณจาก ROAS + CTR" },
  { term: "Persona", meaning: "มุมมองการแสดงผล: Buyer (คนยิงแอด) vs Sales (เซลส์)" },
  { term: "Lock Period", meaning: "ล็อกงวดคอมมิชชั่นไม่ให้ยอดเปลี่ยนหลังปิดเดือน" },
  { term: "Magic Invite Link", meaning: "ลิงก์เชิญส่วนตัวที่ Owner สร้างให้พนักงานคนเดียว ระบุ Role ในตัวลิงก์" },
  { term: "Sparkline", meaning: "กราฟเส้นเล็ก ๆ ใน KPI card แสดงเทรนด์ 7 วันโดยย่อ" },
  { term: "Urgency Badge", meaning: "ป้ายแสดงสถานะคนทักชั่วโมงนี้ (พีค / กำลังขึ้น / ปกติ / เงียบ)" },
];

export const FAQS: { q: string; a: string }[] = [
  {
    q: "ROAS เท่าไหร่ถึงดี?",
    a: "ขึ้นกับ margin สินค้า — สินค้าทั่วไป ROAS ≥ 2.5 ถือว่าคุ้ม สินค้า margin บาง (เครื่องสำอาง / อาหารเสริม) ควร ≥ 3.5 ขึ้นไป — ดูเป้าที่ตั้งไว้ในหน้า \"กลุ่มสินค้า\" หรือ \"จัดการบัญชี\"",
  },
  {
    q: "ทำไมตัวเลขในเว็บไม่ตรงกับ Meta Ads Manager?",
    a: "Meta API delay 30-180 นาทีสำหรับข้อมูลใหม่ + ระบบเรา cache ผลลัพธ์ 5 นาทีเพื่อความเร็ว — กดปุ่ม Refresh ขวาบนเพื่อดึงสด หรือเปิดดู Meta Ads Manager คู่กันเทียบ",
  },
  {
    q: "ข้อมูลอัปเดตบ่อยแค่ไหน?",
    a: "Auto-refresh: KPI/Hub ทุก 5 นาที · Realtime/Live ทุก 1 นาที · AI Insight ทุก 15 นาที · กดปุ่ม Refresh ดึงสดได้ทุกเมื่อ",
  },
  {
    q: "Persona Buyer กับ Sales ต่างกันยังไง?",
    a: "Buyer (คนยิงแอด): เน้น KPI + Smart Scaling + Top Ads · Sales (เซลส์): เพิ่ม panel LIVE 1 ชม.ล่าสุด แสดงคนทัก realtime + urgency badge เพื่อกระตุ้นยอด — สลับได้ตลอด localStorage จะจำให้",
  },
  {
    q: "Export CSV ออกมาทำอะไรต่อได้บ้าง?",
    a: "เปิดใน Google Sheets / Excel → ทำ pivot ต่อ, ส่งผู้บริหาร, เก็บ snapshot สิ้นเดือน, หรือนำเข้า BI tool",
  },
];

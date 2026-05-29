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
  | "ล่างสุด"
  | "ล่างขวา"
  | "ล่างซ้าย"
  | "บนซ้าย/ขวา"
  | "คอลัมน์สุดท้าย"
  | "ขวาบนของตาราง"
  | "ขวาบนของการ์ด"
  | "ขวา (slide-in)"
  | "ขวาของ picker"
  | "กลางจอ"
  | "ในตาราง"
  | "แต่ละแถว"
  | "ล่างขวา"
  | "Tab ประวัติ"
  | "hover"
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
    | "selector"
    | "datepicker"
    | "modal";
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
    | "generic-form"
    | "leaderboard"
    | "comparison"
    | "ai-advisor"
    | "alerts"
    | "cohort"
    | "ad-intelligence"
    | "adset-detail"
    | "benchmark"
    | "smart-scaling"
    | "share-links"
    | "commission-table"
    | "commission-dashboard"
    | "commission-personal"
    | "commission-settings"
    | "accounts-settings"
    | "groups-settings"
    | "user-management"
    | "profile";
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
    whoYouAre:
      "คุณคือผู้สร้าง workspace นี้และเป็นเจ้าของบัญชีโฆษณา Meta — มีสิทธิ์ระดับสูงสุดทุกอย่าง: เพิ่ม/ลบบัญชีโฆษณา, จัดกลุ่มสินค้า, ออก Magic Invite Link เชิญทีม, กำหนด role, ดูคอมมิชชั่นทั้งหมด, ล็อกงวด, ตั้ง Smart Scaling autopilot, ปรับ ROAS target และดู Audit Log — ทุกการเปลี่ยนแปลงระดับสูงต้องผ่านคุณ",
    pagesUsed: [
      { page: "หน้าหลัก (Hub Dashboard) `/`", purpose: "เปิดวันด้วยภาพรวม KPI 5 ตัว + AI Insight + Smart Scaling แนะนำ" },
      { page: "ภาพรวมกลุ่มสินค้า `/group-overview`", purpose: "ดูว่ากลุ่มไหนทำกำไร กลุ่มไหนต้องหยุด" },
      { page: "แดชบอร์ดบัญชีเดี่ยว `/dashboard/:id`", purpose: "เจาะลึกบัญชีที่ผิดปกติ" },
      { page: "ตั้งค่าบัญชีโฆษณา `/accounts`", purpose: "เพิ่ม/แก้ Access Token, ตั้ง ROAS target, ผูกกลุ่ม" },
      { page: "ตั้งค่ากลุ่มสินค้า `/groups`", purpose: "สร้าง/ลบกลุ่มสินค้าตามไลน์โปรดักต์" },
      { page: "จัดการผู้ใช้ `/users`", purpose: "ออก Magic Invite Link + ดู/ลบ user + เปลี่ยน role" },
      { page: "ตั้งค่าคอมมิชชั่น `/commission/settings`", purpose: "ตั้ง tier rate, attribution rule, lock/unlock งวด" },
      { page: "ตารางคอมมิชชั่น `/commission`", purpose: "ตรวจยอดคอมรายงวดก่อนล็อก" },
      { page: "Adset Detail `/adset/:accountId/:adsetId`", purpose: "เจาะ adset รายตัว ดู ads ภายใน + กราฟรายวัน" },
      { page: "Alerts `/alerts`", purpose: "ตั้งกฎ + ช่อง LINE/Webhook + ดูประวัติ" },
      { page: "AI Advisor `/ai-advisor`", purpose: "ขอวิเคราะห์เชิงกลยุทธ์ก่อนตัดสินใจ" },
      { page: "Smart Scaling `/smart-scaling`", purpose: "ตั้ง autopilot + sandbox + ดู scale log" },
    ],
    dailyRoutine: [
      "เช้า (5 นาที): เปิดหน้าหลัก ดู KPI 5 ตัว — Spend / คนทัก / Orders / Revenue / ROAS — ถ้า ROAS เขียวผ่าน, ถ้าเหลืองคลิกเข้าบัญชีที่เหลือง",
      "เช้า (5 นาที): อ่าน AI Insight ทั้งย่อหน้า + ดู Smart Scaling action — ถ้าเป็น 🚀/📉/⛔ ให้กดยืนยันหรือเข้า sandbox ทดลองก่อน",
      "บ่าย (5 นาที): เปิด Group Overview สลับ toggle Spend ↔ ROAS — ดูกลุ่มที่กิน Spend แต่ ROAS ต่ำเป็นอันดับแรก",
      "เย็น (10 นาที): ดู Alerts ที่ยังไม่อ่าน + ตอบสนอง critical alert",
      "ทุกสิ้นเดือน: เข้า Commission Settings → Lock งวดเดือนนั้น + Export CSV ส่งบัญชี",
      "ทุกสิ้นเดือน: ตรวจ Commission Personal ของพนักงานทุกคนก่อนจ่ายเงิน",
    ],
    metricsToWatch: [
      "ROAS รวมทุกบัญชี (เทียบกับ ROAS target) — เป้าหลักของธุรกิจ",
      "Spend รวมรายวัน vs ค่าเฉลี่ย 7 วัน — ขยายงบเร็วเกินไปไหม?",
      "Revenue รวมเดือนนี้ vs เดือนก่อน — เทรนด์ทำกำไร",
      "จำนวน critical alerts ที่ยังไม่ตอบสนอง",
      "% บัญชีที่ status = 'ดี' — เป้า ≥ 70%",
      "Commission รวมเดือนนี้ — ต้นทุนคอม vs revenue",
      "Smart Scaling action ที่รอ approve",
    ],
  },
  {
    role: "ceo",
    whoYouAre:
      "คุณคือผู้บริหารร่วมที่ Owner เชิญเข้ามาด้วย Magic Invite Link — สิทธิ์เกือบเท่า Owner ทุกประการ (ดูข้อมูล/แก้ค่า/ออกลิงก์เชิญ/อนุมัติ Smart Scaling/ดูคอมทุกคน) ยกเว้น 2 อย่าง: ลบ workspace ทั้งหมด และเอา Owner ออก — เหมาะกับผู้บริหารระดับกลาง-สูงที่ดูแล operation รายวันแทนเจ้าของ",
    pagesUsed: [
      { page: "หน้าหลัก `/`", purpose: "เริ่มวันด้วยภาพรวม" },
      { page: "ภาพรวมกลุ่มสินค้า `/group-overview`", purpose: "ตัดสินใจระดับพอร์ต — ขยาย/หยุดกลุ่มไหน" },
      { page: "เปรียบเทียบช่วงเวลา `/comparison`", purpose: "เทียบสัปดาห์นี้กับสัปดาห์ก่อนเพื่อ report บอร์ด" },
      { page: "Leaderboard `/leaderboard`", purpose: "ดูบัญชี/กลุ่ม/แอด Top 5 ของเดือน" },
      { page: "AI Advisor `/ai-advisor`", purpose: "ขอความเห็นจาก Performance Analyst + Sales Conversion Analyst" },
      { page: "Cohort `/cohort`", purpose: "ดูอายุแอด/LTV ลูกค้า — วางแผนระยะยาว" },
      { page: "Alerts `/alerts`", purpose: "อ่าน alert critical ที่ตกค้าง" },
      { page: "Commission Dashboard `/commission/dashboard`", purpose: "ดูต้นทุนคอม vs revenue" },
    ],
    dailyRoutine: [
      "เช้า: ดู KPI หน้าหลัก + AI Insight (5 นาที)",
      "วันจันทร์: เปิด PerformanceComparison ตั้ง rangeA = สัปดาห์นี้ vs rangeB = สัปดาห์ก่อน — copy ตาราง delta % ส่งทีม",
      "วันศุกร์: เปิด Leaderboard เลือก metric = ROAS และ Spend — ส่งสองรายการให้ทีม content",
      "ทุกสิ้นเดือน: ดู Commission Dashboard เทียบ commission/revenue ratio (ควร < 8-10%)",
      "ทุกครั้งมี Alert critical: เข้าหน้า Alerts → ดูบัญชีนั้นใน Single Dashboard → ตัดสินใจร่วมกับ content",
    ],
    metricsToWatch: [
      "ROAS รวม (ภาพรวม)",
      "Revenue สัปดาห์นี้ vs สัปดาห์ก่อน (delta %)",
      "Spend รวมเดือนนี้ vs budget plan",
      "Commission/Revenue ratio (ควร < 8-10%)",
      "Top 5 / Bottom 5 ใน Leaderboard",
      "จำนวน alerts critical ที่ยังไม่จัดการ",
    ],
  },
  {
    role: "content",
    whoYouAre:
      "คุณคือทีมยิงแอด+ครีเอทีฟ — รับผิดชอบสร้าง creative, ตั้ง campaign, ปรับงบรายวัน, แก้ audience, และนำคำแนะนำของ Smart Scaling ไปทำจริงใน Meta Ads Manager — เห็นข้อมูลครบทุกบัญชีที่ Owner ให้สิทธิ์ ดูคอมรวมในเพจ Commission Dashboard ได้ แต่ไม่เห็นยอดคอมรายบุคคลของคนอื่น",
    pagesUsed: [
      { page: "หน้าหลัก `/`", purpose: "เริ่มวัน — KPI + Smart Scaling + Top Ads" },
      { page: "Smart Scaling `/smart-scaling`", purpose: "หน้าหลักทำงานประจำวัน — รับ action 5 ระดับ" },
      { page: "แดชบอร์ดบัญชีเดี่ยว `/dashboard/:id`", purpose: "เจาะบัญชีที่ผลผิดปกติ" },
      { page: "Ads Intelligence `/ad-intelligence`", purpose: "ตาราง adset ทั้งหมด filter หา winner/loser" },
      { page: "Adset Detail `/adset/:id`", purpose: "เจาะ adset เดียว ดู ads + กราฟรายวัน" },
      { page: "Cohort `/cohort`", purpose: "ดูอายุแอด — แอดเก่ายัง work ไหม?" },
      { page: "Benchmark `/ad-metric-benchmark`", purpose: "เทียบแอดตัวเองกับ P75/P90 ของพอร์ต" },
      { page: "AI Advisor `/ai-advisor`", purpose: "ขอ Creative Strategist วิเคราะห์ชื่อแอด" },
    ],
    dailyRoutine: [
      "เช้า 9:00 (15 นาที): เปิดหน้าหลัก ดู Smart Scaling — จด 🚀 (ขึ้น +30%) และ ⛔ (pause) ลงโน้ต",
      "เช้า 9:15 (20 นาที): เข้า Meta Ads Manager ทำตาม action",
      "บ่าย 14:00 (10 นาที): เปิด Ad Intelligence sort by ROAS ASC — ดู bottom 10 adset → ตัดสินใจปิด/แก้ creative",
      "บ่าย 14:10 (5 นาที): เปิด Top Ads ใน Hub — ลอกชื่อ adset winner ไปทำตัวใหม่",
      "เย็น 17:00 (5 นาที): ตรวจ ROAS หน้าหลักอีกครั้ง — ถ้าตกลงจากเช้าให้รีบเช็กบัญชีใดที่กดงบ",
      "ก่อนเริ่ม creative campaign ใหม่: เปิด Benchmark → ดู P75 ของ CTR + Cost/Msg — ตั้งเป้า realistic",
      "ทุกสัปดาห์: เปิด Cohort by week — ดูว่าแอดสัปดาห์ก่อนยัง work ไหม",
    ],
    metricsToWatch: [
      "ROAS รายบัญชีที่ตัวเองดูแล (เทียบ target)",
      "CTR — ถ้าตก < 1% สำหรับ DTC = ครีเอทีฟล้า ต้องทำใหม่",
      "Cost/Msg — เทียบกับ baseline กลุ่มสินค้าเดียวกัน",
      "Smart Scaling Score — ≥ 1.5 → ขึ้นงบได้กล้า",
      "Top Ads ใน Hub — ลอกชื่อไปทำตัวใหม่",
      "อายุแอด (Cohort) — ≥ 30 วันที่ยังดี = winner ของจริง",
      "Hot Pages — เพจไหนมาแรง กระตุ้นยอดต่อ",
    ],
  },
  {
    role: "staff",
    whoYouAre:
      "คุณคือพนักงานปิดการขาย/แอดมินเพจ — ตอบแชต, ปิดออเดอร์, ส่งของ — รับคอมมิชชั่นตามยอดที่ปิดได้ ระบบ track ผ่าน attribution rule ที่ Owner ตั้ง — สิทธิ์การมองเห็นถูกจำกัด: เห็น KPI ภาพรวม (อ่านอย่างเดียว), ดูคอมของตัวเองเท่านั้น, แก้ Smart Scaling/Settings ไม่ได้",
    pagesUsed: [
      { page: "หน้าหลัก `/`", purpose: "สลับ Persona = Sales ใช้ LIVE 1 ชม. ล่าสุดเป็นหลัก" },
      { page: "คอมมิชชั่นของฉัน `/commission/personal`", purpose: "เช็คยอดคอม — งวดปัจจุบัน + งวดล็อกแล้ว" },
      { page: "Profile `/profile`", purpose: "เปลี่ยนรหัส, ตั้ง LINE ID รับ alert" },
    ],
    dailyRoutine: [
      "เช้า 9:00: เปิดหน้าหลัก สลับ Persona เป็น Sales — ดู LIVE 1 ชม. ว่าคนทักไหลเข้ามากี่คน",
      "ทั้งวัน: เฝ้า Hourly Heatmap — ถ้าช่องชั่วโมงนี้สีเข้ม = ยอดมาแรง รีบตอบ",
      "ทั้งวัน: ถ้าเห็น Urgency badge = 'พีค 🔥' → ขอ backup จากเพื่อน",
      "เย็น 18:00 (3 นาที): เปิด Commission Personal ดูยอดคอมสะสมของวัน",
      "ทุกสิ้นเดือน: ตรวจ Commission Personal — งวดที่เพิ่งล็อก ถ้ายอดผิดรีบทัก Owner (หลังจ่ายเงินแล้ว unlock ยาก)",
    ],
    metricsToWatch: [
      "คนทัก 1 ชม. ล่าสุด (LIVE panel) — ≥ 1.5x ค่าเฉลี่ย = พีค",
      "Urgency badge บนหน้าหลัก",
      "ช่องสีเข้มใน Hourly Heatmap วันนี้",
      "ยอดคอมงวดนี้ (Commission Personal — งวดปัจจุบัน)",
      "ยอดคอมงวดล่าสุดที่ล็อก (จะจ่ายเร็ว ๆ นี้)",
    ],
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
  // [Batch 2 · ก้อน A · 8 หน้า analysis]
  // ════════════════════════════════════════════════════════════════

  // 4/19 ─ Leaderboard
  {
    id: "leaderboard",
    title: "จัดอันดับ (Leaderboard)",
    shortLabel: "จัดอันดับ",
    path: "/leaderboard",
    category: "analysis",
    what: "จัดอันดับบัญชี/กลุ่มสินค้าตามตัวชี้วัดที่เลือก (ROAS / Revenue / Spend / Orders / คนทัก) — เห็นผู้ชนะและผู้แพ้ในงวดเดียวกัน เปรียบเทียบกันได้ทันที",
    who: ["owner", "ceo", "content"],
    wireLayout: "leaderboard",
    wireSpots: [
      { x: 4, y: 5, label: "Toolbar: Metric selector / Mode (บัญชี/กลุ่ม) / Date pills" },
      { x: 4, y: 18, label: "Top 3 Podium (Card ใหญ่ 3 ใบ — เหรียญทอง/เงิน/ทองแดง)" },
      { x: 4, y: 45, label: "ตาราง Ranking เต็มหน้า (Sortable + Delta vs งวดก่อน)" },
      { x: 4, y: 82, label: "Mini-chart bar เปรียบเทียบทุกแถว" },
    ],
    elements: [
      { item: "Metric Selector (ROAS / Revenue / Spend / Orders / คนทัก)", zone: "ซ้ายบน", kind: "selector" },
      { item: "Mode Toggle (บัญชี / กลุ่มสินค้า)", zone: "ซ้ายบน", kind: "toolbar" },
      { item: "Date Range pills", zone: "ขวาบน", kind: "filter" },
      { item: "Podium Card อันดับ 1", zone: "กลางบน", kind: "card" },
      { item: "Podium Card อันดับ 2-3", zone: "บนซ้าย/ขวา", kind: "card" },
      { item: "ตารางอันดับ (อันดับ / ชื่อ / Metric / Delta / Mini-bar)", zone: "กลางหน้า", kind: "table" },
      { item: "Delta % vs งวดก่อน (badge ขึ้น/ลง)", zone: "คอลัมน์สุดท้าย", kind: "badge" },
      { item: "ปุ่ม Export CSV", zone: "ขวาบนของตาราง", kind: "button" },
    ],
    explanations: [
      { item: "Metric Selector", meaning: "เลือกตัวชี้วัดที่ใช้จัดอันดับ — เปลี่ยนแล้วทั้งตารางและ Podium คำนวณใหม่ทันที" },
      { item: "Mode Toggle", meaning: "บัญชี = จัดอันดับแต่ละบัญชีโฆษณา · กลุ่มสินค้า = รวมบัญชีในกลุ่มเดียวกันก่อนค่อยจัดอันดับ" },
      { item: "Podium Card", meaning: "3 อันดับแรกแสดงเป็นการ์ดใหญ่ — มีเหรียญทอง/เงิน/ทองแดง + ตัวเลข Metric + Delta จากงวดก่อน", note: "คลิก Podium เพื่อข้ามไปหน้าแดชบอร์ดเดี่ยวของบัญชีนั้น" },
      { item: "Mini-bar", meaning: "แท่งแนวนอนในตาราง — ยาวสุดเท่ากับอันดับ 1 ใช้เปรียบเทียบสัดส่วน 'ห่างกันเท่าไหร่' ได้ทันที" },
      { item: "Delta % vs งวดก่อน", meaning: "เทียบ Metric กับงวดเดียวกันก่อนหน้า (เช่น 7 วันก่อน) — สีเขียวขึ้น สีแดงลง", note: "ROAS / Revenue / Orders / คนทัก: ขึ้น = ดี · Spend: ขึ้น = แดง (จ่ายแพงขึ้น)" },
    ],
    formulas: [
      {
        name: "Mini-bar Width",
        formula: "width(i) = Metric(i) ÷ Metric(อันดับ 1) × 100%",
        example: "อันดับ 1 ROAS 3.2 · อันดับ 5 ROAS 1.6 → bar อันดับ 5 ยาว 50% ของอันดับ 1",
        dataSource: "คำนวณ client-side จาก ranked list",
        refresh: "5 นาที (พร้อม KPI)",
      },
      {
        name: "Delta vs งวดก่อน",
        formula: "Δ% = (Metric ช่วงนี้ − Metric ช่วงก่อนหน้าเท่ากัน) ÷ Metric ก่อน × 100",
        colorRules: [
          { color: "green", when: "Metric ที่ยิ่งสูงยิ่งดี (ROAS/Revenue/Orders/คนทัก) + Δ > 0" },
          { color: "red", when: "Metric ที่ยิ่งสูงยิ่งดี + Δ < 0" },
          { color: "red", when: "Spend + Δ > 0 (จ่ายเพิ่ม)" },
        ],
        example: "7 วันก่อน ROAS 2.0 · 7 วันนี้ ROAS 2.6 → Δ +30% สีเขียว",
        dataSource: "Meta API insights 2 ช่วง",
        refresh: "5 นาที",
      },
    ],
    useCases: [
      { title: "อยากรู้ว่าบัญชีไหนทำกำไรดีที่สุดอาทิตย์นี้", steps: ["Metric = ROAS", "Date = 7 วัน", "ดู Podium อันดับ 1 + เปิดดูแดชบอร์ดเดี่ยวเพื่อหาเคล็ดลับ"] },
      { title: "หาบัญชีที่จ่ายงบเยอะแต่ผลลัพธ์น้อย", steps: ["Metric = Spend (sort desc)", "เทียบกับ ROAS ในคอลัมน์เดียวกัน → ถ้า Spend สูงแต่ ROAS ต่ำ ควรลดงบ"] },
      { title: "นำเสนอผู้บริหารงวดสิ้นเดือน", steps: ["Mode = กลุ่มสินค้า", "Metric = Revenue", "Export CSV → ใส่ในสไลด์"] },
      { title: "เช็คว่ากลุ่มสินค้าใดดีขึ้นมากที่สุด", steps: ["Mode = กลุ่ม", "Sort คอลัมน์ Delta % desc → กลุ่มที่ขึ้นมากสุดอยู่บนสุด"] },
    ],
    tips: [
      { type: "การใช้งาน", text: "กดหัวคอลัมน์ใดก็ได้เพื่อ sort · กดซ้ำเพื่อสลับ asc/desc" },
      { type: "การใช้งาน", text: "Export CSV เปิดใน Sheets ทำ pivot ต่อได้ — ชื่อไฟล์มีวันที่ฝังไว้" },
      { type: "การตัดสินใจ", text: "อย่าตัดสินจาก Metric เดียว — ROAS อันดับ 1 อาจมี Spend แค่ ฿200 (สถิติน้อย ไม่เสถียร) ดู Spend ประกอบเสมอ" },
      { type: "การตัดสินใจ", text: "Mode 'กลุ่มสินค้า' เหมาะกับการเทียบสายผลิตภัณฑ์ · Mode 'บัญชี' เหมาะกับการเทียบทีมที่ดูแลแต่ละบัญชี" },
    ],
  },

  // 5/19 ─ Performance Comparison
  {
    id: "comparison",
    title: "เปรียบเทียบช่วงเวลา (Performance Comparison)",
    shortLabel: "เปรียบเทียบช่วงเวลา",
    path: "/comparison",
    category: "analysis",
    what: "เทียบประสิทธิภาพระหว่าง 2 ช่วงเวลา (เช่น สัปดาห์นี้ vs สัปดาห์ก่อน) ทุก KPI พร้อมกัน เห็นว่าทิศทางขึ้นหรือลง พร้อม % การเปลี่ยนแปลง",
    who: ["owner", "ceo", "content"],
    wireLayout: "comparison",
    wireSpots: [
      { x: 4, y: 5, label: "Toolbar: Account / Period A (วันที่) / Period B (วันที่)" },
      { x: 4, y: 22, label: "5 KPI side-by-side (Period A | Period B | Δ%)" },
      { x: 4, y: 48, label: "กราฟ KPI ทับซ้อน (Period A vs B)" },
      { x: 4, y: 78, label: "ตาราง breakdown รายบัญชี/รายกลุ่ม" },
    ],
    elements: [
      { item: "Account Selector", zone: "ซ้ายบน", kind: "selector" },
      { item: "Period A Picker (วันเริ่ม-วันจบ)", zone: "กลางบน", kind: "datepicker" },
      { item: "Period B Picker (วันเริ่ม-วันจบ)", zone: "กลางบน", kind: "datepicker" },
      { item: "Preset Quick Compare (7d vs ก่อน / MTD vs เดือนก่อน / YTD vs ปีก่อน)", zone: "ขวาบน", kind: "selector" },
      { item: "การ์ดเปรียบเทียบ 5 KPI", zone: "กลางหน้า", kind: "kpi" },
      { item: "กราฟ KPI ทับซ้อน (Line/Area dual)", zone: "กลางหน้า", kind: "chart" },
      { item: "ตาราง breakdown รายบัญชี/รายกลุ่ม", zone: "ล่างสุด", kind: "table" },
      { item: "ปุ่ม Swap (สลับ A↔B)", zone: "ขวาของ picker", kind: "button" },
    ],
    explanations: [
      { item: "Period A / B", meaning: "กำหนด 2 ช่วงเวลาเอง — เลือกได้อิสระ (ไม่ต้องยาวเท่ากันแต่แนะนำให้เท่ากันเพื่อความแฟร์)" },
      { item: "Preset Quick Compare", meaning: "ปุ่มตั้งช่วงให้อัตโนมัติ: '7 วันล่าสุด vs 7 วันก่อนหน้า' / 'เดือนนี้ vs เดือนก่อน' / 'ปีนี้ vs ปีก่อน'" },
      { item: "การ์ดเปรียบเทียบ KPI", meaning: "แสดง Period A | Period B | Δ% — สีเขียวคือทิศทางดี สีแดงคือแย่ลง", note: "คลิกการ์ดเพื่อ filter กราฟด้านล่างเหลือเฉพาะ KPI นั้น" },
      { item: "กราฟทับซ้อน", meaning: "เส้น Period A กับ B จัดให้เริ่มที่จุดเดียวกัน (normalize ตามวันที่ 1 ของช่วง) เพื่อให้ดูง่าย" },
      { item: "ปุ่ม Swap", meaning: "สลับช่วง A↔B ในการกดเดียว — เผื่อต้องการดูทิศทาง 'ลด' แทน 'เพิ่ม'" },
    ],
    formulas: [
      {
        name: "Δ% หลัก",
        formula: "Δ% = (Metric B − Metric A) ÷ Metric A × 100",
        colorRules: [
          { color: "green", when: "Up-metric (ROAS/Revenue/Orders/คนทัก) + Δ > 0" },
          { color: "red", when: "Spend + Δ > 0" },
        ],
        example: "A=฿100k Spend · B=฿120k Spend → Δ +20% สีแดง (จ่ายเพิ่ม)",
        dataSource: "Meta API ดึงข้อมูล 2 ช่วงคู่กัน",
        refresh: "5 นาที",
      },
      {
        name: "Effective ROAS Lift",
        formula: "Lift = ROAS_B − ROAS_A (หน่วยเท่า)",
        example: "A 2.0 · B 2.6 → Lift +0.6 เท่า (จ่าย 1 บาทได้คืนเพิ่มขึ้น 60 สตางค์)",
        dataSource: "คำนวณจากข้อมูลที่โหลดอยู่",
        refresh: "5 นาที",
      },
    ],
    useCases: [
      { title: "ดูว่าโปรโมชั่นที่ทำสัปดาห์นี้ดีขึ้นจริงไหม", steps: ["Preset = 7d vs ก่อน", "ดูคนทัก & Revenue Δ% — ถ้าทั้งคู่บวกแปลว่าโปรเวิร์ก"] },
      { title: "เทียบสองเดือนเต็มสำหรับนำเสนอบอร์ด", steps: ["Preset = MTD vs เดือนก่อน", "Export CSV ตาราง breakdown", "สังเกตว่ากลุ่มไหนพลิกจากแดงเป็นเขียว"] },
      { title: "หาว่าค่าโฆษณาเพิ่มขึ้นเพราะอะไร", steps: ["ดู Spend Δ%", "ถ้าเพิ่มแต่ Revenue ไม่ตาม → ดูตาราง breakdown ว่าเป็นบัญชี/กลุ่มไหน"] },
      { title: "เทียบ A/B test creative 2 ช่วง", steps: ["กำหนด A = ก่อนเปลี่ยน creative", "B = หลังเปลี่ยน", "ดู CTR + ROAS Δ%"] },
    ],
    tips: [
      { type: "การใช้งาน", text: "ตั้งช่วง A กับ B ให้ความยาวเท่ากันเสมอ ไม่เช่นนั้น Δ จะเทียบกันไม่แฟร์" },
      { type: "การใช้งาน", text: "กด Swap แทนการเปลี่ยน datepicker เอง — เร็วและไม่พลาด" },
      { type: "การตัดสินใจ", text: "ถ้า Spend ลดแต่ Revenue เพิ่ม → กำไรขึ้นเต็มเปา ควรขยายโมเดลนี้" },
      { type: "การตัดสินใจ", text: "ROAS Lift ≥ +0.3 ในช่วง 7 วัน ถือว่ามีนัยสำคัญ · น้อยกว่านั้นอาจเป็น noise" },
    ],
  },

  // 6/19 ─ AI Advisor
  {
    id: "ai-advisor",
    title: "AI แนะนำ (AI Advisor)",
    shortLabel: "AI แนะนำ",
    path: "/ai-advisor",
    category: "analysis",
    what: "ที่ปรึกษา AI 6 บทบาท (Performance / Budget / Creative / Audience / Risk / Sales Conversion) วิเคราะห์ข้อมูลทั้งบัญชีแล้วให้คำแนะนำที่นำไปทำต่อได้จริง พร้อม Chat ถาม-ตอบ",
    who: ["owner", "ceo", "content"],
    wireLayout: "ai-advisor",
    wireSpots: [
      { x: 4, y: 5, label: "Toolbar: Role chips 6 ตัว / Account / Date pills" },
      { x: 4, y: 18, label: "การ์ดสรุปข้อเสนอ AI (Streaming markdown)" },
      { x: 4, y: 55, label: "Action Items (checkbox list ที่ทำต่อได้)" },
      { x: 4, y: 75, label: "Chat ถามคำถามต่อ (ส่งบริบทไปด้วย)" },
    ],
    elements: [
      { item: "Role Chips 6 ตัว (Performance / Budget / Creative / Audience / Risk / Sales)", zone: "ซ้ายบน", kind: "selector" },
      { item: "Account Selector", zone: "ซ้ายบน", kind: "selector" },
      { item: "Date Range pills (เริ่มต้น 7 วัน)", zone: "ขวาบน", kind: "filter" },
      { item: "ปุ่ม Regenerate", zone: "ขวาบนของการ์ด", kind: "button" },
      { item: "การ์ดสรุปข้อเสนอ (Streamdown markdown)", zone: "กลางหน้า", kind: "panel" },
      { item: "Action Items (checkbox)", zone: "กลางหน้า", kind: "panel" },
      { item: "AIChatBox", zone: "ล่างสุด", kind: "panel" },
      { item: "ปุ่ม Copy Summary", zone: "ขวาบนของการ์ด", kind: "button" },
    ],
    explanations: [
      { item: "Role Chips", meaning: "แต่ละบทบาทถาม AI ด้วยมุมมองต่างกัน: Performance = วิเคราะห์ KPI · Budget = แนะนำงบ · Creative = ดูชื่อ/หัวเรื่องแอด · Audience = กลุ่มเป้าหมาย · Risk = ตรวจสัญญาณเสี่ยง · Sales = วิเคราะห์ funnel" },
      { item: "การ์ดสรุปข้อเสนอ", meaning: "AI สรุปสถานการณ์ + 2-4 ข้อเสนอ พร้อมเหตุผลและตัวเลขอ้างอิงจากข้อมูลจริง", note: "Stream แสดงทีละบรรทัด ใช้เวลา 5-20 วินาที" },
      { item: "Action Items", meaning: "รายการสิ่งที่ควรทำ (3-6 ข้อ) — ติ๊ก checkbox เก็บไว้เป็น todo ส่วนตัวได้", note: "สถานะติ๊กเก็บใน localStorage ไม่หายระหว่าง session" },
      { item: "AIChatBox", meaning: "ถาม AI ต่อแบบเจาะลึก โดยแชทจะส่งบริบท (ข้อมูล KPI ปัจจุบัน) ให้อัตโนมัติ", note: "ไม่ต้องอธิบายข้อมูลซ้ำ — ถามได้เลย เช่น 'ทำไม ROAS วันที่ 12 ตก?'" },
      { item: "ปุ่ม Regenerate", meaning: "สั่ง AI ให้สรุปใหม่ทั้งหมด — ใช้เมื่อต้องการมุมมองใหม่หรือข้อมูลอัปเดตล่าสุด" },
    ],
    formulas: [
      {
        name: "AI Confidence (ไม่แสดงตรง ๆ แต่สะท้อนในภาษา)",
        formula: "AI พิจารณาจาก: Spend ≥ ฿1,000 · ช่วงเวลา ≥ 3 วัน · จำนวน data point ≥ 20",
        example: "ถ้าข้อมูลน้อย AI จะบอก 'ข้อมูลยังจำกัด ควรรออีก X วัน'",
        dataSource: "LLM (Manus Forge Gateway)",
        refresh: "15 นาที (auto) · กด Regenerate เพื่อสด",
      },
    ],
    useCases: [
      { title: "ROAS ตกลงผิดสังเกต ไม่รู้สาเหตุ", steps: ["Role = Performance", "ดูข้อสรุป", "ถ้ายังสงสัยให้ถาม Chat ต่อ"] },
      { title: "จะปรับงบสัปดาห์หน้ายังไง", steps: ["Role = Budget", "AI จะบอกบัญชี/adset ที่ควรเพิ่ม-ลดพร้อมตัวเลข"] },
      { title: "ชื่อแอดดีพอหรือเปล่า", steps: ["Role = Creative", "AI วิเคราะห์ pattern ของชื่อ adset ที่ ROAS สูง vs ต่ำ"] },
      { title: "กลัวบัญชีโดน Meta ระงับ", steps: ["Role = Risk", "AI ตรวจสัญญาณ (CTR ตกฉับพลัน / Spend หาย / ผิดปกติ) แล้วเตือน"] },
      { title: "คนทักมาเยอะแต่ไม่ปิดการขาย", steps: ["Role = Sales", "AI วิเคราะห์ funnel ที่หาย: คนทัก → ตอบช้า? ไม่มีโปรปิด? ระบุจุดให้ปรับ"] },
    ],
    tips: [
      { type: "การใช้งาน", text: "เลือก Role ก่อนเสมอ — เพราะ prompt และมุมมองต่างกันมาก" },
      { type: "การใช้งาน", text: "Copy Summary แล้วแปะใน Notion / Line group ให้ทีมอ่าน" },
      { type: "การตัดสินใจ", text: "AI ไม่ตัดสินใจแทน — ดูเหตุผลและตัวเลขประกอบเสมอ ถ้าตัวเลขขัดกับสามัญสำนึก ให้ถาม Chat ต่อ" },
      { type: "การตัดสินใจ", text: "ถ้า AI บอก 'ข้อมูลยังน้อย' อย่าเพิ่งปรับเชิงโครงสร้าง รออีก 2-3 วัน" },
    ],
  },

  // 7/19 ─ Alerts
  {
    id: "alerts",
    title: "การแจ้งเตือน (Alerts)",
    shortLabel: "การแจ้งเตือน",
    path: "/alerts",
    category: "analysis",
    what: "กฎแจ้งเตือนที่ระบบเช็คทุก 3 ชั่วโมงและส่งเข้า LINE / Webhook อัตโนมัติ เมื่อ KPI ทะลุเงื่อนไขที่ตั้งไว้ — กันลืม กันพลาด",
    who: ["owner", "ceo", "content"],
    wireLayout: "alerts",
    wireSpots: [
      { x: 4, y: 5, label: "Toolbar: ปุ่ม + สร้างกฎใหม่ / Tab (กฎ / ประวัติ)" },
      { x: 4, y: 18, label: "การ์ดกฎเริ่มต้น (Default rules) toggle เปิด/ปิด" },
      { x: 4, y: 50, label: "ตารางกฎทั้งหมด (ชื่อ / เงื่อนไข / ช่อง / สถานะ)" },
      { x: 4, y: 78, label: "Tab ประวัติแจ้งเตือน (timeline 30 วัน)" },
    ],
    elements: [
      { item: "ปุ่ม + สร้างกฎใหม่", zone: "ขวาบน", kind: "button" },
      { item: "Tab: กฎ / ประวัติ", zone: "กลางบน", kind: "selector" },
      { item: "การ์ดกฎเริ่มต้นพร้อมใช้ (toggle)", zone: "กลางหน้า", kind: "panel" },
      { item: "ตารางกฎทั้งหมด", zone: "กลางหน้า", kind: "table" },
      { item: "คอลัมน์ช่องส่ง (LINE icon / Webhook icon)", zone: "ในตาราง", kind: "badge" },
      { item: "สถานะ Trigger ล่าสุด (เวลา / ผลลัพธ์)", zone: "ในตาราง", kind: "badge" },
      { item: "Modal สร้าง/แก้ไขกฎ (Metric + Operator + Threshold)", zone: "กลางจอ", kind: "modal" },
      { item: "Timeline ประวัติแจ้งเตือน", zone: "Tab ประวัติ", kind: "panel" },
    ],
    explanations: [
      { item: "กฎเริ่มต้น (Default Rules)", meaning: "ระบบมี 8+ กฎพร้อมใช้: ROAS < target × 0.6 · Spend ทะลุงบ 120% · คนทักหาย 6 ชม. · CTR ตกเกิน 30% · ฯลฯ — กด toggle เปิดได้ทันที" },
      { item: "Tab กฎ", meaning: "จัดการกฎทั้งหมด — สร้าง/แก้/ลบ/หยุดชั่วคราว" },
      { item: "Tab ประวัติ", meaning: "timeline เหตุการณ์ที่ส่งจริง 30 วันล่าสุด พร้อมข้อความและสถานะส่ง (ส่งสำเร็จ/ล้มเหลว)" },
      { item: "ช่องส่ง LINE", meaning: "ส่งเข้ากลุ่ม/แชทไลน์ที่ผูกไว้ในตั้งค่า — ทั้ง workspace เห็น", note: "ต้องผูก LINE token ใน Settings ก่อน" },
      { item: "ช่องส่ง Webhook", meaning: "POST JSON payload ไป URL ที่ตั้งไว้ — ใช้เชื่อมกับ Slack / Zapier / ระบบในบ้าน" },
      { item: "Modal สร้างกฎ", meaning: "ฟอร์ม: ชื่อ + Metric + Operator (≤/≥/=) + ค่า Threshold + ช่วงเวลา + ช่องส่ง" },
    ],
    formulas: [
      {
        name: "รอบเช็ค (Check Cycle)",
        formula: "ทุก 3 ชั่วโมง (heartbeat job)",
        example: "กฎตั้งไว้ 'ROAS < 1.5' · เวลา 09:00 ตรวจเจอ ROAS = 1.2 → ส่งข้อความเข้า LINE",
        dataSource: "Heartbeat scheduler · Meta API insights",
        refresh: "ทุก 3 ชั่วโมง (ระบบ) · เช็คเดี๋ยวนี้กดปุ่ม Test",
      },
      {
        name: "Cooldown (กันสแปม)",
        formula: "กฎเดียวกัน ส่งซ้ำได้ทุก 6 ชั่วโมง (กันรบกวน)",
        example: "09:00 ส่งครั้งแรก · เงื่อนไขยังเข้าตอน 12:00 → ไม่ส่งซ้ำ · 15:00 ครบ 6 ชม.ถ้ายังเข้า → ส่งใหม่",
        dataSource: "ตาราง alert_history ใน DB",
        refresh: "ตามรอบ check cycle",
      },
    ],
    useCases: [
      { title: "กลัวบัญชีจ่ายเงินทะลุงบโดยไม่รู้ตัว", steps: ["เปิดกฎ 'Spend ≥ 120% ของงบรายวัน' → LINE จะแจ้งทันทีตอนทะลุ"] },
      { title: "คนทักหายไปกลางวัน ไม่มีใครรู้", steps: ["เปิดกฎ 'คนทัก = 0 ติดต่อกัน 6 ชม. ในเวลา 9-21 น.'"] },
      { title: "เปลี่ยน creative แล้ว ROAS ดิ่ง", steps: ["สร้างกฎเฉพาะกิจ 'ROAS < 1.0' กับบัญชีที่เพิ่งเปลี่ยน", "ใส่ Webhook Slack ทีม creative"] },
      { title: "อยากเห็นภาพรวมการแจ้งเตือนเดือนนี้", steps: ["Tab ประวัติ", "กรองเดือน", "นับว่ากฎไหน fire บ่อยสุด → กฎนั้นอาจตั้ง threshold เข้มเกินไป"] },
    ],
    tips: [
      { type: "การใช้งาน", text: "เริ่มจากเปิดกฎ Default ก่อน — ครอบคลุม case ส่วนใหญ่แล้ว" },
      { type: "การใช้งาน", text: "ตั้งชื่อกฎให้สื่อความหมาย เช่น '[Urgent] ROAS ครีมหน้า ดิ่ง' จะอ่านง่ายตอนเด้งใน LINE" },
      { type: "การตัดสินใจ", text: "ถ้ากฎ fire บ่อยเกินไป (>5 ครั้ง/วัน) ให้เพิ่ม threshold ลง — ไม่งั้นทีมจะชิน ไม่อ่าน" },
      { type: "การตัดสินใจ", text: "Webhook สำคัญต้อง retry — ระบบ retry 3 ครั้ง 1-2-4 นาที ถ้ายังล้มเหลวเก็บใน history แสดงสีแดง" },
    ],
  },

  // 8/19 ─ Cohort Analysis
  {
    id: "cohort",
    title: "วิเคราะห์ตามอายุแอด (Cohort)",
    shortLabel: "Cohort Analysis",
    path: "/cohort",
    category: "analysis",
    what: "จัดกลุ่ม adset ตามวันที่เริ่มยิง แล้วดูว่า ROAS / CTR / คนทักเปลี่ยนยังไงตามอายุ (วันที่ 1, 2, 3, ...) — ใช้รู้ว่าแอดของเรามักหมดอายุที่กี่วัน",
    who: ["owner", "content"],
    wireLayout: "cohort",
    wireSpots: [
      { x: 4, y: 5, label: "Toolbar: Account / Metric (ROAS/CTR/คนทัก) / ช่วง start date" },
      { x: 4, y: 18, label: "Cohort Heatmap (แถว = วันเริ่ม · คอลัมน์ = อายุ adset)" },
      { x: 4, y: 60, label: "กราฟเส้น Avg Curve (โค้งเฉลี่ยทุก cohort)" },
      { x: 4, y: 82, label: "ตาราง adset แต่ละ cohort (drilldown)" },
    ],
    elements: [
      { item: "Account Selector", zone: "ซ้ายบน", kind: "selector" },
      { item: "Metric (ROAS / CTR / คนทัก / Cost/Msg)", zone: "ซ้ายบน", kind: "selector" },
      { item: "ช่วง Start Date (เริ่มยิงเมื่อ)", zone: "กลางบน", kind: "filter" },
      { item: "Cohort Heatmap (แถว=cohort · คอลัมน์=day N)", zone: "กลางหน้า", kind: "chart" },
      { item: "Avg Curve (Line chart โค้งเฉลี่ย)", zone: "กลางหน้า", kind: "chart" },
      { item: "ตาราง drilldown (เลือก cohort แล้วดู adset)", zone: "ล่างสุด", kind: "table" },
      { item: "Tooltip ใน heatmap (cohort + day + ค่า + sample size)", zone: "hover", kind: "selector" },
    ],
    explanations: [
      { item: "Cohort", meaning: "กลุ่ม adset ที่เริ่มยิงในวันเดียวกัน — เช่น cohort 1/Jun = adset ทุกตัวที่เริ่ม 1 มิ.ย." },
      { item: "Day N", meaning: "อายุของ adset นับจากวันเริ่ม — Day 1 = วันแรก, Day 7 = วันที่ 7", note: "ใช้ดู ROAS curve ตามอายุได้ตรงเป๊ะ" },
      { item: "Cohort Heatmap", meaning: "แต่ละ cell = Metric เฉลี่ยของ cohort นั้นใน day N · สีเข้มเขียว = ดี · แดง = ต่ำ" },
      { item: "Avg Curve", meaning: "เส้นเฉลี่ยของทุก cohort — ใช้ดูว่าโดยภาพรวมแอดเราพีคที่ day ไหน เริ่มร่วงที่ day ไหน" },
      { item: "Drilldown", meaning: "คลิก cell ในตารางเพื่อเปิดรายชื่อ adset ใน cohort นั้น — ใช้หา outlier (ตัวที่ดีเด่น หรือดิ่งเร็วผิดปกติ)" },
    ],
    formulas: [
      {
        name: "Cohort Metric",
        formula: "Metric เฉลี่ย day N = Σ(Metric ของ adset i ใน day N) ÷ จำนวน adset i ใน cohort",
        example: "cohort 1/Jun มี 5 adset · day 3 ROAS เฉลี่ย = (2.0+3.1+2.5+1.8+2.2)/5 = 2.32",
        dataSource: "Meta API insights รายวัน + start_time ของแต่ละ adset",
        refresh: "30 นาที",
      },
      {
        name: "Cohort Decay",
        formula: "% Decay = (peak − ค่าวันที่ N) ÷ peak × 100",
        colorRules: [
          { color: "green", when: "Decay < 20%" },
          { color: "amber", when: "20% ≤ Decay < 50%" },
          { color: "red", when: "Decay ≥ 50%" },
        ],
        example: "peak day 3 ROAS 3.0 · day 10 ROAS 1.5 → Decay 50% สีแดง (อายุสั้น)",
        dataSource: "คำนวณจาก heatmap",
        refresh: "30 นาที",
      },
    ],
    useCases: [
      { title: "แอดของเรามักหมดอายุที่กี่วัน", steps: ["Metric = ROAS", "ดู Avg Curve", "สังเกตจุดที่เริ่มดิ่ง — นั่นคืออายุเฉลี่ย"] },
      { title: "cohort วันใดดีกว่าวันอื่น", steps: ["ดูแถวที่สีเข้มเขียวยาวสุด → cohort นั้นยิงในวันดี อาจซ้ำสภาพแวดล้อม (โปร / event)"] },
      { title: "หา adset ที่ outperform ใน cohort", steps: ["Drilldown cohort ที่สนใจ → sort ROAS desc → ดูตัวบนสุด แล้วเอาไปทำซ้ำ"] },
      { title: "ตัดสินใจว่าควรปล่อย adset ใหม่หรือ scale ตัวเดิม", steps: ["ถ้า Avg Curve แสดงว่า day 7+ ดิ่ง → ปล่อยใหม่เป็นรอบ ๆ ดีกว่า scale ตัวเดิม"] },
    ],
    tips: [
      { type: "การใช้งาน", text: "เลือกช่วง start date ยาวพอ (≥ 30 วัน) เพื่อให้มี cohort พอเทียบ" },
      { type: "การใช้งาน", text: "hover cell ดู sample size — ถ้า < 3 adset ค่าอาจไม่เสถียร" },
      { type: "การตัดสินใจ", text: "ถ้าทุก cohort decay เร็ว (>50% ใน 7 วัน) ปัญหาน่าจะอยู่ที่ creative ไม่ใช่งบ" },
      { type: "การตัดสินใจ", text: "cohort ที่ดีต่อเนื่อง 14+ วัน เป็น 'แอดทอง' ควรหาว่าทำไม แล้วทำซ้ำ" },
    ],
  },

  // 9/19 ─ Ad Intelligence
  {
    id: "ad-intelligence",
    title: "วิเคราะห์แอดเชิงลึก (Ad Intelligence)",
    shortLabel: "วิเคราะห์แอดเชิงลึก",
    path: "/ad-intelligence",
    category: "analysis",
    what: "ตารางทุก adset ในทุกบัญชี รวมไว้ที่เดียว มี KPI ครบ + filter หลายชั้น + AI สรุปต่อรายตัวคลิกเดียว — ที่เดียวสำหรับวิเคราะห์ adset ในระดับลึก",
    who: ["owner", "content"],
    wireLayout: "ad-intelligence",
    wireSpots: [
      { x: 4, y: 5, label: "Toolbar: Search / Account filter / Status / Date pills" },
      { x: 4, y: 18, label: "แถบ Filter ขั้นสูง (collapse): ROAS, Spend, อายุ, creative type" },
      { x: 4, y: 35, label: "ตาราง adset (Sortable + Sticky header)" },
      { x: 4, y: 80, label: "Drawer แสดงรายละเอียด adset (เปิดจากคลิกแถว)" },
    ],
    elements: [
      { item: "Search box (ชื่อ adset)", zone: "ซ้ายบน", kind: "selector" },
      { item: "Account Filter (multi-select)", zone: "ซ้ายบน", kind: "selector" },
      { item: "Status Filter (Active / Paused / All)", zone: "ซ้ายบน", kind: "selector" },
      { item: "Date Range pills (default 7 วัน)", zone: "ขวาบน", kind: "filter" },
      { item: "แถบ Filter ขั้นสูง (ROAS range / Spend range / อายุ / creative type)", zone: "กลางบน", kind: "filter" },
      { item: "ตาราง adset 12+ คอลัมน์", zone: "กลางหน้า", kind: "table" },
      { item: "AI Insight badge (✨)", zone: "แต่ละแถว", kind: "button" },
      { item: "Drawer แสดงรายละเอียด adset", zone: "ขวา (slide-in)", kind: "panel" },
      { item: "ปุ่ม Export CSV", zone: "ขวาบน", kind: "button" },
    ],
    explanations: [
      { item: "ตาราง adset", meaning: "คอลัมน์หลัก: ชื่อ · บัญชี · Spend · คนทัก · Orders · ROAS · CTR · CPM · Cost/Msg · อายุ (วัน) · status · sparkline 7 วัน" },
      { item: "Search", meaning: "ค้นชื่อ adset / campaign — ค้นแบบ partial match" },
      { item: "Filter ขั้นสูง", meaning: "กรองหลายเงื่อนไขพร้อมกัน — เช่น Spend > ฿5,000 + ROAS < 1.5 + อายุ < 7 วัน" },
      { item: "AI Insight (✨)", meaning: "คลิกที่ icon ในแถว → เปิด Drawer + ส่งบริบท adset ตัวนั้นให้ AI สรุปสาเหตุ + ข้อเสนอ" },
      { item: "Drawer adset", meaning: "แสดงรายละเอียด: กราฟ 30 วัน · ad creative ภายใน · audience setting · history การปรับงบ", note: "ปิดด้วย ESC หรือคลิกพื้นที่ว่าง" },
    ],
    formulas: [
      {
        name: "การให้สีคอลัมน์ ROAS",
        formula: "เทียบกับ roasTarget ของบัญชีที่ adset อยู่",
        colorRules: [
          { color: "green", when: "ROAS ≥ target" },
          { color: "amber", when: "target × 0.75 ≤ ROAS < target" },
          { color: "red", when: "ROAS < target × 0.75" },
        ],
        example: "target 2.0 · ROAS 1.4 → 1.4 < 2.0×0.75 (1.5) → สีแดง",
        dataSource: "Meta API + DB (roasTarget)",
        refresh: "10 นาที",
      },
      {
        name: "การคำนวณ 'อายุ' adset",
        formula: "อายุ (วัน) = วันนี้ − start_time ของ adset",
        example: "start 1 พ.ค. · วันนี้ 8 พ.ค. → อายุ 7 วัน",
        dataSource: "Meta API field 'start_time'",
        refresh: "คงที่ (เกิดครั้งเดียว)",
      },
    ],
    useCases: [
      { title: "หา adset เผางบ (spend สูง ROAS ต่ำ)", steps: ["Filter: Spend > ฿3,000 + ROAS < 1.5", "sort Spend desc → คลิก ✨ ให้ AI วิเคราะห์ทีละตัว"] },
      { title: "หา adset hidden gem (สเปนต่ำแต่ ROAS สูง)", steps: ["Filter: Spend ฿500-฿2,000 + ROAS > 3", "พิจารณา scale"] },
      { title: "ตรวจ adset ใหม่ที่เริ่มยิงไม่เกิน 3 วัน", steps: ["Filter: อายุ ≤ 3", "status = Active", "sort คนทัก desc → adset ใหม่ที่ดีมักโดดเด่นเร็ว"] },
      { title: "ทบทวน adset ที่หยุดไปแล้ว", steps: ["Status = Paused", "sort by ROAS หลังสุด → ตัวที่ ROAS ดียังหยุดทำไม?"] },
    ],
    tips: [
      { type: "การใช้งาน", text: "sticky header เลื่อนตามตลอด · ใช้ keyboard ↑↓ เพื่อย้าย row · Enter เปิด Drawer" },
      { type: "การใช้งาน", text: "AI ✨ คิดเงิน LLM call — ใช้เฉพาะ adset ที่จะตัดสินใจ ไม่ใช่ทุกแถว" },
      { type: "การตัดสินใจ", text: "อย่าตัดสิน adset จาก ROAS วันเดียว — ดูช่วง 7 วันขึ้นไป + sparkline" },
      { type: "การตัดสินใจ", text: "adset อายุ < 3 วัน ที่ ROAS ต่ำยังไม่ต้องหยุด — ให้เวลาเรียนรู้ (Learning Phase)" },
    ],
  },

  // 10/19 ─ Adset Detail
  {
    id: "adset-detail",
    title: "รายละเอียด Adset (Adset Detail)",
    shortLabel: "รายละเอียด Adset",
    path: "/ad-intelligence/:adsetId",
    category: "analysis",
    what: "หน้าเจาะลึก adset 1 ตัว — กราฟ 30 วัน, รายการ ad ภายใน, audience setting, history การปรับงบ, AI Insight ส่วนตัว",
    who: ["owner", "content"],
    wireLayout: "adset-detail",
    wireSpots: [
      { x: 4, y: 5, label: "Breadcrumb + ชื่อ adset + Status badge" },
      { x: 4, y: 15, label: "KPI Row 6 ใบ (Spend / คนทัก / Orders / Revenue / ROAS / CTR)" },
      { x: 4, y: 35, label: "กราฟแสดงเทรนด์ 30 วัน (เลือก KPI ได้)" },
      { x: 4, y: 60, label: "AI Insight + Audience setting (50/50)" },
      { x: 4, y: 80, label: "ตาราง Ad ภายใน + History การปรับงบ" },
    ],
    elements: [
      { item: "Breadcrumb (Ad Intelligence / ชื่อ adset)", zone: "ซ้ายบน", kind: "button" },
      { item: "Status badge (Active / Paused)", zone: "ขวาบน", kind: "badge" },
      { item: "KPI Row 6 ใบ", zone: "บนสุด", kind: "kpi" },
      { item: "กราฟเทรนด์ 30 วัน + Metric selector", zone: "กลางหน้า", kind: "chart" },
      { item: "การ์ด AI Insight (เฉพาะ adset นี้)", zone: "ซ้ายกลาง", kind: "panel" },
      { item: "การ์ด Audience Setting (อายุ/เพศ/Interest)", zone: "ขวากลาง", kind: "panel" },
      { item: "ตาราง Ad ภายใน adset", zone: "ล่างซ้าย", kind: "table" },
      { item: "History การปรับงบ (timeline)", zone: "ล่างขวา", kind: "panel" },
    ],
    explanations: [
      { item: "Breadcrumb", meaning: "เส้นทางย้อนกลับ — คลิก 'Ad Intelligence' กลับไปตารางใหญ่" },
      { item: "Status badge", meaning: "Active = ยิงอยู่ · Paused = พักอยู่ · Archived = เก็บถาวร" },
      { item: "กราฟเทรนด์ 30 วัน", meaning: "เลือก Metric ที่ต้องการดู (ROAS/Spend/คนทัก/CTR) แล้วระบบ plot เส้นวันต่อวัน 30 วัน" },
      { item: "AI Insight ส่วนตัว", meaning: "AI สรุปเฉพาะ adset นี้ — เห็นได้ทันทีว่าจุดแข็ง/จุดอ่อนคืออะไร" },
      { item: "Audience Setting", meaning: "ข้อมูล targeting จาก Meta — เพศ อายุ ความสนใจ พื้นที่", note: "ถ้าใช้ Lookalike จะแสดงชื่อ audience source ด้วย" },
      { item: "Ad ภายใน", meaning: "รายชื่อ ad creative แต่ละตัวในshared adset + KPI ของแต่ละตัว" },
      { item: "History การปรับงบ", meaning: "timeline ทุกครั้งที่งบรายวันเปลี่ยน (จาก Meta API + จากระบบเราถ้าใช้ Smart Scaling)" },
    ],
    formulas: [
      {
        name: "Metric ในกราฟ",
        formula: "คำนวณรายวันจาก Meta insights · breakdown = ['date_start']",
        example: "ROAS วันที่ 5 พ.ค. = purchase_value(5 พ.ค.) ÷ spend(5 พ.ค.)",
        dataSource: "Meta API insights time-series",
        refresh: "30 นาที",
      },
    ],
    useCases: [
      { title: "ROAS adset ตัวนี้ดีขึ้นหรือแย่ลง", steps: ["กราฟ Metric = ROAS", "ดูเทรนด์ 30 วัน — เส้นขึ้นคือดีขึ้น เส้นเรียบคือคงที่"] },
      { title: "ตัดสินใจว่าจะหยุดหรือ scale", steps: ["ดู AI Insight + Spend cumulative + ROAS curve — ถ้าผ่าน Learning Phase (Spend ≥ ฿1,000) แล้วยังต่ำ → หยุด"] },
      { title: "audience targeting กว้างไปไหม", steps: ["ดูการ์ด Audience", "ถ้าช่วงอายุ 18-65 + Interest กว้าง อาจซอยใหม่ให้แคบ"] },
      { title: "ตรวจ ad ตัวไหนใน adset ฉุดผลรวม", steps: ["ตาราง Ad ภายใน", "sort ROAS asc → ตัวล่างสุดอาจดึงตัวเลขรวม ลองหยุด"] },
    ],
    tips: [
      { type: "การใช้งาน", text: "กดบน sparkline ของ Ad Intelligence แล้วจะ deep-link มาที่นี่ทันที" },
      { type: "การใช้งาน", text: "กราฟ 30 วันสามารถ hover ดู tooltip ราย point ได้" },
      { type: "การตัดสินใจ", text: "adset ที่ history ปรับงบบ่อยมาก (>5 ครั้ง/สัปดาห์) อาจกระทบ Learning Phase — ลด frequency ปรับ" },
      { type: "การตัดสินใจ", text: "ถ้า ROAS เริ่มดิ่งหลัง day 10 ของชีวิต adset → พิจารณา rotate creative" },
    ],
  },

  // 11/19 ─ Ad Metric Benchmark
  {
    id: "ad-metric-benchmark",
    title: "เกณฑ์อ้างอิงตัวชี้วัด (Ad Metric Benchmark)",
    shortLabel: "เกณฑ์อ้างอิง",
    path: "/ad-metric-benchmark",
    category: "analysis",
    what: "เปรียบเทียบ KPI แต่ละบัญชี/กลุ่มสินค้า กับค่าเฉลี่ยและ percentile ทั่วทั้ง workspace — รู้ว่าตัวเองอยู่ตรงไหน (สูงกว่า/ต่ำกว่าค่ากลาง)",
    who: ["owner", "ceo"],
    wireLayout: "benchmark",
    wireSpots: [
      { x: 4, y: 5, label: "Toolbar: Metric / Date pills (default 7 วัน)" },
      { x: 4, y: 18, label: "Box plot รวม (P10 / P25 / Median / P75 / P90)" },
      { x: 4, y: 50, label: "ตาราง: แต่ละบัญชี + ค่า + percentile + diff vs Median" },
    ],
    elements: [
      { item: "Metric Selector (ROAS / CTR / Cost/Msg / Cost/Purchase / CPM)", zone: "ซ้ายบน", kind: "selector" },
      { item: "Date Range pills", zone: "ขวาบน", kind: "filter" },
      { item: "Box plot รวมทั้ง workspace", zone: "กลางบน", kind: "chart" },
      { item: "ตาราง percentile ราย entity", zone: "กลางหน้า", kind: "table" },
      { item: "คอลัมน์ Percentile rank (P-XX)", zone: "ในตาราง", kind: "badge" },
      { item: "คอลัมน์ Diff vs Median (%)", zone: "ในตาราง", kind: "badge" },
    ],
    explanations: [
      { item: "Box plot", meaning: "กราฟกล่อง — กลางคือ Median (P50) · ขอบกล่องคือ P25-P75 · เส้นยาวคือ P10-P90 · จุดนอกคือ outlier" },
      { item: "Percentile rank", meaning: "ตัวเลขบอกว่าค่าของคุณสูงกว่ากี่ % ของ entity ทั้งหมด — P80 = สูงกว่า 80%" },
      { item: "Diff vs Median", meaning: "% ที่ค่าของคุณเหนือ/ใต้ค่ากลาง — ตัวบวกเขียว ตัวลบแดง" },
      { item: "Metric Cost/Msg / CPM", meaning: "Metric ที่ 'ยิ่งต่ำยิ่งดี' — ระบบกลับสีให้ (ต่ำ = เขียว)" },
    ],
    formulas: [
      {
        name: "Percentile rank",
        formula: "PR(x) = (จำนวน entity ที่ค่า ≤ x ÷ total) × 100",
        example: "ใน 10 บัญชี ROAS ของคุณ ≥ 8 บัญชี → PR = 80 (P80)",
        dataSource: "คำนวณ workspace-wide",
        refresh: "30 นาที",
      },
      {
        name: "Diff vs Median",
        formula: "Diff = (ค่าของคุณ − Median) ÷ Median × 100",
        example: "ROAS คุณ 2.6 · Median ทั้ง workspace 2.0 → Diff +30%",
        dataSource: "workspace stats",
        refresh: "30 นาที",
      },
    ],
    useCases: [
      { title: "อยากรู้ว่า ROAS ของเราจัดอยู่ใน top กี่ %", steps: ["Metric = ROAS", "ดู Percentile rank ของแต่ละบัญชีในตาราง"] },
      { title: "Cost/Msg แพงเกินไปไหม", steps: ["Metric = Cost/Msg", "ดู Diff vs Median", "ถ้า +30% ขึ้นไป = แพงผิดปกติ ต้องหาสาเหตุ"] },
      { title: "นำเสนอ CEO ว่า benchmark เราดี", steps: ["export box plot + ตาราง — แสดงว่าเรา > P75 ในหลาย metric"] },
      { title: "หา outlier ที่ฉุดทั้ง workspace ลง", steps: ["sort คอลัมน์ Diff asc → ตัวล่างสุดคือคนที่ทำให้ค่ากลางตก"] },
    ],
    tips: [
      { type: "การใช้งาน", text: "benchmark ใช้ entity ของเราเอง (ไม่ใช่อุตสาหกรรม) — เหมาะกับการเทียบภายในเครือ" },
      { type: "การใช้งาน", text: "hover box plot ดูค่า P-XX ที่แน่นอน" },
      { type: "การตัดสินใจ", text: "ถ้าทุกบัญชีอยู่ใกล้ Median แสดงว่าโครงสร้างเสถียร — outlier น่าสนใจกว่า" },
      { type: "การตัดสินใจ", text: "การอยู่ P90 ของ Cost/Msg = แพงสุด (แย่) — Metric กลับสีให้แล้ว เช็คเครื่องหมายก่อนตีความ" },
    ],
  },

  // ──── Batch 2 · ก้อน B+C (11 หน้า) ────
  { id: "smart-scaling", title: "ปรับงบอัจฉริยะ (Smart Scaling)", shortLabel: "Smart Scaling", path: "/smart-scaling", category: "scaling", what: "หัวใจของระบบ — AI คำนวณ score รายโฆษณา (adset) แล้วแนะนำ 4 ระดับ: 🚀 scale up แรง / ✅ scale up / 👀 คงเดิม / 📉 scale down / ⛔ pause พร้อมระบุจำนวนเงินที่ควรปรับและเหตุผล", who: ["owner", "content"], wireLayout: "smart-scaling", wireSpots: [{ x: 4, y: 6, label: "Toolbar: Account / Mode (Auto/Manual) / Date pills 7วัน" }, { x: 4, y: 20, label: "4 KPI สรุป # adset ในแต่ละ action" }, { x: 4, y: 42, label: "ตาราง adset 10+ คอลัมน์ พร้อม Action badge + เหตุผล" }, { x: 4, y: 82, label: "แผงควบคุม Batch + Sandbox + Lock" }], elements: [{ item: "Account Selector", zone: "ซ้ายบน", kind: "selector" }, { item: "Mode toggle (Auto-pilot / Manual)", zone: "ซ้ายบน", kind: "toolbar" }, { item: "Date Range pills (default 7 วัน)", zone: "ขวาบน", kind: "filter" }, { item: "4 KPI สรุปจำนวน adset แยกตาม action", zone: "บนสุด", kind: "kpi" }, { item: "ตาราง adset 10+ คอลัมน์", zone: "กลางหน้า", kind: "table" }, { item: "Action badge 🚀/✅/👀/📉/⛔", zone: "ในตาราง", kind: "badge" }, { item: "คอลัมน์ 'งบแนะนำใหม่' (฿ ขึ้น/ลง)", zone: "ในตาราง", kind: "badge" }, { item: "ปุ่ม Apply รายตัว + Apply All", zone: "ขวาบนของตาราง", kind: "button" }, { item: "แผง Lock Period + Sandbox", zone: "ล่างสุด", kind: "panel" }], explanations: [{ item: "Mode Auto-pilot", meaning: "ระบบ apply คำแนะนำให้อัตโนมัติทุก 3 ชั่วโมง — ต้องตั้งเพดานงบ (เช่น max +30%/-50% ต่อครั้ง)", note: "เปิดได้เฉพาะ Owner" }, { item: "Mode Manual", meaning: "AI แนะนำเฉย ๆ — ต้องกด Apply เองทีละราย หรือ Apply All" }, { item: "Score", meaning: "ตัวเลข 0–2+ รวม performance ของ ROAS + CTR — ระบบใช้ตัดสินใจ action ที่จะแสดง" }, { item: "Action badge", meaning: "🚀 = scale up แรง +30% · ✅ = scale up +15% · 👀 = continue คงเดิม · 📉 = scale down -25% · ⛔ = pause หยุด" }, { item: "งบแนะนำใหม่", meaning: "คำนวณจาก daily_budget ปัจจุบัน × % ของ action — แสดงเป็นบาท ไม่ต้องคิดเอง", note: "สีเขียว = ขึ้น · แดง = ลง · เทา = pause" }, { item: "Lock Period", meaning: "ถ้าเดือนถูก lock (ปิดรอบคอมมิชชั่น) ห้าม apply งบย้อนหลัง — ระบบจะบล็อก action" }], formulas: [{ name: "Smart Scaling Score", formula: "score = (ROAS_7d ÷ target) × 0.7 + (CTR_7d ÷ ctrThreshold) × 0.3", example: "target 2.0 · ROAS 3.0 → 1.5 · CTR 2.5% ÷ 1.5% threshold = 1.67 · score = 1.05 + 0.50 = 1.55 → 🚀 +30%", dataSource: "Meta API insights + DB (roasTarget)", refresh: "10 นาที" }, { name: "Action mapping จาก score", formula: "≥1.5 → 🚀 +30% · ≥1.1 → ✅ +15% · ≥0.8 → 👀 continue · ≥0.5 → 📉 −25% · <0.5 → ⛔ pause", colorRules: [{ color: "green", when: "score ≥ 1.1 (scale up)" }, { color: "blue", when: "score 0.8–1.1 (continue)" }, { color: "amber", when: "score 0.5–0.8 (scale down)" }, { color: "red", when: "score < 0.5 (pause)" }], example: "score 0.4 → pause · score 1.2 → +15%", dataSource: "คำนวณซ้อนใน server", refresh: "10 นาที" }, { name: "งบแนะนำใหม่", formula: "new_budget = current_daily_budget × (1 + scale_pct)", example: "งบปัจจุบัน ฿1,000 · 🚀 +30% → ฿1,300", dataSource: "Meta API field daily_budget", refresh: "ตอน Apply" }], useCases: [{ title: "scale ตัวที่ ROAS พุ่งสูง", steps: ["Mode = Manual", "sort score desc", "เลือก ✅/🚀", "Apply All"], outcome: "งบ adset ดีเพิ่ม 15–30% ใน 1 คลิก" }, { title: "หยุดตัวเผางบอัตโนมัติ", steps: ["Mode = Auto-pilot", "ตั้ง max −50%", "ระบบ pause ⛔ ทุก 3 ชม."], outcome: "ไม่ต้องเฝ้าจอ ระบบหยุดตัวที่เผางบให้เอง" }, { title: "ทดลอง Sandbox ก่อนใช้งานจริง", steps: ["เปิด Sandbox toggle", "Apply ใน sandbox", "ดูผลจำลอง 7 วัน", "ถ้าโอเค commit"], outcome: "เห็นเหตุการณ์จำลอง 7 วันก่อนตัดสินใจจริง" }, { title: "หยุดระหว่างปิดรอบคอมมิชชั่น", steps: ["เปิด Lock Period", "เลือกเดือนที่ lock", "Smart Scaling หยุด apply"], outcome: "งบ/ROAS ไม่เปลี่ยนระหว่างปิดยอด" }], tips: [{ type: "การใช้งาน", text: "เริ่ม Manual สัปดาห์แรก ค่อยเปิด Auto-pilot — เพื่อรู้จริตของ score ก่อน" }, { type: "การใช้งาน", text: "ตั้ง max +30%/−50% ป้องกัน over-scale ที่จะรีเซ็ต learning phase ของ Meta" }, { type: "การตัดสินใจ", text: "adset อายุ <3 วัน ระบบไม่แนะ scale — รอออก learning phase ก่อน" }, { type: "การตัดสินใจ", text: "อย่า scale up 2 รอบติด — รอ 24–48 ชม. ดูผลก่อน scale อีกรอบ" }, { type: "การตัดสินใจ", text: "Lock Period อย่าลืมเปิดหลังปิดรอบคอมมิชชั่น มิฉะนั้นต้องตามจัดเอกสารใหม่" }] },
  { id: "share-links", title: "ลิงก์แชร์ (Share Links)", shortLabel: "ลิงก์แชร์", path: "/share-links", category: "scaling", what: "สร้างลิงก์อ่านอย่างเดียวให้คนนอกระบบดู dashboard ได้โดยไม่ต้องล็อกอิน — ตั้งขอบเขตได้ (บัญชี/กลุ่ม) เลือก KPI ที่จะโชว์ กำหนด expire / password ได้", who: ["owner", "ceo"], wireLayout: "share-links", wireSpots: [{ x: 4, y: 6, label: "ปุ่ม + สร้างลิงก์ใหม่" }, { x: 4, y: 24, label: "ตารางลิงก์ที่สร้างไว้ (ชื่อ / ขอบเขต / Metric / expire / status)" }, { x: 4, y: 70, label: "Modal สร้าง/แก้ลิงก์" }], elements: [{ item: "ปุ่ม + สร้างลิงก์ใหม่", zone: "ขวาบน", kind: "button" }, { item: "ตารางลิงก์พร้อมสถิติการเข้าชม", zone: "กลางหน้า", kind: "table" }, { item: "ปุ่ม Copy / Edit / Disable แต่ละแถว", zone: "แต่ละแถว", kind: "button" }, { item: "Modal: ชื่อ / ขอบเขต / Metric / expire / password", zone: "กลางจอ", kind: "modal" }, { item: "Status badge (Active / Expired / Disabled)", zone: "ในตาราง", kind: "badge" }, { item: "ช่องสถิติการเข้าชม (จำนวน/ล่าสุด)", zone: "ในตาราง", kind: "badge" }], explanations: [{ item: "ขอบเขตลิงก์", meaning: "all = เห็นทุกบัญชี · account = เฉพาะบัญชีที่เลือก · group = เฉพาะกลุ่มสินค้าที่เลือก" }, { item: "Metric set", meaning: "เลือก KPI ที่จะโชว์ในลิงก์ — ซ่อน Spend ได้ถ้าไม่อยากให้คนนอกเห็นต้นทุน" }, { item: "Expire", meaning: "วันหมดอายุลิงก์ — 7 วัน / 30 วัน / Never" }, { item: "Password", meaning: "รหัสผ่านที่ต้องกรอกตอนเปิดลิงก์ — optional แต่แนะนำสำหรับบุคคลภายนอก" }, { item: "สถิติการเข้าชม", meaning: "ระบบ log IP + timestamp ทุกครั้งที่มีคนเปิดลิงก์ คลิกดูได้ในตาราง" }], formulas: [{ name: "Slug ลิงก์", formula: "slug = nanoid(12) สุ่ม — ไม่มีการชน ไม่ derive จาก ID", example: "https://richbiotech-ads.manus.space/share/x7kQpL4nT2vR", dataSource: "DB share_links", refresh: "ตอนสร้าง/แก้ลิงก์" }, { name: "สิทธิ์เข้าถึง", formula: "อ่านอย่างเดียวตาม scope ที่กำหนด — รวมกับ metric set", example: "ลิงก์ scope group=A · คนรับลิงก์จะไม่เห็นกลุ่ม B/C/D", dataSource: "DB scope policy", refresh: "ทุก request" }], useCases: [{ title: "ส่งรายงานสัปดาห์ให้ลูกค้า", steps: ["+ สร้างลิงก์", "ชื่อ 'รายสัปดาห์ ABC'", "ขอบเขต = group ABC", "Metric ไม่รวม Spend", "expire 7 วัน", "Copy URL ส่ง LINE"], outcome: "ลูกค้าเห็น KPI ไม่เห็นต้นทุน · ลิงก์หมดอายุเอง" }, { title: "ส่งให้ผู้สอบบัญชี/ผู้ตรวจ", steps: ["expire 30 วัน", "ตั้งรหัสผ่าน", "ส่ง URL + รหัสคนละช่อง"], outcome: "ผู้ตรวจดูได้โดยไม่ต้องออก user" }, { title: "ตรวจว่ามีคนเปิดจริงไหม", steps: ["ดูคอลัมน์สถิติ", "คลิกเพื่อดู timestamp + IP"], outcome: "รู้ว่าลูกค้าเปิดจริงหรือไม่" }, { title: "รีโวคลิงก์ที่ไม่ใช้แล้ว", steps: ["หาลิงก์", "กด Disable"], outcome: "ลิงก์จะตอบ 403 ทันที" }], tips: [{ type: "การใช้งาน", text: "ตั้งชื่อให้สื่อความหมาย เช่น 'CEO weekly 30/05' เพื่อหาง่าย" }, { type: "การใช้งาน", text: "expire สั้นกว่าสำหรับลูกค้า (3–7 วัน) · ยาวกว่าสำหรับทีมใน" }, { type: "การตัดสินใจ", text: "อย่าส่งลิงก์ใน group chat ใหญ่ — ใช้ password เมื่อต้องส่งบุคคลภายนอก" }, { type: "การตัดสินใจ", text: "ขอบเขต = all เสี่ยงสูงสุด — ใช้กับ partner ระดับสูงเท่านั้น เลือก group/account ปลอดภัยกว่า" }] },
  { id: "commission-table", title: "ตารางคอมมิชชั่น (Commission Table)", shortLabel: "ตารางคอมมิชชั่น", path: "/commission", category: "commission", what: "ตารางคอมมิชชั่นรายบุคคล × รายเดือน — แสดงยอดขาย อัตรา % คอมที่ได้ สถานะ (open/locked/paid) สำหรับ Owner/CEO/ฟินันซ์ · ปริ้นต์สลิปได้", who: ["owner", "ceo"], wireLayout: "commission-table", wireSpots: [{ x: 4, y: 6, label: "Toolbar: Period / Status filter / Search" }, { x: 4, y: 18, label: "Summary row: Total revenue / Total commission / # คน" }, { x: 4, y: 38, label: "Pivot table: row=คน · col=เดือน · cell=Commission" }, { x: 4, y: 82, label: "ปุ่ม Lock month / Export PDF / mark paid" }], elements: [{ item: "Period selector (เดือน/ไตรมาส/ปี)", zone: "ซ้ายบน", kind: "selector" }, { item: "Status filter (open / locked / paid)", zone: "ซ้ายบน", kind: "selector" }, { item: "Search ชื่อพนักงาน", zone: "ขวาบน", kind: "selector" }, { item: "Summary row บนสุด", zone: "บนสุด", kind: "kpi" }, { item: "Pivot table หลัก", zone: "กลางหน้า", kind: "table" }, { item: "Tooltip cell (hover แสดง breakdown)", zone: "hover", kind: "selector" }, { item: "Status badge ต่อ cell 🔓/🔒/paid", zone: "ในตาราง", kind: "badge" }, { item: "ปุ่ม Lock month", zone: "ล่างสุด", kind: "button" }, { item: "ปุ่ม Export PDF รายคน", zone: "ล่างสุด", kind: "button" }], explanations: [{ item: "Pivot table", meaning: "แถว = พนักงาน · คอลัมน์ = เดือน · cell = คอมมิชชั่นที่ได้ · row สุดท้าย = Total ทั้งปี" }, { item: "Status badge", meaning: "🔓 open = ยังคำนวณได้ · 🔒 locked = ล็อกแล้ว ยอดไม่เปลี่ยน · paid = จ่ายเงินแล้ว" }, { item: "Lock month", meaning: "ปิดเดือน — หลังล็อก ระบบ snapshot revenue + คอม ไม่ recompute อีก", note: "Owner เท่านั้น · unlock ได้ถ้าจำเป็น" }, { item: "Tooltip cell", meaning: "hover เพื่อดู breakdown: ยอดขาย · อัตรา % ตอนนั้น · คอมที่ได้ · สถานะ" }, { item: "Summary row", meaning: "ยอดรวมทั้ง workspace ในช่วงที่เลือก — revenue / commission / จำนวนคนที่ได้รับ" }], formulas: [{ name: "คอมมิชชั่นพื้นฐาน", formula: "commission = revenue_attributed × rate%", example: "ยอด ฿100,000 · rate 3% → ฿3,000", dataSource: "Meta API + DB commission_rules", refresh: "15 นาที (หยุดเมื่อ lock)" }, { name: "Tier rate (หลายขั้น)", formula: "tier: ≤฿50k → 2% · ≤฿200k → 3% · >฿200k → 5%", example: "ยอด ฿150k → (50k×2%) + (100k×3%) = ฿1,000 + ฿3,000 = ฿4,000", dataSource: "DB commission_rules.tiers", refresh: "15 นาที" }, { name: "Lock snapshot", formula: "ตอน lock → copy metrics + commission ลง commission_lock — revenue จากหลังไม่กระทบ", example: "lock พ.ค. → คอม พ.ค. ไม่เปลี่ยน แม้ Meta มียอดมาเพิ่มภายหลัง", dataSource: "DB lock table", refresh: "ตอน lock/unlock" }], useCases: [{ title: "ปิดยอดสิ้นเดือน — จ่ายคอม", steps: ["Period = เดือนที่แล้ว", "ตรวจ Summary", "Lock month", "Export PDF รายคน", "จ่ายเงินแล้ว mark paid"], outcome: "ปิดยอดได้ใน 30 นาที · audit ตามได้" }, { title: "ทีมขายเช็คยอดของตัวเอง", steps: ["Search ชื่อตัวเอง", "ดู row ของตัวเอง", "hover cell ดู breakdown"], outcome: "ทีมขายตรวจสอบเองได้ ไม่ต้อง export Sheet" }, { title: "ตรวจย้อนหลัง", steps: ["เลือกปีย้อนหลัง", "ดู status badge ของเดือนนั้น", "🔓 ปรับได้ · 🔒 final"], outcome: "รู้ทันทีไม่ต้องถามบัญชี" }, { title: "หา Top performer ของไตรมาส", steps: ["Period = ไตรมาส", "sort Total desc", "ดู 5 อันดับแรก"], outcome: "ตัดสินใจมอบรางวัลจากข้อมูลจริง" }], tips: [{ type: "การใช้งาน", text: "ตั้ง Lock month ทุกวันที่ 5 ของเดือนถัดไป — รอ Meta สรุปข้อมูลครบก่อน" }, { type: "การใช้งาน", text: "รองรับ multi-tier rate — ตั้งใน Commission Settings" }, { type: "การตัดสินใจ", text: "อย่า lock เดือนปัจจุบัน — Meta ยังมีโอกาสยอดมาเพิ่มภายหลัง" }, { type: "การตัดสินใจ", text: "ถ้า commission รวมสูงผิดปกติ ตรวจ attribution mapping ว่าไม่ชนกัน" }] },
  { id: "commission-dashboard", title: "แดชบอร์ดคอมมิชชั่น (Commission Dashboard)", shortLabel: "แดชบอร์ดคอมมิชชั่น", path: "/commission/dashboard", category: "commission", what: "ภาพรวมคอมมิชชั่น — กราฟแนวโน้มรายเดือน สัดส่วนตามคน/ทีม KPI รวม / จ่ายแล้ว / ค้างจ่าย และตาราง Top earners", who: ["owner", "ceo"], wireLayout: "commission-dashboard", wireSpots: [{ x: 4, y: 6, label: "Toolbar: Date pills / Team filter" }, { x: 4, y: 16, label: "KPI Row 3: รวม / จ่ายแล้ว / ค้างจ่าย" }, { x: 4, y: 38, label: "Bar chart 12 เดือนย้อนหลัง" }, { x: 4, y: 65, label: "Donut สัดส่วนตามคน/ทีม" }, { x: 4, y: 84, label: "ตาราง Top 5 earners" }], elements: [{ item: "Date pills", zone: "ซ้ายบน", kind: "filter" }, { item: "Team filter", zone: "ขวาบน", kind: "selector" }, { item: "KPI: คอมรวมช่วง", zone: "บนสุด", kind: "kpi" }, { item: "KPI: จ่ายแล้ว (paid)", zone: "บนสุด", kind: "kpi" }, { item: "KPI: ค้างจ่าย (pending)", zone: "บนสุด", kind: "kpi" }, { item: "Bar chart 12 เดือน", zone: "กลางหน้า", kind: "chart" }, { item: "Donut chart (คน/ทีม)", zone: "ล่างซ้าย", kind: "chart" }, { item: "ตาราง Top 5 earners", zone: "ล่างขวา", kind: "table" }], explanations: [{ item: "KPI ค้างจ่าย", meaning: "คอมที่ยังไม่ mark paid (open หรือ locked แต่ยังไม่จ่าย) · กดเพื่อข้ามไป Commission Table กรองทันที" }, { item: "Bar chart 12 เดือน", meaning: "แนวโน้มคอมรายเดือน ย้อนหลัง 1 ปี · สีต่างตาม status" }, { item: "Donut", meaning: "สัดส่วน commission แบ่งตามคนหรือทีม · หาคนผูกขาดรายได้ได้" }, { item: "Top 5 earners", meaning: "5 อันดับแรกในช่วง · % ของยอดรวม · ใช้ตัดสินใจรางวัลโบนัส" }], formulas: [{ name: "% ของรวม (donut)", formula: "% = commission_of_person ÷ total_commission × 100", example: "คน A ฿8,000 · รวม ฿40,000 → 20%", dataSource: "คำนวณจาก commission table", refresh: "15 นาที" }], useCases: [{ title: "รายงาน CEO รายเดือน", steps: ["Period = เดือนปัจจุบัน", "ดู KPI + Bar 12 เดือน", "capture หน้าจอใส่สไลด์"], outcome: "สรุปคอมใน 1 หน้า" }, { title: "ติดตามยอดค้างจ่าย", steps: ["ดู KPI ค้างจ่าย", "ถ้าสูงเกินไป → Commission Table → Lock month"], outcome: "ยอดค้างจ่ายไม่พอกพูน" }, { title: "ดูคนที่ยอดตก", steps: ["Bar chart hover คนเฉพาะ", "ดูแนวโน้ม 3 เดือนล่าสุด"], outcome: "เจอคนยอดตก → คุยตัวต่อตัว" }], tips: [{ type: "การใช้งาน", text: "ใช้คู่กับ Commission Table — ที่นี่เห็นภาพรวม · ที่ table เห็นรายเดือน" }, { type: "การตัดสินใจ", text: "ถ้า Top 1 ครองสัดส่วน >50% — ลด risk โดยกระจายลูกค้าให้คนอื่นมากขึ้น" }] },
  { id: "commission-personal", title: "คอมมิชชั่นของฉัน (My Commission)", shortLabel: "คอมของฉัน", path: "/commission/personal", category: "commission", what: "หน้าส่วนตัวสำหรับพนักงานเซลส์ — ดูยอดขาย คอม สถานะจ่าย ของตัวเอง รายเดือน + แนวโน้ม ระบบกันให้เห็นเฉพาะของตัวเองเท่านั้น (Owner/CEO เปิดดูได้แต่จะเห็นเป็นมุมมองส่วนตัวของตัวเอง)", who: ["owner", "ceo", "staff"], wireLayout: "commission-personal", wireSpots: [{ x: 4, y: 6, label: "Header: รูป + ชื่อ + Role badge" }, { x: 4, y: 20, label: "KPI 3 ใบ: คอมเดือนนี้ / Total ปีนี้ / ค้างจ่าย" }, { x: 4, y: 42, label: "กราฟ Bar 12 เดือน ของฉัน" }, { x: 4, y: 72, label: "ตารางรายเดือน: ยอดขาย · rate% · คอม · สถานะ" }], elements: [{ item: "Header ส่วนตัว", zone: "บนสุด", kind: "card" }, { item: "KPI 3 ใบ", zone: "บนสุด", kind: "kpi" }, { item: "Bar chart 12 เดือนของฉัน", zone: "กลางหน้า", kind: "chart" }, { item: "ตารางรายเดือน", zone: "ด้านล่าง", kind: "table" }, { item: "Status badge ต่อแถว", zone: "ในตาราง", kind: "badge" }, { item: "ปุ่มดาวน์โหลดสลิป PDF", zone: "แต่ละแถว", kind: "button" }], explanations: [{ item: "KPI คอมเดือนนี้", meaning: "ยอดคอมของฉันในเดือนปัจจุบัน · realtime ตามยอดที่เก็บมาถึงตอนนี้" }, { item: "KPI Total ปีนี้", meaning: "รวมคอมตั้งแต่ ม.ค. ปีปัจจุบัน · สะท้อน performance รวม" }, { item: "KPI ค้างจ่าย", meaning: "คอมที่ระบบบันทึกแล้วแต่ยังไม่ mark paid" }, { item: "ตารางรายเดือน", meaning: "แต่ละแถว = 1 เดือน · มี breakdown ยอดขาย+rate · กดดาวน์โหลดสลิป PDF ได้ทุกเดือนที่ paid แล้ว" }, { item: "การกันสิทธิ์", meaning: "ระบบกัน server-side: query auto filter by ctx.user.id — เห็นได้เฉพาะของตัวเอง ดูของคนอื่นไม่ได้" }], formulas: [{ name: "คอมของฉัน", formula: "เหมือนใน Commission Table แต่ filter เฉพาะ user_id = me", example: "ดูคำอธิบายเต็มในหน้า Commission Table", dataSource: "DB · scope=me", refresh: "15 นาที" }], useCases: [{ title: "เช็ครายเดือนของตัวเอง", steps: ["เปิด /commission/personal", "ดู KPI", "ดูตาราง 12 เดือน"], outcome: "รู้ยอดเอง ไม่ต้องถามฟินันซ์" }, { title: "ดาวน์โหลดสลิปไป refer", steps: ["หาเดือนที่ paid", "ปุ่ม PDF", "ใช้ refer ขอสินเชื่อ"], outcome: "ได้สลิป PDF ทันที" }, { title: "ดูแนวโน้มยอดของตัวเอง", steps: ["ดู Bar chart 12 เดือน", "เปรียบเทียบเดือนนี้กับเดือนเดียวกันปีก่อน"], outcome: "วางแผนปรับ performance ของตัวเอง" }], tips: [{ type: "การใช้งาน", text: "ระบบ realtime — เห็นยอดล่าสุดทันที ไม่ต้องรอสิ้นเดือน" }, { type: "การตัดสินใจ", text: "ถ้ายอดไม่ตรงกับที่จำได้ — แจ้ง Owner ทันทีก่อนเดือนถูก lock" }] },
  { id: "commission-settings", title: "ตั้งค่าคอมมิชชั่น (Commission Settings)", shortLabel: "ตั้งค่าคอม", path: "/commission/settings", category: "commission", what: "ตั้งกฎคอมมิชชั่น — อัตรา % รายบุคคล หรือ Tier rate หลายขั้น ตั้ง attribution rule (ลูกค้าคนนี้คือของใคร) ตั้งช่วงล็อกเดือน", who: ["owner"], wireLayout: "commission-settings", wireSpots: [{ x: 4, y: 6, label: "Tab: Rules / Attribution / Lock periods" }, { x: 4, y: 22, label: "ตารางกฎคอม: คน × rate / tier" }, { x: 4, y: 58, label: "Form เพิ่ม/แก้กฎ" }, { x: 4, y: 82, label: "ตารางช่วง Lock period" }], elements: [{ item: "Tab navigation 3 แทบ", zone: "บนสุด", kind: "toolbar" }, { item: "ตารางกฎคอม", zone: "กลางบน", kind: "table" }, { item: "Form เพิ่ม/แก้กฎ", zone: "กลางหน้า", kind: "panel" }, { item: "Toggle Tier mode", zone: "ในการ์ดทุกใบ", kind: "toolbar" }, { item: "ตาราง Tier (ถ้าเปิด)", zone: "ในการ์ดทุกใบ", kind: "table" }, { item: "Tab Attribution: rule mapping ลูกค้า→พนักงาน", zone: "Tab ประวัติ", kind: "table" }, { item: "Tab Lock periods", zone: "Tab ประวัติ", kind: "table" }], explanations: [{ item: "กฎคอม", meaning: "อัตรา % ของพนักงานแต่ละคน · เลือกได้ flat rate หรือ tier rate" }, { item: "Tier rate", meaning: "หลายขั้นบันได เช่น ≤฿50k=2% / ≤฿200k=3% / >฿200k=5% — ระบบคำนวณตามขั้นจริง" }, { item: "Attribution", meaning: "กฎผูกลูกค้า (page/account) เข้ากับพนักงาน เพื่อให้คอมไหลถูกคน" }, { item: "Lock period", meaning: "เดือนใดบ้างที่ถูก lock — แสดง start/end + ใครเป็นคนล็อก + วันที่ล็อก" }], formulas: [{ name: "Tier breakdown", formula: "commission = Σ (revenue_in_tier × tier_rate) ทุก tier ที่ตกอยู่", example: "ยอด ฿150k · tier 50k@2% + 100k@3% = ฿1,000 + ฿3,000 = ฿4,000", dataSource: "DB commission_rules.tiers", refresh: "15 นาที (commission computer)" }], useCases: [{ title: "เพิ่มพนักงานใหม่", steps: ["Tab Rules", "+ Add rule", "เลือกชื่อ", "เลือก rate type (flat/tier)", "บันทึก"], outcome: "พนักงานใหม่เริ่มได้รับคอมจากยอดถัดไป" }, { title: "อัปเดต rate ทุกคนทั้งทีม", steps: ["edit rule รายคน", "กรอก rate ใหม่", "บันทึก"], outcome: "rate ใหม่ใช้กับยอดตั้งแต่ตอนนี้เป็นต้นไป" }, { title: "ผูกลูกค้าใหม่ให้พนักงาน", steps: ["Tab Attribution", "+ Add rule", "เลือก page / account → พนักงาน"], outcome: "ยอดจากลูกค้านี้นับเป็นของพนักงานคนนั้น" }, { title: "ดูประวัติการ lock", steps: ["Tab Lock periods", "ดูตาราง"], outcome: "รู้ว่าใคร lock เดือนไหน ตอนไหน" }], tips: [{ type: "การใช้งาน", text: "เปลี่ยน rate ไม่ย้อนผลกระทบเดือนที่ lock แล้ว — ปลอดภัยจะแก้ได้ตลอด" }, { type: "การตัดสินใจ", text: "Tier rate กระตุ้นพนักงานปิดดีลใหญ่ขึ้น · flat rate เหมาะกับทีมขายสินค้าพื้นฐานหลาก SKU" }, { type: "การตัดสินใจ", text: "Attribution ต้องตั้งให้ครบทุกบัญชี · มิฉะนั้นคอมจะตกในกองรวม (orphan)" }] },
  { id: "accounts-settings", title: "ตั้งค่าบัญชีโฆษณา (Ad Accounts)", shortLabel: "บัญชีโฆษณา", path: "/accounts", category: "settings", what: "เพิ่ม/แก้/ลบ บัญชี Meta Ads — กรอก Account ID + Access Token + ROAS target + จัดกลุ่ม + ทดสอบการเชื่อมต่อ", who: ["owner"], wireLayout: "accounts-settings", wireSpots: [{ x: 4, y: 6, label: "ปุ่ม + เพิ่มบัญชีใหม่" }, { x: 4, y: 20, label: "ตารางบัญชีทั้งหมด: id / name / group / target / status" }, { x: 4, y: 70, label: "Modal เพิ่ม/แก้บัญชี + ทดสอบ Token" }], elements: [{ item: "ปุ่ม + เพิ่มบัญชี", zone: "ขวาบน", kind: "button" }, { item: "ตารางบัญชี", zone: "กลางหน้า", kind: "table" }, { item: "Status badge (Active / Token Expired / Blocked)", zone: "ในตาราง", kind: "badge" }, { item: "ปุ่ม Test Token", zone: "แต่ละแถว", kind: "button" }, { item: "Modal: Account ID, Access Token, Display name, Group, ROAS target", zone: "กลางจอ", kind: "modal" }, { item: "Error panel (จาก Meta API)", zone: "ในการ์ดทุกใบ", kind: "panel" }], explanations: [{ item: "Account ID", meaning: "เลข act_xxx จาก Meta Ads Manager — เป็น unique key" }, { item: "Access Token", meaning: "Long-lived user token หรือ System User token จาก Meta — เก็บแบบเข้ารหัส" }, { item: "ROAS target", meaning: "เป้า ROAS ของบัญชีนี้ — ใช้คำนวณสี/threshold ในทุกหน้า dashboard" }, { item: "Group", meaning: "กลุ่มสินค้าที่บัญชีนี้สังกัด — Filter ที่ Group Overview ใช้ตัวนี้" }, { item: "Test Token", meaning: "กดเพื่อ ping Meta Graph API ดู error เต็มรูปแบบ — ใช้ debug 'API access blocked' หรือ 'expired'", note: "ปุ่มนี้แนะนำให้กดทุกครั้งหลังเพิ่มบัญชีใหม่" }], formulas: [{ name: "Status detection", formula: "ระบบ ping Meta API ทุก 15 นาที — ถ้า return OAuthException → Token Expired · API access blocked → Blocked", example: "act_1661766934815872 ตอบ 'API access blocked' → Status = Blocked", dataSource: "Meta Graph API v22.0", refresh: "15 นาที" }], useCases: [{ title: "เพิ่มบัญชีใหม่", steps: ["+ เพิ่มบัญชี", "กรอก act_id + token", "กรอก ROAS target", "เลือก group", "Test Token", "บันทึก"], outcome: "บัญชีพร้อมใช้ใน Dashboard ภายใน 1 นาที" }, { title: "แก้ Token ที่หมดอายุ", steps: ["หาแถวที่ Status = Blocked", "Edit", "กรอก token ใหม่จาก Graph API Explorer", "Test", "บันทึก"], outcome: "ระบบกลับมาดึงข้อมูลได้ทันที" }, { title: "ปรับ ROAS target ทั้งทีม", steps: ["edit รายบัญชี", "ปรับ target จาก 2.0 → 2.5", "บันทึก"], outcome: "เกณฑ์สีทุกหน้าเปลี่ยนตามทันที" }, { title: "ลบบัญชีที่ไม่ใช้แล้ว", steps: ["edit", "Delete", "ยืนยัน"], outcome: "บัญชีหาย แต่ commission history ที่ผูกอยู่ยังอยู่ (soft delete)" }], tips: [{ type: "การใช้งาน", text: "ใช้ System User token แทน Personal token — ไม่หมดอายุง่าย" }, { type: "การตัดสินใจ", text: "ถ้าเจอ 'API access blocked' → ปัญหา Meta App ไม่ใช่ token — ดู developers.facebook.com → App Dashboard มีคำเตือนไหม" }, { type: "การตัดสินใจ", text: "ตั้ง ROAS target ตามจริง อย่าตั้งสูงเกิน — มิฉะนั้น Smart Scaling จะ pause adset ที่จริง ๆ ยังดี" }] },
  { id: "groups-settings", title: "ตั้งค่ากลุ่มสินค้า (Groups)", shortLabel: "กลุ่มสินค้า", path: "/groups", category: "settings", what: "จัดกลุ่มสินค้า (เช่น Skincare / Supplement / Beauty Device) — ใช้ filter ในทุกหน้าหลัก และคำนวณ Group Breakdown ใน Hub", who: ["owner"], wireLayout: "groups-settings", wireSpots: [{ x: 4, y: 6, label: "ปุ่ม + เพิ่มกลุ่ม" }, { x: 4, y: 20, label: "ตาราง groups: ชื่อ / # บัญชี / สี / ROAS target ทั้งกลุ่ม" }, { x: 4, y: 70, label: "Modal เพิ่ม/แก้กลุ่ม" }], elements: [{ item: "ปุ่ม + เพิ่มกลุ่ม", zone: "ขวาบน", kind: "button" }, { item: "ตาราง groups", zone: "กลางหน้า", kind: "table" }, { item: "ปุ่มเลือก/ลาก reorder", zone: "แต่ละแถว", kind: "button" }, { item: "ปุ่ม Edit / Delete", zone: "แต่ละแถว", kind: "button" }, { item: "Modal: ชื่อ / สี / icon / target ทั้งกลุ่ม", zone: "กลางจอ", kind: "modal" }, { item: "Counter # บัญชีในกลุ่ม", zone: "ในตาราง", kind: "badge" }], explanations: [{ item: "Group", meaning: "ป้ายรวมบัญชี Ads ที่ขายสินค้าหมวดเดียวกัน — ทำให้เปรียบเทียบ ROAS ต่อกลุ่มได้" }, { item: "ROAS target ทั้งกลุ่ม", meaning: "ใช้สำหรับการ์ด Group Overview — ถ้าบัญชีในกลุ่มมี target ต่างกัน ระบบจะใช้ค่าเฉลี่ยถ่วงน้ำหนัก" }, { item: "สี/icon", meaning: "ใช้แสดงในกราฟ Donut Group Breakdown ของ Hub — ให้ดูง่าย" }], formulas: [{ name: "Group ROAS", formula: "Group ROAS = Σ revenue_in_group ÷ Σ spend_in_group", example: "Skincare: revenue ฿120k · spend ฿40k → ROAS 3.0", dataSource: "Aggregate Meta API insights", refresh: "5 นาที (ตาม Hub)" }], useCases: [{ title: "สร้างกลุ่มใหม่", steps: ["+ Add group", "ตั้งชื่อ + สี + target", "บันทึก", "กลับ Accounts settings ผูกบัญชีเข้ากลุ่ม"], outcome: "กลุ่มใหม่พร้อมใช้ใน Filter ทุกหน้า" }, { title: "เปลี่ยนสีให้สังเกตง่าย", steps: ["edit", "เปลี่ยนสี", "บันทึก"], outcome: "กราฟ Group Breakdown ใน Hub เปลี่ยนสีทันที" }, { title: "ลบกลุ่มที่ไม่ใช้", steps: ["ปลดบัญชีออกจากกลุ่มก่อน", "Delete"], outcome: "กลุ่มหายจาก filter" }], tips: [{ type: "การใช้งาน", text: "ใช้ชื่อเดียวกับที่ทีมเรียกใน LINE — เพื่อให้สื่อสารง่าย" }, { type: "การตัดสินใจ", text: "อย่ามีกลุ่มเดียวที่ครอบทุกบัญชี — Group Breakdown จะไม่มีประโยชน์ ตั้งอย่างน้อย 3 กลุ่ม" }] },
  { id: "user-management", title: "จัดการผู้ใช้ (User Management)", shortLabel: "ผู้ใช้", path: "/users", category: "settings", what: "ดูรายชื่อ user ใน workspace แก้ Role / Status สร้าง Magic Invite Link เชิญทีมเข้าระบบโดยไม่ต้องส่ง Company Code", who: ["owner", "ceo"], wireLayout: "user-management", wireSpots: [{ x: 4, y: 6, label: "Toolbar: ปุ่ม + Magic Invite / Search / Filter Role" }, { x: 4, y: 20, label: "ตาราง users: avatar / ชื่อ / role / status / joined" }, { x: 4, y: 70, label: "Modal Magic Invite (ลิงก์ + expire + role)" }], elements: [{ item: "ปุ่ม Magic Invite Link", zone: "ขวาบน", kind: "button" }, { item: "Search ชื่อ/email", zone: "ขวาบน", kind: "selector" }, { item: "Filter Role 4 ปุ่ม", zone: "ซ้ายบน", kind: "filter" }, { item: "ตาราง users", zone: "กลางหน้า", kind: "table" }, { item: "Role select (dropdown)", zone: "แต่ละแถว", kind: "selector" }, { item: "Status badge (Active / Pending / Disabled)", zone: "ในตาราง", kind: "badge" }, { item: "ปุ่ม Disable / Delete", zone: "แต่ละแถว", kind: "button" }, { item: "Modal Magic Invite: role default / expire / max uses", zone: "กลางจอ", kind: "modal" }], explanations: [{ item: "Magic Invite Link", meaning: "ลิงก์เชิญที่ pre-set role ไว้ ผู้ที่เปิดลิงก์จะได้ role นั้นทันที ไม่ต้องรอ Owner approve", note: "ตั้ง expire ได้ และจำกัดจำนวนใช้ได้" }, { item: "Role", meaning: "owner / ceo / content / staff / pending — กำหนดสิทธิ์ดูข้อมูล + ใช้ฟีเจอร์" }, { item: "Status Pending", meaning: "user เข้าด้วย Company Code แต่ Owner ยังไม่กำหนด role → user ใช้งานไม่ได้ ต้องรอ approve" }, { item: "ตาราง users", meaning: "เรียงตามวันที่ join ล่าสุดก่อน · กดที่ row → ไปหน้า Profile ของคนนั้น" }], formulas: [{ name: "การกระจาย role", formula: "owner เป็น static 1 คน · ceo,content,staff = Owner กำหนด · pending = default หลัง Company Code", example: "Magic Invite role=staff · expire 7วัน · max=10 → 10 คนแรกที่เปิดได้ role staff อัตโนมัติ", dataSource: "DB users + invite_links", refresh: "ทันทีเมื่อแก้ในตาราง" }], useCases: [{ title: "เชิญทีมขายเข้าระบบ", steps: ["+ Magic Invite", "role=staff", "expire 7วัน", "max=10", "ส่งลิงก์ใน LINE กลุ่ม"], outcome: "ทีม 10 คนเข้าได้ใน 1 ลิงก์" }, { title: "Approve user pending", steps: ["Filter = pending", "เปิด role dropdown", "เลือก staff", "บันทึก"], outcome: "user เริ่มใช้ระบบได้ทันที" }, { title: "Disable คนออก", steps: ["หาแถว", "Disable", "ยืนยัน"], outcome: "user เปิดเว็บไม่ได้ทันที · history ยังอยู่" }, { title: "เปลี่ยน role พนักงานเป็น CEO", steps: ["หาแถว", "Role = ceo", "บันทึก"], outcome: "เห็นข้อมูลรวมเทียบเท่า Owner (ยกเว้นจัดการ user)" }], tips: [{ type: "การใช้งาน", text: "ใช้ Magic Invite Link แทน Company Code — สะดวกกว่า ตั้ง expire ได้ ตามตัวได้" }, { type: "การตัดสินใจ", text: "owner มี 1 คนต่อ workspace — อย่าให้ token หาย ถ้าเปลี่ยนเจ้าของต้องโอน owner ผ่าน Owner เดิม" }, { type: "การตัดสินใจ", text: "staff เห็นเฉพาะคอมของตัวเอง · CEO เห็นทั้งหมด — ระวังตั้ง role ผิด" }] },
  { id: "profile", title: "โปรไฟล์ของฉัน (Profile)", shortLabel: "โปรไฟล์", path: "/profile", category: "settings", what: "หน้าตั้งค่าส่วนตัว — แก้ชื่อแสดง อวตาร์ ภาษา (TH/EN) เปิดปิดการแจ้งเตือน ดู role ของตัวเอง ดูประวัติเข้าใช้งาน", who: ["owner", "ceo", "content", "staff"], wireLayout: "profile", wireSpots: [{ x: 4, y: 6, label: "Avatar + ชื่อ + role badge" }, { x: 4, y: 20, label: "Form แก้ชื่อ / อีเมล / ภาษา" }, { x: 4, y: 50, label: "การแจ้งเตือน (toggle 4-5 ช่อง)" }, { x: 4, y: 78, label: "ตารางประวัติ Login 10 ครั้งล่าสุด" }], elements: [{ item: "Avatar (upload รูปได้)", zone: "บนสุด", kind: "card" }, { item: "ชื่อแสดง / display name", zone: "กลางบน", kind: "selector" }, { item: "อีเมล (read-only จาก Manus OAuth)", zone: "กลางบน", kind: "selector" }, { item: "ภาษา (TH/EN)", zone: "กลางบน", kind: "selector" }, { item: "Role badge (read-only)", zone: "บนสุด", kind: "badge" }, { item: "Toggle การแจ้งเตือน 4-5 ประเภท", zone: "กลางหน้า", kind: "toolbar" }, { item: "ตารางประวัติ Login (timestamp + IP + UA)", zone: "ด้านล่าง", kind: "table" }, { item: "ปุ่ม Sign out", zone: "ขวาบน", kind: "button" }], explanations: [{ item: "Avatar", meaning: "รูปโปรไฟล์ที่แสดงใน Sidebar + Profile menu · upload PNG/JPG ขนาดไม่เกิน 2MB" }, { item: "Display name", meaning: "ชื่อที่ปรากฏใน Commission Table + User Management · ตั้งให้ชัดเจน เช่นชื่อจริง + นามสกุล" }, { item: "ภาษา", meaning: "TH ค่าเริ่มต้น · EN สำหรับทีมต่างชาติ" }, { item: "การแจ้งเตือน", meaning: "เลือกประเภท: Alerts ใหม่ · Smart Scaling แนะนำ · คอมเดือนนี้ปิด · ลิงก์แชร์ใหม่" }, { item: "ประวัติ Login", meaning: "10 ครั้งล่าสุด · ใช้ตรวจหากมีคนเข้าใช้บัญชีโดยไม่ได้รับอนุญาต" }, { item: "Role read-only", meaning: "เปลี่ยน Role ตัวเองไม่ได้ — ต้องให้ Owner เปลี่ยนใน User Management" }], formulas: [{ name: "สิทธิ์การแจ้งเตือน", formula: "Owner = ได้ทุก notification · CEO = ทุก notification · Content = Smart Scaling + Alerts · Staff = คอมของตัวเอง", example: "Staff toggle Alerts ใหม่ → ระบบส่ง notif เฉพาะตอน ROAS adset ของ account ที่ตัวเองดูแลตก", dataSource: "DB users.notification_prefs", refresh: "realtime" }], useCases: [{ title: "อัพเดตชื่อ + รูป", steps: ["upload avatar", "พิมพ์ display name ใหม่", "บันทึก"], outcome: "ชื่อใหม่ปรากฏทุกที่ภายในวินาที" }, { title: "ปิดการแจ้งเตือนที่ไม่อยากรับ", steps: ["toggle off", "ไม่ต้องบันทึก (auto-save)"], outcome: "หยุดส่ง notif ทันที" }, { title: "ตรวจประวัติ Login", steps: ["scroll ลงไปยังตารางประวัติ", "ดู IP/UA ผิดปกติไหม"], outcome: "เจอความผิดปกติ → กด Sign out + เปลี่ยนรหัส Manus" }], tips: [{ type: "การใช้งาน", text: "ตั้งภาษา EN สำหรับ partner ต่างชาติ · ภาษา TH ใช้กับทีมไทย" }, { type: "การตัดสินใจ", text: "ถ้า role ผิด — ติดต่อ Owner ทันที อย่าใช้บัญชีจนกว่าจะตั้งถูก" }] },
  { id: "onboarding-invite", title: "Onboarding & Magic Invite Redeem", shortLabel: "Onboarding/Invite", path: "/onboarding หรือ /invite/:token", category: "overview", what: "หน้ารับ user ใหม่ — ครั้งแรกที่ Login ระบบนำเข้า /onboarding ให้กรอก Company Code · ถ้ามี Magic Invite ให้เปิดลิงก์ /invite/:token ระบบกำหนด role ให้ทันที", who: ["owner", "ceo", "content", "staff"], wireLayout: "generic-form", wireSpots: [{ x: 4, y: 8, label: "Logo + คำต้อนรับ" }, { x: 4, y: 30, label: "Form Company Code / หรือ ปุ่มเปิด Magic Invite ที่ได้รับ" }, { x: 4, y: 70, label: "ปุ่ม Submit + ลิงก์ติดต่อ Owner" }], elements: [{ item: "Logo + คำต้อนรับ", zone: "บนสุด", kind: "card" }, { item: "Form Company Code (6 หลัก)", zone: "กลางหน้า", kind: "selector" }, { item: "ปุ่ม Submit", zone: "กลางหน้า", kind: "button" }, { item: "ลิงก์ 'ติดต่อ Owner' (LINE/Email)", zone: "ด้านล่าง", kind: "button" }, { item: "หน้า /invite/:token (auto-redeem)", zone: "เต็มหน้า", kind: "panel" }, { item: "ข้อความ status (Redeeming... / Success / Expired / Maxed out)", zone: "กลางหน้า", kind: "badge" }], explanations: [{ item: "Company Code", meaning: "รหัส 6 หลักที่ Owner สร้างไว้ใน Settings → workspace · กรอกครั้งเดียวเพื่อเข้าระบบ" }, { item: "Magic Invite Token", meaning: "ตัวระบุในลิงก์ /invite/xxx · ระบบ redeem อัตโนมัติเมื่อเปิดลิงก์ — ไม่ต้องกรอกอะไร" }, { item: "หลัง redeem", meaning: "Magic Invite: ได้ role ทันที พร้อมใช้งาน · Company Code: ได้ role 'pending' รอ Owner approve" }, { item: "ข้อความ status", meaning: "Expired = ลิงก์หมดอายุ · Maxed out = จำนวนใช้เต็มแล้ว — ต้องขอลิงก์ใหม่จาก Owner" }], formulas: [{ name: "Magic Invite redeem", formula: "redeem → set user.role = invite.role · max_uses -= 1 · ถ้า max_uses = 0 → invite invalid", example: "Invite max=10 · ใช้แล้ว 10 → คนที่ 11 จะได้ข้อความ 'Maxed out'", dataSource: "DB invite_links + users", refresh: "ทันทีตอน redeem" }], useCases: [{ title: "เข้าระบบครั้งแรกด้วย Magic Invite", steps: ["รับลิงก์จาก Owner", "Login Manus ก่อน", "เปิดลิงก์", "ระบบ auto-redeem", "เริ่มใช้งานทันที"], outcome: "ใช้งานได้ใน 30 วินาที" }, { title: "เข้าระบบครั้งแรกด้วย Company Code", steps: ["Login Manus", "กรอก Company Code", "Submit", "รอ Owner approve"], outcome: "เริ่มใช้งานหลัง Owner เปลี่ยน role จาก pending" }, { title: "ลิงก์หมดอายุ ขอใหม่", steps: ["เห็นข้อความ Expired", "กดลิงก์ 'ติดต่อ Owner'", "ขอลิงก์ใหม่"], outcome: "ได้ลิงก์ใหม่จาก Owner" }], tips: [{ type: "การใช้งาน", text: "Magic Invite สะดวกกว่า — Owner ตั้ง role ล่วงหน้า ไม่ต้องคอย approve ทีหลัง" }, { type: "การตัดสินใจ", text: "ถ้าจะเชิญคน 1-2 คน ใช้ Company Code ก็ได้ · เชิญ 5+ คนแนะนำ Magic Invite" }] },
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
  { term: "Score (Smart Scaling)", meaning: "ตัวเลขรวม performance: ROAS/target × 0.7 + CTR/threshold × 0.3 — ระบบใช้ตัดสินใจ action 5 ระดับ" },
  { term: "Action Badge", meaning: "🚀 ขึ้นแรง +30% / ✅ ขึ้น +15% / 👀 คงเดิม / 📉 ลง -25% / ⛔ pause" },
  { term: "Auto-pilot Mode", meaning: "โหมด Smart Scaling ที่ apply คำแนะนำให้อัตโนมัติทุก 3 ชั่วโมง — ขับได้ไม่ต้องเฝ้าจอ" },
  { term: "Sandbox", meaning: "โหมดจำลอง — ทดลอง action ของ Smart Scaling ได้โดยไม่ส่งไป Meta จริง" },
  { term: "Attribution", meaning: "กฎผูกลูกค้า (page/account) เข้ากับพนักงาน — บอกระบบว่ายอดจากลูกค้าคนไหนเป็นคอมของใคร" },
  { term: "Tier Rate", meaning: "อัตราคอมหลายขั้นบันได เช่น ≤฿50k=2% / ≤฿200k=3% / >฿200k=5%" },
  { term: "Slug / Share Link", meaning: "ลิงก์อ่านอย่างเดียวสำหรับคนนอกระบบ — ไม่ต้องล็อกอิน ตั้ง expire/password ได้" },
  { term: "Forecast (AI Advisor)", meaning: "พยากรณ์จบสัปดาห์ / เดือน จาก AI พร้อมช่วงมั่นใจ (confidence interval)" },
  { term: "Alert Severity", meaning: "ระดับความรุนแรงของ Alert: critical (แดง) / warning (เหลือง) / info (น้ำเงิน)" },
  { term: "Benchmark Bands", meaning: "ช่วง P25/P50/P75/P90 ของ metric จากทุกแอด — ใช้เทียบว่าแอดของเราอยู่ช่วงไหนของพอร์ตโฟลิโอ" },
  { term: "Sales Cohort", meaning: "กลุ่มลูกค้าที่ซื้อครั้งแรกในช่วงเวลาเดียวกัน — ตรวจ LTV และ retention ราย cohort" },
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
  {
    q: "ทำไมบัญชีของฉันเขียนว่า 'API access blocked'?",
    a: "Meta บล็อกแอป/โทเคนที่ออก — อาจไม่ได้ verify Business / ทำ App Review / เจอ nipple policy violation · เข้า developers.facebook.com/apps → ดู banner แดง · ถ้าปกติลองออก token ใหม่จาก Graph API Explorer และอัปเดตที่หน้า ตั้งค่าบัญชีโฆษณา",
  },
  {
    q: "สิทธิ์ของ Role แต่ละอย่างต่างกันยังไง?",
    a: "Owner: ทุกอย่าง · CEO: เหมือน Owner ยกเว้นลบ workspace + ลบ Owner · Content: ดู dashboard + ปรับ Smart Scaling ได้ ไม่เห็นคอมมิชชั่น · Staff: เห็นเฉพาะคอมของตัวเอง + LIVE 1 ชม.ล่าสุด",
  },
  {
    q: "Lock Period ถ้าล็อกผิดเดือน unlock ได้ไหม?",
    a: "ได้ — Owner เปิดหน้า Commission Settings → Tab Lock periods → กด Unlock · ระบบไม่ลบประวัติ snapshot — หลัง unlock ระบบจะ recompute ตามยอด Meta ล่าสุด — ถ้าจ่ายคอมไปแล้วอาจต้องตามจ่ายส่วนต่าง",
  },
  {
    q: "ลิงก์แชร์ถูก forward ต่อได้ไหม?",
    a: "ได้ — ถ้าไม่ได้ตั้ง password คนไหนมีลิงก์ก็เปิดได้ · แนะนำ: ส่งแบบ 1-to-1 + ตั้ง expire สั้น + ตั้ง password สำหรับลิงก์ส่งบุคคลภายนอก",
  },
  {
    q: "AI Advisor ใช้ LLM ตัวไหน ข้อมูลหลุดออกหรือไม่?",
    a: "ใช้ผ่าน Manus LLM proxy · server ไม่ส่ง access token ของ Meta ออก · ข้อมูล KPI ถูก aggregate ก่อนส่ง — ไม่มี raw conversion data หรือข้อมูลลูกค้าหลุดออกไป",
  },
  {
    q: "หน้าไหนต้องรีเฟรชเองบ้าง / หน้าไหน auto?",
    a: "อัตโนมัติทุกหน้า: Hub/KPI ทุก 5 นาที · LIVE/Realtime ทุก 1 นาที · AI Insight ทุก 15 นาที · Smart Scaling/Top Ads ทุก 10 นาที · กด 🔄 refresh ขวาบนได้ทุกเมื่อต้องการสดทันที",
  },
  {
    q: "ข้อมูลย้อนหลังได้ไกลขนาดไหน?",
    a: "ระบบดึง Meta API รายวันถอยหลังได้ สูงสุด 90 วัน (ตาม retention ของ Meta) · ระบบเก็บ aggregate ลง DB ไม่จำกัดเวลา — ช่วง cohort/leaderboard ย้อนได้ถึงตอน onboarding",
  },
];

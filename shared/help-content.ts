// shared/help-content.ts
// เนื้อหาคู่มือ Help Center — ฉบับกระชับ จัดตามบทบาท
// ภาษาไทยทั้งหมด

export type HelpRole = "owner" | "ceo" | "content" | "staff";

export const ROLE_META: Record<HelpRole, { emoji: string; label: string; description: string }> = {
  owner: { emoji: "👑", label: "เจ้าของ (Owner)", description: "ผู้สร้าง workspace มีสิทธิ์ทุกอย่าง" },
  ceo: { emoji: "💼", label: "CEO", description: "ผู้บริหารร่วม สิทธิ์เกือบเท่า Owner" },
  content: { emoji: "🎨", label: "คนยิงแอด (Content)", description: "ทีมครีเอทีฟ + วางแผนแอด" },
  staff: { emoji: "💬", label: "เซลส์ (Staff)", description: "พนักงานปิดการขาย" },
};

// ───────────────────────────────────────────────────────────────────
// ส่วนที่ 1: เริ่มต้นใช้งาน
// ───────────────────────────────────────────────────────────────────
export const GETTING_STARTED = {
  what: "Richbiotech Ads Dashboard คือเครื่องมือดูภาพรวมแอดโฆษณา Facebook ทุกบัญชีในที่เดียว เห็นเงินจ่าย/คนทัก/ออเดอร์/รายได้/ROAS ครบ พร้อมเครื่องมือวิเคราะห์ + AI แนะนำการปรับงบและคำนวณคอมมิชชั่นพนักงานอัตโนมัติ",
  loginSteps: [
    "เปิดลิงก์เว็บที่ได้รับ",
    "กดปุ่ม \"เข้าสู่ระบบด้วย Manus\"",
    "ครั้งแรก: กรอก Company Code ที่เจ้าของระบบให้มา หรือคลิกลิงก์เชิญ (Magic Link) ที่ส่งให้",
    "รอเจ้าของกำหนด Role แล้วใช้งานได้ทันที",
  ],
  layoutNotes: [
    {
      label: "Sidebar (เมนูซ้าย)",
      detail: "รวมทุกหน้าใช้งาน จัดเป็นกลุ่ม: ภาพรวม / วิเคราะห์ / ปรับงบ / คอมมิชชั่น / ตั้งค่า — ตรึงคงที่ เลื่อนหน้าไม่ขยับ",
    },
    {
      label: "Topbar (แถบบน)",
      detail: "ปุ่มแจ้งเตือน 🔔 / ปุ่มช่วยเหลือ ❓ / สลับธีม Dark/Light / โปรไฟล์",
    },
    {
      label: "Persona Toggle (สลับมุมมอง)",
      detail: "บนหน้าหลักมีปุ่มสลับ \"คนยิงแอด\" ↔ \"เซลส์\" เพื่อปรับการแสดงผลให้เหมาะกับคุณ",
    },
    {
      label: "Theme (Dark/Light)",
      detail: "สลับโหมดมืด/สว่างได้ตามต้องการ — Sidebar เป็นเข้มถาวรเสมอเพื่อความคมชัด",
    },
  ],
  personaDiff: "มุมมอง \"คนยิงแอด\" จะเน้นข้อมูลแอด/ROAS/Smart Scaling เพื่อช่วยตัดสินใจปรับงบ ส่วนมุมมอง \"เซลส์\" จะเน้นคนทักเข้ามาแบบ Realtime + กราฟชั่วโมงที่ผ่านมา เพื่อกระตุ้นการปิดการขาย",
};

// ───────────────────────────────────────────────────────────────────
// ส่วนที่ 2: คู่มือตามบทบาท (Role Guide)
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
    whoYouAre: "เจ้าของระบบ — เห็นทุกบัญชีโฆษณา ปรับงบ ดูคอมมิชชั่น และจัดการพนักงานทั้งหมด",
    pagesUsed: [
      { page: "หน้าหลัก", purpose: "เช็กภาพรวมเงินจ่าย/รายได้/ROAS ทุกบัญชีรวมในจอเดียว" },
      { page: "แนะนำปรับงบ (Smart Scaling)", purpose: "ดูว่า adset ไหนควรเพิ่ม/ลด/หยุดงบ" },
      { page: "ภาพรวมคอมมิชชั่น", purpose: "ดูยอดคอมที่จะต้องจ่ายพนักงานเดือนนี้" },
      { page: "จัดการผู้ใช้", purpose: "ออก User ใหม่ + กำหนด Role + จัดการลิงก์เชิญ" },
      { page: "จัดการบัญชี / กลุ่มสินค้า / ตั้งค่าคอมมิชชั่น", purpose: "ตั้งค่าระบบทั้งหมด" },
    ],
    dailyRoutine: [
      "เปิด \"หน้าหลัก\" — ดู KPI 5 ตัว: Spend / คนทัก / Orders / Revenue / ROAS",
      "ถ้า ROAS รวมต่ำกว่าเป้า → ไป \"แนะนำปรับงบ\" ดูว่าควรลดงบ adset ไหน",
      "ถ้ามี adset แดง (ROAS < threshold) → กดเข้า \"วิเคราะห์แอดเชิงลึก\" ดูสาเหตุ",
      "ก่อนสิ้นเดือนไปดู \"ภาพรวมคอมมิชชั่น\" + lock period ก่อนปิดยอด",
      "ใช้ \"AI แนะนำ\" ขอคำแนะนำเชิงกลยุทธ์ (5 ผู้เชี่ยวชาญ) เมื่อต้องตัดสินใจใหญ่",
    ],
    metricsToWatch: ["ROAS รวม (≥ เป้า)", "Spend รวม vs เมื่อวาน", "ยอดคอมเดือนนี้"],
  },
  {
    role: "ceo",
    whoYouAre: "ผู้บริหารระดับสูง โฟกัสภาพรวมกลยุทธ์และผลตอบแทนรวม ไม่ลงรายละเอียด adset",
    pagesUsed: [
      { page: "หน้าหลัก", purpose: "ดู KPI หลัก + เทรนด์รายได้ vs ค่าโฆษณา" },
      { page: "ภาพรวมกลุ่มสินค้า", purpose: "เปรียบเทียบ ROAS แต่ละกลุ่มสินค้า" },
      { page: "เปรียบเทียบผลงาน", purpose: "ดูเทียบ 7 วันนี้ vs 7 วันก่อน หรืองวด custom" },
      { page: "ภาพรวมคอมมิชชั่น", purpose: "ดูภาระต้นทุนคอมรายเดือน" },
      { page: "AI แนะนำ", purpose: "ขอ insight ระดับกลยุทธ์จาก AI" },
    ],
    dailyRoutine: [
      "เช้า: เปิด \"หน้าหลัก\" ดู ROAS/Revenue วันก่อน",
      "ดู \"ภาพรวมกลุ่มสินค้า\" — กลุ่มไหนทำกำไรได้ดีสุด/แย่สุด",
      "สัปดาห์ละครั้ง: ใช้ \"เปรียบเทียบผลงาน\" ดูเทรนด์ระยะกลาง",
    ],
    metricsToWatch: ["ROAS รวม", "Revenue เทียบงวดก่อน", "% เปลี่ยนแปลง Spend"],
  },
  {
    role: "content",
    whoYouAre: "คนยิงแอดและทีมครีเอทีฟ — รับผิดชอบเลือกใช้งบและทดสอบ creative",
    pagesUsed: [
      { page: "วิเคราะห์แอดเชิงลึก", purpose: "ดูทุก adset พร้อม filter/sort + AI summary" },
      { page: "แนะนำปรับงบ", purpose: "รับคำแนะนำเพิ่ม/ลดงบ adset แต่ละตัว" },
      { page: "ชาร์ตอันดับ", purpose: "ดู Top/Bottom ของแอด แต่ละ metric" },
      { page: "วิเคราะห์ Cohort", purpose: "ดูว่าแอดอายุกี่วันยังคุ้ม ROAS อยู่" },
      { page: "Benchmark มาตรวัดแอด", purpose: "เทียบ CTR/Cost/ROAS กับมาตรฐาน" },
      { page: "AI แนะนำ", purpose: "ขอ insight จาก AI ก่อนตัดสินใจปรับ creative" },
    ],
    dailyRoutine: [
      "เปิด \"แนะนำปรับงบ\" ก่อน — ดูคำแนะนำ Smart Scaling สำหรับวันนี้",
      "ปรับงบตามแนะนำ → กรอกตัวเลขใหม่ในการ์ด",
      "ไป \"วิเคราะห์แอดเชิงลึก\" ดู adset ที่กำลัง burn งบ ตรวจสอบ creative",
      "เย็น: ดู \"ชาร์ตอันดับ\" หา winner ของวันนี้",
    ],
    metricsToWatch: ["ROAS adset รายตัว", "Cost/Msg", "CTR vs benchmark"],
  },
  {
    role: "staff",
    whoYouAre: "พนักงานเซลส์ — ปิดการขายจากแชทที่ลูกค้าทักเข้ามา",
    pagesUsed: [
      { page: "หน้าหลัก (มุมมอง Sales)", purpose: "ดูคนทัก Realtime ชั่วโมงนี้ + ยอดสะสมวันนี้" },
      { page: "คอมมิชชั่นของฉัน", purpose: "ดูคอมที่ตัวเองได้แต่ละวัน + ประวัติ lock period" },
    ],
    dailyRoutine: [
      "เปิด \"หน้าหลัก\" สลับเป็น \"มุมมอง Sales\"",
      "ดูกล่อง LIVE — ชั่วโมงนี้คนทักกี่คน เทียบกับเฉลี่ย 7 วัน",
      "ถ้าตัวเลขสูงขึ้น → urgency บอก \"พีคแล้ว\" รีบตอบ/ปิดทุกแชท",
      "เย็น: เช็ก \"คอมมิชชั่นของฉัน\" ดูยอดสะสมเดือนนี้",
    ],
    metricsToWatch: ["คนทักชั่วโมงนี้", "ยอดสะสมวันนี้", "ยอดคอมเดือนนี้"],
  },
];

// ───────────────────────────────────────────────────────────────────
// ส่วนที่ 3: คู่มือแต่ละหน้า (Page Reference)
// ───────────────────────────────────────────────────────────────────
export type PageGuide = {
  id: string;
  title: string;
  path: string;
  category: "overview" | "analysis" | "scaling" | "commission" | "settings";
  what: string;
  contains: { item: string; meaning: string }[];
  who: HelpRole[];
  tip: string;
};

export const PAGE_GUIDES: PageGuide[] = [
  // ─── ภาพรวม ───
  {
    id: "hub",
    title: "หน้าหลัก (Hub Dashboard)",
    path: "/",
    category: "overview",
    what: "หน้าแรกที่เปิดมาเจอ — รวมทุก KPI ทุกบัญชีโฆษณาในจอเดียว ทั้งภาพรวมและ realtime",
    contains: [
      { item: "Persona Toggle", meaning: "สลับมุมมอง คนยิงแอด ↔ เซลส์ จะเปลี่ยนรายละเอียดที่แสดง" },
      { item: "5 KPI Cards", meaning: "Spend / คนทัก / Orders / Revenue / ROAS พร้อม sparkline 7 วัน + delta vs เมื่อวาน" },
      { item: "LIVE · 1 ชม.ล่าสุด (Sales view)", meaning: "กราฟ 24 ชม. + คนทักชั่วโมงนี้ + urgency กระตุ้นยอด" },
      { item: "AI Insight", meaning: "AI สรุป 1-2 บรรทัด สิ่งที่ควรสังเกตวันนี้" },
      { item: "เพจมาแรงวันนี้", meaning: "Top 5 เพจที่คนทักเข้ามาเยอะ (รวมเพจเดียวกันแม้คนละบัญชี)" },
      { item: "Heatmap 7×24", meaning: "ตารางคนทัก 7 วัน × 24 ชั่วโมง ดูว่าช่วงไหนคนทักเยอะ" },
      { item: "รายได้ vs ค่าโฆษณา", meaning: "Area+Line chart 30 วัน เห็นเทรนด์รายได้กับงบที่จ่าย" },
      { item: "แยกตามกลุ่มสินค้า", meaning: "แถบสัดส่วน Spend หรือ ROAS ของแต่ละกลุ่มสินค้า + ตัวเลขเปอร์เซ็นต์" },
      { item: "Smart Scaling แนะนำ", meaning: "Top 5 adset ที่ AI แนะนำให้ปรับงบ" },
      { item: "Top Performing Ads", meaning: "Top 5 adset ROAS สูงสุด" },
      { item: "ตารางบัญชีโฆษณา", meaning: "ทุกบัญชีพร้อม sparkline 14 วัน + status pill" },
    ],
    who: ["owner", "ceo", "content", "staff"],
    tip: "เปิดหน้านี้เป็นอันดับแรกของวัน ใช้ Persona Toggle เลือกมุมมองให้ตรงงานของคุณ",
  },
  {
    id: "group-overview",
    title: "ภาพรวมกลุ่มสินค้า",
    path: "/group-overview",
    category: "overview",
    what: "เปรียบเทียบผลงานระดับกลุ่มสินค้า เช่น เจ้าขุน vs I SURE",
    contains: [
      { item: "KPI รวมต่อกลุ่ม", meaning: "Spend, ROAS, Revenue รายกลุ่ม" },
      { item: "ตารางเปรียบเทียบ", meaning: "แสดงทุกกลุ่มเรียงตาม metric ที่เลือก" },
      { item: "Export CSV", meaning: "ดาวน์โหลดข้อมูลออกไปทำรายงานต่อ" },
    ],
    who: ["owner", "ceo", "content"],
    tip: "ใช้หน้านี้ตัดสินใจกระจายงบลงกลุ่มสินค้าที่กำไรสูงกว่า",
  },
  {
    id: "single-dashboard",
    title: "แดชบอร์ดบัญชีเดี่ยว",
    path: "/dashboard",
    category: "overview",
    what: "เจาะดูบัญชีโฆษณาเดียว — ทั้ง KPI + เทรนด์ 14 วันแบบละเอียด",
    contains: [
      { item: "Account Selector", meaning: "เลือกบัญชีจาก dropdown" },
      { item: "KPI รายวัน", meaning: "ตัวเลขของช่วงเวลาที่เลือก" },
      { item: "Trend Chart", meaning: "กราฟ Spend/Revenue/ROAS รายวัน" },
    ],
    who: ["owner", "ceo", "content"],
    tip: "ใช้เมื่อต้องโฟกัสบัญชีเดียวเชิงลึก เช่นบัญชีที่งบเยอะที่สุด",
  },
  // ─── วิเคราะห์ ───
  {
    id: "leaderboard",
    title: "ชาร์ตอันดับ (Leaderboard)",
    path: "/leaderboard",
    category: "analysis",
    what: "จัดอันดับ Top/Bottom ของบัญชี/กลุ่ม/แอด ตาม metric ที่เลือก",
    contains: [
      { item: "Entity Switch", meaning: "เลือกระดับ: บัญชี / กลุ่มสินค้า / Adset" },
      { item: "Metric Switch", meaning: "ROAS / Spend / Revenue / Msg / Orders / CTR" },
      { item: "Top N + Bottom N", meaning: "แสดง 10 อันดับบน + 10 อันดับล่าง พร้อม Badge 🥇🥈🥉" },
    ],
    who: ["owner", "ceo", "content"],
    tip: "ดู Bottom N ก่อน — หาตัวที่ต้องตัดทิ้ง/ปรับด่วน",
  },
  {
    id: "comparison",
    title: "เปรียบเทียบผลงาน",
    path: "/comparison",
    category: "analysis",
    what: "เทียบผลงาน 2 งวดเวลา — งวดเดียวกันอัตโนมัติ หรือ Custom A vs B",
    contains: [
      { item: "Toggle โหมดเทียบ", meaning: "อัตโนมัติ (7 วันนี้ vs 7 วันก่อน) หรือเลือกเอง" },
      { item: "ตาราง side-by-side", meaning: "ทุก metric พร้อม % เปลี่ยน (เขียว/แดง)" },
      { item: "Sparkline 7 วัน", meaning: "เห็นรูปร่างเทรนด์ของแต่ละ metric" },
    ],
    who: ["owner", "ceo", "content"],
    tip: "ใช้ Custom เปรียบช่วงโปรโมชั่น vs ปกติ ดูว่าโปรช่วยขายได้จริงไหม",
  },
  {
    id: "ai-advisor",
    title: "AI แนะนำ",
    path: "/ai-advisor",
    category: "analysis",
    what: "ขอคำแนะนำจาก AI 5 ผู้เชี่ยวชาญ (Performance / Budget / Creative / Risk / Sales)",
    contains: [
      { item: "เลือกผู้เชี่ยวชาญ", meaning: "แต่ละคนมีมุมมองต่างกัน" },
      { item: "Scope + Date Range", meaning: "เลือกขอบเขตข้อมูลให้ AI วิเคราะห์" },
      { item: "ผลลัพธ์ Markdown", meaning: "AI ตอบเป็นรายงานสรุป + คำแนะนำเป็นข้อ ๆ" },
    ],
    who: ["owner", "ceo", "content"],
    tip: "ลองถามผู้เชี่ยวชาญหลายคนสำหรับการตัดสินใจสำคัญ — มุมมองต่างกันช่วยรอบคอบขึ้น",
  },
  {
    id: "ad-intelligence",
    title: "วิเคราะห์แอดเชิงลึก (Ads Intelligence)",
    path: "/ad-intelligence",
    category: "analysis",
    what: "ตารางทุก adset พร้อม filter/sort/pagination + AI summary ต่อ adset",
    contains: [
      { item: "Filter + Sort + Search", meaning: "หา adset ที่ต้องโฟกัส" },
      { item: "AI Summary", meaning: "AI สรุปสาเหตุที่ adset นี้ทำดี/ไม่ดี" },
      { item: "Drill-down → AdsetDetail", meaning: "คลิกเข้าไปดู 4 tabs + กราฟรายวัน + ตาราง Ads" },
    ],
    who: ["owner", "ceo", "content"],
    tip: "Sort by Cost/Msg มาก→น้อย หา adset ที่กิน budget ไร้ผลก่อน",
  },
  {
    id: "ad-metric-benchmark",
    title: "Benchmark มาตรวัดแอด (Ads Metric Benchmark)",
    path: "/ad-metric-benchmark",
    category: "analysis",
    what: "เทียบ CTR / Cost-per-msg / ROAS ของแอดกับ benchmark มาตรฐาน",
    contains: [
      { item: "Donut + Bar charts", meaning: "เห็นว่ากี่ adset อยู่ในแต่ละ tier" },
      { item: "Tier Cards", meaning: "Best / Good / Avg / Below — จับ adset เข้าหมวดให้" },
      { item: "Deep Dive", meaning: "คลิกเข้าไปดูรายละเอียด adset แต่ละกลุ่ม" },
    ],
    who: ["owner", "ceo", "content"],
    tip: "Adset ใน Tier \"Below\" คือกลุ่มแรกที่ต้องตัดสินใจตัดทิ้ง",
  },
  {
    id: "alerts",
    title: "การแจ้งเตือน (Alerts)",
    path: "/alerts",
    category: "analysis",
    what: "ตั้งกฎแจ้งเตือนอัตโนมัติเมื่อ ROAS/Spend/CTR ผิดปกติ + ส่งเข้าเว็บ/LINE/Webhook",
    contains: [
      { item: "Tab Events", meaning: "ดูประวัติเหตุการณ์ที่ถูกแจ้งเตือนแล้ว" },
      { item: "Tab Rules", meaning: "ตั้งกฎใหม่ (เช่น ROAS < 1.5 ติด 3 วัน)" },
      { item: "Tab Channels", meaning: "ตั้งช่องทางส่ง: Manus / LINE / Webhook" },
    ],
    who: ["owner", "ceo", "content"],
    tip: "ตั้งกฎ \"ROAS รวมต่ำกว่าเป้า\" + ส่งเข้า LINE → ไม่พลาดตอนเงินไหลออกผิดปกติ",
  },
  {
    id: "cohort",
    title: "วิเคราะห์ Cohort",
    path: "/cohort",
    category: "analysis",
    what: "ดูว่าแอดอายุกี่วันยังคุ้ม ROAS อยู่ — แสดงเป็น heatmap สี",
    contains: [
      { item: "Toggle 2 มุมมอง", meaning: "By Ad Age (Day N) หรือ By Start Week" },
      { item: "Heatmap สี", meaning: "เขียวเข้ม = ROAS ดี / แดง = ROAS แย่" },
    ],
    who: ["owner", "content"],
    tip: "ถ้าเห็นแอดสีจางลงหลัง Day 7 → creative เริ่ม fatigue ควรเปลี่ยน",
  },
  // ─── ปรับงบ + แชร์ ───
  {
    id: "smart-scaling",
    title: "แนะนำปรับงบ (Smart Scaling)",
    path: "/smart-scaling",
    category: "scaling",
    what: "AI แนะนำเพิ่ม/ลด/หยุดงบรายวัน — แต่ละ adset มี score และ action",
    contains: [
      { item: "Score Badge", meaning: "คะแนน 0-100 บอกความน่าปรับ" },
      { item: "Action", meaning: "Scale Up / Maintain / Scale Down / Pause" },
      { item: "From → To", meaning: "งบเดิม vs งบที่แนะนำ + กดปรับได้จากการ์ด" },
      { item: "Mini timeline", meaning: "เห็นเทรนด์ 7 วันก่อนตัดสินใจ" },
    ],
    who: ["owner", "ceo", "content"],
    tip: "ระบบแค่แนะนำ — คุณต้องกดยืนยันการปรับเอง + ดูใน Meta Ads Manager",
  },
  {
    id: "share-links",
    title: "ลิงก์แชร์ (Share Links)",
    path: "/share-links",
    category: "scaling",
    what: "สร้างลิงก์สาธารณะ (อ่านอย่างเดียว) แชร์ให้คนที่ไม่ได้เป็น user เห็น dashboard",
    contains: [
      { item: "ปุ่มสร้างลิงก์ใหม่", meaning: "เลือกขอบเขต (บัญชี/กลุ่ม) + อายุ" },
      { item: "ตารางลิงก์ทั้งหมด", meaning: "พร้อม revoke ปิดลิงก์ได้ทุกเมื่อ" },
    ],
    who: ["owner", "ceo"],
    tip: "ใช้แชร์ให้ลูกค้า/นักลงทุนดูผลงานโดยไม่ต้องออก user",
  },
  // ─── คอมมิชชั่น ───
  {
    id: "commission-table",
    title: "ตารางคอมมิชชั่น",
    path: "/commission",
    category: "commission",
    what: "ตารางคอมแยกรายกลุ่มสินค้า + รายพนักงาน พร้อม Lock Period",
    contains: [
      { item: "Filter งวด/พนักงาน/กลุ่ม", meaning: "หาแถวที่สนใจได้เร็ว" },
      { item: "Lock Period", meaning: "ล็อกยอดของงวดที่ปิดแล้วไม่ให้แก้ไข" },
      { item: "Export CSV", meaning: "เอาออกไปจ่ายเงินจริง" },
    ],
    who: ["owner", "ceo", "content"],
    tip: "ก่อนปิดเดือนให้กด \"ล็อกงวด\" เพื่อกันตัวเลขเปลี่ยนหลังจ่ายเงินไปแล้ว",
  },
  {
    id: "commission-dashboard",
    title: "ภาพรวมคอมมิชชั่น",
    path: "/commission/dashboard",
    category: "commission",
    what: "ภาพรวมยอดคอมรวมและกราฟแยกตามพนักงาน/กลุ่มสินค้า",
    contains: [
      { item: "KPI ภาระคอมเดือนนี้", meaning: "ยอดรวมที่ต้องจ่าย" },
      { item: "กราฟ Commission by Staff", meaning: "พนักงานคนไหนได้คอมเยอะสุด" },
      { item: "กราฟ Commission by Group", meaning: "กลุ่มสินค้าไหนสร้างคอมเยอะสุด" },
    ],
    who: ["owner", "ceo", "content"],
    tip: "ใช้วางแผน cashflow ปลายเดือนก่อนถึงรอบจ่ายเงิน",
  },
  {
    id: "commission-personal",
    title: "คอมมิชชั่นของฉัน",
    path: "/commission/personal",
    category: "commission",
    what: "หน้าที่พนักงานทุกคนเปิดดูคอมของตัวเองได้",
    contains: [
      { item: "ยอดคอมเดือนนี้", meaning: "ยอดสะสม + แตกตามวัน" },
      { item: "ประวัติงวดที่ล็อกแล้ว", meaning: "ดูย้อนหลัง" },
    ],
    who: ["owner", "ceo", "content", "staff"],
    tip: "ถ้าตัวเลขดูไม่ถูก ทักหา Owner ตรวจสอบได้เลย",
  },
  {
    id: "commission-settings",
    title: "ตั้งค่าคอมมิชชั่น",
    path: "/commission/settings",
    category: "commission",
    what: "ตั้งค่าระบบคอม — Grade, Staff, ผูก clip กับ staff",
    contains: [
      { item: "Grade", meaning: "อัตราคอม % ตามเกรด เช่น A 5% / B 3%" },
      { item: "Staff", meaning: "เพิ่ม/ลบพนักงาน + กำหนด grade" },
      { item: "Clip Assignment", meaning: "ผูก clip โฆษณากับ staff ที่เป็นเจ้าของยอด" },
    ],
    who: ["owner", "ceo"],
    tip: "ตั้งค่า Grade ก่อนเริ่มเดือน — เปลี่ยนกลางเดือนระบบจะคำนวณตามค่าใหม่ ณ วันที่บันทึกเท่านั้น",
  },
  // ─── ตั้งค่าระบบ ───
  {
    id: "accounts",
    title: "จัดการบัญชี (Ads Account)",
    path: "/accounts",
    category: "settings",
    what: "เพิ่ม/ลบบัญชีโฆษณา Facebook ที่จะดึงข้อมูลเข้าระบบ",
    contains: [
      { item: "ปุ่มเพิ่มบัญชี", meaning: "กรอก Ad Account ID + ชื่อเล่น" },
      { item: "ตารางทุกบัญชี", meaning: "พร้อมปุ่มลบ + แก้ไขกลุ่มสินค้า" },
    ],
    who: ["owner", "ceo"],
    tip: "ตั้งชื่อเล่นให้จำง่าย เช่น \"เจ้าขุน-Boatna\" — เห็นในทุกหน้า",
  },
  {
    id: "groups",
    title: "กลุ่มสินค้า (Account Groups)",
    path: "/groups",
    category: "settings",
    what: "สร้างกลุ่มเพื่อรวมหลายบัญชีโฆษณาเข้าเป็นกลุ่มเดียว + ตั้ง threshold",
    contains: [
      { item: "สร้างกลุ่ม + เลือกสมาชิก", meaning: "ลากบัญชีเข้ากลุ่ม" },
      { item: "ROAS / CTR threshold", meaning: "เกณฑ์เตือนเมื่อต่ำกว่า" },
    ],
    who: ["owner", "ceo"],
    tip: "ตั้ง ROAS threshold ตามเป้าจริง ไม่ใช่ค่าเริ่มต้น — จะแม่นยำขึ้น",
  },
  {
    id: "users",
    title: "จัดการผู้ใช้ (User Management)",
    path: "/users",
    category: "settings",
    what: "เพิ่ม/ลบ/แก้ Role พนักงาน + สร้าง Magic Invite Link",
    contains: [
      { item: "ปุ่ม \"ออก User ใหม่\"", meaning: "สร้างลิงก์เชิญส่วนตัว — เลือก Role + ตั้งชื่อ + อายุ 7 วัน" },
      { item: "ตารางลิงก์เชิญ", meaning: "ดูสถานะ Active / Used / Expired / Revoked + ปุ่ม Copy / Revoke" },
      { item: "ตาราง User ปัจจุบัน", meaning: "เปลี่ยน Role / ลบออก (มีปุ่มถังขยะแดง)" },
    ],
    who: ["owner", "ceo"],
    tip: "ใช้ Magic Invite Link แทน Company Code — Owner คุม Role ได้ตั้งแต่ออกลิงก์ ปลอดภัยกว่า",
  },
];

// ───────────────────────────────────────────────────────────────────
// ส่วนที่ 4: ศัพท์ + FAQ
// ───────────────────────────────────────────────────────────────────
export const GLOSSARY: { term: string; meaning: string }[] = [
  { term: "Spend", meaning: "เงินที่จ่ายค่าโฆษณา (บาท)" },
  { term: "ROAS", meaning: "จ่าย 1 ได้กลับกี่เท่า เช่น ROAS 3 = จ่าย 1 บาท ได้ 3 บาท" },
  { term: "คนทัก", meaning: "จำนวนคนทักแชทเข้ามา" },
  { term: "ออเดอร์", meaning: "จำนวนคำสั่งซื้อ" },
  { term: "รายได้ (Revenue)", meaning: "ยอดขายรวม (บาท)" },
  { term: "AOV", meaning: "Average Order Value — ยอดเฉลี่ยต่อออเดอร์" },
  { term: "CTR", meaning: "Click-Through Rate — อัตราคนคลิกโฆษณา (%)" },
  { term: "Cost/Msg", meaning: "ค่าใช้จ่ายต่อ 1 คนทัก" },
  { term: "Adset", meaning: "ชุดโฆษณา หนึ่งชุดมีหลาย ad" },
  { term: "Cohort", meaning: "กลุ่มแอดที่เริ่มยิงในช่วงเดียวกัน — ใช้วิเคราะห์อายุของแอด" },
  { term: "Smart Scaling", meaning: "ระบบ AI แนะนำการปรับงบรายวัน" },
  { term: "Persona", meaning: "มุมมองการแสดงผล: คนยิงแอด vs เซลส์" },
  { term: "Lock Period", meaning: "ล็อกงวดคอมไม่ให้ยอดเปลี่ยนหลังปิดเดือน" },
  { term: "Magic Invite Link", meaning: "ลิงก์เชิญส่วนตัวที่ Owner สร้างให้พนักงานคนเดียว" },
];

export const FAQS: { q: string; a: string }[] = [
  {
    q: "ROAS เท่าไหร่ถึงดี?",
    a: "ขึ้นกับ margin สินค้า สำหรับสินค้าทั่วไป ROAS ≥ 2.5 ถือว่าคุ้ม สินค้า margin บางต้องสูงกว่า 4 ขึ้นไป — ดูเป้าที่ตั้งไว้ในหน้า \"กลุ่มสินค้า\"",
  },
  {
    q: "ทำไมตัวเลขไม่ตรงกับ Meta Ads Manager?",
    a: "Meta API มี delay 30-180 นาทีสำหรับข้อมูลใหม่ และระบบเรา cache ผลลัพธ์ 5 นาทีเพื่อความเร็ว กดปุ่ม Refresh เพื่อดึงใหม่ได้",
  },
  {
    q: "ข้อมูลอัปเดตบ่อยแค่ไหน?",
    a: "Auto-refresh ทุก 60 วินาที (หน้าหลัก) และดึงข้อมูลใหม่จาก Meta ทุก 15 นาที — กดปุ่ม Refresh ดึงสดได้ทุกเมื่อ",
  },
  {
    q: "สถานะ \"เฝ้าระวัง\" กับ \"ต่ำกว่าเป้า\" ต่างกันยังไง?",
    a: "เฝ้าระวัง = ROAS เริ่มลดลงแต่ยังเหนือเกณฑ์ / ต่ำกว่าเป้า = ROAS ต่ำกว่า threshold ที่ตั้งไว้ (ในหน้ากลุ่มสินค้า) ติดต่อกัน",
  },
  {
    q: "Smart Scaling ปรับงบให้จริงไหม?",
    a: "ไม่ — ระบบแค่แนะนำ คุณต้องกดยืนยันแล้วไปปรับเองใน Meta Ads Manager เพื่อความปลอดภัย",
  },
  {
    q: "Export ข้อมูลยังไง?",
    a: "หน้าที่มีตารางส่วนใหญ่มีปุ่ม \"Export CSV\" มุมขวาบน คลิกแล้วได้ไฟล์ .csv ทันที",
  },
  {
    q: "ทำไมพนักงานเข้าระบบไม่ได้?",
    a: "1) ตรวจ Role เป็น \"pending\" หรือไม่ → ต้องให้ Owner เปลี่ยน Role 2) ลิงก์เชิญหมดอายุ (7 วัน) → ออกลิงก์ใหม่ 3) ใช้บัญชี Manus คนละบัญชีกับที่ลิงก์เชิญผูกไว้",
  },
  {
    q: "ลบบัญชีโฆษณาออกแล้วข้อมูลเก่าหายไปไหม?",
    a: "ข้อมูลเก่ายังอยู่ในระบบ แต่จะไม่นำมาคำนวณภาพรวมอีก — หากเพิ่มกลับเข้ามาด้วย Account ID เดิม ข้อมูลจะกลับมา",
  },
];

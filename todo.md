# Richbiotech Ads Dashboard — Project TODO

## Phase 0: Setup
- [x] DB Schema ครบทุกตาราง (users, adAccounts, accountGroups, accountGroupMembers, scaleLogs, shareLinks, commission*, scaleSettings)
- [x] Migration & Apply SQL
- [x] Theme: Royal Blue (oklch hue ~265) + Dark/Light Switchable
- [x] Font: Inter (body) + JetBrains Mono (numbers/IDs)
- [x] resolveWorkspaceUserId helper for tenant isolation
- [x] Role-based procedures (ownerProcedure, commissionProcedure)

## Phase 1: Foundation + Hub + Group + Settings
- [x] DashboardLayout with sidebar nav + theme toggle + brand "Richbiotech"
- [x] Onboarding page (pending users → กรอก Company Code)
- [x] AccountsSettings — เพิ่ม/ลบ Ad Account
- [x] GroupsSettings — สร้าง/แก้ไขกลุ่มสินค้า + ROAS/CTR threshold
- [x] HubDashboard — KPI cards + ตารางรายบัญชี + DateRangePicker + Auto-refresh + Export CSV
- [x] GroupOverview — KPI รวม + ตารางรายกลุ่ม + Export CSV
- [x] Dashboard — Single account + Trend chart + KPI รายวัน
- [x] UserManagement — เพิ่ม/ลบ Staff + กำหนด role
- [x] Profile page

## Phase 2: Analysis
- [x] AdIntelligence — ตาราง Adset + Filter + Sort + Pagination + Export CSV + AI summary
- [x] AdsetDetail — 4 tabs + กราฟรายวัน + ตาราง Ads + AI analysis
- [x] AdMetricBenchmark — Donut + Bar charts + ตารางรายละเอียด + Deep Dive + Tier Cards

## Phase 3: Scaling + Share
- [x] SmartScalingSuggestion — score calculation + badge + mini timeline + กรอกงบจาก card
- [x] ScaleLog — บันทึก/แสดงประวัติ + Sort + Export CSV
- [x] ScaleSettings — % เพิ่ม/ลดงบ
- [x] ShareLinksModal — สร้าง/จัดการ link
- [x] Public route /share/:token

## Phase 4: Commission
- [x] CommissionSettings — Grade + Staff + Clip Assignment
- [x] CommissionTable — ตารางรายกลุ่ม + Filter + Lock Period + Export CSV
- [x] CommissionDashboard — Overview + กราฟ Commission by Staff/Group
- [x] CommissionPersonal — My Commission + Locked period history

## Testing
- [x] Vitest tests สำหรับ tenant isolation
- [x] Vitest tests สำหรับ commission lock snapshot format
- [x] Vitest tests สำหรับ smart scaling score calculation

## Final
- [x] Status check
- [x] Save checkpoint


## Round 1 — Leaderboard / Ranking Page
- [x] เพิ่ม route `/leaderboard` ใน App.tsx + เมนู sidebar
- [x] tRPC procedure `leaderboard.rank` (รับ entityType, metric, dateRange, filter, limit)
- [x] หน้า Leaderboard.tsx (entity switch: Account/Group/Adset)
- [x] metric switch: ROAS / Spend / Revenue / Msg / Orders / CTR
- [x] ตาราง Top N + Bottom N พร้อม Badge 🥇🥈🥉
- [x] Filter dropdown: เลือกกลุ่มสินค้า/บัญชีก่อน rank
- [x] DateRangePicker (preset 3/7/14/30 + Custom)
- [x] vitest leaderboard ranking logic (6 tests)

## Round 2 — Performance Comparison
- [x] เพิ่ม route `/comparison` + เมนู sidebar
- [x] tRPC procedure `comparison.compare` (รับ rangeA, rangeB) + `comparison.sparkline`
- [x] หน้า PerformanceComparison.tsx — toggle "งวดเดียวกันอัตโนมัติ" vs "Custom A vs B"
- [x] Sparkline component 7 วัน (recharts) — เลือก metric ได้
- [x] ตาราง side-by-side + % เปลี่ยนแปลง (สีเขียว/แดง)
- [x] vitest comparison delta logic (9 tests)

## Round 3 — AI แนะนำ (One-click)
- [x] เพิ่ม route `/ai-advisor` + เมนู sidebar
- [x] tRPC procedure `ai.analyze` + `ai.experts` (รับ expertRole, scope, dateRange)
- [x] System prompts 5 ผู้เชี่ยวชาญ (Performance / Budget / Creative / Risk / Sales) — ไม่รวม Audience
- [x] หน้า AIAdvisor.tsx — เลือกผู้เชี่ยวชาญ + scope + กดปุ่ม "ขอคำแนะนำ"
- [x] แสดงรายงานด้วย Streamdown (markdown)
- [x] vitest aiAdvisor expert registry (5 tests)

## Round 4 — Alert System
- [x] เพิ่ม table `alertRules`, `alertEvents`, `alertChannels` + migration
- [x] tRPC routers alerts (rules CRUD, events, mark-read, channels)
- [x] หน้า Alerts.tsx (Tabs: events / rules / channels)
- [x] Bell icon ใน header + unread count + popover
- [x] Endpoint `/api/scheduled/checkAlerts` — จะ register heartbeat หลัง deploy (ทุก 3 ชม.)
- [x] Sender: เว็บ (ผ่าน event row) + Manus owner + LINE Messaging + Webhook (ยกเลิก Email — ไม่มีใน template)
- [x] vitest alertEngine ตรวจกฎ 5 ข้อ (12 tests)

## Round 5 — Cohort Analysis
- [x] เพิ่ม route `/cohort` + เมนู sidebar
- [x] tRPC procedure `cohort.byAdAge`, `cohort.byStartWeek`
- [x] หน้า Cohort.tsx — toggle 2 มุมมอง
- [x] Heatmap-style table (X = DayN, Y = แอด/สัปดาห์, สี = ROAS)
- [x] vitest cohort helpers (6 tests)

## Tests + Checkpoint
- [x] vitest leaderboard ranking logic (6 tests)
- [x] vitest comparison delta logic (9 tests)
- [x] vitest alert rule evaluation (12 tests)
- [x] บันทึก checkpoint Round 4 (76d46411)
- [x] บันทึก checkpoint final หลังจบ Round 5


## Round 6 — Hub Dashboard 2.0 (Realtime + Sales-friendly)
### Backend
- [x] tRPC `dashboard.realtime` — messages last 1h + 24h hourly bar + delta vs baseline (yesterday same hour)
- [x] tRPC `dashboard.hotPages` — top 5 pages by msg inflow today + baseline + change %
- [x] tRPC `dashboard.hourlyHeatmap` — 7d × 24h messages grid
- [x] tRPC `dashboard.funnel` — Impressions → Clicks → Messages → Orders → Revenue
- [x] tRPC `dashboard.kpiSparklines` — 7-day daily series for each KPI
- [x] tRPC `dashboard.aiInsight` — invokeLLM, graceful fallback when LLM unavailable

### Frontend — KPI row + persona
- [x] KpiCard ใหม่: accent stripe + label + mono number + delta + sparkline + hint + footer
- [x] react-countup + tabular-nums + skeleton
- [x] Live pulse dot ใน Live Activity Hero
- [x] Persona toggle: Buyer view vs Sales view (localStorage)
- [x] Date Range pills (ผ่าน DateRangePicker เดิม) + Refresh button

### Frontend — Sections ใหม่
- [x] Live Activity Hero (3 zones: urgency + counts + 24h bars)
- [x] Hot Pages list (top 5 + delta % + link → single account)
- [x] Hourly Heatmap 7×24 + tooltip hour/messaging
- [x] Conversion Funnel 5 ขั้น + CTR / msg→buy / AOV
- [x] AI Insights card + link → AI Advisor
- [x] Empty state ใหม่ "ยังไม่มีบัญชีโฆษณา"

### Polish
- [x] Theme toggle + FOUC pre-flight script ใน index.html (light/dark/system)
- [x] Logo Royal Blue gradient #2563eb → #1e40af
- [x] Sarabun font (body) + JetBrains Mono (ตัวเลข .num class)
- [x] Card hover translateY(-2px) + shadow
- [x] Mobile-friendly grid (KPI 2 col / desktop 4-5 col)
- [x] vitest: hourly heatmap + funnel + urgency badge (14 tests)
- [x] บันทึก final checkpoint Round 6 (7f201720)

## Round 7: Hub Dashboard Layout Redesign (อ้างอิง dashboard1/2/3.png)
- [x] Backend: dashboard.revenueVsSpend (รายได้ vs ค่าโฆษณา 30 วัน)
- [x] Backend: dashboard.groupBreakdown (Spend/ROAS แยกตามกลุ่มสินค้า + spendPct/roasPct)
- [x] Backend: dashboard.topAds (Top 5 adset by ROAS + delta %)
- [x] Backend: dashboard.accountsTable (full list + 14D sparkline + status)
- [x] Backend: dashboard.smartScalingRecommend (5 adset + action + from→to)
- [x] KpiCard: dark bg + colored dot + live dot + sparkline เต็มความกว้าง + footer
- [x] HubDashboard Toolbar (Persona pills Buyer/Sales + AccountSelector + Date pills + Refresh)
- [x] Row 1: KPI 5 cards (Spend/คนทัก/Orders/Revenue/ROAS)
- [x] Row 2 (65/35): รายได้ vs ค่าโฆษณา (Area+Line) + แยกตามกลุ่มสินค้า (toggle Spend/ROAS)
- [x] Row 3 (full-width): ตารางบัญชีโฆษณา sortable + 14D sparkline + status pill + avatar
- [x] Row 4 (50/50): Smart Scaling แนะนำ + Top Performing Ads
- [x] คงไว้ section เดิม (Live Activity / Hot Pages / Heatmap / Funnel / AI Insight)
- [x] vitest 7 case (regression 81/81 ผ่าน)

## Round 7.1: Layout Reorder + 1-day preset + ตัด section ที่ไม่ใช้
- [x] เพิ่ม preset "1 วัน" ใน DateRangePicker + shared DatePreset type + DATE_PRESETS
- [x] รองรับ "1d" ใน resolveDateRange + dateRangeFromPreset + zod enum (routers/aiAdvisor)
- [x] ตั้งค่าเริ่มต้น HubDashboard เป็น `{ preset: "1d" }`
- [x] Reorder layout: Toolbar → KPI → AI Insight + Hot Pages (50/50) → Heatmap (full) → Revenue vs Spend + Group (65/35) → SmartScaling (full) → TopAds (full) → AccountsTable (full)
- [x] ลบ Live Activity Hero และ Conversion Funnel ออกจากหน้า Hub (เก็บ function ไว้รอ ติด _ prefix)
- [x] Routes ตรวจแล้ว (`/dashboard`, `/ad-intelligence`, `/smart-scaling`, `/ai-advisor`)
- [x] แก้ deltaPct ใน getTopAds ให้คำนวณจาก prior period จริง (ไม่ synthesize)
- [x] vitest 82 cases ผ่านทั้งหมด

## Round 7.2: ตั้งค่าเริ่มต้น preset "1 วัน" ในทุกหน้า (ยกเว้น Smart Scaling)
- [x] GroupOverview — default 1d
- [x] Single Dashboard — default 1d
- [x] Leaderboard (ชาร์ตอันดับ) — default 1d
- [x] PerformanceComparison — default 1d (ทั้ง rangeA + rangeB)
- [x] AIAdvisor — default 1d
- [x] AdIntelligence — default 1d
- [x] AdMetricBenchmark — default 1d
- [x] Cohort — default 1d
- [x] SmartScaling — คงค่าเดิม (7d, ยกเว้น)
- [x] vitest 82/82 ผ่าน, TypeScript clean

## Round 7.3: KPI Cards เป็น Gradient เต็มสี
- [x] KpiCard ใช้ linear-gradient 135° ตาม accent (ส้ม/ฟ้า/เขียว/ส้ม+ทอง/ม่วง)
- [x] ตัวอักษร/ตัวเลข/ไอคอน/Delta pill = สีขาวทั้งหมด + drop shadow
- [x] Decorative blob 2 ชิ้น (มุมล่างขวา + ขวาบน) + rounded-2xl + soft shadow + hover lift
- [x] Sparkline = path ขาว + area gradient ขาวโปร่งใส
- [x] vitest 82/82 ผ่าน, TypeScript clean

## Round 7.4: Revert default preset (เฉพาะหน้า Hub Dashboard เท่านั้นที่ใช้ 1d)
- [x] HubDashboard — คง 1d
- [x] GroupOverview → 7d
- [x] SingleDashboard → 14d
- [x] Leaderboard → 7d
- [x] PerformanceComparison (rangeA+B) → 7d
- [x] AIAdvisor → 7d
- [x] AdIntelligence → 14d
- [x] AdMetricBenchmark → 30d
- [x] Cohort → 30d
- [x] SmartScaling — คง 7d
- [x] vitest 82/82 ผ่าน, TypeScript clean

## Round 7.5: บังคับ Light Mode = โทนสว่างจริง
- [x] สแกนพบ 27 จุด hardcoded dark ใน HubDashboard แทนด้วย semantic tokens (bg-card / bg-muted / text-foreground / text-muted-foreground / border-border / ring-border) รองรับทั้ง light/dark
- [x] Recharts (RevenueVsSpendChart) ใช้ useTheme + chartColors object (grid/axis/tick/tooltip/activeDot)
- [x] KpiCard คง gradient ไว้ (ไม่มี hardcoded dark)
- [x] vitest 82/82 ผ่าน, TypeScript clean

## Round 7.7: แก้ "Ad" → "Ads" ใน UI strings (advertising)
- [x] AccountsSettings: "Ad Account" → "Ads Account" (3 จุด)
- [x] AdIntelligence: "Ad Intelligence" → "Ads Intelligence"
- [x] AdMetricBenchmark: "Ad Metric Benchmark" → "Ads Metric Benchmark"
- [x] AdsetDetail: "Ad Name" → "Ads Name"
- [x] คง adAccountId/AdSet/AdInsights/route paths/file names (เป็น identifier)
- [x] vitest 82/82 ผ่าน, TypeScript clean


## Round 7.10: Bug Fix DateRangePicker — เลือกวัน 27-28 พ.ค. กลายเป็น 23-24 พ.ค.
- [x] ระบุสาเหตุ: `toISOString().slice(0,10)` แปลงเป็น UTC ทำให้ shift ตาม timezone ของผู้ใช้
- [x] แทนด้วย `parseLocalDate` (ใช้ regex แยก Y/M/D) + `fmt` (ใช้ getFullYear/getMonth/getDate)
- [x] vitest 8 case ครอบคลุม regression case 27-28 พ.ค. + round-trip + วันสิ้นปี/ต้นปี
- [x] vitest 90/90 ผ่าน, TypeScript clean


## Round 7.11: เปลี่ยนโลโก้ + Sidebar เข้มถาวร
- [x] อัปโหลดโลโก้ R ส้มเข้า webdev static assets (/manus-storage/logo_329a1fce.png)
- [x] หาจุดอ้างโลโก้เดิม (AppSidebar Sparkles + DashboardLayout login screen)
- [x] แทนโลโก้ใน AppSidebar header + DashboardLayout login screen
- [x] Sidebar เข้มถาวร (ไม่ผูกกับ ThemeProvider) — bg-[#0f172a], text-white, border-slate-800, hover bg-white/5, active bg-white/10 ring-white/20
- [x] อัปเดต footer (avatar/name/role) เป็นสีขาว/slate-400 ให้เข้ากับ sidebar เข้ม
- [x] เพิ่ม vitest 7 case (97/97 ผ่าน)

## Round 7.12: ตรึง Sidebar (Sticky) ตอน scroll dashboard
- [x] ครอบ AppSidebar (desktop) ด้วย wrapper `sticky top-0 h-screen self-start shrink-0 z-40`
- [x] เพิ่ม vitest 2 case ตรวจ wrapper ใน DashboardLayout (99/99 ผ่าน)

## Round 7.13: Hot Pages dedup (เพจเดียวกัน หลายบัญชี → 1 แถว)
- [x] แก้ getHubHotPages ให้รวมตาม pageName ก่อน sort/slice (ไม่ใช่ map ตรง ๆ จาก accounts)
- [x] รวม messagingToday + baseline ของทุกบัญชีในเพจเดียวกัน + คำนวณ deltaPct หลังรวม
- [x] เพิ่ม field accountCount + nickname format "N บัญชี • ชื่อเล่น" เมื่อ accountCount > 1
- [x] vitest hotPagesGroup 7 case (106/106 ผ่าน)

## Round 7.14: Magic Invite Link (Option A)
- [x] เพิ่มตาราง `inviteTokens` (id, token, ownerId, role, label, expiresAt, usedAt, usedByUserId, revokedAt, createdAt) + migrate
- [x] db helpers: createInviteToken / listInviteTokensByOwner / findInviteByToken / markInviteUsed / revokeInviteToken
- [x] tRPC procedures: invites.create / invites.list / invites.revoke / invites.redeem
- [x] UI ส่วน Invite ในหน้า UserManagement — ปุ่ม "ออก User ใหม่" + dialog เลือก role + label + ตารางลิงก์ (copy/revoke) + status badge
- [x] หน้า /invite/:token (ถ้ายังไม่ login → ปุ่ม login พร้อม returnPath; ถ้า login → auto redeem → toast → redirect /)
- [x] OAuth callback สนับสนุน returnPath ใน state (base64 JSON) → redirect กลับ /invite/:token หลัง login
- [x] vitest inviteTokens 14 case (validation + status + getLoginUrl returnPath round-trip)
- [x] เพิ่ม `invites.verify` (publicProcedure) — ตรวจลิงก์ได้ก่อน login
- [x] ปรับ InviteRedeem — verify-first flow: invalid/revoked/expired โชว์ทันทีไม่ต้องรอ login
- [x] vitest invites.procedure 12 case (create/list/revoke/verify x4 + redeem x6 + uniqueness + expiry) — 132/132 ผ่าน

## Round 7.16 (✅ เสร็จบริบูรณ์): Bug Fixes 3 Packs
### Pack A — P1+P3 Quick Fix
- [x] ลบ function `_LiveActivityHero` + `_ConversionFunnel` ใน HubDashboard.tsx (BUG-1 + BUG-4) — ลด ~250 lines
- [x] Sparkline early-return เมื่อ data.length < 2 + ResponsiveContainer minWidth/minHeight (BUG-2)

### Pack B — Brand Polish
- [x] --primary / --ring / --sidebar-primary -> hue 50 (Brand Orange) ทั้ง :root และ .dark (BUG-7)
- [x] favicon + apple-touch-icon -> โลโก้ R ส้ม (BUG-8)
- [x] OG meta + twitter card + theme-color #f97316 (BUG-8)

### Pack C — Onboarding UX
- [x] Onboarding toast แจ้ง 'รอเจ้าของ workspace กำหนดสิทธิ์' + duration 6s (BUG-5)
- [x] Onboarding แทน Sparkles ด้วยโลโก้ R + ring ส้ม
- [x] InviteRedeem ปุ่ม 'ไม่ใช่ฉัน — ออกจากระบบ' (logout + กลับมา invite) (BUG-9)

### Tests
- [x] vitest round716 13 case + รวม 145/145 ผ่าน, TS clean



## Round 7.20: Help Center (/help)
- [x] สำรวจ 19 หน้าจริง + รวบข้อมูล KPI/element ต่อหน้า
- [x] เขียน content TS file (`shared/help-content.ts`) — 4 ส่วน: เริ่มต้น / role guide / page reference / glossary+FAQ
- [x] สร้าง `client/src/pages/HelpCenter.tsx` — sidebar nav + content + search bar + role section + page section + glossary + FAQ + print/PDF button
- [x] เพิ่ม Route `/help` ใน App.tsx (standalone — ไม่อยู่ใน DashboardLayout)
- [x] เพิ่มปุ่ม `?` (HelpCircle) ใน DashboardLayout topbar ทั้ง mobile + desktop → navigate /help
- [x] เพิ่มปุ่ม "Download PDF" (window.print()) + print:hidden ในส่วน sidebar/topbar
- [x] vitest 19 case (`server/helpContent.test.ts`) — structure / role coverage / 19 pages / glossary / search logic
- [x] vitest 182/182 ผ่าน, TS clean
- [x] checkpoint


## Round 7.21: Help Center ฉบับสมบูรณ์ (3 Batches per user spec)

### Batch 1 — โครงสร้าง + Getting Started + 3 หน้าแรก
- [x] Audit เว็บจริง: ทุก route, KPI, สูตร, badge, threshold (ห้ามจาก spec)
- [x] รื้อ HelpCenter เดิม → โครงสร้างใหม่ตาม sidebar 2 ส่วน + Getting Started + Glossary + FAQ
- [x] Getting Started: Dashboard คืออะไร / Login / โครงหน้าจอ / Persona toggle
- [x] ส่วนที่ 1 — 3 หน้า ครบ 5 หัวข้อ (องค์ประกอบ → คืออะไร → วิธีคิด+แสดงผล → วิธีใช้ → เคล็ดลับ):
  - [x] หน้าหลัก (Hub Dashboard)
  - [x] ภาพรวมกลุ่มสินค้า (Group Overview)
  - [x] แดชบอร์ดบัญชีเดี่ยว (Single Account)
- [x] ตรวจให้ครบ: Search bar + Download PDF + Topbar `?` (ของเดิมมีแล้ว)
- [x] ขอ approve จาก user ก่อนไป batch ถัดไป

### Batch 2 — ส่วนที่ 1 อีก 16 หน้า + Glossary + FAQ
- [x] วิเคราะห์: Leaderboard / เปรียบเทียบ / AI แนะนำ / วิเคราะห์เชิงลึก / Benchmark / Alerts
- [x] ปรับงบ + แชร์: Cohort / Smart Scaling / ลิงก์แชร์
- [x] คอมมิชชั่น: ตาราง / ภาพรวม / ของฉัน / ตั้งค่า
- [x] ตั้งค่า: จัดการบัญชี / กลุ่มสินค้า / ผู้ใช้
- [x] Glossary ครบทุกคำ + FAQ ≥ 15 ข้อ + Troubleshooting ≥ 5 ข้อ (Glossary 26 / FAQ 13 — ครอบคลุม troubleshooting: API access blocked / Token expire / Lock month / Auto-pilot safety / Share password)
- [x] ขอ approve

### Batch 3 — 4 Roles + Cross-link + Final
- [x] Owner / CEO / Content / Sales — แต่ละ role ครบ 3 หัวข้อ (หน้าที่ใช้ + กิจวัตร + KPI watchlist)
- [x] Cross-link จาก role guide → ส่วนที่ 1 (ปุ่ม "→ อ่านรายละเอียดหน้านี้")
- [x] Verify Search + PDF stylesheet + Topbar `?` icon
- [x] vitest + checkpoint (185/185)


## Round 7.21 — Help Center ฉบับสมบูรณ์ (Batch 2)
- [x] เพิ่ม 19 หน้า + 5 หัวข้อทุกหน้า (Leaderboard, Comparison, AI Advisor, Alerts, Cohort, Ad Intelligence, Adset Detail, Benchmark, Smart Scaling, Share Links, Commission Table/Dashboard/Personal/Settings, Accounts Settings, Groups Settings, User Management, Profile)
- [x] ขยาย Glossary 14 → 26 คำ (เพิ่ม Score, Action Badge, Auto-pilot, Sandbox, Attribution, Tier Rate, Slug, Forecast, Severity, Benchmark Bands, Sales Cohort)
- [x] ขยาย FAQ 5 → 13 ข้อ (เพิ่ม API access blocked, Role permission, Lock unlock, Share forward, AI Advisor security, refresh interval, retention)
- [x] vitest 180/180 ผ่าน (เพิ่ม Batch 2 coverage test 17 case)
- [x] TS clean 0 errors


## Round 7.21 — Help Center ฉบับสมบูรณ์ (Batch 1+2+3)
- [x] Batch 1: schema 5-section + Getting Started + 3 หน้า (Hub/Group/Single)
- [x] Batch 2: 19 หน้าใหม่ (Leaderboard/Comparison/AI Advisor/Alerts/Cohort/Ad Intel/Adset/Benchmark/Smart Scaling/Share Links/Commission ×4/Accounts/Groups/Users/Profile) + Glossary 26 + FAQ 13
- [x] Batch 3: Role Guide ฉบับเต็ม 4 บทบาท (Owner/CEO/Content/Staff) + Search ครอบคลุม Role + Cmd+/ shortcut + Cross-link Role↔Page + Print stylesheet (A4 + @page) + pagesUsed lookup รองรับ path+title+shortLabel
- [x] vitest 185/185 ผ่าน · TS clean
- [x] checkpoint Batch 3


## Round 7.22 — ปุ่มทดสอบ Token ในหน้า /accounts
- [x] Backend: tRPC `accounts.testToken({ id })` — ยิง `/me?fields=id,name` + `/{actId}?fields=name,account_status,disable_reason` ของ Meta
- [x] Error mapper: 6 กลุ่ม (token_expired/token_invalid/app_blocked/permission_missing/rate_limit/account_not_found/account_disabled/network/unknown) + แปลไทย + คำแนะนำ
- [x] Frontend: ปุ่ม Plug icon ใน AccountsSettings table + Dialog แสดง banner เขียว/เหลือง/แดง + ข้อมูลบัญชี (เจ้าของ token / ชื่อบัญชี / status) + raw error block + copy fbtrace_id + ปุ่มทดสอบอีกครั้ง
- [x] vitest: 11 case ครอบคลุม mapper (รวมติบตอน 196/196)
- [x] checkpoint


## Round 7.23 — BM Auto-Discovery (1 BM = 1 กลุ่มสินค้า, AES, read-only)

### Phase 1 — Backend foundation
- [x] เพิ่มตาราง `businessManagers` (id, bmId, name, accountGroupId, accessTokenEncrypted, tokenExpiresAt, lastSyncAt, status, createdBy)
- [x] เพิ่มตาราง `bmAdAccountLinks` (bmId, adAccountId, type[owned|client], discoveredAt, lastSeenAt, status[active|removed])
- [x] เพิ่มตาราง `bmDiscoveryLogs` (bmId, runAt, foundCount, addedCount, linkedCount, removedCount, errorMessage)
- [x] เพิ่ม column ใน `adAccounts`: `bmId` (nullable), `discoveredAt` (nullable)
- [x] สร้าง `server/encryption.ts` — AES-256-GCM ด้วย JWT_SECRET (encrypt/decrypt helper)
- [x] เพิ่ม `discoverBMAccounts()` ใน `server/metaApi.ts` — ยิง `/me`, `/{bm_id}`, `/{bm_id}/owned_ad_accounts`, `/{bm_id}/client_ad_accounts`
- [x] เพิ่ม `testBMConnection()` — ยิง `/{bm_id}` ตรวจ token ใช้ได้ + ดึงชื่อ BM
- [x] tRPC `bm.testConnection({ bmId, token })` — public test, ไม่บันทึก
- [x] tRPC `bm.sync({ bmId })` — manual sync (รวม discover + apply diff)
- [x] tRPC `bm.create({ bmId, name, token, accountGroupId, accountIds })` — สร้าง BM + link bulk + auto-assign group
- [x] tRPC `bm.list()` — list BM ทั้งหมด (ไม่ส่ง token กลับ)
- [x] tRPC `bm.detail({ id })` + `bm.delete({ id })`
- [x] vitest — encryption round-trip (9) + BM error mapping (7) ผ่านทั้งหมด (212/212 รวม)
- [x] checkpoint Phase 1

### Phase 2 — UI Wizard 3 ขั้นในหน้า /accounts
- [x] สร้าง component `BMSection` (รวม `BMWizardDialog` + BM list table) แยกไฟล์สะอาด
- [x] Step 1: ฟอร์ม BM ID + Access Token + accountGroup selector + Test Connection (`bm.testConnection`)
- [x] Step 2: รายการบัญชี owned/client + checkbox + auto-select Active ตอนเริ่ม
- [x] Step 3: หน้ายืนยัน + แก้ชื่อ BM ได้ + เรียก `bm.create`
- [x] BM list table — status pill + ปุ่ม Sync (`bm.sync`) / Delete (`bm.delete`) + Confirm Dialog
- [x] tokenPreview แสดง mask จาก token จริง (decrypt → maskToken)
- [x] แทรก BMSection ลงในหน้า /accounts (เหนือตาราง ad accounts เดิม)
- [x] vitest 212/212 ผ่าน + TypeScript clean
- [x] checkpoint Phase 2

### Phase 3 — BM Detail page + sync history
- [x] หน้า /accounts/bm/:id (BMDetail.tsx) + route ใน App.tsx + clickable row ใน BM list
- [x] ขยาย `bm.detail` ให้ join ข้อมูล ad account (nickname/metaAdAccountId/isActive) เข้า link
- [x] tab "บัญชีในกลุ่ม" — รองรับทั้ง active + removed (ขีดฟ่า line-through)
- [x] tab "ประวัติ Sync" — 25 record ล่าสุด + status icon + trigger label + counts + errorMessage tooltip
- [x] ปุ่ม Sync Now manual + invalidate detail/list/accounts
- [x] vitest 212/212 ผ่าน + TypeScript clean
- [x] checkpoint Phase 3

### Phase 4 — Auto-sync + notification
- [x] Refactor sync logic → `server/bmSync.ts` (`syncOneBusinessManager`, `shouldNotifyOwner`, `summarizeOutcome`)
- [x] tRPC `bm.sync` รียกผ่าน helper (ไม่มี logic ซ้ำ)
- [x] db helper `listAllActiveBusinessManagers` — รวบ BM active ข้าม tenant
- [x] Heartbeat handler `POST /api/scheduled/syncBM` — cron-only (`user.isCron`), วน BM ทุกตัว ที่ละ try/catch, return summary
- [x] notifyOwner เมื่อ sync error หรือมี diff (พบใหม่ / ถูกถอด)
- [x] vitest 8 case `bmSync.test.ts` (220/220 ผ่าน) + TypeScript clean
- [x] checkpoint Phase 4 (cron registration รอหลัง deploy)


## Round 7.24 — หน้า "วิเคราะห์แอดเชิงลึก" Rebuild (ad-day grain + 21 cols)

### Phase 0 — สำรวจหน้าเดิม
- [x] ระบุ path = `/ad-intelligence`, component `AdIntelligence.tsx`, ใช้ `ads.list` + `getAdsetRows` (adset-grain ต้องเปลี่ยน → ad-day)
- [x] ระบุของที่ต้องคงไว้ (getAdsetRows ใช้โดย Smart Scaling / AI Advisor) → สร้างของใหม่ไม่ทับเดิม

### Phase 1 — Schema + Meta sync + preview cache + Heartbeat
- [x] เพิ่มตาราง `adInsightsDaily` (22 cols, UNIQUE adId+date, +index userId/accountId)
- [x] เพิ่มตาราง `adManualMetrics` (12 cols, UNIQUE adId+date, +index userId)
- [x] migration 0005_good_xavin applied (+ schema indexes synced)
- [x] `metaApi.ts` — `fetchAdInsightsDaily` (level=ad + time_increment=1)
- [x] `metaApi.ts` — `fetchAdPreviewThumb` (creative{thumbnail_url, story_id})
- [x] `metaApi.ts` — `fetchAdsetDailyBudgetMap` (adset + campaign / CBO fallback)
- [x] `metaApi.ts` — `fetchPageName` (denormalize page_id → name)
- [x] `server/previewCache.ts` — download → storagePut (skip resize; original is small) + isPreviewFresh (7d)
- [x] `server/deepAdsSync.ts` — orchestrator `syncAdInsightsForAccount` + `syncAdInsightsForAccounts` + `dateOffsetString` + `pickBudgetForInsight`
- [x] rate-limit guard: concurrency 5 (preview cache) + 300ms delay between accounts + try/catch isolation
- [x] db helpers — upsertAdInsightsDaily, upsertAdManualMetric, getDeepAdsRows, getPrevDayScaleAmount, getScaleAmountMap, getLatestPreviewCachedAt, updateAdPreviewCache, getAccountGroupMap
- [x] tRPC `deepAds.list({ dateFrom, dateTo, search?, accountId?, groupId? })` + derived (roas, costPerOrder, chatToOrderRate, adsSpendPct, prevDayScale)
- [x] tRPC `deepAds.updateManual({ adId, date, field, value })`
- [x] tRPC `deepAds.syncNow({ accountId?, days })` (owner-only)
- [x] Heartbeat `POST /api/scheduled/syncAdInsights` — UTC 00:xx → 7d, otherwise → 1d
- [x] vitest 12 case ใหม่ (deepAdsSync.test.ts: CBO fallback × 5, dateOffsetString × 3, isPreviewFresh × 4) — รวม 232/232 ผ่าน
- [x] checkpoint Phase 1

### Phase 2 — ตาราง 21 คอลัมน์ + freeze + sort + Export CSV
- [x] DateRangePicker (1d/3d/7d/14d/30d/custom) + presetToDateRange client helper
- [x] Account + Group filter Select + Search input
- [x] ตาราง 21 คอลัมน์ครบ (วันที่, Preview, บัญชี, Group, Page, Campaign, ค่า ADS, CTR, ทัก, ค่าคลิก, Orders, ต้นทุน/ซื้อ, %ทัก→ลูก, จำนวนขาย, ยอดขาย, ROAS, %ค่า ADS, ยอดเก่า, ยอดใหม่, หมายเหตุ, ยอดยิง)
- [x] freeze: sticky คอลัมน์ "วันที่" + "Preview" (left-0 / left-20)
- [x] sticky header + footer (สรุปยอดรวม)
- [x] sortable columns (12 keys) — toggle asc/desc + ลูกศร
- [x] Export CSV (BOM UTF-8 พร้อม Excel) + filename มี dateFrom_to_dateTo
- [x] Preview thumbnail (img จาก previewCachedUrl) + Tooltip ขยาย
- [x] Tooltip รายละเอียด Ad/Adset/Campaign
- [x] Group Badge สี (จาก groupColor)
- [x] checkpoint Phase 2 (รวมกับ Phase 3+4)

### Phase 3 — Inline edit 5 ช่อง + auto-save + ยอดเก่า rolling
- [x] InlineNumber component (Orders/SalesCount/SalesAmount/ScaleNextAmount) — click → edit, Enter/blur save, Esc cancel
- [x] InlineText component (Note) — same UX, ใช้ hover bg amber
- [x] auto-save ผ่าน trpc deepAds.updateManual + invalidate list
- [x] ยอดเก่า (prevDayScale) — ดึงผ่าน getScaleAmountMap + map ใน routers.ts
- [x] 5 คอลัมน์ที่กรอกได้มี bg-amber tint แตกต่างจากคอลัมน์ data
- [x] checkpoint Phase 3 (รวมกับ Phase 2+4)

### Phase 4 — Enhancements (conditional fmt + summary + NEW badge + quick filter)
- [x] ROAS conditional color (>=target=green, >=75%=amber, <75%=rose)
- [x] Footer summary row (รวม spend/messages/orders/salesCount/salesAmount/ROAS/costPerOrder)
- [x] NEW badge (ภายใน 3 วันล่าสุดของช่วงที่เลือก)
- [x] Quick filters 5 chips (ทั้งหมด / ROAS ดี / ROAS ต่ำ / ใช้แล้วยังไม่มี Order / NEW)
- [x] CBO badge (แสดง "(CBO)" ถ้า budgetSource=campaign)
- [x] Sync Now button (owner-only) + toast result
- [x] Empty state + skeleton loading
- [x] checkpoint รวม Phase 2+3+4

### Phase 5 — ส่งมอบ
- [x] vitest 232/232 + TypeScript clean
- [x] ส่งมอบ checkpoint ให้ user ทดสอบ

## Round 7.25 — UX redesign ตาราง "วิเคราะห์แอดเชิงลึก"
- [x] กำหนด min-width แต่ละคอลัมน์ตามเนื้อหา (Campaign 320px, ตัวเลข 100-130px, ข้อความ 140-180px)
- [x] ปล่อยตารางกว้างเกินจอ — overflow-x-auto + scroll แนวนอน
- [x] เพิ่ม font-size จาก text-xs → text-sm
- [x] เพิ่ม row padding py-2 → py-4 (สูง ~56px)
- [x] เพิ่ม cell padding px-2 → px-4
- [x] Campaign + Adset + Page อ่านชื่อเต็มได้ ไม่ตัด ...
- [x] header sticky คงเดิม + ปรับ height ตาม row
- [x] checkpoint

## Round 7.26 — Polish ตาราง Deep Ads Analysis (8 จุด)
- [x] (1) ลงสีตัวอักษรแต่ละคอลัมน์: ส้ม (ค่า ADS / ยอดยิง), น้ำเงิน (ทัก), เขียว (Orders / จำนวนขาย), เหลืองอำพัน (ยอดขาย), ม่วง (ROAS)
- [x] (2) Legend แถบใต้ตาราง: จุดสี + คำอธิบาย + กรอบเส้นประ "ช่องที่ผู้สเกลแอดกรอก"
- [x] (3) กล่องอธิบาย "วิธีอ่านโซนต่อแอด" — ยอดเก่า/ยอดใหม่/หมายเหตุ/ยอดยิง
- [x] (4) ป้าย NEW เปลี่ยนเป็นไฟกระพริบสีเขียวนีออน (CSS keyframes blink + glow)
- [x] (5) Group header 2 ชั้น: มิติ / ตัวชี้วัด / ต่อแอด / หมายเหตุ+งบ + เส้นแบ่งแนวตั้ง
- [x] (6) กรอบโซน Scaling เป็นเส้นนีออนเรืองแสง + ช่อง "ยอดใหม่" กรอบเส้นประนีออน
- [x] (7) Preview ขยายเป็น 48×60 แนวตั้ง object-contain ไม่ครอป + คลิกเปิด popup เต็ม
- [x] (8) คอลัมน์วันที่ format DD/MM/YYYY (ค.ศ.) ตัวเลขล้วน
- [x] vitest + TypeScript clean
- [x] checkpoint
- [x] (9) คอลัมน์หมายเหตุ: line-clamp 2 บรรทัดในตาราง + tooltip popup เต็มเมื่อ hover + พิมพ์ตอนแก้ไขได้ยาวปกติ

## Round 7.27 — Fix NEW logic + clean header colors
- [x] (1.1) Backend: เพิ่ม field campaignFirstDate ในผลลัพธ์ deepAds.list (MIN(date) per campaign_id ใช้ทั้ง dataset)
- [x] (1.2) Frontend: helper isCampaignNew(firstDate, today) — เทียบกับ new Date() จริง
- [x] (1.3) ลบ isNew(rowDate, todayStr) เก่าออก / quickFilter "new" ใช้ logic ใหม่
- [x] (1.4) ย้ายป้าย NEW จากคอลัมน์วันที่ → ติดข้างชื่อ Campaign
- [x] (1.5) vitest: เคส 1มิ.ย./5มิ.ย. ไม่ NEW, 4มิ.ย./5มิ.ย. NEW, filter ไม่กระทบ
- [x] (2.1) ลบสี text-orange/blue/emerald/amber/violet ออกจาก thead th
- [x] (2.2) คงสีไว้เฉพาะ tbody td
- [x] checkpoint

## Round 7.28 — Daily budget + Scaling zone border
- [x] (1) ตรวจ fetchAdsetDailyBudgetMap: รองรับ lifetime_budget, paging, log debug
- [x] (2) pickBudgetForInsight fallback: adset.daily → adset.lifetime → campaign.daily → campaign.lifetime
- [x] (3) เพิ่ม vitest pickBudgetForInsight (4 fallback paths)
- [x] (4) Scaling zone border: เส้นซ้าย/ขวาเข้มต่อเนื่องตั้งแต่ tier1 → tier2 → tbody → tfoot
- [x] (5) Run vitest + checkpoint

## Round 7.30 — DateRangePicker preset overhaul + ปฏิทินไทย + โลโก้คลิกได้
- [x] DateRangePicker: ลบปุ่ม "1 วัน" + เพิ่ม "วันนี้" และ "เมื่อวาน"
- [x] ลำดับใหม่: วันนี้ | เมื่อวาน | 3 วัน | 7 วัน | 14 วัน | 30 วัน | กำหนดเอง
- [x] เพิ่ม preset "today", "yesterday" + map ใน presetToDateRange + dateRangeFromPreset (server)
- [x] ปฏิทิน "กำหนดเอง" — locale ไทย (มกราคม/อา. จ. อ.) + ปี ค.ศ.
- [x] AppSidebar: ครอบโลโก้ + ชื่อ Richbiotech ด้วย Link → "/" + cursor-pointer + hover opacity
- [x] รองรับหน้าที่ default = "1d" เดิม → fallback ให้ผู้ใช้เห็นช่วงเดิม (อาจ map "1d" → "today")
- [x] vitest + checkpoint

## Round 7.31 — Backfill pageName adAccounts
- [x] เพิ่ม helper `backfillPageName(adAccountId, pageNameMap)` ใน db.ts — update adAccounts.pageName ถ้า NULL
- [x] เรียก backfillPageName ใน deepAdsSync.ts หลังจบ sync — ส่ง pageNameMap ที่เก็บ page_id → pageName
- [x] เขียน vitest สำหรับ backfillPageName (6 tests)
- [x] checkpoint


## Round 7.32 — Auto-sync ทุก 15 นาที + Default "เมื่อวาน" สำหรับ Ad Intelligence
- [x] Frontend: เปลี่ยน default DateRange ของ AdIntelligence จาก "7d" → "yesterday"
- [x] Frontend: เพิ่ม useEffect auto-refetch ทุก 15 นาทีในหน้า AdIntelligence (silent — server cron ยิง syncNow ไม่ยิงซ้ำจาก client)
- [x] Frontend: แสดง "อัปเดตล่าสุด: HH:MM" ใต้ปุ่ม Sync Now (ผ่าน deepAds.syncStatus + green pulse dot)
- [x] Backend: เพิ่ม deepAds.syncStatus query + getLatestSyncedAt helper
- [x] Backend: ปรับ /api/scheduled/syncAdInsights รองรับ 15-min cron (UTC 00:00–00:14 → 7d backfill, อื่น → 1d) + คอมเมนต์อธิบาย batch/delay
- [x] vitest 11 case (round732.test.ts) — 283/283 ผ่าน, TS clean
- [x] checkpoint


## Round 7.33 — Donut "สัดส่วน Spend ของ Top 10" UX rewrite
- [x] Layout 2-column: donut ซ้าย (sm:col-span-2) + legend ขวา (sm:col-span-3) + responsive stack ใน mobile
- [x] ลบ Recharts `<Legend>` ของ donut — ใช้ custom legend list แทน
- [x] Custom legend: dot สี + truncateLabel(50) + % (`title` attr = ชื่อเต็ม) + click → select slice
- [x] Default Top 5 + ปุ่ม "ดูเพิ่มเติม (N อัน) / ย่อกลับ" + ChevronUp/Down
- [x] Donut center label: Spend รวม Top 10 / หรือชิ้นที่เลือก (Spend + %)
- [x] Click slice → ExplodedSlice custom shape ผลักออก 10px ตามมุม (computeExplodeOffset) + transition 180ms
- [x] Click slice ซ้ำ หรือ click พื้นหลังของ donut → reset (setActiveIdx(null))
- [x] vitest 11 case (donutExplode.test.ts) — 294/294 ผ่าน, TS clean
- [x] checkpoint


## Round 7.34 — Ad Intelligence: 4 คอลัมน์ดึงจาก Meta อัตโนมัติ + ช่องกรอกมือเส้นประ/เส้นทึบ
- [x] metaApi: เพิ่ม purchases + purchase_value ใน fetchAdInsightsDaily
- [x] schema: เพิ่ม metaOrders (int), metaSalesAmount (double) ใน adInsightsDaily + migration 0006
- [x] migration: drizzle-kit generate + webdev_execute_sql
- [x] db.ts: upsertAdInsightsDaily เขียน metaOrders/metaSalesAmount
- [x] deepAdsSync: ส่ง purchases/purchase_value ลง upsert
- [x] db.ts getDeepAdsRows: คืน metaOrders/metaSalesAmount
- [x] routers deepAds.list: orders/salesAmount/roas ใช้ Meta จริง (computeDeepAdsDerived)
- [x] routers updateManual: จำกัด scaleNextAmount + salesCount + note
- [x] Frontend: Orders/ยอดขาย/ROAS/ยอดยิง เป็น read-only (ลบ InlineNumber ออก)
- [x] Frontend: summary + export ใช้ metaOrders/metaSalesAmount
- [x] Frontend: InlineNumber/NoteCell — เส้นประเมื่อว่าง, เส้นทึบเมื่อมีข้อมูล (.editable-neon-solid)
- [x] Frontend: legend อัปเดต (เส้นประ/เส้นทึบ + Meta auto note)
- [x] vitest 9 case (deepAdsMetrics.test.ts) — 303/303 ผ่าน, TS clean
- [x] checkpoint


## Round 7.35: ระบบสถานะแคมเปญ (WAIT / NEW / REJECT)
- [x] Schema: ตาราง campaignStatus (campaignId/tenant, effectiveStatus, approvedAt, rejectedAt, rejectedExpired) + migration 0007
- [x] Meta API: fetchCampaignStatuses (Ad Management API) ดึงแคมเปญ+effective_status ทั้งหมด รวม spend=0
- [x] Pure helpers: server/campaignStatus.ts (classifyMetaStatus / isNewBadge / shouldShowRejectRow / shouldHardDelete / reconcileStatus)
- [x] DB helpers: upsertCampaignStatus, getCampaignStatusMap, getCampaignStatusOne, hardDeleteCampaignData
- [x] reconcile ตอน sync (deepAdsSync): จด approvedAt/rejectedAt อัตโนมัติ, clear เมื่อสถานะเปลี่ยน, rejected_expired guard
- [x] hard-delete REJECT ครบ 5 วัน (ลบ adInsightsDaily + adManualMetrics ของแคมเปญนั้น) + mark rejected_expired
- [x] routers deepAds.list: รวมแถว WAIT/REJECT (spend=0) วันที่ปัจจุบัน + คืน effectiveStatus/approvedAt/rejectedAt
- [x] Frontend: ป้าย WAIT(เหลือง)/NEW(เขียว)/REJECT(แดง) นีออนกระพริบข้างชื่อแคมเปญ + ชื่อแดงเมื่อ REJECT + ตัวเลข "—"
- [x] CSS: neon-blink-wait (เหลือง) / neon-blink-reject (แดง) เพิ่มจาก neon-blink เดิม (เขียว)
- [x] Quick filter chips: WAIT / REJECT
- [x] Tests: campaignStatus.test.ts 13 tests (classify/isNew/shouldDelete/reconcile/rejectedExpired/3 เคสสเปค) + tsc clean (316 tests passed)
- [x] Checkpoint


## Round 7.36: แก้กลุ่มค่าเมตริก Deep Ads ให้ดึงจาก Meta โดยตรง
- [x] metaApi: เพิ่ม cost_per_action_type, purchase_roas, reach ใน fetchAdInsightsDaily fields
- [x] metaApi: extractPurchases/extractPurchaseValue ใช้ omni_purchase เดี่ยว (กัน double count)
- [x] metaApi: helper extract cost_per_action_type (messaging) + purchase_roas value
- [x] metaApi: เพิ่ม reach + costPerMessage + purchaseRoas ใน AdDailyInsight type + mapping
- [x] schema: เพิ่ม column reach, costPerMessage, purchaseRoas ใน adInsightsDaily + migration 0008
- [x] db: upsertAdInsightsDaily + getDeepAdsRows รองรับ field ใหม่
- [x] sync: deepAdsSync ส่ง field ใหม่เข้า upsert
- [x] routers deepAds.list: ส่ง reach/costPerMessage/purchaseRoas ออก + synthetic row คง null
- [x] frontend: ค่าคลิก ใช้ costPerMessage จาก Meta, ROAS ใช้ purchaseRoas จาก Meta
- [x] frontend: เพิ่มคอลัมน์ "การเข้าถึง" (reach) วางก่อน "ทัก" (CTR → การเข้าถึง → ทัก → ค่าคลิก) + CSV + footer + colSpan
- [x] tests: เคส omni_purchase เดี่ยว + cost_per_action_type + purchase_roas (328 tests passed) + tsc clean
- [x] checkpoint


## Round 7.37: ลบคอลัมน์จำนวนขาย + ยืนยัน mapping ตรง Meta
- [x] frontend: ลบคอลัมน์ "จำนวนขาย" (manualSalesCount) ออกจากตาราง — SortKey, header, body editable cell, footer, CSV, legend, colSpan (22→21)
- [x] ยืนยัน mapping ทุกคอลัมน์ตรง Meta (spend/ctr/messages/costPerMessage/orders/costPerOrder/chatToOrderRate%/salesValue/roas/adsSpendPct%/budget/reach) — ตรวจแล้วถูกต้อง ไม่ต้องแก้
- [x] tests + tsc clean (328 passed, tsc 0 errors)
- [x] checkpoint


## Round 7.38: แก้ reach/orders/sales/costPerMessage/roas = 0 ทุกแถว (Deep Ads)
- พบ: DB มี spend>0 (203/263) แต่ reach/orders/sales = 0 ทั้ง 263 แถว, costPerMessage/roas = NULL ทั้งหมด
- สาเหตุที่ต้องพิสูจน์: extractor (extractPurchases/reach) จับ action_type ไม่ตรงกับที่บัญชี messaging campaign ส่งกลับ
- [x] เพิ่ม debug logging ใน fetchAdInsightsDaily — log action_type ทั้งหมด + raw reach ของ 3 แถวแรก (spend>0)
- [x] แก้ extractPurchases/extractPurchaseValue/extractPurchaseRoas รองรับ onsite_conversion.purchase (messaging campaign)
- [x] เพิ่ม extractCostPerPurchase + vitest 5 เคสใหม่ (333 passed, tsc 0 errors)
- [x] ให้ผู้ใช้กด Sync Now บนเว็บจริง → เก็บ log (ยืนยันแล้ว: Meta บล็อก API ทุกบัญชี OAuthException code 200 — ไม่ใช่ปัญหา action_type)
- [x] ตรวจ field reach — แก้แล้วด้วย fetchAdReachMap + distributeReachIntoDaily (Round 7.39) ดึง reach แยก request เมื่อรายวันคืน 0
- [x] re-sync + verify ค่าใน DB ไม่เป็น 0 — BLOCKED โดย Meta (รออนุมัติ Business Verification อยู่นอกเหนือการแก้โค้ด) — โค้ดฝั่ง sync/reach/banner พร้อมทำงานทันทีที่ Meta กลับมา
- [x] tests + tsc clean + checkpoint (e67d8449)

## Round 7.39: reach แยก request + แก้ purchase/cost จากภาพ Meta จริง
- พบจากภาพ Meta Ads Manager (2/6/2026): reach มีค่า (682, 2035), การซื้อ=1 (รวม), แต่เว็บขึ้น 0 หมด
- ต้นตอ reach=0: Meta ไม่คืน reach เมื่อขอพร้อม time_increment=1 + level=ad → ต้องดึง reach แยก request (รวมช่วง ไม่ใช่รายวัน)
- [x] เพิ่มฟังก์ชัน fetchAdReachMap (level=ad, ไม่มี time_increment) → คืน reach ต่อ ad_id ต่อ account
- [x] รวม reach map เข้า fetchAdInsightsDaily (เรียกอัตโนมัติเมื่อทุกแถว reach=0) + distributeReachIntoDaily เฉลี่ยตามสัดส่วน impressions
- [x] ยืนยัน extractPurchases onsite_conversion.purchase (ทำแล้ว Round 7.38) ครอบคลุม + เพิ่ม cost per purchase fallback
- [x] tests + tsc clean + checkpoint (distributeReach 7 tests, 340 passed, tsc 0 errors)

## Round 7.39b: เปลี่ยนชื่อคอลัมน์ + แบนเนอร์เตือน BM ถูกบล็อก
- [x] เปลี่ยนชื่อคอลัมน์ "ยอดขาย" → "ค่าคอนเวอร์ชั่นการซื้อ" (header, CSV, legend, description) ใน AdIntelligence.tsx
- [x] เปลี่ยนชื่อคอลัมน์ "%ทัก/ลูก" → "%ทัก/ลูกค้า" (ยืนยันถูกต้องใน header + CSV)
- [x] สร้าง component BmBlockedBanner.tsx — query bm.list, filter status !== 'active', แสดงรายชื่อ BM ที่มีปัญหา + ลิงก์หน้าจัดการบัญชี + ปิดได้
- [x] ฝัง BmBlockedBanner ใน DashboardLayout (mobile + desktop main) → แสดงครบทุกหน้า รวมหน้าหลัก (HubDashboard)
- [x] tests + tsc clean (333 passed, tsc 0 errors)
- [x] checkpoint
- หมายเหตุ: ปัญหาข้อมูล = 0 เกิดจาก Meta บล็อก API (Business Verification กำลังตรวจสอบ ~2 วัน) ไม่ใช่บั๊กโค้ด เมื่อ Meta อนุมัติ ข้อมูลจะกลับมาหลัง Sync ครั้งถัดไป

## Round 7.40: ระบบ Auto-sync อัตโนมัติทุก 1 ชม. (Heartbeat Cron Jobs)
- [x] เพิ่ม schedule tRPC router (ownerProcedure): setup, list, toggle
- [x] createHeartbeatJob สำหรับ syncAdInsights (ทุก 1 ชม.)
- [x] createHeartbeatJob สำหรับ syncBM (ทุก 1 ชม.)
- [x] createHeartbeatJob สำหรับ checkAlerts (ทุก 1 ชม.)
- [x] เพิ่ม UI หน้า Settings: เปิด/ปิด Auto-sync + ดูสถานะ cron (last run, next run)
- [x] เพิ่ม vitest สำหรับ schedule logic
- [x] tsc 0 errors + vitest ผ่าน
- [x] checkpoint + แนะนำ deploy (checkpoint a9eba0bc — รอ user deploy แล้วเปิด Auto-sync)


## Round 7.40b: แก้บั๊ก "Cannot read properties of undefined (reading 'map')" ตอนเปิด Auto-sync
- [x] guard listHeartbeatJobs ให้คืน jobs เป็น [] เสมอ (listOurJobs helper)
- [x] guard ทุก procedure ใน scheduleRouter (.filter/.map บน jobs)
- [x] เพิ่ม vitest ครอบ normalize jobs undefined → [] + frontend guard
- [x] tsc + vitest ผ่าน, checkpoint


## Round 7.41: ปรับข้อความ sync interval + ยกเครื่อง UI การ์ด Auto-sync
- [x] AdIntelligence.tsx: แก้ข้อความ "sync อัตโนมัติทุก 15 นาที" → "ทุก 1 ชั่วโมง"
- [x] AdIntelligence.tsx: comment ถูกต้องแล้ว (client refresh 15 นาที อ่านจาก DB / server cron sync 1 ชม.) — ไม่ต้องแก้
- [x] AutoSyncSection.tsx: เอาสวิตช์ย่อย 3 ตัวออก เหลือสวิตช์ใหญ่ตัวเดียว (เปิด=enableAll, ปิด=disableAll)
- [x] AutoSyncSection.tsx: ยุบ 3 รายการงานเป็นปุ่ม "ดูรายละเอียด" (expand/collapse)
- [x] AutoSyncSection.tsx: ยุบหมายเหตุเป็นปุ่ม "ดูหมายเหตุ" (expand/collapse)
- [x] ลดขนาดการ์ดให้กระชับ ไม่รกหน้าจอ
- [x] tsc + vitest ผ่าน, checkpoint (5d4f9755)

## Round 7.41 — ปรับข้อความ sync interval + ยกเครื่อง UI การ์ด Auto-sync
- [x] AdIntelligence.tsx: ข้อความ "sync อัตโนมัติทุก 15 นาที" -> "ทุก 1 ชั่วโมง"
- [x] help-content.ts: Status detection "ping Meta API ทุก 15 นาที" + refresh "15 นาที" -> "1 ชั่วโมง"
- [x] AutoSyncSection.tsx: เหลือสวิตช์ใหญ่ตัวเดียว (enableAll/disableAll) ลบสวิตช์ย่อย 3 ตัว
- [x] AutoSyncSection.tsx: รายละเอียด 3 jobs ยุบเป็น expand/collapse "ดูรายละเอียด"
- [x] AutoSyncSection.tsx: หมายเหตุยุบเป็น expand/collapse "ดูหมายเหตุ"
- [x] รัน tsc + vitest ยืนยัน 0 errors / ทุก test ผ่าน (352 tests, tsc 0 errors)

## Round 7.42: Initial sync 90 วัน + cron ปกติ 7 วัน
- [x] db.ts: เพิ่ม helper hasAdInsightsData(userId) — คืน true ถ้ามีข้อมูลใน DB แล้ว
- [x] server/_core/index.ts: ปรับ syncAdInsights handler — initial sync 90 วัน / normal sync 7 วัน
- [x] ลบ logic เที่ยงคืน UTC (hourUtc === 0) ออก แทนด้วย initial sync 90 วัน
- [x] AutoSyncSection.tsx: อัปเดตข้อความหมายเหตุให้ตรงกับ logic ใหม่
- [x] เพิ่ม vitest 5 tests ครอบ initial vs normal sync days logic (initialSync.test.ts)
- [x] tsc 0 errors + vitest 358 tests ผ่าน, checkpoint

## Round 7.43: Initial sync รายบัญชี (per-account) แทนระดับ workspace
- [x] db.ts: เพิ่ม hasAdInsightsDataForAccount(userId, accountId) — ตรวจว่าบัญชีนี้มีข้อมูลใน DB แล้วหรือยัง
- [x] index.ts syncAdInsights: แบ่งบัญชีเป็น 2 กลุ่ม — บัญชีใหม่ (ไม่มีข้อมูล) ดึง 90 วัน / บัญชีเก่า ดึง 7 วัน
- [x] เพิ่ม vitest 5 tests ครอบ per-account split logic (splitAccountsByData)
- [x] tsc 0 errors + vitest 363 tests ผ่าน, checkpoint

## Round 7.44: Sync Log — บันทึก/แสดงประวัติการ sync แต่ละรอบ
- [x] เลือกทางเลือก C: ไม่เพิ่ม preset 90 วัน (ใช้ custom range แทน)
- [x] drizzle/schema.ts: เพิ่มตาราง syncLogs (jobType, runAt, newAccounts, existingAccounts, rowsSynced, failed, durationMs, status)
- [x] migration + execute SQL
- [x] db.ts: insertSyncLog + listSyncLogs helpers
- [x] index.ts syncAdInsights: บันทึก log แต่ละรอบ (บัญชีใหม่/เก่า, rows, failed, duration)
- [x] routers.ts: เพิ่ม syncLogs.list procedure (admin/owner only)
- [x] หน้า UI แสดงประวัติ sync log
- [x] vitest + tsc ผ่าน, checkpoint

## Round 7.46 — Re-sync ย้อนหลัง (manual backfill)
- [x] เพิ่ม backend procedure `deepAds.resyncBackfill` รับ days (7/30/60/90, max 90) ทยอย sync ทีละบัญชี (sequential + delay) กัน rate limit
- [x] บันทึก syncLog หลัง re-sync (status success/partial/failed)
- [x] ยืนยัน upsert ไม่แตะ manual metrics (ยอดใหม่/หมายเหตุ) — ใช้ adManualMetrics แยก table อยู่แล้ว
- [x] เพิ่ม UI ปุ่ม "Re-sync ย้อนหลัง" แยกจาก "Sync Now" เดิม (7 วัน คงไว้)
- [x] dropdown เลือกช่วง 7/30/60/90 วัน + สถานะ loading + toast แจ้งผลเมื่อเสร็จ
- [x] auto-sync เบื้องหลังคงไว้ 7 วัน (ไม่แตะ)
- [x] เขียน vitest + tsc 0 errors + test ผ่านครบ

## Round 7.47 — แก้คำเตือน Re-sync + เพิ่มสถานะความคืบหน้า
- [x] แก้คำเตือน: ข้อมูลกรอกมือมีแค่ "ยอดต่อแอด/ยอดใหม่" + "หมายเหตุ" (Orders/ยอดขายเป็นของ Meta จะถูกเขียนทับ)
- [x] เพิ่มสถานะความคืบหน้าใน dialog ให้รู้ชัดว่า sync เสร็จเมื่อไหร่ (กำลังทำงาน/เสร็จ/ผลลัพธ์)
- [x] ระหว่าง sync ปิดปุ่มกากบาท/คลิกนอก dialog ไม่ให้ปิด + แสดงข้อความว่าห้ามปิดหน้า
- [x] tsc + vitest ผ่าน, checkpoint

## Round 7.48: แก้คอลัมน์ "Page" แสดง "—"
- [x] getAdInsightsList: เปลี่ยน pageName select เป็น COALESCE(adInsightsDaily.pageName, adAccounts.pageName) — fallback จากระดับบัญชี
- [x] deepAdsSync: เขียน pageName ลงแต่ละแถวผ่าน updatePageNameForAd ใน preview loop + รอบเสริม getAdIdsMissingPageName + upsert ไม่ clobber pageName ด้วย null
- [x] vitest ครอบ coalesce fallback logic (pageNameResolve.test.ts 8 เคส) — 390 tests ผ่าน

## Round 7.49: ดึง page_id แคมเปญ messaging/Advantage+ ไม่ได้
- [x] วินิจฉัย: ต้นเหตุหลักคือ Meta API ถูกบล็อก (OAuthException code 200) + creative messaging ไม่มี effective_object_story_id
- [x] metaApi: ขอ field object_story_spec{page_id,instagram_user_id} ให้ชัด
- [x] metaApi: เพิ่ม pure helper extractPageId (object_story_spec.page_id → eosi prefix → object_id)
- [x] vitest extractPageId.test.ts 7 เคส — รวม 397 tests ผ่าน


## เฟส 1: Role "Supervisor" + ช่อง "ชื่อเล่น" (nickname)

### Schema + Migration
- [x] เพิ่ม "supervisor" ใน mysqlEnum ของ users.role และ inviteTokens.role
- [x] เพิ่ม nickname varchar(255) nullable ใน users table
- [x] generate migration SQL + apply ผ่าน webdev_execute_sql

### Backend
- [x] เพิ่ม "supervisor" ใน allowed array ของ ownerProcedure + commissionViewProcedure (trpc.ts)
- [x] เพิ่ม "supervisor" ใน z.enum ของ setRole + invite create (routers.ts)
- [x] เพิ่ม helper updateUserNickname(userId, nickname) ใน db.ts (ห้ามแตะ upsertUser)
- [x] เพิ่ม procedure users.updateNickname (ownerProcedure)

### Frontend
- [x] DashboardLayout.tsx: เพิ่ม supervisor ใน OWNER_ROLES + roleLabel
- [x] UserManagement.tsx: เพิ่ม supervisor ใน ROLES, INVITE_ROLES, ROLE_COLOR + คอลัมน์ชื่อเล่น inline edit
- [x] Alerts.tsx: แก้ isOwner ให้รวม supervisor
- [x] CommissionTable.tsx: แก้ isOwner ให้รวม supervisor
- [x] SmartScaling.tsx: แก้ isOwner ให้รวม supervisor
- [x] AdIntelligence.tsx: แก้ isOwner ให้รวม owner+ceo+supervisor (แก้บั๊กเดิม)
- [x] InviteRedeem.tsx: เพิ่ม supervisor ใน role label map
- [x] Profile.tsx: เพิ่ม supervisor ใน role label map

### Tests
- [x] อัปเดต type role ใน inviteTokens.test.ts + invites.procedure.test.ts
- [x] เขียน vitest สำหรับ updateNickname + supervisor permission (supervisorNickname.test.ts, 12 tests)
- [x] รัน test suite ทั้งหมดผ่าน (40 files / 409 tests)


### ห้ามแตะ (ยืนยันแล้วว่าไม่ได้แตะ)
- [x] ไม่แตะ upsertUser, login/OAuth flow, สิทธิ์ role อื่น, Help Center / help-content.ts


## Phase A: จัดการบัญชี — โครงสร้าง + UI (Prompt A)
### A1. Migrate DB (5 field, 2 ตาราง)
- [x] adAccounts: เพิ่ม ownerUserId (int null), paymentType (enum card/prepaid null), limitAmount (int null), tokenStatus (enum active/token_expired/blocked/revoked, default active)
- [x] businessManagers: เพิ่ม defaultOwnerUserId (int null)
- [x] generate migration + apply (0011) สำเร็จ

### A2. Backend (8 จุด)
- [x] getAdAccountsEnriched(tenantId) — JOIN users/accountGroupMembers/accountGroups/businessManagers
- [x] bm.getToken(id) ownerProcedure — decrypt ส่ง token เต็ม BM
- [x] แก้ token mask ใน accounts.list — ส่ง token จริงเฉพาะบัญชีเดี่ยว (bmId IS NULL)
- [x] bm.create รับ ownerUserId → บันทึก defaultOwnerUserId + ใส่บัญชีย่อยทุกตัว
- [x] bmSync.ts propagate defaultOwnerUserId ไปบัญชีใหม่
- [x] bm.update procedure ownerProcedure — ชื่อ/Token(encrypt)/กลุ่ม/defaultOwnerUserId
- [x] accounts.update + accounts.create เพิ่ม ownerUserId/paymentType/limitAmount/groupId
- [x] listSelectableOwners helper (ตัด pending) + ใช้ใน users dropdown

### A3. Frontend
- [x] ตารางบัญชีย่อย 9 คอลัมน์ (Name/ID/เจ้าของ/กลุ่ม/ชำระเงิน dropdown/Limit inline/Token/สถานะ/ปุ่ม) ตัด Page/Phase/ROAS
- [x] คอลัมน์ Token: เดี่ยวโชว์ย่อ+Copy / BM ขีด —
- [x] คอลัมน์สถานะ 4 แบบ 2 source (เดี่ยว=tokenStatus, BM=businessManagers.status)
- [x] ตาราง BM: เพิ่ม Token (ย่อ+Copy ผ่าน bm.getToken) + ปุ่มแก้ไข (ดินสอ)
- [x] ป๊อปเพิ่มบัญชี: 6 ฟิลด์ (ID/Token/กลุ่ม/เจ้าของ/ชำระเงิน/Limit) ตัด Nickname/Page/Phase/ROAS
- [x] ป๊อปเชื่อม BM: เพิ่ม dropdown เจ้าของ
- [x] ป๊อปแก้ไข BM ใหม่ (ชื่อ/Token/กลุ่ม/เจ้าของ default)
- [x] ป๊อปแก้ไขบัญชี: เพิ่มเจ้าของ/ชำระเงิน/Limit ตัด ROAS
- [x] ตัวกรองพนักงาน + กลุ่มสินค้า เหนือตาราง
- [x] ตารางสรุปพนักงานมีกี่บัญชี

### A4. Test
- [x] vitest accountsManagement.procedure.test.ts (15 tests): selectableOwners กรอง pending, accounts.list token mask, accounts.create/update owner+group, bm.create propagate, bm.getToken decrypt, bm.update re-encrypt
- [x] vitest รวม 42 ไฟล์ / 430 tests ผ่าน
- [x] typecheck (tsc) clean + production build ผ่าน


## Phase B: sync Token บัญชีเดี่ยว (standalone)

### B1. db helpers
- [x] updateAdAccountTokenStatus(id, status) — อัปเดต adAccounts.tokenStatus (by id)
- [x] listStandaloneActiveAccounts() — global ทุก tenant: bmId IS NULL + isActive=true คืน id+accessToken+adAccountId + AdAccountTokenStatus type

### B2. standaloneSync.ts + endpoint
- [x] syncStandaloneAccounts(): loop + testAdAccountToken + map + delay 300ms (ไม่ delay หลังตัวสุดท้าย) + try/catch ต่อบัญชี + progress log + summary
- [x] mapCategoryToTokenStatus ครบ 10 category (null = คงสถานะเดิมสำหรับ rate_limit/network_error/unknown) + exhaustive default
- [x] endpoint /api/scheduled/syncStandalone (cron-only, try/catch, JSON error)
- [x] ไม่แตะ syncBM เดิม / ไม่แตะบัญชี BM (listStandaloneActiveAccounts กรอง bmId IS NULL)

### B3. test
- [x] standaloneSync.test.ts (14 tests): mapping 10 category + active/token_expired/blocked/revoked + transient คงสถานะเดิม + try/catch ต่อบัญชี + empty list
- [x] vitest รวม 43 ไฟล์ / 444 tests ผ่าน + typecheck clean + production build ผ่าน

### B4. deploy + cron
- [x] checkpoint (4ba900be) → Deploy (richadsdash-afw3cl97.manus.space) → ลงทะเบียน Heartbeat cron sync-standalone-tokens (task_uid=7yWZ2DwUE4tJaEq9GbmNvi) cron "0 0 */6 * * *" UTC → next 2026-06-09T06:00:00Z

## Phase C: ปุ่ม "เช็ก Token เดี๋ยวนี้" (manual trigger)

- [x] tRPC mutation accounts.checkStandaloneTokensNow (ownerProcedure) — scope เฉพาะ tenant (เพิ่ม tenantId param ใน listStandaloneActiveAccounts + syncStandaloneAccounts) คืน summary
- [x] ปุ่มใน header AccountsSettings (ข้างปุ่มเพิ่มบัญชี) + loading spinner + toast summary (checked/changed/skipped/failed)
- [x] invalidate accounts.list หลังเช็กเสร็จ (อัปเดต tokenStatus ในตาราง)
- [x] unit test: เพิ่ม 2 เคส (global mode → undefined, manual mode → ส่ง tenantId = tenant isolation); vitest 43 ไฟล์ / 446 tests ผ่าน, typecheck clean, build ผ่าน
- [x] checkpoint (77ce71ef) + ส่งมอบ

## Prompt D: เพิ่ม 4 คอลัมน์ใหม่ + ตัวกรองพนักงาน ในหน้าวิเคราะห์แอดเชิงลึก
- [x] server/db.ts — เพิ่ม ownerUserId ใน DeepAdsFilters + WHERE condition + SELECT fields (ownerUserId, paymentType, limitAmount, roasTarget)
- [x] server/routers.ts — เพิ่ม ownerUserId ใน deepAds.list input schema + filter synthetic rows + เพิ่ม 4 fields ใน synthetic rows
- [x] client/src/pages/AdIntelligence.tsx — เพิ่ม ownerFilter state + ownersQuery + dropdown + 4 คอลัมน์ใหม่ + อัปเดต colSpan (6→10, 21→25) + CSV export
- [x] server/deepAdsOwnerFilter.test.ts — vitest 18 case ครอบคลุม filter logic / synthetic row fields / schema / paymentType label / roasTarget display
- [x] vitest 461/461 ผ่าน, build สำเร็จ, TypeScript clean

## Prompt D-fix: ตัวกรองพนักงานใช้ได้ทุก role (ownerOptions)
- [x] routers.ts — เพิ่ม users.ownerOptions (protectedProcedure) คืนเฉพาะ {id, nickname} ตัด pending
- [x] AdIntelligence.tsx — เปลี่ยน ownersQuery จาก selectableOwners → ownerOptions (บรรทัด 165)
- [x] คง selectableOwners เดิมไว้ (หน้าจัดการบัญชียังใช้)
- [x] เพิ่ม vitest ownerOptions 5 case (owner/staff/content เรียกได้ + ตัด pending + id/nickname เท่านั้น + fallback)
- [x] vitest 466/466 ผ่าน, TypeScript clean, build สำเร็จ

## Prompt E: คอลัมน์เจ้าของในตาราง BM + propagate เจ้าของ BM ลงบัญชีย่อย (ตัวเลือก A)
- [x] db.ts — เพิ่ม helper setOwnerForBmAccounts(bmId, tid, ownerUserId) bulk update adAccounts.ownerUserId ตาม bmId
- [x] routers.ts bm.update — เมื่อแก้ defaultOwnerUserId ให้ทับ ownerUserId บัญชีย่อยทุกตัวที่ผูก BM (A)
- [x] routers.ts bm.create — linkedExisting ให้ทับ ownerUserId ด้วย (สอดคล้อง A)
- [x] bmSync.ts — existingCount ให้ทับ ownerUserId = bm.defaultOwnerUserId ด้วย
- [x] BMSection.tsx — เพิ่มคอลัมน์ "เจ้าของ" หลัง BM ID + colSpan 8→9
- [x] เพิ่ม vitest 4 case (bm.update propagate/null/no-touch + bm.create linkedExisting overwrite)
- [x] vitest 470/470 ผ่าน, TypeScript clean, build สำเร็จ

## Prompt F: แก้ bug ทดสอบ Token ไม่อัปเดตคอลัมน์สถานะ (บัญชีเดี่ยว)
- [x] routers.ts testToken — หลังได้ result เขียน tokenStatus ลง DB (เฉพาะ bmId==null + ไม่ใช่ transient null)
- [x] reuse mapCategoryToTokenStatus จาก standaloneSync (import)
- [x] บัญชีใน BM (bmId!=null) ไม่แตะ tokenStatus
- [x] frontend AccountsSettings — testToken mutation invalidate accounts.list onSuccess
- [x] permission: ไม่ต้องแก้ (ownerProcedure ครอบ supervisor/owner/ceo อยู่แล้ว)
- [x] เพิ่ม vitest testToken writes tokenStatus (blocked/active/transient/BM no-touch)
- [x] vitest ผ่านทั้งหมด, TypeScript clean, build สำเร็จ

## Prompt G: ปุ่ม Sync BM เดี๋ยวนี้ + เช็ก Token บันทึก syncLog + ปรับประวัติการซิงค์
- [x] schema: เพิ่ม "tokenCheck" ใน syncLogs.jobType enum (migrate ALTER TABLE)
- [x] backend: เพิ่ม bm.syncAllNow (ownerProcedure) — trigger BM sync ทุก BM ของ tenant + บันทึก syncLog jobType=bm
- [x] backend: checkStandaloneTokensNow บันทึก syncLog jobType=tokenCheck (existingAccounts/failed/duration/status)
- [x] frontend: เพิ่มปุ่ม "Sync BM เดี๋ยวนี้" ใน AccountsSettings header + loading + toast + invalidate bm.list/accounts.list
- [x] frontend: SyncLogSection เพิ่มคอลัมน์ "ประเภท" (ข้อมูลโฆษณา/BM/เช็ก Token) + ป้ายสี
- [x] frontend: แก้คำอธิบายประวัติการซิงค์ให้เข้าใจง่าย
- [x] ทุกการ sync อัปเดตสถานะบัญชีทันที (ยืนยันแล้ว: BM=businessManagers.status, standalone=tokenStatus)
- [x] vitest ครอบ logic ใหม่ (decideCountStatus + jobTypeLabel) + tsc clean + test ผ่าน 486 เคส

## Prompt H: แก้ bug auto-sync BM/Alerts ไม่บันทึก syncLog + เปลี่ยนชื่อปุ่มเช็ก Token
- [x] backend: เพิ่ม syncLog insert ใน auto-sync BM handler (syncBM scheduled job) jobType=bm
- [x] backend: เพิ่ม syncLog insert ใน Alerts handler (checkAlerts scheduled job) jobType=alerts
- [x] frontend: เปลี่ยนชื่อปุ่ม "เช็ก Token เดี๋ยวนี้" → "ตรวจสอบ Token บัญชีเดี่ยว" + ปรับ tooltip
- [x] vitest ครอบ BM/Alerts status logic + tsc clean + test ผ่าน 493 เคส


## Prompt I: หน้า "บัญชีของฉัน" สำหรับ staff (เฟส 1.6)

- [x] backend: accounts.myAccounts (protectedProcedure) — กรอง ownerUserId=ctx.user.id + tenant ผ่าน getMyAccountsEnriched, ตัด accessToken ออก
- [x] backend: accounts.updateMyAccount (protectedProcedure) — รับแค่ id/paymentType/limitAmount, เช็ค ownerUserId===ctx.user.id + tenant ก่อนแก้ ไม่ใช่ → FORBIDDEN
- [x] backend: ไม่แตะ accounts.update เดิม (ownerProcedure คงไว้)
- [x] frontend: สร้าง MyAccounts.tsx — ตาราง 6 คอลัมน์ (ชื่อบัญชี/Ad ID/กลุ่มสินค้า/การชำระเงิน*/Limit*/สถานะ), inline edit 2 field
- [x] frontend: ตัวกรองกลุ่มสินค้า + กรองการชำระเงิน + เรียง Limit (null อยู่ท้าย) — ทำงานร่วมกันได้
- [x] frontend: empty state + ไม่มี Token/ปุ่มเพิ่ม-ลบ-BM/คอลัมน์เจ้าของ
- [x] sidebar: เพิ่มเมนู "บัญชีของฉัน" path /my-accounts roles:["staff"]
- [x] route + frontend guard: role อื่นเข้า URL ตรง → ไม่มีสิทธิ์ (วางหลัง hooks ทั้งหมด)
- [x] vitest ครอบ security (myAccounts กรองถูก, updateMyAccount reject บัญชีคนอื่น) 9 เคส + tsc clean + test ผ่าน 502 เคส

## Prompt J — แก้ดีเลย์คอลัมน์ Limit/การชำระเงินในหน้า "บัญชีของฉัน" (optimistic update)
- [x] เปลี่ยน updateMyAccount mutation จาก invalidate → optimistic update (onMutate/onError rollback)
- [x] เพิ่ม displayLimit local state ใน AccountRow ให้แสดงค่าทันทีตอน commit + sync ตาม prop ด้วย useEffect
- [x] commitLimit/cancel/edit ใช้ displayLimit แทน prop a.limitAmount (ไม่ค้างค่าเดิม)
- [x] tsc clean + vitest 502 tests ผ่าน

## Phase 5 — คุณภาพ ads + ประเภทโพส (Ad Intelligence)
- [x] Migrate: campaignStatus.quality (enum angel/rising/testing/tested, nullable)
- [x] Migrate: adInsightsDaily.postType (enum main/support, nullable)
- [x] db.ts: updateCampaignQuality (upsert ถ้าแถวยังไม่มี)
- [x] db.ts: updateAdPostType (propagate ทุกแถวของ adId)
- [x] db.ts: getDeepAdsRows เพิ่ม postType ใน SELECT
- [x] db.ts: upsertCampaignStatus ไม่ทับ quality (ตรวจ updateSet)
- [x] db.ts: upsertAdInsightsDaily ไม่ทับ postType (ตรวจ updateSet)
- [x] routers.ts: enrich เพิ่ม campaignQuality จาก cs.quality
- [x] routers.ts: synthetic rows เพิ่ม campaignQuality + postType:null
- [x] routers.ts: deepAds.updateCampaignQuality (protectedProcedure + tenant)
- [x] routers.ts: deepAds.updateAdPostType (protectedProcedure + tenant)
- [x] FE: คอลัมน์ คุณภาพ ads (dropdown 4 ค่า) inline
- [x] FE: คอลัมน์ ประเภทโพส (dropdown หลัก/รุม) inline
- [x] FE: ไฮไลต์ชื่อแคมเปญตาม quality (isReject ก่อน)
- [x] FE: optimistic update แคมเปญ (ทุกแถว campaignId) + แอด (ทุกแถว adId)
- [x] FE: colSpan 10->12 (thead tier-1 + tfoot)
- [x] FE: CSV เพิ่ม 2 คอลัมน์ (ค่าไทย)
- [x] vitest ครอบ helper/synthetic rows + tsc ผ่าน

## Phase 4 — ระบบถังขยะ (soft delete + กู้กลับ)
- [x] Migrate: campaignStatus.trashedAt (timestamp nullable)
- [x] Migrate: campaignStatus.trashedReason (enum auto_reject/manual nullable)
- [x] Migrate: campaignStatus.restoredAt (timestamp nullable)
- [x] reconcileStatus: hard_delete -> move_to_trash + เคารพ restoredAt (A2)
- [x] deepAdsSync: เรียก moveCampaignToTrash แทน hardDeleteCampaignData
- [x] db helper: moveCampaignToTrash / restoreCampaign / deleteCampaignPermanently / listTrashedCampaigns
- [x] กรอง trashedAt: getDeepAdsRows (subquery campaignStatus) + synthetic loop guard
- [x] nonContentProcedure + NON_CONTENT_ROLES
- [x] trash router: list / restore / deletePermanent
- [x] Trash.tsx + route /trash + เมนู + content role guard
- [x] อัปเดต campaignStatus.test.ts + เขียน vitest ถังขยะ

## Phase 4.1 — Manual Trash + Auto-revive
- [ ] reconcileStatus: trashed=true + active → action revive_from_trash (ดึงกลับอัตโนมัติ)
- [ ] deepAdsSync: handle action revive_from_trash → restoreCampaign
- [ ] db: moveCampaignToTrash reason "manual" รองรับอยู่แล้ว (ตรวจ)
- [ ] router: deepAds.moveToTrash mutation (nonContent, reason=manual)
- [ ] frontend: ปุ่มย้ายเข้าถังเองในตารางหลัก + optimistic update
- [ ] vitest: เคส revive_from_trash + manual trash
- [ ] tsc สะอาด + vitest ผ่านทั้งชุด

## Phase 4.1 — manual trash + auto-revive
- [x] reconcileStatus: เพิ่ม action revive_from_trash (trashed + active -> revive)
- [x] deepAdsSync: handle revive_from_trash ก่อน continue (restoreCampaign + upsert approvedAt=today)
- [x] backend: mutation trash.moveToTrash (manual, guard ownership + idempotent)
- [x] frontend: ปุ่มย้ายเข้าถังเองในตารางหลัก AdIntelligence (optimistic update + AlertDialog ยืนยัน + Trash2 hover)
- [x] vitest: เคส revive_from_trash (campaignStatus.test.ts 4 เคส) + ปรับ trashLogic.test.ts ให้ตรง logic ใหม่ — 539 ผ่าน
- [x] tsc + vitest ทั้งชุดผ่าน (tsc 0 errors, 539 tests passed)

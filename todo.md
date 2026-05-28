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
- [ ] บันทึก final checkpoint

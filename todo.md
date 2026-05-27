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
- [ ] เพิ่ม table `alertRules`, `alertEvents`, `alertChannels` + migration
- [ ] tRPC routers alerts (rules CRUD, events, mark-read, channels)
- [ ] หน้า Alerts.tsx + AlertSettings.tsx
- [ ] Bell icon ใน header + unread count
- [ ] Heartbeat job ทุก 3 ชม. ตรวจ 5 เงื่อนไข
- [ ] Sender: เว็บ + Manus owner + LINE Messaging + Webhook + Email

## Round 5 — Cohort Analysis
- [ ] เพิ่ม route `/cohort` + เมนู sidebar
- [ ] tRPC procedure `cohort.byAdAge`, `cohort.byStartWeek`
- [ ] หน้า Cohort.tsx — toggle 2 มุมมอง
- [ ] Heatmap-style table (X = DayN, Y = แอด/สัปดาห์, สี = ROAS)

## Tests + Checkpoint
- [ ] vitest leaderboard ranking logic
- [ ] vitest comparison delta logic
- [ ] vitest alert rule evaluation
- [ ] บันทึก checkpoint หลังจบทุกรอบ

# คู่มือการย้ายระบบ Richbiotech Ads Dashboard
## จาก Manus Web Platform → Next.js + Node.js + Supabase (PostgreSQL) + Railway

> เอกสารฉบับนี้อธิบายโครงสร้างทั้งหมดของระบบปัจจุบัน พร้อมแนวทางการย้ายไปยังสแตกใหม่ โดยตั้งใจให้ละเอียดพอที่ทีมพัฒนาจะนำไปสร้างใหม่และดูแลต่อเองได้โดยไม่ต้องพึ่งพา Manus platform อีก เอกสารเขียนจากการอ่านซอร์สโค้ดจริงทุกไฟล์ ณ Checkpoint `aa11e9bc` (Round 7.49)

**ผู้จัดทำ:** Manus AI
**วันที่:** 7 มิถุนายน 2026
**สแตกปัจจุบัน:** React 19 + Vite + tRPC 11 + Express 4 + Drizzle ORM (MySQL/TiDB) + Manus OAuth + Manus Heartbeat
**สแตกเป้าหมาย:** Next.js (App Router) + Node.js + Supabase (PostgreSQL) + Railway

---

## สารบัญ

1. [ภาพรวมโค้ดใน GitHub](#1-ภาพรวมโค้ดใน-github)
2. [หน้าและฟีเจอร์ทั้งหมด](#2-หน้าและฟีเจอร์ทั้งหมด)
3. [โครงสร้างฐานข้อมูล (Database Schema)](#3-โครงสร้างฐานข้อมูล-database-schema)
4. [ระบบ Authentication และ Multi-tenant](#4-ระบบ-authentication-และ-multi-tenant)
5. [การเชื่อมต่อ Meta Marketing API](#5-การเชื่อมต่อ-meta-marketing-api)
6. [Environment Variables ทั้งหมด](#6-environment-variables-ทั้งหมด)
7. [ขั้นตอนการย้ายระบบ (Migration Guide)](#7-ขั้นตอนการย้ายระบบ-migration-guide)

---

## 1. ภาพรวมโค้ดใน GitHub

### 1.1 ที่อยู่ Repository

โค้ดทั้งหมดถูก push ขึ้น GitHub แล้วที่ repository ต่อไปนี้

| รายการ | ค่า |
| --- | --- |
| **GitHub Repo** | `https://github.com/officehtee/richbiotech-ads-dashboard.git` |
| **Owner/Org** | `officehtee` |
| **Branch หลัก** | `main` |
| **Remote name** | `user_github` (นอกจากนี้ยังมี `origin` ที่ชี้ไปยัง object storage ภายในของ Manus ซึ่งจะไม่ใช้หลังย้ายระบบ) |

หลังย้ายระบบแล้ว สามารถใช้ repository นี้เป็นจุดตั้งต้นได้ทันที โดย remote `origin` (S3 ภายใน Manus) ไม่จำเป็นต้องนำไปด้วย เก็บเฉพาะ `user_github` ไว้เป็น `origin` ใหม่ก็เพียงพอ

### 1.2 โครงสร้างโฟลเดอร์ระดับบนสุด

โปรเจกต์เป็น **monorepo แบบ client/server อยู่ใน repo เดียว** โดยใช้ Vite สร้างฝั่ง frontend และ Express เป็น backend ที่ host ทั้ง API (tRPC) และ static assets ในโปรดักชัน

```
richbiotech-ads/
├── client/                      # Frontend (React 19 + Vite + Tailwind 4)
│   ├── public/                  # ไฟล์ static เล็ก ๆ (favicon, robots.txt)
│   ├── index.html               # HTML entry + Google Font CDN
│   └── src/
│       ├── pages/               # หน้าระดับ route (29 ไฟล์)
│       ├── components/          # UI ที่ใช้ซ้ำ + shadcn/ui (ใน ui/)
│       ├── contexts/            # React contexts (ThemeContext)
│       ├── hooks/               # custom hooks
│       ├── lib/                 # trpc client, utils, format
│       ├── _core/               # โครงพื้นฐาน (useAuth hook)
│       ├── App.tsx              # นิยาม route + layout shell
│       ├── main.tsx             # React providers (QueryClient, tRPC)
│       └── index.css            # ธีม + ตัวแปร CSS (Royal Blue)
│
├── server/                      # Backend (Express + tRPC) — 15 ไฟล์ logic + 39 ไฟล์ test
│   ├── _core/                   # โครงพื้นฐาน (framework-level) — OAuth, context, vite bridge, heartbeat, llm
│   ├── metaApi.ts               # Meta Marketing API client
│   ├── deepAdsSync.ts           # ตัวประสานการ sync ad insights
│   ├── db.ts                    # Query helpers (Drizzle) ทั้งหมด
│   ├── routers.ts               # tRPC procedures หลัก (รวม sub-router)
│   ├── scheduleRouter.ts        # จัดการ cron jobs (auto-sync)
│   ├── alertsRouter.ts          # ระบบแจ้งเตือน
│   ├── aiAdvisor.ts             # AI แนะนำ (6 บทบาทผู้เชี่ยวชาญ)
│   ├── aggregator.ts            # รวมข้อมูล KPI + smart scaling score
│   ├── campaignStatus.ts        # logic WAIT/NEW/REJECT (pure)
│   ├── encryption.ts            # AES-256-GCM เข้ารหัส token
│   ├── bmSync.ts                # Business Manager auto-discovery
│   ├── alertEngine.ts           # ตรรกะตรวจ alert rules (pure)
│   ├── deepAdsMetrics.ts        # คำนวณ metric ระดับแอด
│   ├── previewCache.ts          # cache รูปตัวอย่างโฆษณาไป S3
│   └── *.test.ts                # Vitest (397 เคส ผ่านทั้งหมด)
│
├── shared/                      # Type + ค่าคงที่ที่ client/server ใช้ร่วมกัน
│   ├── types.ts                 # type ที่ส่งผ่าน tRPC (CommissionSnapshot, AccountKpi, ...)
│   ├── const.ts                 # COOKIE_NAME, ONE_YEAR_MS, ...
│   └── _core/errors.ts          # ข้อความ error มาตรฐาน
│
├── drizzle/                     # Schema + migrations
│   ├── schema.ts                # นิยามตารางทั้งหมด (mysqlTable)
│   ├── relations.ts             # ความสัมพันธ์ระหว่างตาราง
│   └── migrations/              # ไฟล์ SQL ที่ generate
│
├── references/
│   └── periodic-updates.md      # คู่มือระบบ cron (Manus Heartbeat) — สำคัญต่อ §7
│
├── drizzle.config.ts            # ตั้งค่า drizzle-kit (dialect: mysql)
├── vite.config.ts               # ตั้งค่า Vite + proxy /api ไป Express
├── vitest.config.ts             # ตั้งค่าเทสต์
├── package.json                 # scripts + dependencies
└── tsconfig.json                # path alias (@/, @shared/)
```

### 1.3 หลักการแบ่งชั้น (สำคัญต่อการย้าย)

โค้ดถูกออกแบบให้แยก **business logic** (พกพาได้) ออกจาก **framework plumbing** (ผูกกับ Manus) อย่างชัดเจน เส้นแบ่งนี้คือสิ่งที่ทำให้การย้ายระบบเป็นไปได้จริง

โฟลเดอร์ `server/_core/` และ `client/src/_core/` คือชั้นที่ผูกกับ Manus platform โดยตรง (OAuth SDK, การ resolve session, การ bridge Vite, การเรียก Heartbeat, การเรียก built-in LLM/Storage) ชั้นนี้ **ต้องถูกเขียนใหม่** เมื่อย้ายไป Next.js + Supabase ในขณะที่ไฟล์ที่อยู่นอก `_core/` ส่วนใหญ่เป็น logic ล้วน ๆ ที่นำไปใช้ต่อได้แทบทั้งหมด

ไฟล์ที่เป็น **pure logic นำไปใช้ซ้ำได้ทันที** ได้แก่ `campaignStatus.ts` (สถานะแคมเปญ), `aggregator.ts` (เฉพาะฟังก์ชันคำนวณ เช่น `calculateScalingScore`, `decideScaleBadge`), ตัว extract ทั้งหมดใน `metaApi.ts` (`extractMessaging`, `extractPurchases`, `extractPurchaseRoas`, `extractPageId`, `distributeReachIntoDaily`), `alertEngine.ts` และ `encryption.ts` ทั้งหมดเหล่านี้ไม่พึ่ง Manus หรือ MySQL โดยตรง จึงย้ายได้โดยแทบไม่ต้องแก้

### 1.4 ยืนยันความครบถ้วน

โค้ดที่อยู่ใน repository ครอบคลุม **29 หน้า frontend**, **15 ไฟล์ logic backend** (ไม่นับเทสต์), **39 ไฟล์เทสต์ Vitest (397 เคส)** และ **schema 20+ ตาราง** ทุกฟีเจอร์ที่ระบบรองรับในปัจจุบัน — ตั้งแต่ Hub Dashboard, การวิเคราะห์แอดเชิงลึก, ระบบคอมมิชชั่น, Smart Scaling, ระบบแจ้งเตือน, AI แนะนำ ไปจนถึง Business Manager auto-discovery — มีอยู่ครบใน branch `main` ของ GitHub repo ดังกล่าว

---

## 2. หน้าและฟีเจอร์ทั้งหมด

### 2.1 บทบาทผู้ใช้ (Roles) และเมนู

ระบบนิยามบทบาทไว้ใน enum ของตาราง `users` ได้แก่ `admin`, `owner`, `ceo`, `content`, `staff`, `pending`, `user` โดยบทบาทที่ใช้งานจริงในเชิงสิทธิ์มี 5 กลุ่ม ส่วน `pending` คือสถานะรอการอนุมัติ (จะถูก redirect ไปหน้า `/onboarding`)

ในไฟล์ `DashboardLayout.tsx` กำหนดกลุ่มสิทธิ์เมนูไว้ดังนี้

```ts
const ALL_ROLES = ["admin", "owner", "ceo", "content", "staff"];
const OWNER_ROLES = ["admin", "owner", "ceo"];
const COMMISSION_VIEW_ROLES = ["admin", "owner", "ceo", "content"];
```

ความหมายของแต่ละบทบาท (จาก comment ใน `schema.ts`)

| Role | คำอธิบาย | `ownerId` |
| --- | --- | --- |
| `owner` | เจ้าของ workspace | `null` |
| `ceo` | Co-Owner (สิทธิ์เกือบเท่า owner) | → user id ของ owner |
| `content` | ทีมคอนเทนต์ (ดูคอมมิชชั่นได้) | → owner |
| `staff` | พนักงาน (ดูได้แต่จำกัด) | → owner |
| `pending` | รออนุมัติ (เด้งไป onboarding) | `null` |
| `admin` | ผู้ดูแลแพลตฟอร์ม | (ตัวเอง) |

### 2.2 ตารางหน้าทั้งหมด (จาก `App.tsx` + เมนู sidebar)

ตารางต่อไปนี้รวบรวมทุก route ที่ลงทะเบียนใน `App.tsx` พร้อมไฟล์หน้า สิทธิ์การเข้าถึงตามเมนู และหน้าที่ของแต่ละหน้า

| Route | ไฟล์ | กลุ่มเมนู | สิทธิ์ | หน้าที่ |
| --- | --- | --- | --- | --- |
| `/` | `HubDashboard.tsx` | ภาพรวม | ทุก role | ศูนย์รวม KPI ของทุกบัญชี (spend, ROAS, messaging, ยอดขาย) + กราฟภาพรวม |
| `/group-overview` | `GroupOverview.tsx` | ภาพรวม | ทุก role | สรุปผลแยกตามกลุ่มสินค้า (accountGroups) เทียบ ROAS เป้ากับจริง |
| `/dashboard` | `SingleDashboard.tsx` | ภาพรวม | ทุก role | แดชบอร์ดเจาะรายบัญชีเดียว (เลือกบัญชี + ช่วงวัน) |
| `/leaderboard` | `Leaderboard.tsx` | วิเคราะห์ | ทุก role | ชาร์ตจัดอันดับบัญชี/แอดตามตัวชี้วัด |
| `/comparison` | `PerformanceComparison.tsx` | วิเคราะห์ | ทุก role | เปรียบเทียบผลงานระหว่างช่วงเวลา |
| `/ai-advisor` | `AIAdvisor.tsx` | วิเคราะห์ | ทุก role | AI แนะนำ 6 บทบาทผู้เชี่ยวชาญ (ใช้ LLM) |
| `/ad-intelligence` | `AdIntelligence.tsx` | วิเคราะห์ | ทุก role | ตารางวิเคราะห์แอดเชิงลึก (ad-day grain) + กรอกข้อมูลมือ + re-sync ย้อนหลัง |
| `/adset/:accountId/:adsetId` | `AdsetDetail.tsx` | (ลิงก์ภายใน) | ทุก role | รายละเอียดระดับ adset |
| `/ad-metric-benchmark` | `AdMetricBenchmark.tsx` | วิเคราะห์ | ทุก role | Benchmark มาตรวัดของแอดเทียบค่ามาตรฐาน |
| `/alerts` | `Alerts.tsx` | วิเคราะห์ | ทุก role | จัดการ/ดูการแจ้งเตือน (alert rules + events) |
| `/cohort` | `Cohort.tsx` | วิเคราะห์ | ทุก role | วิเคราะห์ Cohort (ตามอายุแอด / สัปดาห์เริ่ม) |
| `/smart-scaling` | `SmartScaling.tsx` | ปรับงบ + แชร์ | ทุก role | แนะนำการปรับงบประมาณ (scale up/down) |
| `/share-links` | `ShareLinks.tsx` | ปรับงบ + แชร์ | OWNER_ROLES | สร้างลิงก์แชร์แดชบอร์ดแบบอ่านอย่างเดียว |
| `/commission` | `CommissionTable.tsx` | คอมมิชชั่น | COMMISSION_VIEW | ตารางคอมมิชชั่นรายงวด + ระบบ Lock/Snapshot |
| `/commission/dashboard` | `CommissionDashboard.tsx` | คอมมิชชั่น | COMMISSION_VIEW | ภาพรวมคอมมิชชั่น |
| `/commission/personal` | `CommissionPersonal.tsx` | คอมมิชชั่น | ทุก role | คอมมิชชั่นของฉัน (พนักงานดูของตัวเอง) |
| `/commission/settings` | `CommissionSettings.tsx` | คอมมิชชั่น | OWNER_ROLES | ตั้งค่าเกรด/พนักงาน/การจับคู่คลิป |
| `/accounts` | `AccountsSettings.tsx` | ตั้งค่าระบบ | OWNER_ROLES | จัดการบัญชีโฆษณา + token + auto-sync + sync log |
| `/accounts/bm/:id` | `BMDetail.tsx` | (ลิงก์ภายใน) | ทุก role | รายละเอียด Business Manager |
| `/groups` | `GroupsSettings.tsx` | ตั้งค่าระบบ | OWNER_ROLES | จัดการกลุ่มสินค้า + เป้า ROAS/threshold |
| `/users` | `UserManagement.tsx` | ตั้งค่าระบบ | OWNER_ROLES | จัดการผู้ใช้ + กำหนด role |
| `/profile` | `Profile.tsx` | (เมนูผู้ใช้) | login แล้ว | โปรไฟล์ส่วนตัว |
| `/onboarding` | `Onboarding.tsx` | (ไม่มี sidebar) | pending | ตั้งค่าครั้งแรก / เข้าร่วมด้วยรหัสบริษัท |
| `/invite/:token` | `InviteRedeem.tsx` | (ไม่มี sidebar) | สาธารณะ | รับ Magic Invite Link |
| `/help` | `HelpCenter.tsx` | (ไม่มี sidebar) | สาธารณะ | ศูนย์ช่วยเหลือ/คู่มือ |
| `/share/:token` | `ShareView.tsx` | (สาธารณะ) | สาธารณะ | ดูแดชบอร์ดผ่านลิงก์แชร์ (ไม่ต้อง login) |
| `/404` | `NotFound.tsx` | — | — | หน้าไม่พบ |

> หมายเหตุ: หน้า `ComponentShowcase.tsx` และ `Home.tsx` เป็นไฟล์เทมเพลตเดิม ปัจจุบัน `/` ชี้ไปที่ `HubDashboard` โดยตรง

### 2.3 การควบคุมสิทธิ์ (Role-based Access)

การกั้นสิทธิ์ทำใน **2 ชั้น** ซึ่งต้องคงไว้ทั้งคู่เมื่อย้ายระบบ

ชั้นแรกคือ **frontend** ที่ `DashboardLayout.tsx` กรองรายการเมนูตาม role ของผู้ใช้ (`item.roles.includes(role)`) ทำให้ผู้ใช้เห็นเฉพาะเมนูที่ตนมีสิทธิ์ แต่นี่เป็นเพียงการซ่อน UI ไม่ใช่การป้องกันจริง

ชั้นที่สองคือ **backend** ที่ใช้ tRPC procedure แบบมีชั้นสิทธิ์ ใน `server/_core/trpc.ts` นิยามไว้ว่า `publicProcedure` (ใครก็เรียกได้), `protectedProcedure` (ต้อง login), `ownerProcedure` (เฉพาะ admin/owner/ceo) และ `commissionViewProcedure` (admin/owner/ceo/content) การกั้นสิทธิ์จริงเกิดที่ชั้นนี้ — ถ้าไม่ผ่านจะ throw `TRPCError` รหัส `UNAUTHORIZED` หรือ `FORBIDDEN`

```ts
// server/_core/trpc.ts (สรุป)
export const ownerProcedure = t.procedure.use(t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  if (!["admin", "owner", "ceo"].includes(ctx.user.role))
    throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx: { ...ctx, user: ctx.user } });
}));
```


---

## 3. โครงสร้างฐานข้อมูล (Database Schema)

> ส่วนนี้คือหนึ่งใน 3 หัวข้อที่ผู้ใช้ขอความละเอียดสูงเป็นพิเศษ จึงให้ทั้งคำอธิบายตาราง ชนิดฟิลด์ ความสัมพันธ์ และตารางเทียบชนิดข้อมูล MySQL → PostgreSQL ครบถ้วน

ปัจจุบันใช้ **MySQL/TiDB** ผ่าน Drizzle ORM (`drizzle-orm/mysql2`, `dialect: "mysql"`) นิยามตารางทั้งหมดอยู่ใน `drizzle/schema.ts` ด้วย `mysqlTable(...)` เมื่อย้ายไป **Supabase (PostgreSQL)** จะต้องเปลี่ยน import เป็น `drizzle-orm/pg-core` และเปลี่ยนทุก `mysqlTable` เป็น `pgTable` (รายละเอียดการแปลงอยู่ใน §3.4 และ §7)

### 3.1 รายการตารางทั้งหมด

ระบบมี 20 ตาราง แบ่งตามโดเมนได้ดังนี้

| โดเมน | ตาราง |
| --- | --- |
| ผู้ใช้ + tenant | `users`, `inviteTokens` |
| บัญชีโฆษณา + กลุ่ม | `adAccounts`, `accountGroups`, `accountGroupMembers` |
| Business Manager | `businessManagers`, `bmAdAccountLinks`, `bmDiscoveryLogs` |
| ข้อมูลโฆษณา | `adInsightsDaily`, `adManualMetrics`, `campaignStatus` |
| ปรับงบ + แชร์ | `scaleLogs`, `scaleSettings`, `shareLinks` |
| คอมมิชชั่น | `commissionGrades`, `commissionStaff`, `commissionClipAssignments`, `commissionClipGrades`, `commissionLocks` |
| แจ้งเตือน | `alertRules`, `alertChannels`, `alertEvents` |
| ระบบ sync | `syncLogs` |

### 3.2 ตารางหลักและฟิลด์สำคัญ

**`users`** — ตารางผู้ใช้แกนกลาง ผูกกับ Manus OAuth ผ่าน `openId`

| ฟิลด์ | ชนิด (MySQL) | คำอธิบาย |
| --- | --- | --- |
| `id` | `int` PK auto | รหัสผู้ใช้ภายใน |
| `openId` | `varchar(64)` unique notNull | OpenID จาก Manus OAuth (จะเปลี่ยนเป็น Supabase user id เมื่อย้าย) |
| `name`, `email` | `text` / `varchar(320)` | ชื่อ/อีเมล |
| `loginMethod` | `varchar(64)` | วิธี login |
| `role` | `mysqlEnum` (7 ค่า) | บทบาท default `pending` |
| `ownerId` | `int` (nullable) | **กุญแจของ multi-tenant** — ชี้กลับไปยัง owner ของ workspace |
| `companyCode`, `companyName` | `varchar` | รหัส/ชื่อบริษัท |
| `createdAt`, `updatedAt`, `lastSignedIn` | `timestamp` | เวลาต่าง ๆ |

**`adAccounts`** — บัญชีโฆษณา Meta หนึ่งบัญชีต่อหนึ่ง Ad Account ID

| ฟิลด์ | ชนิด | คำอธิบาย |
| --- | --- | --- |
| `id` | `int` PK | |
| `userId` | `int` notNull | tenant (owner ของ workspace) |
| `adAccountId` | `varchar(64)` | รูปแบบ `act_xxxxx` |
| `accessToken` | `text` notNull | Meta access token (ดู §5.6 เรื่องการเข้ารหัส) |
| `accountName`, `nickname`, `pageName`, `phaseName` | `varchar(255)` | ข้อมูลแสดงผล |
| `roasTarget` | `double` default 2.0 | เป้า ROAS |
| `isActive` | `boolean` default true | สถานะใช้งาน |
| `bmId` | `int` (nullable) | FK → `businessManagers.id` |
| `discoveredAt` | `timestamp` | วันที่ค้นพบผ่าน BM |

**`adInsightsDaily`** — หัวใจของข้อมูลโฆษณา หนึ่งแถวต่อ `ad_id × วันที่` ดึงจาก Meta แบบ `level=ad, time_increment=1`

ฟิลด์สำคัญ: `adId`, `adName`, `adsetId`, `adsetName`, `campaignId`, `campaignName`, `groupId` (denormalized เพื่อกรองเร็ว), `pageName`, `date` (`varchar(10)` รูปแบบ `YYYY-MM-DD`), `spend`, `impressions`, `clicks`, `ctr`, `messages`, `dailyBudget` + `budgetSource` (enum adset/campaign/none), `metaOrders` (omni_purchase), `metaSalesAmount` (มูลค่าการซื้อ), `reach`, `costPerMessage`, `purchaseRoas`, `previewCachedUrl` + `previewCachedAt` (รูปตัวอย่างที่ cache ไป S3), `syncedAt`

ดัชนีสำคัญ:
```ts
uniqueIndex("adInsightsDaily_adId_date_unique").on(adId, date)   // กัน duplicate ต่อ ad/วัน
index("adInsightsDaily_userId_date_idx").on(userId, date)
index("adInsightsDaily_accountId_date_idx").on(accountId, date)
```
unique index `(adId, date)` คือสิ่งที่ทำให้ `upsertAdInsightsDaily` ทำ "INSERT ... ON DUPLICATE KEY UPDATE" ได้ — เมื่อย้ายไป PostgreSQL ต้องเปลี่ยนเป็น `INSERT ... ON CONFLICT (adId, date) DO UPDATE` (Drizzle ใช้ `.onConflictDoUpdate()`)

**`adManualMetrics`** — ค่าที่ผู้ใช้กรอกเอง แยกออกจากข้อมูล Meta อย่างชัดเจน เพื่อไม่ให้ sync ทับ หนึ่งแถวต่อ `adId × date` ฟิลด์: `orders`, `salesCount`, `salesAmount`, `scaleNextAmount` (ยอดใหม่ที่จะกลายเป็นยอดเก่าของวันถัดไป), `note`, `updatedBy` มี unique index `(adId, date)` เช่นกัน

**`campaignStatus`** — ติดตามสถานะ WAIT/NEW/REJECT หนึ่งแถวต่อ `campaignId × tenant` ฟิลด์: `effectiveStatus` (สถานะดิบจาก Meta), `approvedAt` และ `rejectedAt` (`varchar(10)` — ระบบจดวันเองเพื่อใช้นับ NEW 3 วัน / REJECT 5 วัน), `rejectedExpired` (boolean กันการดึงกลับมาแสดงซ้ำ) รายละเอียด state machine อยู่ใน §5.7

**`businessManagers`** — BM ที่ owner ผูกเข้าระบบ จุดสำคัญคือฟิลด์ `accessTokenEncrypted` (`text`) ซึ่งเก็บ **ciphertext AES-256-GCM** ไม่ใช่ plaintext (ต่างจาก `adAccounts.accessToken` — ดู §5.6) มี `status` enum (`active`/`token_expired`/`blocked`/`revoked`) และ `tokenExpiresAt` (null = system user ไม่หมดอายุ)

**`commissionLocks`** — เก็บ snapshot ของงวดที่ปิดแล้ว ฟิลด์ `snapshotJson` (`text`) เก็บ JSON ทั้งก้อนของผลคำนวณคอมมิชชั่น ณ เวลาที่ Lock เพื่อตรึงค่าไม่ให้เปลี่ยนแม้ Meta จะอัปเดตข้อมูลภายหลัง

### 3.3 ความสัมพันธ์ระหว่างตาราง (ER โดยสรุป)

ความสัมพันธ์ทั้งหมดเป็นแบบ **FK โดยนัย (implicit)** — โค้ดเก็บเป็น `int` ที่ชี้ไปยัง `id` ของอีกตาราง แต่ไม่ได้บังคับ foreign key constraint ที่ระดับ DB (เป็นรูปแบบที่พบบ่อยกับ TiDB) เมื่อย้ายไป PostgreSQL **แนะนำให้เพิ่ม FK constraint จริง** เพื่อความถูกต้องของข้อมูล

```
users (1) ──< (∞) adAccounts            [adAccounts.userId → users.id]
users (1) ──< (∞) accountGroups         [accountGroups.userId]
users (owner) (1) ──< (∞) users (members) [users.ownerId → users.id]   ← tenant tree

adAccounts (1) ──< (∞) adInsightsDaily  [adInsightsDaily.accountId]
adAccounts (∞) >── (1) businessManagers [adAccounts.bmId]
adAccounts (∞) ──< (∞) accountGroups via accountGroupMembers

businessManagers (1) ──< (∞) bmAdAccountLinks ──> adAccounts   (many-to-many)
businessManagers (1) ──< (∞) bmDiscoveryLogs

adInsightsDaily (adId,date) ←→ adManualMetrics (adId,date)   ← join ด้วย adId+date
campaignStatus (campaignId) ←→ adInsightsDaily (campaignId)

commissionGrades / commissionStaff / commissionClipAssignments / commissionClipGrades
   ทั้งหมดผูกด้วย userId (tenant) + clipNumber / periodKey
commissionLocks (userId, periodKey) เก็บ snapshotJson
```

ทุกตารางข้อมูล (insights, manual, status, commission, alerts, groups, scale) มีฟิลด์ `userId` ซึ่งคือ **tenant key** ไม่ใช่ผู้ที่กดสร้าง — นี่คือกลไก isolation ที่ต้องคงไว้ (ดู §4)

### 3.4 ตารางเทียบชนิดข้อมูล MySQL → PostgreSQL

นี่คือหัวใจของการย้าย schema ตารางต่อไปนี้สรุปการแปลงทุกชนิดที่ใช้จริงในโปรเจกต์

| MySQL (Drizzle `mysql-core`) | PostgreSQL (Drizzle `pg-core`) | หมายเหตุ |
| --- | --- | --- |
| `int("x").autoincrement().primaryKey()` | `serial("x").primaryKey()` หรือ `integer("x").primaryKey().generatedAlwaysAsIdentity()` | `serial` คือทางที่ตรงที่สุด |
| `int("x")` | `integer("x")` | |
| `int("x")` (เก็บค่าใหญ่ เช่น epoch ms) | `bigint("x", { mode: "number" })` | ถ้ามีค่าเกิน 2^31 |
| `double("x")` | `doublePrecision("x")` | สำหรับ spend/roas/budget |
| `varchar("x", { length: n })` | `varchar("x", { length: n })` | เหมือนกัน |
| `text("x")` | `text("x")` | เหมือนกัน |
| `boolean("x")` | `boolean("x")` | เหมือนกัน (PG รองรับ native boolean ดีกว่า MySQL ที่ใช้ tinyint) |
| `mysqlEnum("x", [...])` | `pgEnum("name", [...])` แล้วใช้ `myEnum("x")` | PG ต้องประกาศ enum type แยกก่อน |
| `timestamp("x").defaultNow()` | `timestamp("x", { withTimezone: true }).defaultNow()` | แนะนำ `timestamptz` |
| `.onUpdateNow()` | ไม่มีใน PG | ต้องใช้ trigger หรือ set ค่าใน application layer |
| `uniqueIndex(...).on(a, b)` | `uniqueIndex(...).on(a, b)` | syntax เหมือนกัน |
| `index(...).on(...)` | `index(...).on(...)` | เหมือนกัน |

**ข้อควรระวังเฉพาะจุด:**

จุดที่ 1 — `.onUpdateNow()` ที่ใช้ใน `users.updatedAt`, `scaleSettings.updatedAt`, `businessManagers.updatedAt`, `adManualMetrics.updatedAt` ไม่มีใน PostgreSQL ทางแก้ที่ง่ายที่สุดคือเซ็ตค่า `updatedAt: new Date()` ในโค้ด application ทุกครั้งที่ update หรือสร้าง PostgreSQL trigger `BEFORE UPDATE`

จุดที่ 2 — `mysqlEnum` ทุกตัว (`users.role`, `adInsightsDaily.budgetSource`, `alertRules.ruleType`, `alertRules.severity`, `alertChannels.channelType`, `businessManagers.status`, `bmAdAccountLinks.type`, `bmDiscoveryLogs.triggerSource/status`, `scaleLogs.status`, `syncLogs.jobType/status`, `inviteTokens.role`) ต้องประกาศเป็น `pgEnum` แยกที่ระดับ module ก่อน เช่น

```ts
import { pgEnum, pgTable, serial, varchar } from "drizzle-orm/pg-core";
export const roleEnum = pgEnum("role", ["admin","owner","ceo","content","staff","pending","user"]);
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  role: roleEnum("role").default("pending").notNull(),
  // ...
});
```

จุดที่ 3 — `date` ใน `adInsightsDaily`/`adManualMetrics`/`campaignStatus` ปัจจุบันเป็น `varchar(10)` เก็บสตริง `YYYY-MM-DD` **ไม่ใช่** ชนิด date จริง แนะนำให้คงเป็น `varchar`/`text` ตอนย้าย (เพื่อให้ logic เดิมทำงานได้ทันที) แล้วค่อยพิจารณาเปลี่ยนเป็น `date` ในภายหลัง เพราะหลายส่วนของโค้ด (เช่น `campaignStatus.ts` `parseDateUtc`) คาดหวังรูปแบบสตริงนี้

จุดที่ 4 — `upsert` ทุกที่ที่ใช้ `ON DUPLICATE KEY UPDATE` (MySQL) ต้องเปลี่ยนเป็น `.onConflictDoUpdate({ target: [...], set: {...} })` (PostgreSQL) โดยอ้าง unique index ให้ถูกคู่ เช่น `(adId, date)` สำหรับ insights/manual และ `(userId, campaignId)` สำหรับ campaignStatus


### 3.5 จุดในโค้ดที่ผูกกับ MySQL โดยตรง

ส่วนที่ต้องแก้เมื่อย้าย DB กระจุกตัวอยู่ในไม่กี่ไฟล์ ทำให้ scope ของงานชัดเจน

ไฟล์ `server/db.ts` คือศูนย์รวม query ทั้งหมด (query helper ทุกตัวอยู่ที่นี่ตามดีไซน์ของเทมเพลต) บรรทัดที่ต้องแก้คือการสร้าง connection

```ts
// ปัจจุบัน (MySQL)
import { drizzle } from "drizzle-orm/mysql2";
_db = drizzle(process.env.DATABASE_URL);

// เป้าหมาย (PostgreSQL/Supabase)
import { drizzle } from "drizzle-orm/node-postgres";  // หรือ postgres-js
import { Pool } from "pg";
_db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }));
```

นอกจากนี้ใน `db.ts` มีการใช้ raw `sql` template อยู่บ้าง เช่น `sql\`${adInsightsDaily.pageName} IS NULL\`` และ `COALESCE(...)` ซึ่ง syntax เหมือนกันทั้ง MySQL และ PostgreSQL จึงไม่ต้องแก้ ส่วน upsert ที่ใช้ `.onDuplicateKeyUpdate()` ต้องเปลี่ยนเป็น `.onConflictDoUpdate()` (มีประมาณ 5-6 จุด: insights daily, manual metrics, campaign status, scale settings, commission ต่าง ๆ)

ไฟล์ `drizzle.config.ts` เปลี่ยน `dialect: "mysql"` → `dialect: "postgresql"` และไฟล์ `drizzle/schema.ts` เปลี่ยน import + ชนิดตามตาราง §3.4 จากนั้น generate migration ใหม่ทั้งชุดสำหรับ PostgreSQL

สรุป: **logic การ query เกือบทั้งหมดพกพาได้** เพราะ Drizzle ทำให้ syntax คล้ายกัน จุดที่ต้องแก้จริงคือ (1) connection driver, (2) schema definitions, (3) upsert conflict syntax, (4) `.onUpdateNow()` ทั้งหมดนี้รวมแล้วเป็นงานที่กำหนดขอบเขตได้ชัด ไม่กระจายทั้งโปรเจกต์

---

## 4. ระบบ Authentication และ Multi-tenant

> ผู้ใช้จะย้ายไปใช้ **Supabase Auth** ส่วนนี้อธิบายว่าระบบเดิมทำงานอย่างไร และต้องปรับตรงไหน

### 4.1 Auth ปัจจุบันทำงานอย่างไร

ระบบปัจจุบันใช้ **Manus OAuth** (OAuth 2.0 authorization code flow) ไม่มีระบบรหัสผ่านเป็นของตัวเอง ลำดับการทำงานคือ

1. Frontend สร้าง login URL ด้วย `getLoginUrl(returnPath)` (ใน `client/src/const.ts`) ซึ่ง encode `origin + returnPath` ลงใน `state` (base64 JSON) แล้วพาผู้ใช้ไปยัง Manus login portal
2. หลังผู้ใช้ยืนยันตัวตน Manus เด้งกลับมาที่ `GET /api/oauth/callback?code=...&state=...`
3. Handler ใน `server/_core/oauth.ts` เรียก `sdk.exchangeCodeForToken(code, state)` → ได้ access token → `sdk.getUserInfo(token)` → ได้ `openId`, `name`, `email`
4. `db.upsertUser({ openId, name, email, ... })` สร้าง/อัปเดตผู้ใช้ (ผูกด้วย `openId`)
5. `sdk.createSessionToken(openId, {...})` สร้าง **JWT** เซ็นด้วย `JWT_SECRET` แล้ว set เป็น httpOnly cookie ชื่อตาม `COOKIE_NAME` (อายุ 1 ปี)
6. ทุก request ถัดไป `createContext` (ใน `server/_core/context.ts`) เรียก `sdk.authenticateRequest(req)` ถอด JWT จาก cookie → คืน `User` object เป็น `ctx.user`

จุดสำคัญ: **session คือ JWT ใน httpOnly cookie** ไม่ใช่ session table และ **user ถูกเก็บในตาราง `users` ของเราเอง** โดยมี `openId` เป็นตัวเชื่อมกับผู้ให้บริการ identity (Manus)

### 4.2 Multi-tenant Isolation (ต้องคงไว้ — สำคัญมาก)

ระบบเป็น **multi-tenant** หลายบริษัทใช้ระบบเดียวกันโดยข้อมูลแยกกันสนิท กลไกอยู่ที่ฟังก์ชัน `resolveWorkspaceUserId` ใน `db.ts`

```ts
export async function resolveWorkspaceUserId(userId, role, ownerId): Promise<number> {
  if (role === "owner" || role === "admin") return userId;  // เป็นเจ้าของเอง
  if (ownerId) return ownerId;                               // สมาชิก → ชี้ไป owner
  const fallback = await getOwnerUserId();
  return fallback ?? userId;
}
```

ทุก procedure ใน backend จะเรียก helper `tenantId(ctx)` (wrapper ของ `resolveWorkspaceUserId`) เพื่อแปลง "ผู้ใช้ที่ login" เป็น "tenant id" ก่อน query เสมอ จากนั้น query ทั้งหมดกรองด้วย `WHERE userId = <tenantId>` ผลคือ พนักงาน (`staff`/`content`/`ceo`) จะเห็นข้อมูลของ workspace เดียวกับ owner ของตน ในขณะที่ owner คนอื่นเห็นแต่ข้อมูลตัวเอง **กลไกนี้ไม่ผูกกับ Manus เลย** จึงย้ายไปใช้กับ Supabase Auth ได้ทันที

### 4.3 ต้องปรับอะไรเมื่อย้ายไป Supabase Auth

แนวทางที่กระทบโค้ดน้อยที่สุดคือ **คงตาราง `users` และ logic tenant ไว้ทั้งหมด** แล้วเปลี่ยนเฉพาะชั้น identity provider ดังนี้

| สิ่งที่ต้องทำ | รายละเอียด |
| --- | --- |
| แทน Manus OAuth ด้วย Supabase Auth | ใช้ `@supabase/supabase-js` (หรือ `@supabase/ssr` สำหรับ Next.js) ทำ login ผ่าน email/OAuth providers ของ Supabase |
| Map identity → ตาราง `users` | เปลี่ยนความหมายของ `openId` เป็น `auth.users.id` (UUID) ของ Supabase แล้วยัง upsert ลงตาราง `users` ของเราเหมือนเดิม (เพื่อเก็บ `role`, `ownerId`, `companyCode`) |
| เปลี่ยนการ resolve session | แทน `sdk.authenticateRequest` ด้วยการ verify Supabase JWT (Supabase ออก JWT ให้อยู่แล้ว) ใน middleware ของ Next.js / Node — ถอด user id จาก token แล้ว lookup ตาราง `users` เพื่อได้ `role` + `ownerId` |
| `getLoginUrl` / callback | ไม่ต้องใช้ Manus portal อีก เปลี่ยนเป็น flow ของ Supabase (`supabase.auth.signInWithOAuth` / magic link) |
| `protectedProcedure` / `ownerProcedure` | logic การเช็ค role คงเดิมได้ 100% เพียงเปลี่ยน "ที่มาของ `ctx.user`" จาก Manus SDK เป็น Supabase session |

**ทางเลือกการเก็บ role:** สามารถเก็บ `role`/`ownerId` ไว้ใน custom claims ของ Supabase JWT (ผ่าน auth hook) เพื่อลด DB lookup หรือคงไว้ในตาราง `users` แล้ว lookup ทุก request ก็ได้ — แนะนำแบบหลังในช่วงแรกเพราะตรงกับโครงเดิมและแก้น้อยกว่า

**ข้อดีของดีไซน์เดิม:** เพราะ business logic ทั้งหมดอ้างถึง "user id ภายใน" (`users.id` แบบ int) ไม่ใช่ identity ของ provider โดยตรง การสลับ provider จึงกระทบแค่ชั้นบาง ๆ ที่แปลง "token → users.id" เท่านั้น ตาราง insights/commission/alerts ที่อ้าง `userId` ไม่ต้องแก้เลย

> หมายเหตุเรื่อง id type: ตาราง `users.id` เดิมเป็น `int` ส่วน `auth.users.id` ของ Supabase เป็น `uuid` ดังนั้นอย่าใช้ Supabase uuid เป็น PK ของตาราง `users` โดยตรง ให้คง `users.id` เป็น integer ต่อไป (เพราะตารางอื่นอ้าง int นี้จำนวนมาก) แล้วเพิ่มคอลัมน์ `supabaseUserId uuid unique` เพื่อ map กับ `auth.users.id` แทน — วิธีนี้รักษา FK ทั้งหมดในระบบไว้ได้


---

## 5. การเชื่อมต่อ Meta Marketing API

> นี่คือหัวข้อที่ 2 ที่ผู้ใช้ขอความละเอียดสูง ส่วนนี้ครอบคลุมเวอร์ชัน API, รายการ endpoint ทั้งหมด, field ที่ดึง, การคำนวณ, logic การ sync และความถี่ cron พร้อมประเมินความพกพาของโค้ด

### 5.1 เวอร์ชันและ base URL

โค้ด Meta ทั้งหมดอยู่ในไฟล์เดียว: `server/metaApi.ts` (เสริมด้วย `deepAdsSync.ts` ที่ทำ orchestration และ `bmSync.ts` สำหรับ Business Manager)

```ts
const META_API_VERSION = "v22.0";
const META_BASE = `https://graph.facebook.com/v22.0`;
```

ใช้ **Graph API v22.0** เรียกผ่าน `fetch` ตรง ๆ ไม่มี SDK ของ Facebook ทุก request เป็น `GET` พร้อมแนบ `access_token` เป็น query parameter ผ่าน helper กลาง `metaFetch()` ซึ่ง **จับ error ทุกชนิดและคืน `null`/array ว่าง** เพื่อให้แดชบอร์ดไม่ crash แม้ token เสีย (พฤติกรรมที่เห็นใน log `[MetaAPI] 400: API access blocked` ก็คือ token ใน sandbox หมดสิทธิ์ ซึ่งระบบกลืน error อย่างถูกต้อง)

### 5.2 รายการ endpoint/function ที่เรียก Meta ทั้งหมด

| Function (`metaApi.ts`) | Endpoint Graph API | ใช้ทำอะไร |
| --- | --- | --- |
| `fetchAccountInsight` | `GET /{actId}/insights` (`level=account`) | KPI รวมระดับบัญชี (Hub/Single dashboard) |
| `fetchAccountDailyInsights` | `GET /{actId}/insights` (`time_increment=1`) | KPI รายวันระดับบัญชี (กราฟ trend) |
| `fetchAccountHourlyInsights` | `GET /{actId}/insights` (`breakdowns=hourly_stats...`) | heatmap รายชั่วโมง / live pulse |
| `fetchAdsetInsights` | `GET /{actId}/insights` (`level=adset`) | KPI ระดับ adset |
| `fetchAdsetDailyInsights` | `GET /{actId}/insights` (`level=adset, time_increment=1`) | adset รายวัน |
| `fetchAdsForAdset` | `GET /{actId}/insights` (`level=ad`, filter adset) | แอดภายใน adset |
| `fetchAdInsightsDaily` | `GET /{actId}/insights` (`level=ad, time_increment=1, limit=500`) | **แกนหลัก** — ad×วัน สำหรับ Ad Intelligence + deep sync |
| `fetchAdReachMap` | `GET /{actId}/insights` (`level=ad`, ไม่มี time_increment) | ดึง reach รวมต่อ ad (แก้ปัญหา reach=0 รายวัน) |
| `fetchAdsetDailyBudgetMap` | `GET /{actId}/adsets` + `GET /{actId}/campaigns` (`fields=daily_budget,...`) | งบรายวันของ adset/campaign |
| `fetchCampaignStatuses` | `GET /{actId}/campaigns` (`fields=effective_status,...`) | สถานะแคมเปญ (ใช้ใน WAIT/NEW/REJECT) |
| `fetchAdPreviewThumb` | `GET /{adId}?fields=adcreatives{...}` | รูปตัวอย่าง + page id ของแอด |
| `fetchPageName` | `GET /{pageId}?fields=name` | ชื่อเพจ |
| `validateToken` | `GET /{actId}?fields=id,name` | ตรวจ token ใช้ได้ไหม (เบื้องต้น) |
| `testAdAccountToken` | `GET /me` + `GET /{actId}?fields=name,account_status,disable_reason` | ทดสอบ token + สถานะบัญชี (หน้า Accounts) |
| `testBMConnection` | `GET /me` + `GET /{bmId}?fields=id,name` | ทดสอบ token ของ BM |
| `discoverBMAccounts` | `GET /{bmId}/owned_ad_accounts` + `GET /{bmId}/client_ad_accounts` | auto-discover บัญชีภายใต้ BM |

### 5.3 Field ที่ดึงจริง (ตัวอย่างจาก `fetchAdInsightsDaily` — แกนหลัก)

```
fields = ad_id, ad_name, adset_id, adset_name, campaign_id, campaign_name,
         spend, impressions, clicks, ctr, reach,
         actions, action_values, cost_per_action_type, purchase_roas, date_start
params = level=ad, time_increment=1, limit=500, time_range={since,until}
```

### 5.4 การคำนวณ/แปลงค่า (mapping จาก payload ดิบ → metric ที่ใช้)

ค่าหลายตัวไม่ได้มาตรง ๆ แต่ต้อง extract จาก array `actions` / `action_values` / `cost_per_action_type` / `purchase_roas` ตรรกะการ extract ทั้งหมดเป็น **pure function** ที่ย้ายได้ทันที

| Metric | ที่มา | ตรรกะ |
| --- | --- | --- |
| **messages** (เริ่มสนทนา) | `actions[]` | `extractMessaging`: ไล่หา `onsite_conversion.messaging_conversation_started_7d` → `onsite_conversion.total_messaging_connection` → `messaging_conversation_started_7d` ตัวแรกที่ > 0 |
| **purchases** (ออเดอร์) | `actions[]` | `extractPurchases`: ไล่หา `omni_purchase` → `purchase` → `onsite_conversion.purchase` → `offsite_conversion.fb_pixel_purchase` (ใช้ตัวเดียวกันป้องกัน double-count) |
| **purchase_value** (มูลค่าขาย) | `action_values[]` | `extractPurchaseValue`: ลำดับเดียวกับ purchases |
| **cost_per_message** | `cost_per_action_type[]` | `extractCostPerMessage`: คืน `null` ถ้าไม่พบ (ไม่แสดงแทน 0) |
| **purchase_roas** | `purchase_roas[]` | `extractPurchaseRoas`: ดึง ROAS ที่ Meta คำนวณให้ |
| **reach** | field `reach` | ถ้า reach=0 ทุกแถว (Meta ไม่คืน reach ตอน `time_increment=1`) → เรียก `fetchAdReachMap` ดึง reach รวม แล้ว `distributeReachIntoDaily` เฉลี่ยกลับเข้าแต่ละวันตามสัดส่วน impressions |
| **page_id / page name** | `adcreatives` ของแอด | `extractPageId` แกะจาก object_story_spec / effective_object_story_id แล้ว `fetchPageName` |
| **ctr, cpm, spend, impressions, clicks** | field ตรง ๆ | ผ่าน `parseNum` (กัน null/string) |

### 5.5 Logic การ Sync และความถี่ (Cron)

ระบบ sync ทำผ่าน **Manus Heartbeat (HTTP cron)** ซึ่งแพลตฟอร์ม POST เข้ามาที่ endpoint `/api/scheduled/*` ใน `server/_core/index.ts` มี 3 jobs (นิยามใน `scheduleRouter.ts` → `AUTOSYNC_JOBS`)

| Job | Cron (6-field UTC) | Endpoint | หน้าที่ |
| --- | --- | --- | --- |
| `syncAdInsights` | `0 0 * * * *` (ทุกต้นชั่วโมง) | `/api/scheduled/syncAdInsights` | ดึง ad-day insights ทุก tenant |
| `syncBM` | `0 5 * * * *` (นาทีที่ 5) | `/api/scheduled/syncBM` | auto-discover/อัปเดต/ลบบัญชีภายใต้ BM |
| `checkAlerts` | `0 10 * * * *` (นาทีที่ 10) | `/api/scheduled/checkAlerts` | ตรวจ alert rules + ส่งแจ้งเตือน |

**กลยุทธ์ window การ sync (ตรงตามที่ผู้ใช้กำหนดไว้):** ในแต่ละรอบ `syncAdInsights` จะตรวจทุกบัญชีของทุก tenant แล้วแยกเป็น 2 กลุ่ม — บัญชีใหม่ (ยังไม่มีข้อมูล insights เลย ตรวจด้วย `hasAdInsightsDataForAccount`) จะ sync **ย้อนหลัง 90 วัน** (initial backfill) ส่วนบัญชีเก่า sync แค่ **7 วันล่าสุด** (rolling) เพื่อกัน rate limit การยิงจริงทำใน `deepAdsSync.ts → syncAdInsightsForAccounts` ที่รันทีละบัญชี (concurrency 5 + delay 300ms)

ภายใน `syncAdInsightsForAccount` หนึ่งบัญชีจะทำตามลำดับ: (1) ดึง insights + budgets + campaign statuses พร้อมกัน, (2) reconcile สถานะแคมเปญ WAIT/NEW/REJECT และ hard-delete แคมเปญที่ REJECT ครบ 5 วัน, (3) upsert insights รายแถวลง `adInsightsDaily`, (4) cache รูปตัวอย่าง + เติม `pageName` (concurrency 5), (5) backfill pageName ที่ยังว่าง ผลลัพธ์ทุกรอบถูกบันทึกลง `syncLogs`

นอกจาก auto-sync ผู้ใช้ยัง trigger เองได้ผ่านปุ่มในหน้า Ad Intelligence: `deepAds.syncNow` (sync ทันที) และ `deepAds.resyncBackfill` (re-sync ย้อนหลังตามจำนวนวันที่เลือก)

### 5.6 การจัดเก็บ Token และการเข้ารหัส

มี **2 รูปแบบ** ที่ต่างกัน ต้องระวังตอนย้าย

`adAccounts.accessToken` เก็บเป็น **plaintext** ใน DB (ใช้ตรงเมื่อเรียก Meta) ส่วน `businessManagers.accessTokenEncrypted` เก็บเป็น **ciphertext** ที่เข้ารหัสด้วย `server/encryption.ts` (AES-256-GCM) รูปแบบผลลัพธ์คือ `iv:authTag:ciphertext` (hex) โดยกุญแจมาจาก env `ENCRYPTION_KEY` (อ่าน 32 ไบต์แรก) ฟังก์ชันคือ `encryptToken()` / `decryptToken()`

โค้ดส่วนนี้เป็น Node `crypto` มาตรฐาน **ย้ายได้ทันทีไม่ต้องแก้** ขอเพียงตั้ง env `ENCRYPTION_KEY` ตัวเดิมในระบบใหม่ มิฉะนั้น token BM ที่เข้ารหัสไว้จะถอดไม่ได้ (ถ้าเริ่มข้อมูลใหม่ก็ตั้งคีย์ใหม่ได้)

> คำแนะนำเชิงความปลอดภัยตอนย้าย: ควรเข้ารหัส `adAccounts.accessToken` ด้วย (ปัจจุบันเป็น plaintext) เพราะ Supabase/Postgres ที่เปิด public อาจมีความเสี่ยงสูงกว่า TiDB ภายใน Manus

### 5.7 Business Logic สำคัญ: WAIT / NEW / REJECT (ต้องคงไว้)

ตรรกะนี้อยู่ใน `server/campaignStatus.ts` เป็น **pure function** (`reconcileStatus`) ทำงานเป็น state machine ตามสถานะ `effective_status` จาก Meta โดยระบบจดวันที่อนุมัติ/ปฏิเสธเอง

ตรรกะโดยสรุป: แคมเปญที่ Meta ยัง `PENDING_REVIEW`/`IN_PROCESS` = **WAIT** (รออนุมัติ), เมื่อเปลี่ยนเป็น `ACTIVE` ระบบจดเป็นวันอนุมัติและถือเป็น **NEW** ต่อเนื่อง 3 วัน, ถ้า Meta `DISAPPROVED` = **REJECT** ระบบจดวันและจะแสดง 5 วันก่อน hard-delete ข้อมูลทิ้ง (`rejectedExpired` กันการดึงกลับมาแสดงซ้ำ) ตรรกะนับวันใช้เวลา UTC ผ่าน `parseDateUtc` logic ทั้งหมดมีเทสต์ครอบคลุมและ **ย้ายได้ทันที**

### 5.8 ความพกพาของโค้ด Meta API ไป Node.js backend ใหม่

โค้ด Meta แทบทั้งหมด **ย้ายไป Node.js backend ใหม่ได้เลย** เพราะใช้ `fetch` มาตรฐาน + Node `crypto` ไม่พึ่ง tRPC หรือ MySQL จุดที่ผูกกับโครงเดิมมีเพียง 2 จุด

จุดแรกคือ **การถูกเรียกผ่าน tRPC** — ปัจจุบัน `metaApi` ถูกเรียกโดย procedure ใน `routers.ts` และ orchestrator `deepAdsSync.ts` ซึ่งรับ-เขียน DB ผ่าน helper ใน `db.ts` เมื่อย้าย ส่วนที่ "เรียก Meta แล้วได้ค่า" ใช้ได้เลย แต่ส่วนที่ "เขียนลง DB" ต้องเปลี่ยนเป็น query ของ PostgreSQL (ดู §3.5)

จุดที่สองคือ **trigger ของ cron** — ปัจจุบันพึ่ง Manus Heartbeat (`/api/scheduled/*` + `sdk.authenticateRequest` ตรวจ `isCron`) เมื่อย้ายไป Railway ต้องเปลี่ยนเป็นกลไก cron อื่น (ดู §7.5) แต่ "งานที่ cron ทำ" (ฟังก์ชัน sync) เหมือนเดิม

**Permission ที่ token ต้องมี:** `ads_read` (ดึง insights — จำเป็น) และ `ads_management` (ดึงงบ/สถานะแคมเปญ และจำเป็นถ้าจะสั่งปรับงบในอนาคต) สำหรับ BM ต้องเป็น token ที่มีสิทธิ์เข้าถึง Business (เช่น System User token ของ BM นั้น) เพื่อเรียก `owned_ad_accounts` / `client_ad_accounts` ได้


---

## 6. Environment Variables ทั้งหมด

ตัวแปร environment ทั้งหมดถูกใช้ผ่าน `server/_core/env.ts` (ฝั่ง server) และผ่าน `import.meta.env.VITE_*` (ฝั่ง client) ปัจจุบัน **ไม่มีไฟล์ `.env.example` ใน repo** เพราะ Manus inject ค่าเหล่านี้ให้อัตโนมัติ — เมื่อย้ายระบบ ทีมต้องสร้าง `.env` เองตามตารางนี้

### 6.1 ตัวแปรที่ระบบใช้จริง

| ตัวแปร | ฝั่ง | คำอธิบาย | ต้องมีในระบบใหม่? |
| --- | --- | --- | --- |
| `DATABASE_URL` | server | connection string ฐานข้อมูล | **ใช่** (เปลี่ยนเป็น Supabase Postgres URL) |
| `JWT_SECRET` | server | กุญแจเซ็น session JWT (cookie) | จะถูกแทนด้วยกลไกของ Supabase Auth |
| `ENCRYPTION_KEY` | server | กุญแจ AES-256-GCM เข้ารหัส BM token (`encryption.ts`) | **ใช่** (สำคัญต่อการถอด token เดิม) |
| `VITE_APP_ID` | both | Manus OAuth application ID | ไม่ใช้ (แทนด้วย Supabase) |
| `OAUTH_SERVER_URL` | server | Manus OAuth backend URL | ไม่ใช้ |
| `VITE_OAUTH_PORTAL_URL` | client | Manus login portal URL | ไม่ใช้ |
| `OWNER_OPEN_ID` | server | openId ของ owner (ใช้ `getOwnerUserId` fallback) | แทนด้วย Supabase user id ของ owner |
| `OWNER_NAME` | server | ชื่อ owner | ทางเลือก |
| `BUILT_IN_FORGE_API_URL` | server | URL ของ Manus built-in API (LLM/storage/notification) | **ต้องแทน** (ดู §7.4) |
| `BUILT_IN_FORGE_API_KEY` | server | bearer token เรียก built-in API (server) | **ต้องแทน** |
| `VITE_FRONTEND_FORGE_API_URL` | client | built-in API URL ฝั่ง frontend | ต้องแทน/ตัดออก |
| `VITE_FRONTEND_FORGE_API_KEY` | client | bearer token ฝั่ง frontend | ต้องแทน/ตัดออก |
| `VITE_APP_TITLE` | client | ชื่อแอป (แสดงผล) | ทางเลือก |
| `VITE_APP_LOGO` | client | URL โลโก้ | ทางเลือก |
| `VITE_ANALYTICS_ENDPOINT` | client | endpoint analytics ของ Manus | ตัดออก/แทนด้วย analytics อื่น |
| `VITE_ANALYTICS_WEBSITE_ID` | client | website id analytics | ตัดออก |
| `DEBUG_DEEP_ADS` | server | `=1` เปิด debug log payload Meta (`metaApi.ts`) | ทางเลือก (debug) |
| `NODE_ENV` | server | `production`/`development` | **ใช่** (มาตรฐาน) |
| `PORT` | server | พอร์ตที่ Express ฟัง (Railway inject ให้) | **ใช่** (อย่า hardcode) |

### 6.2 ตัวแปรใหม่ที่ต้องเพิ่มในสแตกใหม่

| ตัวแปร | คำอธิบาย |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL ของ Supabase project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key (ฝั่ง client) |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key (ฝั่ง server เท่านั้น — ห้าม expose) |
| `OPENAI_API_KEY` (หรือ provider อื่น) | แทน Manus built-in LLM สำหรับฟีเจอร์ AI แนะนำ |
| `CRON_SECRET` | (แนะนำ) shared secret ยืนยันว่า request cron มาจากแหล่งที่เชื่อถือได้ |

แนะนำให้สร้างไฟล์ `.env.example` ในระบบใหม่โดยรวมตัวแปรจาก 6.1 (เฉพาะที่ยังใช้) + 6.2 เพื่อให้ทีมตั้งค่าได้ง่าย


---

## 7. ขั้นตอนการย้ายระบบ (Migration Guide)

> หัวข้อที่ 3 ที่ผู้ใช้ขอความละเอียดสูงสุด ส่วนนี้แบ่งงานเป็นขั้น เรียงตามลำดับที่แนะนำให้ทำจริง พร้อมระบุว่าอะไร "ใช้ต่อได้เลย" อะไร "ต้องเขียนใหม่" จุดเสี่ยง business logic ที่ต้องคงไว้ และ bug/งานค้างที่ทราบ

### 7.1 ภาพรวมยุทธศาสตร์การย้าย

หัวใจของการย้ายที่กระทบโค้ดน้อยที่สุดคือ **แยก 3 ชั้นออกจากกัน**: (1) ชั้น business logic ซึ่งพกพาได้เกือบทั้งหมด, (2) ชั้น data access (Drizzle) ซึ่งแก้เฉพาะ dialect, และ (3) ชั้น platform (OAuth, cron, LLM, storage) ซึ่งต้องเขียนใหม่ ลำดับงานที่แนะนำคือทำชั้น (3) ก่อนเพราะเป็นโครง แล้วค่อยดึง (1) และ (2) เข้ามาเสียบ

### 7.2 สิ่งที่ "ใช้ต่อได้เลย" กับ "ต้องเขียนใหม่"

| ส่วน | สถานะ | หมายเหตุ |
| --- | --- | --- |
| `shared/types.ts`, `shared/const.ts` | **ใช้ต่อได้เลย** | type contracts ทั้งหมด |
| `server/campaignStatus.ts` (WAIT/NEW/REJECT) | **ใช้ต่อได้เลย** | pure + มีเทสต์ |
| `server/metaApi.ts` (ทุก fetch/extract) | **ใช้ต่อได้เลย** | fetch มาตรฐาน + crypto |
| `server/encryption.ts` | **ใช้ต่อได้เลย** | Node crypto |
| `server/alertEngine.ts`, `aggregator.ts` (ฟังก์ชันคำนวณ), `deepAdsMetrics.ts` | **ใช้ต่อได้เลย** | pure logic |
| ตรรกะคอมมิชชั่น (grade/lock/snapshot calc) | **ใช้ต่อได้เลย** | pure (logic อยู่ฝั่ง server + client) |
| Frontend UI (29 หน้า, shadcn/ui, Tailwind) | **ใช้ต่อได้ ~80%** | JSX/CSS ย้ายได้ แต่ต้องเปลี่ยน data layer (ดู §7.6) |
| `server/db.ts` (query helpers) | **แก้บางส่วน** | logic เหมือนเดิม เปลี่ยน driver + upsert syntax |
| `drizzle/schema.ts`, `drizzle.config.ts` | **แก้** | MySQL → PostgreSQL (§3.4) |
| `server/routers.ts` + sub-routers (tRPC) | **เขียนใหม่/ปรับ** | ถ้าใช้ tRPC ต่อ → แก้ context; ถ้าเปลี่ยนเป็น REST/Route Handlers → เขียนใหม่ |
| `server/_core/*` (OAuth, context, sdk, vite, heartbeat) | **เขียนใหม่** | ผูกกับ Manus โดยตรง |
| `client/src/_core/hooks/useAuth.ts`, `const.ts` (getLoginUrl) | **เขียนใหม่** | เปลี่ยนเป็น Supabase Auth |
| LLM/Storage/Notification helpers (`_core/llm.ts` ฯลฯ) | **เขียนใหม่** | แทน Manus Forge ด้วย provider ภายนอก |

### 7.3 ลำดับขั้นการย้าย (แนะนำ)

**ขั้นที่ 1 — ตั้งโครง Next.js + Supabase.** สร้างโปรเจกต์ Next.js (App Router) เชื่อม Supabase project ตั้ง Supabase Auth (email/OAuth) แล้วทำ flow login/logout ให้ใช้ได้ก่อน

**ขั้นที่ 2 — ย้าย schema.** แปลง `drizzle/schema.ts` เป็น `pg-core` ตาม §3.4 (เปลี่ยน `mysqlTable`→`pgTable`, `mysqlEnum`→`pgEnum`, `double`→`doublePrecision`, จัดการ `.onUpdateNow()`), ตั้ง `dialect: "postgresql"`, generate migration ใหม่, push ขึ้น Supabase เพิ่มคอลัมน์ `supabaseUserId uuid` ในตาราง `users` เพื่อ map กับ `auth.users`

**ขั้นที่ 3 — ย้าย data layer.** ย้าย `server/db.ts` เปลี่ยน connection เป็น `pg`/`postgres-js` แก้ upsert ทุกจุดเป็น `.onConflictDoUpdate()` เขียนเทสต์ครอบ query สำคัญ (มี Vitest เดิมเป็นต้นแบบ)

**ขั้นที่ 4 — ย้าย API layer.** ตัดสินใจระหว่างคง tRPC (เร็วกว่า เพราะ FE เดิมเรียก `trpc.*` อยู่แล้ว) กับเปลี่ยนเป็น Next.js Route Handlers/Server Actions ถ้าคง tRPC ให้สร้าง context ใหม่ที่ดึง user จาก Supabase session แทน `sdk.authenticateRequest` แล้ว procedure ทั้งหมด (รวม `ownerProcedure`, `tenantId`) ใช้ต่อได้เกือบหมด

**ขั้นที่ 5 — ย้าย Meta + cron.** นำ `metaApi.ts`/`deepAdsSync.ts`/`bmSync.ts` มาเสียบกับ data layer ใหม่ แล้วตั้ง cron (ดู §7.5)

**ขั้นที่ 6 — ย้าย integration ภายนอก.** แทน LLM/Storage/Notification (§7.4)

**ขั้นที่ 7 — Deploy ขึ้น Railway.** ตั้ง env ทั้งหมด, ใช้ `PORT` จาก Railway (ห้าม hardcode), ตั้ง Railway Cron

### 7.4 การแทนบริการของ Manus (LLM / Storage / Notification)

| บริการเดิม (Manus) | ใช้ที่ไหน | แทนด้วย |
| --- | --- | --- |
| `_core/llm.ts` (`invokeLLM`) | หน้า AI แนะนำ (`aiAdvisor.ts` — 6 บทบาท) | OpenAI/Anthropic SDK โดยตรง (interface คล้าย chat completions อยู่แล้ว แก้แค่ client) |
| `_core/storage.ts` (`storagePut`) | cache รูปตัวอย่างโฆษณา (`previewCache.ts`) | Supabase Storage หรือ S3 — เปลี่ยนเฉพาะฟังก์ชัน put แล้วเก็บ URL ลง `adInsightsDaily.previewCachedUrl` เหมือนเดิม |
| `_core/notification.ts` (`notifyOwner`) | แจ้งเตือน owner | LINE Notify / Webhook (ระบบ alert มี `alertChannels` รองรับ LINE+Webhook อยู่แล้ว) |
| `_core/voiceTranscription.ts` | ไม่ได้ใช้ในฟีเจอร์หลัก | ตัดออกได้ |

ฟีเจอร์ **AI แนะนำ** (`aiAdvisor.ts`) ใช้ `invokeLLM` ส่ง prompt ตามบทบาทผู้เชี่ยวชาญ (performance_analyst, budget_optimizer, creative_strategist, audience_specialist, risk_compliance, sales_conversion) การย้ายเพียงเปลี่ยน implementation ของ `invokeLLM` ให้เรียก provider ใหม่ — โครง prompt/role คงเดิมได้

### 7.5 การจัดการ Cron บน Railway (จุดที่ต้องออกแบบใหม่)

ระบบเดิมพึ่ง **Manus Heartbeat** ที่ POST เข้ามาที่ `/api/scheduled/*` พร้อม auth พิเศษ (`sdk.authenticateRequest` → `isCron`) บน Railway ไม่มีกลไกนี้ ต้องเลือกอย่างใดอย่างหนึ่ง

แนะนำใช้ **Railway Cron Jobs** (cron service แยก) หรือ external scheduler (เช่น cron-job.org / GitHub Actions schedule) ยิง HTTP POST มาที่ endpoint เดิม โดยเปลี่ยนการ auth จาก Manus เป็นการตรวจ header `Authorization: Bearer $CRON_SECRET` แล้วคง logic ภายใน handler (แยกบัญชีใหม่ 90 วัน/เก่า 7 วัน, reconcile, upsert) ไว้ทั้งหมด สิ่งที่ต้องคงคือ **3 jobs และความถี่รายชั่วโมง** ตาม §5.5 และ handler ต้อง **idempotent** (เขียนแบบ upsert อยู่แล้ว จึงรันซ้ำได้ปลอดภัย)

ข้อควรระวังเรื่อง timeout: เดิม Manus จำกัด handler 2 นาที/ครั้ง บน Railway ไม่มีข้อจำกัดนั้น แต่ถ้า tenant/บัญชีเยอะ ควรพิจารณาแบ่งงานเป็น batch หรือใช้คิว เพื่อไม่ให้รอบเดียวยาวเกินไปและกัน Meta rate limit

### 7.6 การย้าย Frontend (React/Vite → Next.js)

UI ทั้ง 29 หน้าเขียนด้วย React 19 + shadcn/ui + Tailwind 4 ซึ่งย้ายเข้า Next.js ได้เป็นส่วนใหญ่ จุดที่ต้องแก้คือ

ระบบ routing เปลี่ยนจาก `wouter` (ใน `App.tsx`) เป็น Next.js App Router (โฟลเดอร์ `app/`) — ต้อง map แต่ละ route เป็นไฟล์ `page.tsx` ส่วน dynamic route เช่น `/adset/:accountId/:adsetId` เป็น `app/adset/[accountId]/[adsetId]/page.tsx`

การเรียกข้อมูลเปลี่ยนจาก `trpc.*.useQuery/useMutation` — ถ้าคง tRPC ไว้ ใช้ `@trpc/react-query` กับ Next.js ได้ (แก้แค่ provider setup) ถ้าเลิก tRPC ต้องเขียน data fetching ใหม่เป็น Server Components/Route Handlers ส่วน `useAuth()` เปลี่ยนไปอ่าน session จาก Supabase

components ใน `client/src/components/ui/*` (shadcn) และ business components ส่วนใหญ่ย้ายได้ตรง ๆ ระวังเฉพาะ `'use client'` directive ที่ Next.js ต้องการสำหรับ component ที่ใช้ hook/interactivity

### 7.7 Business Logic สำคัญที่ต้องคงไว้ (ห้ามตกหล่น)

1. **WAIT / NEW / REJECT state machine** (`campaignStatus.ts`): WAIT=รออนุมัติ, NEW=3 วันหลัง active, REJECT=แสดง 5 วันแล้ว hard-delete, ใช้เวลา UTC จดวันเอง
2. **การต่อแอด (scaleNextAmount)** (`adManualMetrics`): ยอดที่กรอกเป็น "ยอดใหม่" จะกลายเป็น "ยอดเก่า" ของวันถัดไป — logic การ carry-over ต้องคงไว้
3. **คอมมิชชั่น + Lock/Snapshot** (`commissionLocks.snapshotJson`): เมื่อปิดงวดต้อง freeze ผลคำนวณเป็น JSON ไม่ให้เปลี่ยนแม้ Meta อัปเดตข้อมูลย้อนหลัง — กลไก periodKey + snapshot ต้องคงไว้
4. **Smart Scaling Score** (`aggregator.ts`): `score = ROASnorm×0.7 + CTRnorm×0.3` (normalize ด้วย roasTarget/ctrThreshold) แล้ว map เป็น badge (scale-up-large ≥1.5, scale-up-small ≥1.1, watch ≥0.8, scale-down-small ≥0.5, scale-down-large) ต้องคงสูตรและ threshold เดิม
5. **การคำนวณคอลัมน์ Ad Intelligence**: messaging/purchases/purchase_value จาก action arrays (ลำดับ fallback ตาม §5.4 เพื่อกัน double-count), cost_per_message คืน null ถ้าไม่มี, reach แจกจ่ายเมื่อรายวัน=0
6. **Multi-tenant isolation** (`resolveWorkspaceUserId`): ทุก query กรองด้วย tenantId — ห้ามหลุดข้ามบริษัท
7. **การแยกข้อมูล Meta vs Manual**: `adInsightsDaily` (จาก Meta, sync ทับได้) กับ `adManualMetrics` (กรอกมือ, ห้าม sync ทับ) — join ด้วย `(adId, date)` ต้องไม่ปนกัน
8. **window การ sync**: บัญชีใหม่ 90 วัน, บัญชีเก่า 7 วัน (ตรงตามความต้องการของผู้ใช้)

### 7.8 จุดเสี่ยง/ต้องระวังเป็นพิเศษ

ความเสี่ยงสูงสุดอยู่ที่ **upsert semantics** — MySQL `ON DUPLICATE KEY UPDATE` กับ PostgreSQL `ON CONFLICT` ต่างกันเรื่องการระบุ target index ถ้า map ผิดคู่จะเกิดข้อมูลซ้ำหรือ overwrite ผิด ควรเทสต์ upsert ของ `adInsightsDaily (adId,date)` และ `campaignStatus (userId,campaignId)` อย่างละเอียด

ความเสี่ยงรองคือ **timezone** — ระบบใช้ UTC ทั้งหมด (เก็บ date เป็นสตริง `YYYY-MM-DD` แบบ UTC, นับวัน NEW/REJECT ด้วย UTC) ต้องไม่เผลอแปลงเป็น local time ระหว่างย้าย มิฉะนั้นการนับวันและการ join date จะเพี้ยน

ความเสี่ยงอื่น ๆ ได้แก่ การถอด BM token เดิม (ต้องใช้ `ENCRYPTION_KEY` ตัวเดิม), การรักษา `users.id` เป็น int (อย่าเปลี่ยนเป็น uuid), และการตั้ง cron ให้ idempotent + กัน Meta rate limit (คง concurrency 5 + delay 300ms)

### 7.9 จุดที่ยังทำไม่เสร็จ / Bug ที่ทราบ

จากการอ่านโค้ด มีประเด็นที่ควรรับทราบและพิจารณาแก้ระหว่างย้าย

ประเด็นแรกคือ **debug log ของ Meta ถูกเปิดค้างไว้** ใน `metaApi.ts` บรรทัด `const DEBUG_INSIGHTS = process.env.DEBUG_DEEP_ADS === "1" || true;` — ส่วน `|| true` ทำให้ debug log ทำงานเสมอแม้ไม่ได้ตั้ง env ควรเอา `|| true` ออกในระบบใหม่เพื่อลด log

ประเด็นที่สองคือ **การจำแนกผลของ sync เมื่อ token ถูกบล็อก** — เมื่อ Meta คืน `API access blocked` (code 200) ตัว `metaFetch` จะคืน array ว่าง ทำให้ `syncAdInsightsForAccount` มองว่าสำเร็จ (`ok: true, rowsSynced: 0`) แทนที่จะรายงานเป็น error รายบัญชี ผลคือ `syncLogs` อาจขึ้น success ทั้งที่ไม่ได้ข้อมูลจริง (สังเกตได้จาก log `API access blocked` จำนวนมากใน sandbox) ระบบมี `classifyMetaError` ที่จำแนก error ละเอียดแล้ว แต่ deep sync ยังไม่ได้เชื่อมผลนั้นเข้ากับสถานะรายบัญชีอย่างเต็มที่ — แนะนำให้ปรับ `metaFetch` ให้แยก "ว่างเพราะไม่มีข้อมูล" ออกจาก "ว่างเพราะ error" ในระบบใหม่

ประเด็นที่สามคือ **token ของ `adAccounts` เก็บเป็น plaintext** (ต่างจาก BM ที่เข้ารหัส) ซึ่งเป็นความเสี่ยงด้านความปลอดภัยที่ควรปิดช่องตอนย้ายไป DB สาธารณะ

ประเด็นที่สี่คือ **token ที่ใช้ทดสอบใน sandbox หมดสิทธิ์แล้ว** (เห็นจาก log) จึงควรเตรียม token ที่มี `ads_read`/`ads_management` ที่ใช้งานได้จริงสำหรับทดสอบ sync หลังย้าย

> ทั้งสี่ประเด็นเป็นเรื่องที่จัดการได้ ไม่ใช่ blocker ของการย้าย แต่ควรบันทึกไว้เพื่อไม่ให้ตกหล่น

---

## ภาคผนวก: สรุปสั้นสำหรับผู้บริหารโครงการ

ระบบนี้ออกแบบมาดีในแง่การแยกชั้น ทำให้ **business logic หลักเกือบทั้งหมด (Meta API, WAIT/NEW/REJECT, คอมมิชชั่น, Smart Scaling, multi-tenant) ย้ายไปสแตกใหม่ได้โดยแก้ไม่มาก** งานหนักจริงกระจุกอยู่ที่ 3 จุด: (1) แปลง schema MySQL→PostgreSQL พร้อม upsert syntax, (2) เปลี่ยน identity จาก Manus OAuth เป็น Supabase Auth (โดยคงตาราง `users` และ tenant logic), และ (3) แทนบริการแพลตฟอร์ม (cron/LLM/storage/notification) ด้วยบริการภายนอก หากทำตามลำดับใน §7.3 จะลดความเสี่ยงและทำให้แต่ละขั้นทดสอบได้เป็นอิสระ

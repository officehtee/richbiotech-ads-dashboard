# แผนเสนอฟีเจอร์: Business Manager Auto-Discovery

> **สถานะ:** ข้อเสนอ — รอ Owner confirm ก่อนเริ่ม code  
> **เป้าหมาย:** เพิ่ม BM Token ครั้งเดียว → ระบบ discover Ad Accounts ทั้งหมดที่ผูกใน BM นั้น → tag เข้ากลุ่มสินค้า → sync insights อัตโนมัติ

---

## หมวด 1 — ความเป็นไปได้ทางเทคนิค

### Q1. Meta Graph API รองรับการดึง list Ad Accounts จาก BM ID ด้วย BM Token อันเดียวได้ไหม?

**ได้ครับ — Meta รองรับเต็มรูปแบบ** ผ่าน Graph API v22.0

**Endpoint หลักที่ใช้:**

| จุดประสงค์ | Endpoint | ส่งกลับ |
|---|---|---|
| ดู BM ที่ User/SystemUser เข้าถึงได้ | `GET /me/businesses` | array ของ BM (id, name, verification_status) |
| ดู Ad Accounts ทั้งหมดที่ BM **เป็นเจ้าของ** | `GET /{business_id}/owned_ad_accounts?fields=id,account_id,name,account_status,currency,timezone_name,disable_reason` | Ad Account ที่ BM เป็นเจ้าของโดยตรง |
| ดู Ad Accounts ที่ BM **ได้รับ access** (ของลูกค้า/พาร์ทเนอร์) | `GET /{business_id}/client_ad_accounts?fields=...` | Ad Account ลูกค้าที่ BM agency ได้รับสิทธิ์ |
| ดู BM ที่ Ad Account อยู่ภายใต้ | `GET /{ad_account_id}?fields=business` | ตรวจสอบ ownership ย้อนกลับ |

**Permission/scope ที่ต้องมี (ขั้นต่ำ):**
- `business_management` — เพื่อเข้าถึง `/{business_id}/...` ทั้งหมด
- `ads_read` — เพื่อดึง `insights` ของแต่ละ Ad Account
- *(optional)* `ads_management` — ถ้าจะให้ Smart Scaling แก้ budget ผ่าน BM token

**ข้อสำคัญ:** ใช้ **System User Token** (สร้างจาก Business Settings → System Users) จะดีที่สุดเพราะ long-lived (ไม่หมดอายุ) — User Access Token ของคนปกติจะหมดอายุใน 60 วัน

---

### Q2. BM Token มีอายุเท่าไหร่? ใช้ System User Token long-lived ได้ไหม?

**3 ประเภทของ Token** ที่เลือกใช้ได้:

| ประเภท | อายุ | เหมาะกับ |
|---|---|---|
| User Access Token (สั้น) | 1–2 ชม. | ห้ามใช้ในระบบ |
| User Access Token (long-lived) | 60 วัน | ใช้ได้แต่ต้อง re-auth ทุก 2 เดือน |
| **System User Token** | **ไม่หมดอายุ** (จนกว่าจะ revoke) | **แนะนำสำหรับ production** |

**คำแนะนำ:** ระบบควรบังคับ/แนะนำให้ใช้ **System User Token** เพราะ:
1. ไม่หมดอายุ → ไม่ต้องสร้างกลไก auto-refresh ที่ซับซ้อน
2. ผูกกับ BM โดยตรง ไม่ใช่บัญชี Facebook ส่วนตัว (ถ้าเจ้าของลาออก/บัญชีถูก disable ระบบยังใช้งานต่อได้)
3. กำหนด scope แยกได้ละเอียดผ่าน Business Settings

**Auto-refresh สำหรับ User Token (กรณีไม่ใช้ System User):**
- Meta มี endpoint `GET /oauth/access_token?grant_type=fb_exchange_token` แต่ต้องมี user interaction ครั้งแรก
- ระบบจะ detect token หมดอายุ (error code 190) → ส่ง notify ไปที่ Owner ให้ re-login → ไม่ทำ auto-refresh เงียบ ๆ เพราะอันตราย

---

### Q3. ดึง insights ของ 10+ Ad Accounts พร้อมกัน จะติด Meta API rate limit ไหม?

**ติดได้** ถ้าทำไม่ดี — แต่จัดการได้ทั้งหมด

**Rate limit ของ Meta Marketing API (Business Use Case):**
- **App-level**: ขึ้นกับ tier ของแอป (เริ่มต้น Standard = 200 calls/ชม./user)
- **Account-level (BUC)**: ขึ้นกับ `total_cputime`, `total_time`, `call_count` แสดงใน response header `X-Business-Use-Case-Usage` (0–100%)
- **Throttling**: ถ้า usage > 75% → ส่ง 200 OK แต่ delay เพิ่ม / > 95% → ตอบ error code 17 (User request limit) หรือ 80004 (BUC throttle)

**กลยุทธ์ที่ระบบจะใช้:**

1. **Batched request** — รวม insights ของหลาย Ad Account ใน 1 HTTP call ผ่าน Graph Batch API (`POST /?batch=[...]`) — ลด round-trip
2. **Field selection แม่นยำ** — ขอเฉพาะ fields ที่ใช้จริง (spend, impressions, clicks, actions, action_values) ไม่ขอ `*`
3. **Stagger schedule** — sync ไม่พร้อมกันทั้ง 18 บัญชี: queue คั่นทีละบัญชี ห่างกัน 2–5 วินาที
4. **Read header `X-Business-Use-Case-Usage`** — ถ้า usage > 75% → ขยายระยะคั่นเป็น 30 วินาที
5. **Backoff exponential** — code 17/80004 → delay 60s, 120s, 240s, 480s
6. **Cache 5 นาที** — KPI rollup ของ Hub cache 5 นาที (เหมือนระบบเดิม) ไม่ยิง Meta ทุกครั้งที่ user เปิดหน้า

**ผลลัพธ์ที่คาดหวัง:** 18 บัญชี ดึง insights 7 วัน (1 batch request) ใช้ ~ 5–10 BUC points จาก 100 → เหลือเฟือสำหรับใช้งานปกติ

---

## หมวด 2 — ผลกระทบกับระบบเดิม

### Q4. ต้องเพิ่ม table `businessManagers` ใหม่ไหม? โครงสร้างที่แนะนำ?

**ต้องเพิ่ม** — ขอเสนอ schema 3 ตารางใหม่ + แก้ตารางเดิม 1 ตาราง:

```ts
// ตารางใหม่ #1: businessManagers
export const businessManagers = mysqlTable("businessManagers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),            // Owner ของ workspace
  bmId: varchar("bmId", { length: 64 }).notNull(),         // BM ID จาก Meta
  bmName: varchar("bmName", { length: 255 }),               // ชื่อ BM (auto จาก Meta)
  nickname: varchar("nickname", { length: 255 }),           // ชื่อภายในที่ Owner ตั้ง เช่น "I SURE PLUS BM"
  accessToken: text("accessToken").notNull(),               // System User Token
  tokenType: mysqlEnum("tokenType", ["system_user", "user_long_lived"])
    .default("system_user").notNull(),
  tokenExpiresAt: timestamp("tokenExpiresAt"),              // null = ไม่หมดอายุ
  defaultGroupId: int("defaultGroupId"),                    // กลุ่มสินค้าเริ่มต้นสำหรับ AdAcc ใน BM นี้
  autoSync: boolean("autoSync").default(true),              // เปิด/ปิด auto-discovery
  syncIntervalHours: int("syncIntervalHours").default(24), // ทุกกี่ชม.ที่จะ re-scan
  lastSyncAt: timestamp("lastSyncAt"),
  lastSyncStatus: mysqlEnum("lastSyncStatus",
    ["success", "partial", "failed", "pending"]).default("pending"),
  lastSyncError: text("lastSyncError"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ตารางใหม่ #2: bmAdAccountLinks (link table)
export const bmAdAccountLinks = mysqlTable("bmAdAccountLinks", {
  id: int("id").autoincrement().primaryKey(),
  bmId: int("bmId").notNull(),               // ref businessManagers.id
  adAccountId: int("adAccountId").notNull(), // ref adAccounts.id
  discoveredAt: timestamp("discoveredAt").defaultNow().notNull(),
  // ใช้สถานะเพื่อ track lifecycle ของ Ad Account ที่ถูก discover
  status: mysqlEnum("status",
    ["active", "excluded", "removed_from_bm"]).default("active"),
  // ownership ของ Ad Account ใน BM (owned = BM เป็นเจ้าของ / client = BM ได้รับสิทธิ์)
  ownership: mysqlEnum("ownership", ["owned", "client"]).default("owned"),
});

// ตารางใหม่ #3: bmDiscoveryLogs (ประวัติการ scan)
export const bmDiscoveryLogs = mysqlTable("bmDiscoveryLogs", {
  id: int("id").autoincrement().primaryKey(),
  bmId: int("bmId").notNull(),
  scannedAt: timestamp("scannedAt").defaultNow().notNull(),
  durationMs: int("durationMs"),
  accountsFound: int("accountsFound").default(0),
  accountsAdded: int("accountsAdded").default(0),
  accountsRemoved: int("accountsRemoved").default(0),
  accountsExcluded: int("accountsExcluded").default(0),
  rawJson: text("rawJson"),                  // raw response จาก Meta สำหรับ debug
  errorMessage: text("errorMessage"),
});
```

**แก้ตาราง `adAccounts` เดิม** — เพิ่ม 2 column:

```ts
// เพิ่มใน adAccounts:
sourceBmId: int("sourceBmId"),               // null = manual, มีค่า = มาจาก BM
isAutoDiscovered: boolean("isAutoDiscovered").default(false),
```

**เหตุผลของ design:**
- แยก `businessManagers` ออกจาก `adAccounts` ชัดเจน — 1 BM = N AdAccounts (1:N)
- ใช้ **link table** `bmAdAccountLinks` แทนการเขียน `bmId` ตรงใน `adAccounts` — รองรับเคส 1 AdAccount อยู่หลาย BM ในอนาคต + status `excluded` (Q6)
- `bmDiscoveryLogs` ช่วย debug ปัญหา rate limit, token expire, ownership change

---

### Q5. AdAccount เดิมที่เพิ่ม manual จะกระทบไหม? Migrate ยังไง?

**ไม่กระทบ** — AdAccount เดิมจะอยู่เหมือนเดิมทั้งหมด

**กฎการแยก:**
- AdAccount ที่ `sourceBmId IS NULL` = manual → แก้ token / ลบได้ตามปกติ
- AdAccount ที่ `sourceBmId IS NOT NULL` = มาจาก BM → token ใช้ของ BM แทน, ห้ามลบจาก /accounts (ต้องลบจากหน้า BM แทน)

**Migration plan สำหรับของเดิม (optional):**
- หน้า BM Settings มีปุ่ม "**ลิงก์ AdAccount ที่มีอยู่กับ BM**" — Owner เลือก AdAccount manual เก่า → ระบบ verify ว่า AdAccount นั้นอยู่ใน BM จริง → update `sourceBmId` + ย้าย token ไปใช้ของ BM
- ของเดิมที่ไม่ได้ลิงก์จะอยู่แบบ standalone ตลอดไป (ไม่บังคับ migrate)

---

### Q6. BM 1 ตัวมี AdAccount ที่ไม่อยากเอาเข้า Dashboard — exclude ยังไง? UX ที่ดีที่สุด?

**UX ที่แนะนำ — 2 ขั้นเลือก:**

**ขั้นที่ 1: หน้า Add BM Wizard (ตอนเพิ่ม BM ครั้งแรก)**
- หลังกรอก BM Token + กลุ่มสินค้า → ระบบ scan → **แสดง list AdAccount ทั้งหมดที่เจอ พร้อม checkbox**
- Default: เลือกทุกอันที่ status = `ACTIVE` (status 1)
- Status อื่น (DISABLED 2, UNSETTLED 3, PENDING_RISK_REVIEW 7, ฯลฯ) → uncheck default + แสดง tag สีเทาว่า "ปิดอยู่"
- มีปุ่ม "เลือกทั้งหมด / ไม่เลือก" + filter "เฉพาะที่ active"

**ขั้นที่ 2: หน้า BM Detail (หลัง add แล้ว)**
- ตารางแสดง AdAccount ภายใต้ BM นี้ พร้อมคอลัมน์ "สถานะใน Dashboard"
- 3 สถานะ: **เปิดใช้** (`active`) / **ปิดชั่วคราว** (`excluded`) / **หายจาก BM แล้ว** (`removed_from_bm`)
- toggle switch ในตารางเพื่อ exclude/include รายตัว
- **กฎสำคัญ:** ถ้า re-scan แล้ว Meta ส่ง AdAccount ที่เคย `excluded` มา → คงสถานะ `excluded` (ไม่ override) ป้องกัน Owner ตั้งใจปิดแต่ระบบเปิดเองทุก 24 ชม.

---

## หมวด 3 — Sync และ Auto-discovery

### Q7. ระบบควร re-scan BM เพื่อดู AdAccount ใหม่บ่อยแค่ไหน?

**แนะนำ 2 กลไกควบคู่:**

1. **Auto ทุก 24 ชม.** (default) — รัน Heartbeat cron job ตอน 02:00 ของ timezone bangkok (เลี่ยงช่วง peak ของผู้ใช้)
   - ตั้งค่าได้ใน BM Settings → `syncIntervalHours` (default 24, range 6–168 ชม.)
   - ถ้า `autoSync = false` → ข้าม
2. **ปุ่ม "Re-scan ตอนนี้"** ในหน้า BM Detail — ใช้ตอน Owner เพิ่ม AdAccount ใหม่ใน BM แล้วอยากเห็นทันที
   - มี cooldown 60 วินาที (ป้องกันกดถี่)
   - แสดง spinner + progress: "กำลังตรวจ BM... (1/3)"

**บันทึก audit log ทุกครั้ง** ใน `bmDiscoveryLogs` เพื่อ trace ปัญหา

---

### Q8. การ sync insights ของ 18+ บัญชี ใช้เวลานานแค่ไหน? Background job แบบไหน? แสดง progress?

**Performance estimate** (อิงระบบเดิม):
- 1 AdAccount, 7 วัน insights, batched fields → **~1–2 วินาที**
- 18 AdAccounts batched ใน 1 request → **~5–10 วินาที**
- ถ้า sequential (cool-down 3 วินาทีระหว่าง account) → **~70 วินาที**

**Background job strategy:**

ระบบเดิมใช้ **Heartbeat scheduler** อยู่แล้ว — ขยายต่อ:

1. **Hourly heartbeat** — ดึง insights 24 ชม.ล่าสุดของทุก BM (สำหรับ Hub realtime)
2. **6-hourly heartbeat** — refresh 7 วัน + 30 วัน aggregates
3. **Daily heartbeat (02:00)** — BM discovery scan + cleanup expired tokens

**ไม่ใช้ external queue** (BullMQ/Redis) เพราะ Cloud Run cold start + min-instances=0 ไม่เหมาะ — ใช้ Heartbeat ที่ schedule จากภายนอกแทน (มีอยู่แล้วในระบบ)

**Progress UI:**
- หน้า BM Detail → tab "ประวัติการ sync" → ตารางจาก `bmDiscoveryLogs` แสดง 30 ครั้งล่าสุด (เวลา, จำนวนเจอ, สถานะ, error)
- ถ้า user กด "Re-scan ตอนนี้" → modal แสดง real-time progress ผ่าน tRPC subscription (หรือ polling 1 วินาที)
- Badge สีบนเมนู BM: เขียว = sync ภายใน 24 ชม. / เหลือง = 24–48 ชม. / แดง = > 48 ชม. หรือ failed

---

### Q9. ถ้า AdAccount 1 ใน 10 ถูก Meta disable ระหว่างวัน — handle ยังไง?

**กลยุทธ์ "fail-soft per account":**

1. ระหว่าง sync — ถ้า 1 AdAccount return error → log + skip → **ไป AdAccount ถัดไป** (ไม่ abort ทั้ง batch)
2. AdAccount นั้นมาร์คในตารางด้วย icon ⚠ + tooltip error message
3. ถ้า error code = 100 (account ไม่พบ) / 200 (access blocked) / 17 (rate) → จัด category ผ่าน `classifyMetaError` ที่ทำไว้ใน Round 7.22
4. **Auto-notify Owner** ผ่าน Alert system ถ้า:
   - AdAccount disabled มากกว่า 24 ชม.
   - BM token หมดอายุ
   - ≥ 30% ของ AdAccount ใน BM ล้มเหลวพร้อมกัน (สัญญาณว่า BM โดน restrict)
5. **Dashboard ยังแสดงข้อมูลที่ดึงได้** — KPI rollup จะ exclude account ที่ error + แสดง banner "5 ใน 18 บัญชีดึงไม่ได้ — [ดูรายละเอียด]"

---

## หมวด 4 — ความปลอดภัย

### Q10. BM Token เก็บที่ไหน? เข้ารหัสยังไง?

**เก็บใน DB** column `businessManagers.accessToken` (TEXT)

**แนวทาง encryption (เลือก 1 ใน 2):**

| ทางเลือก | ข้อดี | ข้อเสีย |
|---|---|---|
| **A. AES-256-GCM ใน application layer** ใช้ `crypto` ของ Node + secret key จาก env (`TOKEN_ENCRYPTION_KEY`) | ง่าย, control เต็มที่, ไม่ต้องพึ่ง infra ภายนอก | ถ้า env key รั่ว = ทุก token รั่ว |
| **B. ฝาก secret manager** เช่น Google Secret Manager (ผ่าน Manus secrets) | แยก lifecycle ของ key/token, audit ครบ | implement ซับซ้อน, Cloud Run cold start เพิ่ม |

**คำแนะนำ:** ใช้ **A** ก่อน (เร็ว + ปลอดภัยพอ) — set env `TOKEN_ENCRYPTION_KEY` 32 bytes random, เก็บ IV + auth tag ในคอลัมน์เดียวกัน format `iv:authTag:ciphertext` (base64). ใน UI แสดง token แบบ masked เท่านั้น (`EAAxxxxxxxxxxxx****`) — copy full ได้เฉพาะ Owner กดปุ่ม "แสดง"

**Token ปัจจุบันในตาราง `adAccounts`** — เก็บ plaintext อยู่ — ควร migrate ไปใช้ encryption เดียวกัน ในเฟสที่แยกออกไป (ไม่บังคับใน BM feature นี้ แต่แนะนำให้ทำ Round ต่อ)

---

### Q11. ใครเห็น/แก้ Token ได้บ้าง?

**Role matrix:**

| Role | ดูรายการ BM | ดู token plaintext | เพิ่ม/แก้/ลบ BM | Re-scan |
|---|---|---|---|---|
| **Owner** | ✅ | ✅ (กดปุ่ม "แสดง") | ✅ | ✅ |
| **CEO** | ✅ (read-only) | ❌ | ❌ | ✅ |
| **Content / Staff** | ❌ | ❌ | ❌ | ❌ |
| **Admin (platform)** | ✅ ทุก workspace | ❌ | ❌ | ❌ |

**Implementation:** ใช้ `ownerProcedure` (ทำไว้แล้วใน Round 7.22) สำหรับ mutate, `protectedProcedure` + role check สำหรับ read

---

### Q12. ถ้า Token รั่ว/leak จะ revoke ยังไง?

**ขั้นตอนใน UI:**
1. หน้า BM Detail → ปุ่ม **"Revoke Token"** (สีแดง) → confirm dialog
2. ระบบ **mark `isActive = false`** + clear `accessToken` ทันที (ไม่ลบ row)
3. แสดง instruction: "เข้า Business Settings → System Users → [ชื่อ user] → Generate New Token แล้วคลิก 'อัปเดต Token' ที่นี่"
4. AdAccount ภายใต้ BM นี้จะหยุด sync ทันที (cron job skip BM ที่ `isActive = false`)
5. Owner วาง token ใหม่ → ระบบ verify ผ่าน `/me/businesses` → activate ใหม่

**สำคัญ:** Meta ไม่มี endpoint ให้ app ภายนอก revoke token ของตัวเอง — Owner ต้องเข้า Business Settings ลบ System User เอง ระบบทำได้แค่ "หยุดใช้ token นั้นในระบบเรา"

**Audit trail:** บันทึก `bmDiscoveryLogs` action `token_revoked_at` + ส่ง notify ไป Owner + CEO ทุกครั้ง

---

## หมวด 5 — UX/UI

### Q13. หน้าจัดการ BM ควรอยู่ที่ไหน?

**แนะนำ: สร้าง section ใหม่ใน sidebar "Business Managers"** ใต้กลุ่ม "ตั้งค่า"

**โครงเมนูใหม่:**
```
📊 หน้าหลัก
📁 กลุ่มสินค้า
📈 บัญชีโฆษณา (เดี่ยว)
...
⚙ ตั้งค่า
   ├── Business Managers   ← ใหม่
   ├── บัญชีโฆษณา           ← เดิม (manual + ที่มาจาก BM)
   ├── กลุ่มสินค้า          
   ├── ผู้ใช้                
   └── โปรไฟล์              
```

**เหตุผล:**
- BM เป็นแหล่งที่มาของ AdAccount ระดับสูงกว่า → ควรมีหน้าเฉพาะ
- หน้า "บัญชีโฆษณา" เดิมยังอยู่ — แสดงทุก AdAccount (manual + auto) พร้อมคอลัมน์ "ที่มา" (BM name หรือ Manual)
- ไม่รวมกับ "บัญชีโฆษณา" เพราะจะรกและ UX สับสน

---

### Q14. แสดง list AdAccounts ภายใต้ BM ยังไง?

**แนะนำ: หน้า BM List + หน้า BM Detail แยก (drill-down pattern)**

**หน้า BM List `/settings/bm`:**
- ตาราง: ชื่อ BM, จำนวน AdAccount, sync ล่าสุด, สถานะ token, ปุ่ม "ดูรายละเอียด"

**หน้า BM Detail `/settings/bm/:id`:**
- Header: ชื่อ BM, BM ID, ปุ่ม "Re-scan ตอนนี้" / "Revoke Token" / "ตั้งค่า"
- Tab 1: **AdAccounts** — ตาราง expand แสดงทุก AdAccount พร้อม toggle excluded
- Tab 2: **ประวัติการ sync** — ตาราง `bmDiscoveryLogs`
- Tab 3: **ตั้งค่า** — กลุ่มสินค้า default / รอบ sync / autoSync on/off

**ไม่ใช้ nested table** ในหน้า BM List เพราะถ้ามี 5 BM × 10 AdAccount = ตาราง 50 แถว — ยาวเกินไป

---

### Q15. เพิ่ม BM แล้ว auto-discover เจอ 20 AdAccount แต่ user อยากแค่ 15 — UX?

**Wizard 3-step:**

**Step 1: ข้อมูล BM**
- ช่อง BM ID + System User Token
- ช่อง "ชื่อภายใน" (เช่น "I SURE PLUS BM")
- Dropdown "กลุ่มสินค้า default" (จะ tag AdAccount ใหม่เข้ากลุ่มนี้)
- ปุ่ม "ตรวจสอบ Token" (เหมือน Round 7.22) — ต้องผ่านก่อนกด Next

**Step 2: เลือก AdAccount** ⭐ จุดสำคัญ
- ระบบ scan → แสดงตาราง:
  ```
  [✓] act_1234567  I SURE PLUS Main    ACTIVE    USD   📊 มี Spend 7 วัน
  [✓] act_2345678  I SURE PLUS Reach   ACTIVE    USD   📊 มี Spend 7 วัน
  [ ] act_3456789  TEST Account        ACTIVE    USD   ⊘ ไม่มี Spend (น่าจะทดสอบ)
  [ ] act_4567890  Old Campaign        DISABLED  USD   ⚠ ปิดอยู่
  ```
- มี filter chip: "ทั้งหมด / Active เท่านั้น / มี spend / เริ่มต้นใหม่"
- ปุ่ม "เลือกทั้งหมด" / "ไม่เลือกเลย"
- แสดง badge "เลือกแล้ว 15/20"

**Step 3: ยืนยัน**
- สรุป: BM, กลุ่ม, จำนวน AdAccount ที่เลือก
- ปุ่ม "บันทึก & เริ่ม sync"

**เมื่อเสร็จ:** redirect ไปหน้า BM Detail พร้อม banner "เริ่ม sync แล้ว — ดูความคืบหน้าด้านล่าง"

---

## หมวด 6 — แผนการ Implement

### Q16. ฟีเจอร์นี้แบ่ง implement กี่ batch?

**แนะนำ 4 phases — ส่งแต่ละ phase ให้ Owner ตรวจก่อนไปต่อ:**

**Phase 1 — Backend foundation (ไม่กระทบ UI เดิม)**
- เพิ่ม 3 ตารางใหม่ใน schema + migration
- แก้ `adAccounts` เพิ่ม 2 column (`sourceBmId`, `isAutoDiscovered`)
- เพิ่ม `server/bmApi.ts` — helper: `listBusinesses`, `listOwnedAdAccounts`, `verifyBmToken`
- เพิ่ม token encryption helper (`server/encryption.ts`)
- เพิ่ม tRPC router `bm.list / bm.create / bm.verifyToken / bm.scan`
- vitest ครอบคลุม helper + router

**Phase 2 — UI Add BM Wizard + BM List**
- หน้า `/settings/bm` — list
- Wizard 3-step สำหรับ add BM (ตามด้านบน)
- หน้า `/settings/bm/:id` — detail (tab AdAccounts + Settings)
- Cross-link จาก /accounts → "ดู BM ของบัญชีนี้"

**Phase 3 — Auto-sync + Heartbeat integration**
- เพิ่ม heartbeat job `bm-daily-scan` (02:00)
- หน้า BM Detail tab "ประวัติการ sync"
- Progress dialog ตอนกด re-scan
- Alert integration: token expired / BM disabled

**Phase 4 — Migration + polish**
- หน้า "ลิงก์ AdAccount เดิมกับ BM"
- Encrypt existing tokens ใน `adAccounts` (optional)
- Help Center: เพิ่มหน้า "Business Managers" + glossary
- E2E test ผ่าน vitest

---

### Q17. ใช้เวลา implement ประมาณเท่าไหร่?

**ประเมินคร่าว ๆ (เป็นจำนวนรอบ tool/conversation):**

| Phase | งาน | รอบ |
|---|---|---|
| 1 | Backend foundation | ~ 4–6 รอบ |
| 2 | UI Wizard + List + Detail | ~ 6–8 รอบ |
| 3 | Heartbeat + progress + alert | ~ 3–5 รอบ |
| 4 | Migration + Help docs | ~ 3–4 รอบ |
| **รวม** | | **~ 16–23 รอบ** |

ส่ง checkpoint ต่อ phase → Owner review ได้ก่อนไปต่อ

---

### Q18. ต้องการอะไรจาก Owner ก่อนเริ่ม?

**สิ่งที่ต้องการ:**

1. **ตัวอย่าง BM 1 ตัวสำหรับทดสอบ** — ขอ:
   - BM ID (หา: Business Settings → Business Info → Business Manager ID)
   - System User Token (สร้าง: Business Settings → System Users → Generate New Token → เลือก scope `business_management`, `ads_read`, `ads_management` (optional))
   - **อย่าส่งใน chat โดยตรง** — เดี๋ยวเปิดช่องตั้งค่าใน UI ให้กรอกหลัง Phase 1 เสร็จ
2. **ยืนยัน scope** — ต้องการให้ Smart Scaling แก้ budget ผ่าน BM token ด้วยไหม? (ถ้า yes → ต้องขอ `ads_management`)
3. **กลุ่มสินค้าที่จะ map กับ BM แรก** — เช่น "I SURE PLUS BM" → กลุ่ม "I SURE PLUS"
4. **เลือก encryption strategy** — A (AES ใน app) หรือ B (Secret Manager)
5. **Confirm Phase boundaries** — โอเคไหมที่จะส่ง 4 phase ตามที่เสนอ

---

## สรุป Risk + Mitigation

| Risk | ผลกระทบ | Mitigation |
|---|---|---|
| Meta restrict BM (เกิดอยู่ตอนนี้) | sync ไม่ได้ทั้ง BM | classifyMetaError + banner แจ้ง + email Owner |
| Token รั่ว | คนนอกเข้าถึง Ad Account ได้ | AES-256 encrypt + role-based + revoke flow |
| Rate limit | sync ช้าหรือ fail | Batched + stagger + cache + backoff |
| AdAccount หายจาก BM | ข้อมูลในระบบไม่ตรง | mark `removed_from_bm` + ไม่ลบ data เก่า |
| User เพิ่ม AdAccount ใหม่ใน BM แต่ไม่ scan | ไม่เห็นในระบบ | daily auto-scan + ปุ่ม manual re-scan |
| Encryption key รั่ว | token ทั้งหมดถูก decrypt ได้ | เก็บ key ใน Manus secrets + rotate ทุก 6 เดือน |
| Owner ลาออก / บัญชี Meta ส่วนตัวถูก ban | token ส่วนตัวใช้ไม่ได้ | บังคับใช้ System User Token (ไม่ผูกบุคคล) |

---

## ขั้นต่อไป

**รอ Owner ตอบ:**
1. ✅ เห็นด้วยกับโครง schema ที่เสนอไหม? (3 ตารางใหม่ + แก้ adAccounts)
2. ✅ เห็นด้วยกับ UX wizard 3-step ไหม?
3. ✅ เลือก encryption A หรือ B?
4. ✅ Confirm 4 phases — เริ่ม Phase 1 ได้เลยไหม?
5. ❓ มีจุดไหนอยากให้ปรับก่อนเริ่ม?

> **หมายเหตุ:** จะไม่เริ่ม code จนกว่าจะได้ confirm จาก Owner ตามคำสั่งเดิม

# แผนสำรอง: Ad-Level Status Roll-up (รอปลด Meta Token)

> **สถานะเอกสาร:** แผน/เอกสารเตรียมไว้ — **ยังไม่ลงมือทำ**
> **เงื่อนไขเริ่มทำ:** ต่อเมื่อ verify แล้วพบว่า "ช่องโหว่เกิดจริง" (ดู Checklist Verify ข้อสุดท้าย)
> **วันที่ร่าง:** 11 มิ.ย. 2026

---

## 1. ปัญหาที่แผนนี้แก้ (Background)

ปัจจุบันระบบดึง `effective_status` **ที่ระดับ campaign เท่านั้น**:

- `server/metaApi.ts` → `fetchCampaignStatuses()` บรรทัด ~1321-1343
  - endpoint: `GET /{adAccountId}/campaigns?fields=id,name,effective_status`
  - คืนเฉพาะ `{ campaign_id, campaign_name, effective_status }`

**ช่องโหว่ที่สงสัย:** การถูกปฏิเสธ (disapprove) ใน Meta มักเกิดที่ **ระดับโฆษณา (ad)** ไม่ใช่ระดับแคมเปญ เมื่อ ad ย่อยถูกปฏิเสธ:
- `effective_status` ระดับ **ad** = `DISAPPROVED`
- `effective_status` ระดับ **campaign** (ที่เราดึง) **อาจยังเป็น `ACTIVE`**

→ ผลคือบนหน้าเว็บ Meta แสดง "ไม่ได้นำส่งอยู่ตอนนี้ / ข้อผิดพลาดของโฆษณา" แต่ระบบเราเห็นเป็น `ACTIVE` (เขียว) → **ปุ่มส่งคำขอ (เฟส 3B) ไม่ขึ้น** และคอลัมน์การแสดงโฆษณา (เฟส 3A) แสดงผิด

**⚠️ ข้อควรระวัง:** ยังไม่ยืนยันว่าช่องโหว่นี้เกิดจริง — เป็นไปได้ว่าเมื่อ ad ถูกปฏิเสธ Meta จะส่ง `effective_status` ระดับ campaign เป็น `WITH_ISSUES` ซึ่ง **เราครอบอยู่แล้ว** (อยู่ใน `REJECT_STATUSES`) ดังนั้น **ต้อง verify ก่อนเสมอ** ห้ามลงมือโดยไม่ verify

---

## 2. ความรู้ Meta API ที่เกี่ยวข้อง

### 2.1 effective_status แต่ละ level ต่างกัน
| Level | endpoint | ค่า reject ที่เป็นไปได้ |
|---|---|---|
| campaign | `/{adAccountId}/campaigns` | `WITH_ISSUES`, `CAMPAIGN_PAUSED` (ปกติ campaign ไม่ค่อยเป็น DISAPPROVED ตรงๆ) |
| adset | `/{adAccountId}/adsets` | `ADSET_DISAPPROVED`, `WITH_ISSUES` |
| **ad** | `/{adAccountId}/ads` | **`DISAPPROVED`**, `WITH_ISSUES`, `PENDING_REVIEW` |

### 2.2 field ที่ควรดึงระดับ ad
```
GET /{adAccountId}/ads
  ?fields=id,name,campaign_id,adset_id,effective_status,issues_info{level,error_code,error_summary,error_message}
  &limit=200
  &access_token=...
```
- `effective_status` (ad-level) → ค่าหลักในการตัดสิน
- `campaign_id` → ใช้ roll-up กลับไปที่ campaign
- `issues_info` → (เสริม) เก็บเหตุผลถูกปฏิเสธไว้แสดง tooltip ภายหลัง (optional ในเฟสนี้)

> หมายเหตุ: `ad_review_feedback` ต้องเรียกรายตัว (`/{adId}?fields=ad_review_feedback`) → แพง ไม่ควรดึงในรอบ sync ปกติ ใช้แค่ `issues_info` ที่มากับ list ก็พอ

---

## 3. แนวทางแก้: Roll-up ad → campaign

### 3.1 อัลกอริทึม roll-up (ฝั่ง server, pure function — unit test ได้)
```
สำหรับแต่ละ campaign:
  ดึง ads ทั้งหมดใน account → group by campaign_id
  rolledStatus(campaign) =
    ถ้ามี ad ใด ๆ classifyMetaStatus(ad.effective_status) === "reject"
      → "DISAPPROVED" (มาก่อนทุกอย่าง — reject ชนะ)
    else ถ้ามี ad ใด ๆ === "active"
      → "ACTIVE"
    else ถ้ามี ad ใด ๆ === "wait"
      → "PENDING_REVIEW"
    else
      → ใช้ค่า campaign-level เดิม (fallback)
```
**หลักการ:** "reject ชนะทุกสถานะ" — ถ้ามี ad แม้แต่ตัวเดียวถูกปฏิเสธ ให้ทั้ง campaign แสดง reject (ตรงกับที่ผู้ใช้เห็นบนหน้า Meta)

### 3.2 จุดแทรกโค้ด (ไม่ใช่การแก้ตอนนี้ — แค่ระบุตำแหน่ง)
| ไฟล์ | จุด | สิ่งที่ทำ |
|---|---|---|
| `server/metaApi.ts` | เพิ่ม `fetchAdStatuses(adAccountId, token)` ข้าง ๆ `fetchCampaignStatuses` (~บรรทัด 1321) | ดึง ad-level + คืน `{ ad_id, campaign_id, effective_status, issues_info? }[]` |
| `server/metaApi.ts` | เพิ่ม pure `rollUpAdStatusToCampaign(ads)` | คืน `Map<campaign_id, effective_status>` ตามอัลกอริทึม 3.1 |
| `server/deepAdsSync.ts` | บรรทัด ~112 (`Promise.all` ที่เรียก `fetchCampaignStatuses`) | เพิ่ม `fetchAdStatuses` แล้ว roll-up → override `cs.effective_status` ก่อนส่งเข้า `reconcileStatus` (บรรทัด ~130) |
| `server/campaignStatus.ts` | **ไม่ต้องแก้** `REJECT_STATUSES` / `classifyMetaStatus` | logic ครอบ DISAPPROVED/WITH_ISSUES อยู่แล้ว — roll-up แค่ป้อนค่าที่ถูกต้องเข้าไป |

> **จุดสำคัญ:** การแก้นี้เป็นการ "ป้อน effective_status ที่ถูกต้องกว่า" เข้า pipeline เดิม **ไม่แตะ reconcileStatus / REJECT_STATUSES / ปุ่มเฟส 3B** เลย → ความเสี่ยง regression ต่ำ

---

## 4. ต้อง migration เพิ่มไหม

**ไม่จำเป็นในเวอร์ชันขั้นต่ำ (MVP ของแผนนี้):**
- roll-up เกิดใน memory ระหว่าง sync แล้ว override `effectiveStatus` ที่เขียนลง `campaignStatus.effectiveStatus` (คอลัมน์เดิม schema.ts บรรทัด 497) → **ใช้คอลัมน์เดิมได้เลย ไม่ต้อง migrate**

**Optional (ถ้าต้องการเก็บรายละเอียด ad-level เพื่อแสดง tooltip เหตุผล):**
- เพิ่มคอลัมน์ `rejectReason varchar(512)` หรือตารางใหม่ `adStatus` (ad_id, campaign_id, effective_status, issues_json, syncedAt)
- → เป็นงานเพิ่ม ไม่อยู่ใน MVP แยกทำทีหลังได้

---

## 5. จัดการ Rate Limit (สำคัญ — งานนี้เสี่ยงสุด)

การดึง ads ทุกตัวต่อ account = request เพิ่มขึ้นมาก เสี่ยง Meta rate limit (error code 17 / 80004)

**มาตรการ (เรียงตามความสำคัญ):**
1. **ใช้ list endpoint ระดับ account เดียว** `/{adAccountId}/ads` (1 ชุด request แบบ paged) — **อย่า** วนเรียกรายแคมเปญ/ราย ad
2. **paged + limit 200** ใช้ `fetchAllPages(url, maxPages)` เดิม (จำกัด ~25 หน้า เหมือน `fetchCampaignStatuses`)
3. **filtering ที่ Meta**: ใส่ `filtering=[{field:"ad.effective_status",operator:"IN",value:["DISAPPROVED","WITH_ISSUES","PENDING_REVIEW"]}]` → ดึงเฉพาะ ad ที่ "ไม่ปกติ" ลดขนาด response มาก (ad ที่ ACTIVE ไม่ต้องดึง เพราะ campaign-level ครอบ active อยู่แล้ว)
4. **คงดีเลย์ต่อ account เดิม** ใน `syncAdInsightsForAccounts` (บรรทัด ~389 `sleep(delayMs)`)
5. **graceful degrade**: ถ้า `fetchAdStatuses` ล้มเหลว/timeout → คืน `[]` แล้ว fallback ใช้ค่า campaign-level เดิม (เหมือน pattern `fetchCampaignStatuses` บรรทัด 1337-1342) — **ห้าม throw**
6. (ถ้ายังหนัก) ดึง ad-level **เฉพาะรอบ sync รายชั่วโมง** ไม่ต้องทำในทุก trigger

---

## 6. กระทบเฟสไหนบ้าง

| เฟส | ผลกระทบ | ต้องทำอะไร |
|---|---|---|
| **3A คอลัมน์การแสดงโฆษณา** | ✅ ดีขึ้น — สี/ป้ายตรงกับ Meta จริงเมื่อ ad ถูก reject | ไม่ต้องแก้ UI (ใช้ effectiveStatus เดิม) |
| **3B ปุ่มส่งคำขอ** | ✅ ดีขึ้น — ปุ่มขึ้นถูกเคสมากขึ้น | ไม่ต้องแก้เงื่อนไขปุ่ม (อิง classifyMetaStatus เดิม) |
| **เฟส 11 ป้าย NEW/REJECT/WAIT** | ✅ ดีขึ้น — ป้าย reject แม่นขึ้น | ไม่ต้องแก้ — อิง effectiveStatus ที่ roll-up แล้ว |
| **เฟส 5 ถังขยะ (auto-reject 5 วัน)** | ⚠️ **ต้องระวัง** — ถ้า roll-up ทำให้ campaign เป็น reject มากขึ้น → แคมเปญถูกนับ rejectedAt และเข้าถังขยะอัตโนมัติเมื่อครบ 5 วันมากขึ้น | **verify ว่าเป็นพฤติกรรมที่ต้องการ** — ถ้าใช่ ไม่ต้องแก้ logic ถังขยะ (reconcileStatus จัดการให้แล้ว) |

**สรุปผลกระทบ:** แก้ที่ "ต้นน้ำ" (ป้อน effectiveStatus ที่ถูก) ทำให้ทุกเฟสปลายน้ำดีขึ้นพร้อมกันโดยไม่ต้องแก้ logic แต่ละเฟส **ยกเว้นต้องเฝ้าระวังเฟส 5** (auto-trash เร็วขึ้น)

---

## 7. Checklist เทสต์ตอน Verify (ทำทันทีที่ปลด token)

### 7.1 ⭐ ขั้นชี้ขาด — verify ว่าช่องโหว่เกิดจริงไหม
- [ ] หาแคมเปญที่ **ถูกปฏิเสธจริง 1 ตัว** (หน้าเว็บ Meta แสดง "ไม่ได้นำส่ง / ข้อผิดพลาดของโฆษณา")
- [ ] เรียก `GET /{adAccountId}/campaigns?fields=id,name,effective_status` ดูค่า **campaign-level** ที่ Meta ส่งกลับ:
  - **ถ้า = `ACTIVE`** → 🔴 **มีช่องโหว่จริง** → เริ่มทำตามแผนนี้
  - **ถ้า = `WITH_ISSUES` หรือ `DISAPPROVED`** → 🟢 **ไม่มีช่องโหว่** → **ไม่ต้องทำแผนนี้** (เราครอบอยู่แล้ว)
- [ ] (เสริม) เรียก `GET /{adAccountId}/ads?fields=id,campaign_id,effective_status,issues_info` ดูว่า ad-level ส่ง `DISAPPROVED` จริงไหม เพื่อยืนยันสมมติฐาน

### 7.2 ถ้าตัดสินใจทำ — เทสต์หลัง implement
- [ ] unit test `rollUpAdStatusToCampaign`: reject ชนะ active/wait/closed
- [ ] unit test: ทุก ad active → คง active
- [ ] unit test: ads ว่าง → fallback campaign-level เดิม
- [ ] regression: `reconcileStatus` / เฟส 3B / ถังขยะ tests เดิมยังผ่านครบ
- [ ] integration: account ที่มี ad ถูก reject → campaign แสดง reject + ปุ่มส่งคำขอขึ้น
- [ ] rate limit: account ใหญ่ (ad เยอะ) → ไม่ throttle, fallback graceful เมื่อ error

---

## 8. สรุป Decision Tree

```
ปลด token ได้
   │
   ├─ verify campaign-level ของแคมเปญที่ reject จริง
   │
   ├─ ค่า = WITH_ISSUES/DISAPPROVED ──→ ไม่ต้องทำแผนนี้ (ปิดเคส)
   │
   └─ ค่า = ACTIVE ──→ มีช่องโหว่ ──→ ทำตามแผน:
          1. fetchAdStatuses (filtering + paged + graceful)
          2. rollUpAdStatusToCampaign (pure)
          3. แทรกใน deepAdsSync override effectiveStatus
          4. unit + regression + rate limit test
          5. เฝ้าระวังเฟส 5 (auto-trash เร็วขึ้น)
```

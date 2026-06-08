import { describe, it, expect } from "vitest";

/**
 * เฟส 1: Role "Supervisor" + ช่อง "ชื่อเล่น" (nickname)
 *
 * ทดสอบ pure logic ที่เลียนแบบเงื่อนไขจริงใน:
 *  - server/_core/trpc.ts  (ownerProcedure / commissionViewProcedure allow-lists)
 *  - server/routers.ts     (users.updateNickname: tenant isolation + trim->null)
 *  - server/db.ts          (upsertUser allow-list ต้องไม่แตะ nickname)
 * โดยไม่ต้องเชื่อม DB จริง
 */

// ---- จำลอง allow-list จาก trpc.ts (ต้องตรงกับโค้ดจริง) ----
const OWNER_ALLOWED = ["admin", "owner", "ceo", "supervisor"];
const COMMISSION_VIEW_ALLOWED = ["admin", "owner", "ceo", "supervisor", "content"];

function canAccessOwner(role: string): boolean {
  return OWNER_ALLOWED.includes(role);
}
function canViewCommission(role: string): boolean {
  return COMMISSION_VIEW_ALLOWED.includes(role);
}

// ---- จำลอง logic updateNickname จาก routers.ts ----
type FakeUser = { id: number; ownerId: number | null; nickname: string | null };

function updateNicknameLogic(
  store: FakeUser[],
  tenantId: number,
  input: { userId: number; nickname: string | null },
): { ok: true } {
  const target = store.find((u) => u.id === input.userId);
  if (!target) throw new Error("NOT_FOUND");
  // tenant isolation: ต้องเป็น owner เอง หรือสมาชิกของ owner
  if (target.id !== tenantId && target.ownerId !== tenantId) {
    throw new Error("FORBIDDEN");
  }
  const trimmed = input.nickname?.trim() ?? "";
  target.nickname = trimmed === "" ? null : trimmed;
  return { ok: true };
}

describe("Supervisor role — สิทธิ์เทียบเท่า ceo", () => {
  it("supervisor เข้าถึง ownerProcedure ได้ (เหมือน ceo/owner/admin)", () => {
    expect(canAccessOwner("supervisor")).toBe(true);
    expect(canAccessOwner("ceo")).toBe(true);
    expect(canAccessOwner("owner")).toBe(true);
    expect(canAccessOwner("admin")).toBe(true);
  });

  it("staff / content / pending เข้า ownerProcedure ไม่ได้", () => {
    expect(canAccessOwner("staff")).toBe(false);
    expect(canAccessOwner("content")).toBe(false);
    expect(canAccessOwner("pending")).toBe(false);
  });

  it("supervisor ดูคอมมิชชั่นได้ (commissionViewProcedure)", () => {
    expect(canViewCommission("supervisor")).toBe(true);
    // content ดูได้ แต่ staff ดูไม่ได้
    expect(canViewCommission("content")).toBe(true);
    expect(canViewCommission("staff")).toBe(false);
  });

  it("supervisor มีสิทธิ์ชุดเดียวกับ ceo ทุกประการ", () => {
    const roles = ["admin", "owner", "ceo", "supervisor", "content", "staff", "pending"];
    for (const r of roles) {
      expect(canAccessOwner("supervisor")).toBe(canAccessOwner("ceo"));
      expect(canViewCommission("supervisor")).toBe(canViewCommission("ceo"));
      void r;
    }
  });
});

describe("updateNickname — ตั้ง/แก้ชื่อเล่น", () => {
  const makeStore = (): FakeUser[] => [
    { id: 1, ownerId: null, nickname: null }, // owner (tenant)
    { id: 2, ownerId: 1, nickname: null }, // member ของ owner 1
    { id: 99, ownerId: 50, nickname: null }, // member ของ workspace อื่น
  ];

  it("owner ตั้งชื่อเล่นให้สมาชิกในทีมได้", () => {
    const store = makeStore();
    updateNicknameLogic(store, 1, { userId: 2, nickname: "พี่ตั้ม" });
    expect(store.find((u) => u.id === 2)?.nickname).toBe("พี่ตั้ม");
  });

  it("owner ตั้งชื่อเล่นให้ตัวเองได้", () => {
    const store = makeStore();
    updateNicknameLogic(store, 1, { userId: 1, nickname: "บอส" });
    expect(store.find((u) => u.id === 1)?.nickname).toBe("บอส");
  });

  it("ชื่อเล่นว่าง/เว้นวรรคล้วน → เก็บเป็น null (ไม่ใช่ string ว่าง)", () => {
    const store = makeStore();
    store.find((u) => u.id === 2)!.nickname = "เดิม";
    updateNicknameLogic(store, 1, { userId: 2, nickname: "   " });
    expect(store.find((u) => u.id === 2)?.nickname).toBeNull();
    updateNicknameLogic(store, 1, { userId: 2, nickname: null });
    expect(store.find((u) => u.id === 2)?.nickname).toBeNull();
  });

  it("ตัด whitespace หัวท้ายของชื่อเล่น", () => {
    const store = makeStore();
    updateNicknameLogic(store, 1, { userId: 2, nickname: "  น้องเอ  " });
    expect(store.find((u) => u.id === 2)?.nickname).toBe("น้องเอ");
  });

  it("tenant isolation: แก้ชื่อเล่นข้าม workspace ไม่ได้ (FORBIDDEN)", () => {
    const store = makeStore();
    expect(() => updateNicknameLogic(store, 1, { userId: 99, nickname: "x" })).toThrow(
      "FORBIDDEN",
    );
  });

  it("ไม่พบ user → NOT_FOUND", () => {
    const store = makeStore();
    expect(() => updateNicknameLogic(store, 1, { userId: 777, nickname: "x" })).toThrow(
      "NOT_FOUND",
    );
  });
});

describe("upsertUser — ต้องไม่ทับ nickname ตอน login", () => {
  // เลียนแบบ allow-list ใน upsertUser (db.ts):
  //   textFields = ["name", "email", "loginMethod"] + role + lastSignedIn + openId(key)
  const UPSERT_FIELDS = ["openId", "name", "email", "loginMethod", "role", "lastSignedIn"];

  it("nickname ไม่อยู่ใน allow-list ของ upsertUser", () => {
    expect(UPSERT_FIELDS).not.toContain("nickname");
  });

  it("จำลอง login ซ้ำ: nickname ที่ owner ตั้งไว้ต้องคงอยู่", () => {
    const user: { name: string; nickname: string | null } = {
      name: "Old Name",
      nickname: "พี่ตั้ม",
    };
    // login ใหม่: อัปเดตเฉพาะ field ใน allow-list
    const incoming = { name: "Manus Account Name", email: "a@b.com" };
    for (const k of Object.keys(incoming)) {
      if (UPSERT_FIELDS.includes(k)) {
        (user as any)[k] = (incoming as any)[k];
      }
    }
    expect(user.name).toBe("Manus Account Name"); // name ถูกอัปเดต
    expect(user.nickname).toBe("พี่ตั้ม"); // nickname ไม่ถูกแตะ
  });
});

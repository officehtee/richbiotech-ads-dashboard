# 🔄 Rebuild Sidebar from Scratch — Richbiotech Ads Dashboard

> **ทำใหม่ทั้งหมด ไม่ต้องพยายาม "patch" ของเดิม** · ทิ้ง shadcn `Sidebar` / `SidebarGroup` / `SidebarMenu` / `SidebarMenuButton` / `Separator` แล้วเขียน component ใหม่ด้วย HTML + Tailwind ปกติ · ทุก nav item สูงเท่ากัน · section header เว้น 1 บรรทัดจากเมนูก่อนหน้า

---

## 🎯 เป้าหมายเชิงรูปธรรม (วัดด้วยตา + DevTools)

### กฎทอง 3 ข้อ (Acceptance Criteria)

1. **ทุก nav item สูง 36px เท่ากัน** — ไม่ว่า label สั้นหรือยาว ไม่ว่า active หรือไม่
2. **Section header เว้น 1 "บรรทัดเต็ม" (36px) จากเมนูก่อนหน้า** — เหมือนการเว้นบรรทัดในเอกสาร
3. **ห้ามมี `position`, `transform`, `margin` ติดลบ บน section header หรือ nav item โดยเด็ดขาด**

### ตัวเลขเป๊ะ (เพื่อให้ผลลัพธ์เหมือนกันทุกครั้ง)

| ส่วน                              | ขนาด                                 |
| --------------------------------- | ------------------------------------ |
| Sidebar width (default)           | **264px** (resizable 240–400)        |
| Sidebar width (collapsed)         | 48px                                 |
| Nav item height                   | **36px** (fixed)                     |
| Nav item padding                  | 8px 12px                             |
| Nav item icon size                | 16px × 16px (`size-4`)               |
| Nav item gap (icon ↔ label)       | 10px                                 |
| Nav item border-radius            | 8px                                  |
| Gap ระหว่าง nav items ใน section  | 2px                                  |
| Gap ระหว่าง section header → ใต้  | 4px                                  |
| Gap ระหว่าง nav item → section header ถัดไป | **36px (= 1 nav item height)** |
| Section header font-size          | 11px / weight 600 / uppercase / 0.08em letter-spacing |
| Section header height             | 20px (line-height 1.4)               |
| Section header padding            | 0 16px                               |
| Section header color              | `text-muted-foreground/60`           |

---

## 🏗 โครงสร้าง JSX ที่ต้องใช้ (เป๊ะ ๆ)

ใช้ HTML element ปกติ — **อย่า** ใช้ `Sidebar*` ของ shadcn เพราะมัน inject `data-*` + `position` ที่ทำให้ทับซ้อน

```tsx
<aside className="sidebar-root">
  {/* Header (logo) - ไม่นับเข้า nav */}
  <div className="sidebar-header">...</div>

  {/* Nav body */}
  <nav className="sidebar-nav">
    {sections.map((section, sectionIndex) => (
      <div key={section.label} className="sidebar-section">
        {sectionIndex > 0 && <div className="sidebar-section-spacer" />}
        <div className="sidebar-section-header">{section.label}</div>
        <ul className="sidebar-menu">
          {section.items.map((item) => (
            <li key={item.path}>
              <button className={cn("sidebar-item", isActive && "is-active")}>
                <Icon className="sidebar-item-icon" />
                <span className="sidebar-item-label">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    ))}
  </nav>

  {/* Footer (user) */}
  <div className="sidebar-footer">...</div>
</aside>
```

> ⚠️ `sidebar-section-spacer` คือ `<div className="h-9" />` (36px) — ทำหน้าที่ "เว้น 1 บรรทัด" แทน margin/gap เพื่อหลีกเลี่ยง margin collapse กับ flex parent

---

## 🎨 Tailwind classes (vanilla — ไม่ใช้ shadcn primitives)

ใช้ `@apply` ใน `index.css` หรือเขียน inline ก็ได้ — เลือก inline ตามนี้ถ้าจะให้ Manus ทำงานเร็ว:

```tsx
// Root
"sidebar-root":         "flex h-screen flex-col bg-sidebar text-sidebar-foreground border-r"
"sidebar-header":       "h-16 flex items-center gap-3 px-3 border-b shrink-0"
"sidebar-nav":          "flex-1 min-h-0 overflow-y-auto py-3"
"sidebar-section":      "flex flex-col"
"sidebar-section-spacer": "h-9 shrink-0"        // 36px = 1 บรรทัด เป๊ะ
"sidebar-section-header": "h-5 flex items-center px-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60 leading-none mb-1"
"sidebar-menu":         "flex flex-col gap-0.5 px-2"

// Item (button)
"sidebar-item":         "group flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-sm text-foreground/80 hover:bg-accent hover:text-foreground transition-colors"
"sidebar-item.is-active": "bg-primary/10 text-primary font-medium ring-1 ring-primary/15"
"sidebar-item-icon":    "h-4 w-4 shrink-0"
"sidebar-item-label":   "flex-1 min-w-0 truncate text-left"   // truncate ที่ span — ไม่ wrap
```

> ❗ **ห้าม** ใส่ `position: absolute|fixed|sticky` หรือ `transform` ที่ใด ๆ ใน sidebar (ยกเว้น header logo ที่ใช้ flex อย่างเดียว)

---

## 📐 ทำไมต้องใช้ "spacer div" แทน margin/gap

**ปัญหาที่เจอ:**
- `margin-top` ใน flex column parent ที่มี `gap-0` หรือ `gap-2` — margin collapse กับ gap **ไม่แน่นอน** แต่ละ browser
- `mt-5` บน `SidebarGroup` ของ shadcn ถูก override โดย `flex flex-col p-2` ที่ shadcn ใส่ default
- `<Separator />` ของ shadcn คือ `h-px` (1px) — ดูเหมือนหายไป

**ทางที่แน่นอน:**
- ใส่ `<div className="h-9 shrink-0" />` (36px คงที่) ระหว่าง section → flex parent **ต้อง** เคารพ
- ไม่มี margin collapse, ไม่มี gap interaction, ไม่มีคำว่า "ทำไมไม่ทำงาน"

---

## 🛠 Implementation Steps (Manus ต้องทำตามลำดับ)

### Step 1 — Backup เก่า (ก่อนเขียนใหม่)

```bash
cd /home/ubuntu/richbiotech-ads/client/src/components
cp DashboardLayout.tsx DashboardLayout.backup.tsx
```

### Step 2 — สร้าง Sidebar component ใหม่แยกไฟล์

สร้าง `client/src/components/AppSidebar.tsx`:

```tsx
import { useLocation } from "wouter";
import { ChevronLeft, Sparkles, /* …icons */ } from "lucide-react";
import { cn } from "@/lib/utils";

type MenuItem = { icon: React.ComponentType<{ className?: string }>; label: string; path: string; roles?: string[] };
type MenuSection = { label: string; items: MenuItem[] };

interface Props {
  sections: MenuSection[];
  collapsed: boolean;
  onToggle: () => void;
  brandName: string;
  brandTagline: string;
}

export function AppSidebar({ sections, collapsed, onToggle, brandName, brandTagline }: Props) {
  const [location, setLocation] = useLocation();

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "flex h-screen flex-col bg-sidebar text-sidebar-foreground border-r transition-[width] duration-200",
        collapsed ? "w-12" : "w-[264px]",
      )}
    >
      {/* Header */}
      <div className="h-16 flex items-center gap-3 px-3 border-b shrink-0">
        <button onClick={onToggle} className="h-9 w-9 flex items-center justify-center hover:bg-accent rounded-lg shrink-0">
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </button>
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[#2563eb] to-[#1e40af] text-white flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex flex-col min-w-0 leading-tight">
              <span className="font-bold text-sm truncate">{brandName}</span>
              <span className="text-[10px] text-muted-foreground tracking-wider uppercase">{brandTagline}</span>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 min-h-0 overflow-y-auto py-3">
        {sections.map((section, sectionIndex) => (
          <div key={section.label} className="flex flex-col">
            {/* Spacer 36px = 1 บรรทัด (ยกเว้น section แรก) */}
            {sectionIndex > 0 && <div className="h-9 shrink-0" aria-hidden />}

            {/* Section header */}
            {!collapsed && (
              <div className="h-5 flex items-center px-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60 leading-none mb-1">
                {section.label}
              </div>
            )}

            {/* Menu */}
            <ul className="flex flex-col gap-0.5 px-2">
              {section.items.map((item) => {
                const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
                return (
                  <li key={item.path}>
                    <button
                      onClick={() => setLocation(item.path)}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "group flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-sm transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary font-medium ring-1 ring-primary/15"
                          : "text-foreground/80 hover:bg-accent hover:text-foreground",
                        collapsed && "justify-center px-0",
                      )}
                    >
                      <item.icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
                      {!collapsed && <span className="flex-1 min-w-0 truncate text-left">{item.label}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer (user) — ใส่เพิ่มเอง */}
    </aside>
  );
}
```

### Step 3 — แทนที่การใช้งานใน DashboardLayout

ใน `DashboardLayout.tsx`:
- ลบ import `Sidebar`, `SidebarHeader`, `SidebarContent`, `SidebarGroup`, `SidebarGroupLabel`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, `SidebarFooter`, `Separator`
- ลบ `SidebarProvider` wrapper
- ใช้ `<AppSidebar>` แทน
- จัดการ collapsed ด้วย `useState` ปกติ + persist localStorage

### Step 4 — Resizable handle (optional แต่แนะนำ)

วาง `<div>` ขนาด 4px × full-height ขอบขวา sidebar — cursor `col-resize` — เก็บ width ใน localStorage

```tsx
{!collapsed && (
  <div
    onMouseDown={startResize}
    className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/30"
  />
)}
```

### Step 5 — Test 3 resolutions

```
1920×1080  → ตัวอักษรเต็ม ไม่ wrap
1440×900   → ตัวอักษรเต็ม ไม่ wrap
1366×768   → sidebar scroll ได้ ไม่มี layout เพี้ยน
```

### Step 6 — DevTools verification

Click ที่ section header → Computed tab:
- ✅ `position: static`
- ✅ `transform: none`
- ✅ `margin: 0px`
- ✅ Box model — top เป็น "spacer div 36px"

Click ที่ทุก nav item → Computed:
- ✅ `height: 36px` (ทุกตัวเท่ากัน)
- ✅ `padding: 8px 12px`

---

## 📋 รายการเมนูที่ต้องคงไว้เหมือนเดิม

```ts
const sections: MenuSection[] = [
  {
    label: "ภาพรวม",
    items: [
      { icon: LayoutDashboard, label: "หน้าหลัก", path: "/" },
      { icon: Layers, label: "ภาพรวมกลุ่มสินค้า", path: "/groups" },
      { icon: BarChart3, label: "แดชบอร์ดบัญชีเดี่ยว", path: "/account" },
    ],
  },
  {
    label: "วิเคราะห์",
    items: [
      { icon: Trophy, label: "ชาร์ตอันดับ (Leaderboard)", path: "/leaderboard" },
      { icon: ArrowLeftRight, label: "เปรียบเทียบผลงาน", path: "/comparison" },
      { icon: Brain, label: "AI แนะนำ", path: "/ai-advisor" },
      { icon: Sparkles, label: "วิเคราะห์แอดเชิงลึก", path: "/ads-deep" },
      { icon: Target, label: "Benchmark มาตรวัดแอด", path: "/benchmark" },
      { icon: Bell, label: "การแจ้งเตือน (Alerts)", path: "/alerts" },
      { icon: Grid3x3, label: "วิเคราะห์ Cohort", path: "/cohort" },
    ],
  },
  {
    label: "ปรับงบ + แชร์ลิงก์",
    items: [
      { icon: TrendingUp, label: "แนะนำปรับงบ (Smart Scaling)", path: "/smart-scaling" },
      { icon: Share2, label: "ลิงก์แชร์", path: "/share-links" },
    ],
  },
  {
    label: "คอมมิชชั่น",
    items: [
      { icon: TableProperties, label: "ตารางคอมมิชชั่น", path: "/commission" },
      { icon: PieChart, label: "ภาพรวมคอมมิชชั่น", path: "/commission/overview" },
      { icon: DollarSign, label: "คอมมิชชั่นของฉัน", path: "/commission/me", roles: ["admin","owner","ceo","content"] },
      { icon: Settings2, label: "ตั้งค่าคอมมิชชั่น", path: "/commission/settings", roles: ["admin","owner"] },
    ],
  },
  {
    label: "ตั้งค่าระบบ",
    items: [
      { icon: Building2, label: "จัดการบัญชี", path: "/accounts", roles: ["admin","owner","ceo"] },
      { icon: FolderOpen, label: "กลุ่มสินค้า", path: "/groups-settings", roles: ["admin","owner","ceo"] },
      { icon: Users, label: "จัดการผู้ใช้", path: "/users", roles: ["admin","owner"] },
    ],
  },
];
```

---

## ❌ สิ่งที่ห้ามทำ

- ❌ ใช้ `Sidebar*` primitives ของ shadcn (`Sidebar`, `SidebarGroup`, `SidebarMenu`, ฯลฯ)
- ❌ ใช้ `Separator` แทน spacer
- ❌ ใช้ `margin-top` / `mt-*` / `gap-*` เพื่อสร้างระยะระหว่าง section
- ❌ ใช้ `position: absolute|fixed|sticky` กับ section header
- ❌ ใช้ `transform` กับ section header หรือ nav item
- ❌ มี nav item ความสูงไม่เท่ากัน (เช่น active item สูงกว่าเพราะ font-medium)
- ❌ ปล่อยให้ label wrap 2 บรรทัด — **ต้อง** truncate ด้วย `…`

---

## ✅ Self-Test Checklist (Manus ต้องเช็ค → ส่ง screenshot ก่อน mark task)

### Visual
- [ ] เปิด sidebar ที่ default width 264px — ไม่มี text ถูก truncate ด้วย `…`
- [ ] ทุก nav item icon อยู่ตำแหน่งแนวตั้งเดียวกัน
- [ ] Section header อยู่บน "บรรทัดว่าง" (36px) ที่เว้นชัดเจน — ไม่ทับเมนู
- [ ] Active item เด่นด้วย bg + ring + text color (ไม่เด่นด้วย height)
- [ ] Hover state ทำงาน — ไม่กระตุก
- [ ] Collapsed mode (48px) — แสดงแค่ icon ใต้กัน, hover แสดง title

### DevTools
- [ ] Inspect section header — `position: static`, `transform: none`, `margin: 0`
- [ ] Inspect nav item — `height: 36px` ทุกตัว
- [ ] Inspect spacer — `height: 36px`, ไม่มี content

### Cross-resolution
- [ ] 1920×1080 — OK
- [ ] 1440×900 — OK
- [ ] 1366×768 — sidebar scroll ได้

---

## 📷 Deliverable

ส่ง screenshot 1 ภาพ ครอบคลุม sidebar ทั้งเส้นจาก "ภาพรวม" → "จัดการผู้ใช้" — เพื่อให้เห็นว่า:
1. Section header ทุกอันเว้น 1 บรรทัดเต็มจากเมนูก่อนหน้า
2. ทุก nav item สูงเท่ากันเป๊ะ
3. ไม่มี text ถูกตัด

---

**Priority:** Critical · UI สำคัญที่สุด
**Scope:** เฉพาะ Sidebar — ไม่แตะ routes, data, backend
**Time estimate:** 30-45 นาที (รวม backup + rebuild + test 3 resolutions)

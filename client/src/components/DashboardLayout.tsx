import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/contexts/ThemeContext";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  Brain,
  Building2,
  Grid3x3,
  DollarSign,
  Folder,
  Gauge,
  Laptop,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  Moon,
  Settings as SettingsIcon,
  Share2,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
  Trophy,
  User as UserIcon,
  Users,
  HelpCircle,
  Wallet,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import AlertBell from "./AlertBell";
import BmBlockedBanner from "./BmBlockedBanner";
import { AppSidebar, type SidebarSection } from "./AppSidebar";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

const ALL_ROLES = ["admin", "owner", "ceo", "supervisor", "content", "staff"];
const OWNER_ROLES = ["admin", "owner", "ceo", "supervisor"];
const COMMISSION_VIEW_ROLES = ["admin", "owner", "ceo", "supervisor", "content"];
// Phase 4: ถังขยะ — ทุก role ยกเว้น content
const NON_CONTENT_ROLES = ["admin", "owner", "ceo", "supervisor", "staff"];

const menuSections: SidebarSection[] = [
  {
    label: "ภาพรวม",
    items: [
      { icon: LayoutDashboard, label: "หน้าหลัก", path: "/", roles: ALL_ROLES },
      { icon: Layers, label: "ภาพรวมกลุ่มสินค้า", path: "/group-overview", roles: ALL_ROLES },
      { icon: BarChart3, label: "แดชบอร์ดบัญชีเดี่ยว", path: "/dashboard", roles: ALL_ROLES },
    ],
  },
  {
    label: "วิเคราะห์",
    items: [
      { icon: Trophy, label: "ชาร์ตอันดับ", path: "/leaderboard", roles: ALL_ROLES },
      { icon: ArrowLeftRight, label: "เปรียบเทียบผลงาน", path: "/comparison", roles: ALL_ROLES },
      { icon: Brain, label: "AI แนะนำ", path: "/ai-advisor", roles: ALL_ROLES },
      { icon: Sparkles, label: "วิเคราะห์แอดเชิงลึก", path: "/ad-intelligence", roles: ALL_ROLES },
      { icon: Target, label: "Benchmark มาตรวัดแอด", path: "/ad-metric-benchmark", roles: ALL_ROLES },
      { icon: Bell, label: "การแจ้งเตือน", path: "/alerts", roles: ALL_ROLES },
      { icon: Grid3x3, label: "วิเคราะห์ Cohort", path: "/cohort", roles: ALL_ROLES },
    ],
  },
  {
    label: "ปรับงบ + แชร์ลิงก์",
    items: [
      { icon: TrendingUp, label: "แนะนำปรับงบ", path: "/smart-scaling", roles: ALL_ROLES },
      { icon: Share2, label: "ลิงก์แชร์", path: "/share-links", roles: OWNER_ROLES },
    ],
  },
  {
    label: "คอมมิชชั่น",
    items: [
      { icon: Wallet, label: "ตารางคอมมิชชั่น", path: "/commission", roles: COMMISSION_VIEW_ROLES },
      { icon: Gauge, label: "ภาพรวมคอมมิชชั่น", path: "/commission/dashboard", roles: COMMISSION_VIEW_ROLES },
      { icon: DollarSign, label: "คอมมิชชั่นของฉัน", path: "/commission/personal", roles: ALL_ROLES },
      { icon: SettingsIcon, label: "ตั้งค่าคอมมิชชั่น", path: "/commission/settings", roles: OWNER_ROLES },
    ],
  },
  {
    label: "ตั้งค่าระบบ",
    items: [
      { icon: Building2, label: "จัดการบัญชี", path: "/accounts", roles: OWNER_ROLES },
      { icon: Folder, label: "กลุ่มสินค้า", path: "/groups", roles: OWNER_ROLES },
      { icon: Users, label: "จัดการผู้ใช้", path: "/users", roles: OWNER_ROLES },
      { icon: Trash2, label: "ถังขยะ", path: "/trash", roles: NON_CONTENT_ROLES },
    ],
  },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";
const DEFAULT_WIDTH = 264;
const MIN_WIDTH = 240;
const MAX_WIDTH = 400;

const BRAND_NAME = "Richbiotech";
const BRAND_TAGLINE = "Ads Dashboard";

const roleLabel: Record<string, string> = {
  admin: "Platform Admin",
  owner: "เจ้าของ",
  ceo: "Co-Owner",
  supervisor: "Supervisor",
  content: "ทีมคอนเทนต์",
  staff: "พนักงาน",
  pending: "รอ approve",
  user: "ผู้ใช้",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const { theme, preference, setPreference, toggleTheme } = useTheme();

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_WIDTH;
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    const parsed = saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
    return Math.max(Math.min(parsed, MAX_WIDTH), MIN_WIDTH);
  });

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  });

  // มือถือ: sidebar overlay
  const [mobileOpen, setMobileOpen] = useState(false);

  const [isResizing, setIsResizing] = useState(false);
  const widthRef = useRef(sidebarWidth);
  widthRef.current = sidebarWidth;

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  // ปิด mobile overlay เวลาเปลี่ยนหน้า
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  // Resize handler
  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(Math.min(e.clientX, MAX_WIDTH), MIN_WIDTH);
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-background to-accent/30">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-4">
            <img
              src="/manus-storage/logo_329a1fce.png"
              alt={BRAND_NAME}
              className="h-16 w-16 rounded-2xl object-contain shadow-xl"
            />
            <div className="text-center">
              <h1 className="text-2xl font-semibold tracking-tight">
                {BRAND_NAME} {BRAND_TAGLINE}
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                เข้าสู่ระบบเพื่อใช้งาน Dashboard
              </p>
            </div>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            เข้าสู่ระบบ
          </Button>
        </div>
      </div>
    );
  }

  const role = (user.role ?? "user") as string;
  const visibleSections = menuSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.roles || item.roles.includes(role)),
    }))
    .filter((section) => section.items.length > 0);

  const allItems = visibleSections.flatMap((s) => s.items);
  const activeMenuItem =
    allItems.find((item) => location === item.path) ??
    allItems.find((item) => item.path !== "/" && location.startsWith(item.path));

  // Footer: avatar + dropdown
  const sidebarFooter = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex items-center gap-3 rounded-lg px-1.5 py-1.5 hover:bg-white/10 transition-colors w-full text-left ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <Avatar className="h-9 w-9 border border-slate-700 shrink-0">
            <AvatarFallback className="text-xs font-medium bg-white/10 text-white">
              {user.name?.charAt(0).toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate leading-none text-white">
                {user.name || "-"}
              </p>
              <p className="text-xs text-slate-400 truncate mt-1">
                {roleLabel[role] ?? role}
              </p>
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          onClick={() => setLocation("/profile")}
          className="cursor-pointer"
        >
          <UserIcon className="mr-2 h-4 w-4" />
          <span>โปรไฟล์</span>
        </DropdownMenuItem>
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          ธีม
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={preference}
          onValueChange={(v) => setPreference(v as "light" | "dark" | "system")}
        >
          <DropdownMenuRadioItem value="light" className="cursor-pointer">
            <Sun className="mr-2 h-4 w-4" />
            <span>สว่าง</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark" className="cursor-pointer">
            <Moon className="mr-2 h-4 w-4" />
            <span>มืด</span>
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system" className="cursor-pointer">
            <Laptop className="mr-2 h-4 w-4" />
            <span>ตามระบบ</span>
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={logout}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>ออกจากระบบ</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // ===== Mobile =====
  if (isMobile) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        {/* Mobile Top Bar */}
        <div className="flex h-14 items-center justify-between border-b bg-background/95 px-3 backdrop-blur sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-accent"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
            <span className="font-medium text-foreground truncate">
              {activeMenuItem?.label ?? BRAND_NAME}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <AlertBell />
            <Link href="/help">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                title="คู่มือการใช้งาน"
                aria-label="คู่มือการใช้งาน"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Overlay Sidebar */}
        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 z-50 shadow-2xl">
              <AppSidebar
                sections={visibleSections}
                collapsed={false}
                onToggle={() => setMobileOpen(false)}
                currentPath={location}
                onNavigate={(p) => {
                  setLocation(p);
                  setMobileOpen(false);
                }}
                brandName={BRAND_NAME}
                brandTagline={BRAND_TAGLINE}
                footer={sidebarFooter}
                width={288}
              />
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="absolute top-3 right-3 h-9 w-9 flex items-center justify-center rounded-lg bg-background/80 hover:bg-accent z-10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </>
        )}

        <main className="flex-1 p-4">
          <BmBlockedBanner />
          {children}
        </main>
      </div>
    );
  }

  // ===== Desktop =====
  return (
    <div className="flex min-h-screen bg-background">
      <div className="sticky top-0 h-screen self-start shrink-0 z-40">
      <AppSidebar
        sections={visibleSections}
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        currentPath={location}
        onNavigate={setLocation}
        brandName={BRAND_NAME}
        brandTagline={BRAND_TAGLINE}
        footer={sidebarFooter}
        width={sidebarWidth}
        onResizeMouseDown={() => setIsResizing(true)}
      />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="flex h-12 items-center justify-end gap-1 border-b bg-background/95 px-4 sticky top-0 z-30">
          <AlertBell />
          <Link href="/help">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              title="คู่มือการใช้งาน"
              aria-label="คู่มือการใช้งาน"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9"
            title="สลับธีม"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </div>
        <main className="flex-1 p-4 md:p-6 overflow-x-auto">
          <BmBlockedBanner />
          {children}
        </main>
      </div>
    </div>
  );
}

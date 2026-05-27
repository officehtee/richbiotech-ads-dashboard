import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
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
  ChevronRight,
  DollarSign,
  Folder,
  Gauge,
  Layers,
  LayoutDashboard,
  LogOut,
  Moon,
  PanelLeft,
  Settings as SettingsIcon,
  Share2,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
  Trophy,
  User as UserIcon,
  Users,
  Wallet,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import AlertBell from "./AlertBell";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

type MenuItem = {
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
  roles?: string[]; // if undefined, accessible to everyone
};

type MenuSection = {
  label: string;
  items: MenuItem[];
};

const ALL_ROLES = ["admin", "owner", "ceo", "content", "staff"];
const OWNER_ROLES = ["admin", "owner", "ceo"];
const COMMISSION_VIEW_ROLES = ["admin", "owner", "ceo", "content"];

const menuSections: MenuSection[] = [
  {
    label: "ภาพรวม",
    items: [
      { icon: LayoutDashboard, label: "Hub Dashboard", path: "/", roles: ALL_ROLES },
      { icon: Layers, label: "ภาพรวมกลุ่มสินค้า", path: "/group-overview", roles: ALL_ROLES },
      { icon: BarChart3, label: "แดชบอร์ดเดี่ยว", path: "/dashboard", roles: ALL_ROLES },
    ],
  },
  {
    label: "วิเคราะห์",
    items: [
      { icon: Trophy, label: "Leaderboard", path: "/leaderboard", roles: ALL_ROLES },
      { icon: ArrowLeftRight, label: "Performance Comparison", path: "/comparison", roles: ALL_ROLES },
      { icon: Brain, label: "AI Advisor", path: "/ai-advisor", roles: ALL_ROLES },
      { icon: Sparkles, label: "Ad Intelligence", path: "/ad-intelligence", roles: ALL_ROLES },
      { icon: Target, label: "Ad Metric Benchmark", path: "/ad-metric-benchmark", roles: ALL_ROLES },
      { icon: Bell, label: "Alerts & ตั้งค่า", path: "/alerts", roles: ALL_ROLES },
      { icon: Grid3x3, label: "Cohort Analysis", path: "/cohort", roles: ALL_ROLES },
    ],
  },
  {
    label: "ปรับงบ + แชร์",
    items: [
      { icon: TrendingUp, label: "Smart Scaling", path: "/smart-scaling", roles: ALL_ROLES },
      { icon: Share2, label: "Share Links", path: "/share-links", roles: OWNER_ROLES },
    ],
  },
  {
    label: "Commission",
    items: [
      { icon: Wallet, label: "Commission Table", path: "/commission", roles: COMMISSION_VIEW_ROLES },
      { icon: Gauge, label: "Overview", path: "/commission/dashboard", roles: COMMISSION_VIEW_ROLES },
      { icon: DollarSign, label: "My Commission", path: "/commission/personal", roles: ALL_ROLES },
      { icon: SettingsIcon, label: "Commission Settings", path: "/commission/settings", roles: OWNER_ROLES },
    ],
  },
  {
    label: "Settings",
    items: [
      { icon: Building2, label: "จัดการบัญชี", path: "/accounts", roles: OWNER_ROLES },
      { icon: Folder, label: "กลุ่มสินค้า", path: "/groups", roles: OWNER_ROLES },
      { icon: Users, label: "จัดการผู้ใช้", path: "/users", roles: OWNER_ROLES },
    ],
  },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 264;
const MIN_WIDTH = 220;
const MAX_WIDTH = 400;

const BRAND_NAME = "Richbiotech";
const BRAND_TAGLINE = "Ads Dashboard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-background to-accent/30">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20">
              <Sparkles className="h-7 w-7" />
            </div>
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

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { theme, toggleTheme } = useTheme();

  const role = (user?.role ?? "user") as string;

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

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };
    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const roleLabel: Record<string, string> = {
    admin: "Platform Admin",
    owner: "เจ้าของ",
    ceo: "Co-Owner",
    content: "ทีมคอนเทนต์",
    staff: "พนักงาน",
    pending: "รอ approve",
    user: "ผู้ใช้",
  };

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center border-b">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-9 w-9 flex items-center justify-center hover:bg-accent rounded-lg transition-colors shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-sm">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col min-w-0 leading-tight">
                    <span className="font-semibold tracking-tight truncate text-sm">
                      {BRAND_NAME}
                    </span>
                    <span className="text-[10px] text-muted-foreground tracking-wider uppercase">
                      {BRAND_TAGLINE}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            {visibleSections.map((section) => (
              <SidebarGroup key={section.label} className="py-1">
                {!isCollapsed && (
                  <SidebarGroupLabel className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground/70 px-3">
                    {section.label}
                  </SidebarGroupLabel>
                )}
                <SidebarMenu className="px-2">
                  {section.items.map((item) => {
                    const isActive =
                      location === item.path ||
                      (item.path !== "/" && location.startsWith(item.path));
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(item.path)}
                          tooltip={item.label}
                          className="h-9 transition-all"
                        >
                          <item.icon
                            className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                          />
                          <span className="text-sm">{item.label}</span>
                          {isActive && !isCollapsed && (
                            <ChevronRight className="ml-auto h-3.5 w-3.5 text-primary" />
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroup>
            ))}
          </SidebarContent>

          <SidebarFooter className="p-3 border-t">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1.5 py-1.5 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                      {user?.name?.charAt(0).toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {roleLabel[role] ?? role}
                    </p>
                  </div>
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
                <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
                  {theme === "dark" ? (
                    <Sun className="mr-2 h-4 w-4" />
                  ) : (
                    <Moon className="mr-2 h-4 w-4" />
                  )}
                  <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                </DropdownMenuItem>
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
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/30 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile ? (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg" />
              <span className="font-medium text-foreground">
                {activeMenuItem?.label ?? BRAND_NAME}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <AlertBell />
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
        ) : (
          <div className="flex border-b h-12 items-center justify-end gap-1 bg-background/95 px-4 sticky top-0 z-30">
            <AlertBell />
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
        )}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </>
  );
}

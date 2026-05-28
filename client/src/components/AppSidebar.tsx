import { cn } from "@/lib/utils";
import { ChevronLeft, PanelLeft } from "lucide-react";
import type React from "react";

export type SidebarMenuItem = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  roles?: string[];
};

export type SidebarSection = {
  label: string;
  items: SidebarMenuItem[];
};

const LOGO_URL = "/manus-storage/logo_329a1fce.png";

interface AppSidebarProps {
  sections: SidebarSection[];
  collapsed: boolean;
  onToggle: () => void;
  currentPath: string;
  onNavigate: (path: string) => void;
  brandName: string;
  brandTagline: string;
  footer?: React.ReactNode;
  width?: number;
  onResizeMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

/**
 * AppSidebar — Sidebar ที่ทำใหม่จากศูนย์ (เลิกใช้ shadcn Sidebar primitives)
 *
 * กฎทอง 3 ข้อ:
 *  1. ทุก nav item สูง 36px (h-9) เป๊ะ ไม่ว่า active หรือ label ยาว
 *  2. Section header เว้น 1 บรรทัดเต็ม (36px) จากเมนูก่อนหน้า ด้วย <Spacer h-9 />
 *  3. ห้าม position/transform/margin ติดลบ
 */
export function AppSidebar({
  sections,
  collapsed,
  onToggle,
  currentPath,
  onNavigate,
  brandName,
  brandTagline,
  footer,
  width,
  onResizeMouseDown,
}: AppSidebarProps) {
  const expandedWidth = width ?? 264;

  return (
    <aside
      data-collapsed={collapsed}
      style={{
        width: collapsed ? 48 : expandedWidth,
      }}
      className={cn(
        "relative flex h-screen flex-col border-r border-slate-800 bg-[#0f172a] text-white shrink-0",
        "transition-[width] duration-200 ease-out",
      )}
    >
      {/* Header */}
      <div className="h-16 flex items-center gap-2 px-2 border-b border-slate-800 shrink-0">
        <button
          type="button"
          onClick={onToggle}
          aria-label="Toggle navigation"
          className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors shrink-0"
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <img
              src={LOGO_URL}
              alt={brandName}
              className="h-9 w-9 rounded-lg object-contain shrink-0"
            />
            <div className="flex flex-col min-w-0 leading-tight">
              <span className="font-bold text-sm tracking-tight truncate text-white">
                {brandName}
              </span>
              <span className="text-[10px] text-slate-400 tracking-wider uppercase truncate">
                {brandTagline}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Nav body */}
      <nav className="sidebar-scroll sidebar-scroll-mask flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-3">
        {sections.map((section, sectionIndex) => (
          <div key={section.label} className="flex flex-col">
            {/* Spacer 36px = 1 บรรทัดเต็ม (ยกเว้น section แรก) */}
            {sectionIndex > 0 && (
              <div className="h-9 shrink-0" aria-hidden="true" />
            )}

            {/* Section header */}
            {!collapsed && (
              <div className="h-5 flex items-center px-4 mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 leading-none">
                {section.label}
              </div>
            )}

            {/* Menu items */}
            <ul className="flex flex-col gap-0.5 px-2 list-none m-0">
              {section.items.map((item) => {
                const isActive =
                  currentPath === item.path ||
                  (item.path !== "/" && currentPath.startsWith(item.path));
                const Icon = item.icon;
                return (
                  <li key={item.path}>
                    <button
                      type="button"
                      onClick={() => onNavigate(item.path)}
                      title={collapsed ? item.label : undefined}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "group flex h-9 w-full items-center gap-2.5 rounded-lg text-sm transition-colors",
                        collapsed ? "justify-center px-0" : "px-3",
                        isActive
                          ? "bg-white/10 text-white font-medium ring-1 ring-white/20"
                          : "text-slate-300 hover:bg-white/5 hover:text-white",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isActive ? "text-white" : "",
                        )}
                      />
                      {!collapsed && (
                        <span className="flex-1 min-w-0 truncate whitespace-nowrap text-left">
                          {item.label}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      {footer && (
        <div className="border-t border-slate-800 p-3 shrink-0">
          {footer}
        </div>
      )}

      {/* Resize handle (เฉพาะ expanded mode) */}
      {!collapsed && onResizeMouseDown && (
        <div
          onMouseDown={onResizeMouseDown}
          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-white/20 transition-colors z-50"
          aria-hidden="true"
        />
      )}
    </aside>
  );
}

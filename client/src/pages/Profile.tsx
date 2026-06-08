import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/contexts/ThemeContext";
import { LogOut, Moon, Sun } from "lucide-react";

const ROLE_LABEL: Record<string, string> = {
  admin: "Platform Admin",
  owner: "เจ้าของ Workspace",
  ceo: "Co-Owner / CEO",
  supervisor: "Supervisor",
  content: "ทีมคอนเทนต์",
  staff: "พนักงาน",
  pending: "รอ approve",
};

export default function Profile() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  if (!user) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">โปรไฟล์</h1>
      </header>
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-16 w-16 border-2">
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
              {user.name?.charAt(0).toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg font-semibold">{user.name}</p>
            <p className="text-sm text-muted-foreground">
              ชื่อเล่น: {user.nickname?.trim() ? user.nickname : "—"}
            </p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
              {ROLE_LABEL[user.role] ?? user.role}
            </span>
          </div>
        </div>
        <div className="border-t pt-4 space-y-3">
          <Button variant="outline" onClick={toggleTheme} className="w-full justify-start">
            {theme === "dark" ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
            {theme === "dark" ? "เปลี่ยนเป็น Light Mode" : "เปลี่ยนเป็น Dark Mode"}
          </Button>
          <Button variant="outline" onClick={logout} className="w-full justify-start text-destructive">
            <LogOut className="h-4 w-4 mr-2" />
            ออกจากระบบ
          </Button>
        </div>
      </Card>
    </div>
  );
}

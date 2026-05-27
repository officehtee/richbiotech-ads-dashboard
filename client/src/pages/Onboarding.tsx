import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Building2, Loader2, Sparkles, UserPlus } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Onboarding() {
  const { user, refresh } = useAuth();
  const [, setLocation] = useLocation();
  const [code, setCode] = useState("");
  const [companyName, setCompanyName] = useState("");
  const join = trpc.onboarding.joinByCompanyCode.useMutation({
    onSuccess: async () => {
      toast.success("เข้าร่วม workspace สำเร็จ");
      await refresh();
      setLocation("/");
    },
    onError: (e) => toast.error(e.message),
  });
  const setup = trpc.onboarding.setupCompany.useMutation({
    onSuccess: async (res) => {
      toast.success(`สร้าง workspace สำเร็จ • Company Code: ${res.companyCode}`);
      await refresh();
      setLocation("/");
    },
    onError: (e) => toast.error(e.message),
  });

  if (!user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-accent/30">
      <Card className="w-full max-w-md p-7">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20 mb-3">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">ยินดีต้อนรับ {user.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            เลือกการตั้งค่าเริ่มต้นเพื่อใช้งานระบบ
          </p>
        </div>
        <Tabs defaultValue="join">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="join">
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              เข้าร่วม Workspace
            </TabsTrigger>
            <TabsTrigger value="create">
              <Building2 className="h-3.5 w-3.5 mr-1.5" />
              สร้าง Workspace
            </TabsTrigger>
          </TabsList>
          <TabsContent value="join" className="mt-4 space-y-4">
            <p className="text-xs text-muted-foreground">
              ใส่ Company Code ที่ได้รับจากเจ้าของบัญชี
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="code">Company Code</Label>
              <Input
                id="code"
                placeholder="ABCDEF12"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="off"
              />
            </div>
            <Button
              className="w-full"
              disabled={!code || join.isPending}
              onClick={() => join.mutate({ code })}
            >
              {join.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              เข้าร่วม
            </Button>
          </TabsContent>
          <TabsContent value="create" className="mt-4 space-y-4">
            <p className="text-xs text-muted-foreground">
              ระบบจะสร้าง Company Code ให้อัตโนมัติเพื่อใช้แชร์ให้ทีมงาน
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="company">ชื่อบริษัท / Workspace</Label>
              <Input
                id="company"
                placeholder="Richbiotech"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              disabled={!companyName || setup.isPending}
              onClick={() => setup.mutate({ companyName })}
            >
              {setup.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              สร้าง Workspace
            </Button>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}

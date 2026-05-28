import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

const LOGO_URL = "/manus-storage/logo_329a1fce.png";

function Brand({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex flex-col items-center mb-5">
      <img
        src={LOGO_URL}
        alt="Richbiotech"
        className="h-14 w-14 rounded-2xl shadow-md ring-1 ring-orange-500/20 bg-white p-1.5"
      />
      <h2 className="mt-3 text-base font-semibold tracking-tight">Richbiotech Ads Dashboard</h2>
      {subtitle ? <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p> : null}
    </div>
  );
}

const ROLE_LABEL: Record<string, string> = {
  ceo: "Co-Owner (CEO)",
  content: "ทีมคอนเทนต์",
  staff: "พนักงาน",
};

const REASON_TEXT: Record<string, string> = {
  not_found: "ลิงก์เชิญไม่ถูกต้อง",
  revoked: "ลิงก์เชิญถูกยกเลิกแล้ว",
  used: "ลิงก์เชิญถูกใช้ไปแล้ว",
  expired: "ลิงก์เชิญหมดอายุแล้ว",
};

export default function InviteRedeem() {
  const { token } = useParams<{ token: string }>();
  const { user, loading, refresh } = useAuth();
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ role: string } | null>(null);
  const triedRef = useRef(false);

  // Verify ก่อนเสมอ — แสดงสถานะลิงก์ทันทีไม่ต้องรอ login
  const verify = trpc.invites.verify.useQuery(
    { token: token ?? "" },
    { enabled: !!token, retry: false },
  );

  const redeem = trpc.invites.redeem.useMutation({
    onSuccess: async (res) => {
      setSuccess({ role: res.role });
      await refresh();
      toast.success("เข้าร่วม workspace สำเร็จ");
      setTimeout(() => setLocation("/"), 1200);
    },
    onError: (e) => {
      setError(e.message);
    },
  });

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (!token) return;
    if (!verify.data?.ok) return;
    if (triedRef.current) return;
    triedRef.current = true;
    redeem.mutate({ token });
  }, [loading, user, token, verify.data, redeem]);

  if (loading || verify.isLoading) {
    return (
      <CenterShell>
        <Brand subtitle="กำลังตรวจสอบลิงก์เชิญ…" />
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </CenterShell>
    );
  }

  // ลิงก์ไม่ valid → โชว์ทันทีไม่ต้องรอ login
  if (verify.data && !verify.data.ok) {
    const reason = REASON_TEXT[verify.data.reason] ?? "ลิงก์เชิญไม่ถูกต้อง";
    return (
      <CenterShell>
        <Card className="w-full max-w-md p-7 text-center">
          <Brand />
          <ShieldAlert className="h-10 w-10 mx-auto text-rose-500" />
          <h1 className="text-xl font-semibold mt-3">ใช้ลิงก์เชิญไม่ได้</h1>
          <p className="text-sm text-rose-600 mt-2">{reason}</p>
          {"label" in verify.data && verify.data.label ? (
            <p className="text-xs text-muted-foreground mt-2">
              ลิงก์ของ: {verify.data.label}
            </p>
          ) : null}
          <Button variant="outline" className="mt-5" onClick={() => setLocation("/")}>
            ไปหน้าแรก
          </Button>
        </Card>
      </CenterShell>
    );
  }

  // ลิงก์ valid แต่ยังไม่ login → ให้กดปุ่ม login + กลับมาหน้านี้
  if (!user && verify.data?.ok) {
    const returnPath = `/invite/${token}`;
    return (
      <CenterShell>
        <Card className="w-full max-w-md p-7 text-center">
          <Brand />
          <h1 className="text-xl font-semibold">คุณได้รับเชิญเข้าใช้งาน</h1>
          <p className="text-sm text-muted-foreground mt-2">
            สิทธิ์ที่จะได้รับ: <b>{ROLE_LABEL[verify.data.role] ?? verify.data.role}</b>
          </p>
          {verify.data.label ? (
            <p className="text-xs text-muted-foreground mt-1">
              ผู้รับ: {verify.data.label}
            </p>
          ) : null}
          <Button
            className="w-full mt-5"
            onClick={() => {
              window.location.href = getLoginUrl(returnPath);
            }}
          >
            เข้าสู่ระบบเพื่อใช้ลิงก์เชิญ
          </Button>
        </Card>
      </CenterShell>
    );
  }

  if (success) {
    return (
      <CenterShell>
        <Card className="w-full max-w-md p-7 text-center">
          <Brand />
          <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500" />
          <h1 className="text-xl font-semibold mt-3">เข้าร่วม workspace สำเร็จ</h1>
          <p className="text-sm text-muted-foreground mt-2">
            สิทธิ์ของคุณ: <b>{ROLE_LABEL[success.role] ?? success.role}</b>
          </p>
          <p className="text-xs text-muted-foreground mt-3">กำลังพาเข้าหน้า Dashboard…</p>
        </Card>
      </CenterShell>
    );
  }

  if (error) {
    return (
      <CenterShell>
        <Card className="w-full max-w-md p-7 text-center">
          <Brand />
          <ShieldAlert className="h-10 w-10 mx-auto text-rose-500" />
          <h1 className="text-xl font-semibold mt-3">ใช้ลิงก์เชิญไม่สำเร็จ</h1>
          <p className="text-sm text-rose-600 mt-2">{error}</p>
          <Button variant="outline" className="mt-5" onClick={() => setLocation("/")}>
            ไปหน้าแรก
          </Button>
        </Card>
      </CenterShell>
    );
  }

  return (
    <CenterShell>
      <Brand subtitle="กำลังเข้าร่วม workspace…" />
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </CenterShell>
  );
}

function CenterShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-background via-background to-accent/30">
      {children}
    </div>
  );
}

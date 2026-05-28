import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  BookOpen,
  Search,
  Users,
  LayoutDashboard,
  TrendingUp,
  Sparkles,
  Coins,
  Settings,
  HelpCircle,
  ChevronRight,
  ArrowLeft,
  Lightbulb,
  ExternalLink,
  Printer,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  GETTING_STARTED,
  ROLE_GUIDES,
  ROLE_META,
  PAGE_GUIDES,
  GLOSSARY,
  FAQS,
  type HelpRole,
  type PageGuide,
} from "../../../shared/help-content";

type Section =
  | { kind: "start" }
  | { kind: "role"; role: HelpRole }
  | { kind: "page"; pageId: string }
  | { kind: "glossary" }
  | { kind: "faq" };

const CATEGORY_META: Record<
  PageGuide["category"],
  { label: string; icon: typeof LayoutDashboard }
> = {
  overview: { label: "ภาพรวม", icon: LayoutDashboard },
  analysis: { label: "วิเคราะห์", icon: TrendingUp },
  scaling: { label: "ปรับงบ + แชร์", icon: Sparkles },
  commission: { label: "คอมมิชชั่น", icon: Coins },
  settings: { label: "ตั้งค่า", icon: Settings },
};

export default function HelpCenter() {
  const { user } = useAuth();
  const myRole = (user?.role ?? "owner") as HelpRole;
  const [section, setSection] = useState<Section>({ kind: "start" });
  const [search, setSearch] = useState("");

  const matched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    const pages = PAGE_GUIDES.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.what.toLowerCase().includes(q) ||
        p.contains.some(
          (c) =>
            c.item.toLowerCase().includes(q) ||
            c.meaning.toLowerCase().includes(q),
        ),
    );
    const faqs = FAQS.filter(
      (f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q),
    );
    const glossary = GLOSSARY.filter(
      (g) =>
        g.term.toLowerCase().includes(q) || g.meaning.toLowerCase().includes(q),
    );
    return { pages, faqs, glossary };
  }, [search]);

  const groupedPages = useMemo(() => {
    const map: Record<PageGuide["category"], PageGuide[]> = {
      overview: [],
      analysis: [],
      scaling: [],
      commission: [],
      settings: [],
    };
    for (const p of PAGE_GUIDES) map[p.category].push(p);
    return map;
  }, []);

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="border-b bg-card sticky top-0 z-30 print:hidden">
        <div className="container py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              กลับ
            </Button>
          </Link>
          <div className="flex-1 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/10 grid place-items-center text-primary">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">คู่มือการใช้งาน</h1>
              <p className="text-xs text-muted-foreground">
                Help Center · Richbiotech Ads Dashboard
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 max-w-sm flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาหน้า / คำถาม / ศัพท์..."
                className="pl-9"
              />
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">พิมพ์ / บันทึก PDF</span>
          </Button>
        </div>
        <div className="md:hidden container pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหา..."
              className="pl-9"
            />
          </div>
        </div>
      </div>

      <div className="container py-6 grid lg:grid-cols-[260px_1fr] gap-6">
        {/* Sidebar */}
        <aside className="space-y-1 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-auto print:hidden">
          <NavItem
            active={section.kind === "start"}
            onClick={() => setSection({ kind: "start" })}
            icon={<Sparkles className="h-4 w-4" />}
            label="เริ่มต้นใช้งาน"
          />

          <div className="pt-3 pb-1 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            ตามบทบาท
          </div>
          {ROLE_GUIDES.map((g) => (
            <NavItem
              key={g.role}
              active={section.kind === "role" && section.role === g.role}
              onClick={() => setSection({ kind: "role", role: g.role })}
              icon={
                <span className="text-base leading-none">
                  {ROLE_META[g.role].emoji}
                </span>
              }
              label={ROLE_META[g.role].label}
              hint={g.role === myRole ? "คุณ" : undefined}
            />
          ))}

          {Object.entries(groupedPages).map(([cat, pages]) => {
            const meta = CATEGORY_META[cat as PageGuide["category"]];
            const Icon = meta.icon;
            return (
              <div key={cat}>
                <div className="pt-3 pb-1 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5" />
                  {meta.label}
                </div>
                {pages.map((p) => (
                  <NavItem
                    key={p.id}
                    active={
                      section.kind === "page" && section.pageId === p.id
                    }
                    onClick={() => setSection({ kind: "page", pageId: p.id })}
                    label={p.title}
                  />
                ))}
              </div>
            );
          })}

          <div className="pt-3 pb-1 px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            อ้างอิง
          </div>
          <NavItem
            active={section.kind === "glossary"}
            onClick={() => setSection({ kind: "glossary" })}
            icon={<BookOpen className="h-4 w-4" />}
            label="ศัพท์ที่ควรรู้"
          />
          <NavItem
            active={section.kind === "faq"}
            onClick={() => setSection({ kind: "faq" })}
            icon={<HelpCircle className="h-4 w-4" />}
            label="คำถามพบบ่อย"
          />
        </aside>

        {/* Content */}
        <main className="min-w-0">
          {matched ? (
            <SearchResults
              matched={matched}
              query={search}
              onPick={(s) => {
                setSearch("");
                setSection(s);
              }}
            />
          ) : section.kind === "start" ? (
            <StartSection myRole={myRole} onJump={(s) => setSection(s)} />
          ) : section.kind === "role" ? (
            <RoleSection role={section.role} onPickPage={(id) => setSection({ kind: "page", pageId: id })} />
          ) : section.kind === "page" ? (
            <PageSection pageId={section.pageId} />
          ) : section.kind === "glossary" ? (
            <GlossarySection />
          ) : (
            <FaqSection />
          )}
        </main>
      </div>
    </div>
  );
}

function NavItem({
  active,
  onClick,
  icon,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
        active
          ? "bg-primary/10 text-primary font-medium"
          : "hover:bg-muted text-foreground/80"
      }`}
    >
      {icon ?? <span className="size-4" />}
      <span className="flex-1 truncate">{label}</span>
      {hint && (
        <Badge variant="secondary" className="text-[10px]">
          {hint}
        </Badge>
      )}
    </button>
  );
}

function SectionHeader({
  badge,
  title,
  description,
}: {
  badge?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6">
      {badge && (
        <Badge variant="secondary" className="mb-3">
          {badge}
        </Badge>
      )}
      <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
      {description && (
        <p className="text-muted-foreground mt-2">{description}</p>
      )}
    </div>
  );
}

function StartSection({
  myRole,
  onJump,
}: {
  myRole: HelpRole;
  onJump: (s: Section) => void;
}) {
  return (
    <div className="space-y-6">
      <SectionHeader
        badge="เริ่มต้นที่นี่"
        title="ยินดีต้อนรับสู่ Richbiotech Ads Dashboard"
        description={GETTING_STARTED.what}
      />

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <p className="font-medium mb-1">ลัดไปยังคู่มือของบทบาทคุณ</p>
              <p className="text-sm text-muted-foreground mb-3">
                คุณคือ {ROLE_META[myRole].emoji} {ROLE_META[myRole].label} —{" "}
                {ROLE_META[myRole].description}
              </p>
              <Button
                size="sm"
                onClick={() => onJump({ kind: "role", role: myRole })}
                className="gap-2"
              >
                ดูคู่มือเฉพาะบทบาทของฉัน
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="text-lg font-semibold">วิธี Login เข้าระบบ</h3>
          <ol className="space-y-2">
            {GETTING_STARTED.loginSteps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="size-6 rounded-full bg-primary/10 text-primary text-xs font-bold grid place-items-center shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm pt-0.5">{s}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <h3 className="text-lg font-semibold">โครงสร้างหน้าจอ</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {GETTING_STARTED.layoutNotes.map((n) => (
              <div
                key={n.label}
                className="rounded-lg border bg-muted/30 p-3"
              >
                <div className="font-medium text-sm">{n.label}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {n.detail}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-2">
            มุมมอง คนยิงแอด vs เซลส์
          </h3>
          <p className="text-sm text-muted-foreground">
            {GETTING_STARTED.personaDiff}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <h3 className="text-lg font-semibold">เลือกบทบาทของคุณ</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {ROLE_GUIDES.map((g) => (
              <button
                key={g.role}
                type="button"
                onClick={() => onJump({ kind: "role", role: g.role })}
                className="text-left rounded-lg border bg-card hover:bg-muted/50 p-4 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{ROLE_META[g.role].emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">
                      {ROLE_META[g.role].label}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {g.whoYouAre}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RoleSection({
  role,
  onPickPage,
}: {
  role: HelpRole;
  onPickPage: (id: string) => void;
}) {
  const guide = ROLE_GUIDES.find((g) => g.role === role)!;
  const meta = ROLE_META[role];
  return (
    <div className="space-y-6">
      <SectionHeader
        badge="คู่มือตามบทบาท"
        title={`${meta.emoji} ${meta.label}`}
        description={guide.whoYouAre}
      />

      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" />
            คุณใช้หน้าไหนบ้าง
          </h3>
          <div className="space-y-2">
            {guide.pagesUsed.map((p) => {
              const pg = PAGE_GUIDES.find((x) => x.title === p.page);
              return (
                <button
                  key={p.page}
                  type="button"
                  onClick={() => pg && onPickPage(pg.id)}
                  disabled={!pg}
                  className="w-full text-left rounded-lg border bg-muted/30 p-3 hover:bg-muted/60 transition-colors disabled:cursor-default"
                >
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-sm">{p.page}</div>
                    {pg && (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {p.purpose}
                  </p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            กิจวัตรประจำวัน
          </h3>
          <ol className="space-y-2">
            {guide.dailyRoutine.map((r, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="size-6 rounded-full bg-primary/10 text-primary text-xs font-bold grid place-items-center shrink-0">
                  {i + 1}
                </span>
                <span className="pt-0.5">{r}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-2">
          <h3 className="text-lg font-semibold">ตัวเลขที่ต้องเฝ้าดู</h3>
          <div className="flex flex-wrap gap-2">
            {guide.metricsToWatch.map((m) => (
              <Badge key={m} variant="outline" className="text-sm">
                {m}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PageSection({ pageId }: { pageId: string }) {
  const p = PAGE_GUIDES.find((x) => x.id === pageId);
  if (!p) return null;
  const meta = CATEGORY_META[p.category];
  return (
    <div className="space-y-6">
      <SectionHeader
        badge={meta.label}
        title={p.title}
        description={p.what}
      />

      <div className="flex flex-wrap gap-2 mb-2">
        {p.who.map((r) => (
          <Badge key={r} variant="secondary">
            {ROLE_META[r].emoji} {ROLE_META[r].label}
          </Badge>
        ))}
        <Link href={p.path}>
          <Badge variant="outline" className="cursor-pointer hover:bg-muted">
            <ExternalLink className="h-3 w-3 mr-1" />
            ไปยังหน้านี้
          </Badge>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <h3 className="text-lg font-semibold">มีอะไรในหน้านี้บ้าง</h3>
          <div className="divide-y">
            {p.contains.map((c) => (
              <div key={c.item} className="py-3 first:pt-0 last:pb-0">
                <div className="font-medium text-sm">{c.item}</div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {c.meaning}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <p className="font-medium text-sm mb-1">เคล็ดลับ</p>
              <p className="text-sm text-muted-foreground">{p.tip}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GlossarySection() {
  return (
    <div className="space-y-4">
      <SectionHeader
        badge="อ้างอิง"
        title="ศัพท์ที่ควรรู้"
        description="ความหมายของศัพท์ที่ปรากฏบ่อยในระบบ"
      />
      <Card>
        <CardContent className="pt-6">
          <dl className="divide-y">
            {GLOSSARY.map((g) => (
              <div
                key={g.term}
                className="py-3 first:pt-0 last:pb-0 grid sm:grid-cols-[140px_1fr] gap-2"
              >
                <dt className="font-semibold text-sm text-primary">
                  {g.term}
                </dt>
                <dd className="text-sm text-muted-foreground">{g.meaning}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function FaqSection() {
  return (
    <div className="space-y-4">
      <SectionHeader
        badge="อ้างอิง"
        title="คำถามพบบ่อย"
        description="คำตอบของข้อสงสัยที่ผู้ใช้ส่วนใหญ่เจอ"
      />
      <div className="space-y-3">
        {FAQS.map((f, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="font-semibold mb-2 flex items-start gap-2">
                <HelpCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>{f.q}</span>
              </div>
              <p className="text-sm text-muted-foreground pl-6">{f.a}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SearchResults({
  matched,
  query,
  onPick,
}: {
  matched: {
    pages: typeof PAGE_GUIDES;
    faqs: typeof FAQS;
    glossary: typeof GLOSSARY;
  };
  query: string;
  onPick: (s: Section) => void;
}) {
  const total =
    matched.pages.length + matched.faqs.length + matched.glossary.length;
  return (
    <div className="space-y-4">
      <SectionHeader
        badge={`ผลการค้นหา`}
        title={`พบ ${total} รายการสำหรับ "${query}"`}
      />
      {total === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            ไม่พบข้อมูลที่เกี่ยวข้อง ลองใช้คำค้นหาอื่นดู
          </CardContent>
        </Card>
      )}

      {matched.pages.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2 text-sm text-muted-foreground">
            หน้าใช้งาน ({matched.pages.length})
          </h3>
          <div className="space-y-2">
            {matched.pages.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onPick({ kind: "page", pageId: p.id })}
                className="w-full text-left rounded-lg border bg-card hover:bg-muted/50 p-3 transition-colors"
              >
                <div className="font-medium text-sm">{p.title}</div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {p.what}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {matched.faqs.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2 text-sm text-muted-foreground">
            คำถาม ({matched.faqs.length})
          </h3>
          <div className="space-y-2">
            {matched.faqs.map((f, i) => (
              <Card key={i}>
                <CardContent className="pt-4 pb-4">
                  <div className="font-medium text-sm">{f.q}</div>
                  <p className="text-xs text-muted-foreground mt-1">{f.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {matched.glossary.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2 text-sm text-muted-foreground">
            ศัพท์ ({matched.glossary.length})
          </h3>
          <Card>
            <CardContent className="pt-4 pb-4">
              <dl className="divide-y">
                {matched.glossary.map((g) => (
                  <div
                    key={g.term}
                    className="py-2 first:pt-0 last:pb-0 grid sm:grid-cols-[140px_1fr] gap-2"
                  >
                    <dt className="font-semibold text-sm text-primary">
                      {g.term}
                    </dt>
                    <dd className="text-sm text-muted-foreground">
                      {g.meaning}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

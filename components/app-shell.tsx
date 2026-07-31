"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Building2,
  ChevronDown,
  FileClock,
  FileCog,
  FileSpreadsheet,
  FilePlus2,
  FolderArchive,
  Gauge,
  History,
  Layers3,
  Menu,
  PlugZap,
  Settings2,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

type CurrentUser = {
  name: string;
  role: "admin" | "engineering" | "viewer";
};

const roleLabels: Record<CurrentUser["role"], string> = {
  admin: "Administradora",
  engineering: "Engenharia",
  viewer: "Visualização",
};

const navigation = [
  { label: "Visão geral", href: "/", icon: Gauge },
  { label: "Obras", href: "/obras", icon: Building2 },
  { label: "Nova apresentação", href: "/nova-apresentacao", icon: FilePlus2 },
  { label: "PowerPoints salvos", href: "/apresentacoes", icon: FolderArchive },
  { label: "Excel salvos", href: "/excels", icon: FileSpreadsheet },
  { label: "Modelos de PowerPoint", href: "/modelos", icon: Layers3 },
  { label: "Mapeamento de slides", href: "/mapeamentos", icon: FileCog },
  { label: "Integrações", href: "/integracoes", icon: PlugZap },
  { label: "Histórico", href: "/historico", icon: History },
  { label: "Usuários", href: "/usuarios", icon: Users },
  { label: "Configurações", href: "/configuracoes", icon: Settings2 },
];

function Sidebar({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <aside className="flex h-full w-[270px] shrink-0 flex-col border-r border-accent/10 bg-[#03142c] text-white">
      <div className="flex h-[76px] items-center gap-3 border-b border-accent/15 px-6">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-[#071f44] shadow-[inset_0_0_0_1px_rgba(255,255,255,.35)]">
          <FileClock size={21} strokeWidth={2.3} />
        </div>
        <div>
          <p className="text-[15px] font-bold leading-tight tracking-[-0.02em]">
            Engenharia Slides
          </p>
          <p className="mt-1 text-[11px] font-medium text-white/50">
            Gestão de apresentações
          </p>
        </div>
      </div>

      <nav className="scrollbar-none flex-1 space-y-1 overflow-y-auto px-3 py-5">
        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">
          Menu principal
        </p>
        {navigation.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex h-11 items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition",
                active
                  ? "bg-brand text-white shadow-[0_10px_24px_rgba(47,140,255,.24)]"
                  : "text-white/64 hover:bg-[#0e315c] hover:text-white",
              )}
            >
              <Icon
                size={18}
                className={active ? "text-white" : "text-white/50"}
              />
              <span className="flex-1">{item.label}</span>
              {item.href === "/nova-apresentacao" && !active ? (
                <span className="rounded-md bg-accent px-1.5 py-0.5 text-[9px] font-extrabold text-[#071f44]">
                  NOVO
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="m-3 rounded-2xl border border-accent/15 bg-[#09294d] p-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
          <ShieldCheck size={16} className="text-accent" />
          Ambiente protegido
        </div>
        <p className="text-[11px] leading-5 text-white/45">
          Arquivos privados e alterações rastreadas por usuário.
        </p>
      </div>
    </aside>
  );
}

export function AppShell({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    apiFetch<CurrentUser>("/auth/me").then(setCurrentUser).catch(() => undefined);
  }, []);

  const initials = (currentUser?.name ?? "Minha conta")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">
        <Sidebar pathname={pathname} />
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Fechar menu"
            className="absolute inset-0 bg-[#071d17]/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full w-[286px] shadow-2xl">
            <Sidebar
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
            <Button
              aria-label="Fechar menu"
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3 text-white hover:bg-accent/10 hover:text-white"
              onClick={() => setMobileOpen(false)}
            >
              <X size={18} />
            </Button>
          </div>
        </div>
      ) : null}

      <div className="min-w-0 flex-1 lg:pl-[270px]">
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-accent/15 bg-[#082343]/95 px-4 backdrop-blur-xl sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu size={20} />
            </Button>
            <div className="min-w-0">
              {eyebrow ? (
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7a8984]">
                  {eyebrow}
                </p>
              ) : null}
                <h1 className="truncate text-lg font-bold tracking-[-0.025em] text-[#102c50] sm:text-xl">
                {title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              aria-label="Notificações"
              className="relative grid h-10 w-10 place-items-center rounded-xl border border-accent/20 bg-surface text-[#c7def7] transition hover:bg-surface-elevated"
            >
              <Bell size={18} />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-[#082343] bg-warning" />
            </button>
            <div className="hidden h-8 w-px bg-accent/15 sm:block" />
            <button className="flex items-center gap-2 rounded-xl px-1 py-1 text-left hover:bg-surface sm:pr-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-xs font-extrabold text-white">
                {initials}
              </div>
              <div className="hidden sm:block">
                <p className="max-w-36 truncate text-xs font-bold text-[#183554]">
                  {currentUser?.name ?? "Minha conta"}
                </p>
                <p className="text-[10px] text-[#81908b]">
                  {currentUser ? roleLabels[currentUser.role] : "Conta conectada"}
                </p>
              </div>
              <ChevronDown size={14} className="hidden text-[#7b8984] sm:block" />
            </button>
          </div>
        </header>
        <main className="fine-grid min-h-[calc(100vh-76px)] p-4 sm:p-7">
          <div className="mx-auto max-w-[1440px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

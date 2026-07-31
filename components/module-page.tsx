import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type ModuleRow = {
  title: string;
  subtitle: string;
  meta: string;
  status: string;
  statusTone?: "success" | "warning" | "neutral";
};

export function ModulePage({
  title,
  eyebrow,
  description,
  actionLabel,
  actionHref = "#",
  icon: Icon,
  stats,
  rows,
}: {
  title: string;
  eyebrow: string;
  description: string;
  actionLabel: string;
  actionHref?: string;
  icon: LucideIcon;
  stats: Array<{ label: string; value: string; note: string }>;
  rows: ModuleRow[];
}) {
  return (
    <AppShell title={title} eyebrow={eyebrow}>
      <section className="flex flex-col justify-between gap-5 rounded-3xl border border-accent/15 bg-card p-6 shadow-[0_18px_44px_rgba(0,8,24,.24)] sm:flex-row sm:items-center">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand/18 text-accent">
            <Icon size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-[-0.03em] text-[#183b30]">
              {title}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#71817b]">
              {description}
            </p>
          </div>
        </div>
        <Button asChild className="shrink-0">
          <Link href={actionHref}>
            <Plus size={16} />
            {actionLabel}
          </Link>
        </Button>
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent>
              <p className="text-xs font-semibold text-[#7a8984]">{stat.label}</p>
              <p className="mt-2 text-2xl font-bold tracking-[-0.04em] text-[#1a3d32]">
                {stat.value}
              </p>
              <p className="mt-2 text-[11px] text-[#899690]">{stat.note}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="mt-5 overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h3 className="text-sm font-bold text-[#25443a]">Registros recentes</h3>
            <p className="mt-1 text-[11px] text-[#84928d]">
              Dados do ambiente e status da configuração
            </p>
          </div>
          <Button variant="ghost" size="sm">
            Ver todos <ArrowRight size={14} />
          </Button>
        </div>
        <div className="divide-y">
          {rows.map((row) => (
            <div
              key={`${row.title}-${row.meta}`}
              className="flex flex-col gap-3 px-5 py-4 transition hover:bg-surface sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[#29483e]">
                  {row.title}
                </p>
                <p className="mt-1 truncate text-xs text-[#7a8984]">
                  {row.subtitle}
                </p>
              </div>
              <p className="text-xs font-medium text-[#73837d]">{row.meta}</p>
              <Badge
                className={
                  row.statusTone === "success"
                    ? "border-success/30 bg-success/10 text-success"
                    : row.statusTone === "warning"
                      ? "border-warning/30 bg-warning/10 text-warning"
                      : ""
                }
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {row.status}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}

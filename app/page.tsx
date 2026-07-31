import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileDown,
  FilePlus2,
  Layers3,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const recent = [
  {
    project: "FAR Carpina",
    reference: "Junho 2026",
    owner: "Fernanda Alves",
    updated: "Hoje, 09:42",
    status: "Concluído",
  },
];

export default function Home() {
  return (
    <AppShell title="Visão geral" eyebrow="Engenharia Slides">
      <section className="relative overflow-hidden rounded-3xl bg-[#0b2d55] px-5 py-6 text-white shadow-[0_20px_50px_rgba(7,31,68,.2)] sm:px-8 sm:py-8">
        <div className="absolute -right-16 -top-28 h-72 w-72 rounded-full border-[42px] border-[#5ea7ff]/12" />
        <div className="absolute bottom-0 right-[22%] h-24 w-24 translate-y-1/2 rounded-full bg-[#5ea7ff]/10" />
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <Badge className="mb-4 border-accent/20 bg-accent/10 text-[#b9d9ff]">
              <Sparkles size={12} />
              Ciclo mensal em andamento
            </Badge>
            <h2 className="max-w-2xl text-2xl font-bold tracking-[-0.035em] sm:text-3xl">
              Transforme dados de obra em uma apresentação pronta para decisão.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/58">
              Importe a planilha, revise as fontes e gere o PowerPoint mantendo
              o padrão visual aprovado pela empresa.
            </p>
          </div>
          <Button asChild size="lg" className="shrink-0 bg-accent text-[#071f44] hover:bg-[#8fc3ff]">
            <Link href="/nova-apresentacao">
              <FilePlus2 size={18} />
              Nova apresentação
            </Link>
          </Button>
        </div>
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Obras cadastradas",
            value: "1",
            note: "FAR Carpina ativa",
            icon: Building2,
            color: "bg-[#123e6f] text-accent",
          },
          {
            label: "Apresentações",
            value: "1",
            note: "geração real validada",
            icon: Layers3,
            color: "bg-[#174b7a] text-[#9bd3ff]",
          },
          {
            label: "Vínculos cadastrados",
            value: "31",
            note: "mapeamento FAR Carpina",
            icon: CheckCircle2,
            color: "bg-[#0c355f] text-[#7bbcff]",
          },
          {
            label: "Slides protegidos",
            value: "2",
            note: "slides 6 e 11",
            icon: Clock3,
            color: "bg-[#1d5688] text-[#b4dcff]",
          },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label}>
              <CardContent className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#778680]">
                    {metric.label}
                  </p>
                  <p className="mt-2 text-3xl font-bold tracking-[-0.045em] text-[#18392f]">
                    {metric.value}
                  </p>
                  <p className="mt-2 text-[11px] font-medium text-[#74837e]">
                    {metric.note}
                  </p>
                </div>
                <div className={`grid h-10 w-10 place-items-center rounded-xl ${metric.color}`}>
                  <Icon size={19} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_.85fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold tracking-[-0.02em] text-[#1d3d33]">
                Apresentações recentes
              </h3>
              <p className="mt-1 text-xs text-[#7a8984]">
                Últimos arquivos processados pela equipe
              </p>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/historico">
                Ver histórico <ArrowRight size={14} />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto pt-4">
            <table className="w-full min-w-[680px] border-separate border-spacing-0 text-left">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8a9792]">
                  <th className="border-b py-3">Obra</th>
                  <th className="border-b py-3">Referência</th>
                  <th className="border-b py-3">Responsável</th>
                  <th className="border-b py-3">Atualização</th>
                  <th className="border-b py-3">Status</th>
                  <th className="border-b py-3 text-right">Arquivo</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((item) => (
                  <tr key={`${item.project}-${item.reference}`} className="text-xs">
                    <td className="border-b border-[#edf1ef] py-4 font-bold text-[#28463c]">
                      {item.project}
                    </td>
                    <td className="border-b border-[#edf1ef] py-4 text-[#65756f]">
                      {item.reference}
                    </td>
                    <td className="border-b border-[#edf1ef] py-4 text-[#65756f]">
                      {item.owner}
                    </td>
                    <td className="border-b border-[#edf1ef] py-4 text-[#7c8a85]">
                      {item.updated}
                    </td>
                    <td className="border-b border-[#edf1ef] py-4">
                      <Badge
                        className={
                          item.status === "Concluído"
                            ? "border-success/30 bg-success/10 text-success"
                            : "border-warning/30 bg-warning/10 text-warning"
                        }
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {item.status}
                      </Badge>
                    </td>
                    <td className="border-b border-[#edf1ef] py-4 text-right">
                      <Button
                        aria-label={`Baixar ${item.project}`}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                      >
                        <FileDown size={16} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <h3 className="text-base font-bold tracking-[-0.02em] text-[#1d3d33]">
                FAR Carpina
              </h3>
              <p className="mt-1 text-xs text-[#7b8a85]">Referência: junho 2026</p>
            </div>
            <Badge className="border-success/30 bg-success/10 text-success">
              <TrendingUp size={12} />
              Em dia
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl bg-surface p-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-semibold text-[#60716b]">
                  Progresso físico acumulado
                </span>
                <strong className="text-xl tracking-[-0.04em] text-[#174b3b]">
                  12,36%
                </strong>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#061d38]">
                <div className="h-full w-[62%] rounded-full bg-brand" />
              </div>
              <div className="mt-3 flex justify-between text-[10px] font-medium text-[#7d8b86]">
                <span>Base: 11,97%</span>
                <span>Realizado: 12,36%</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border p-3">
                <CalendarDays size={16} className="mb-3 text-brand" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#84918c]">
                  Última medição
                </p>
                <p className="mt-1 text-xs font-bold text-[#29473d]">30/06/2026</p>
              </div>
              <div className="rounded-xl border p-3">
                <BarChart3 size={16} className="mb-3 text-[#6c7c27]" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#84918c]">
                  Vínculos cadastrados
                </p>
                <p className="mt-1 text-xs font-bold text-[#29473d]">31 vínculos</p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-xl border border-warning/25 bg-warning/10 p-3">
              <ShieldCheck size={18} className="shrink-0 text-[#a47b2d]" />
              <div>
                <p className="text-xs font-bold text-[#594b2d]">
                  Slides protegidos: 6 e 11
                </p>
                <p className="mt-0.5 text-[10px] text-[#8a7b5a]">
                  Esses slides permanecerão exatamente como no modelo.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}

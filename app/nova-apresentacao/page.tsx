"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FileSpreadsheet,
  FileUp,
  Layers3,
  LockKeyhole,
  Presentation,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { API_URL, apiFetch } from "@/lib/api";

type Project = { id: string; name: string };
type Template = {
  id: string;
  name: string;
  version: number;
  protected_slides: number[];
};
type ExcelUpload = {
  id: string;
  original_filename: string;
  analysis: {
    sheet_count: number;
    sheets: Array<{ name: string; dimensions: string }>;
    detected_reference_month?: string | null;
  };
};
type Generation = {
  id: string;
  status: "review" | "completed" | "failed";
  warnings: Array<{ message: string }>;
  error_message?: string | null;
};

const steps = [
  "Selecionar obra",
  "Identificar período",
  "Enviar Excel",
  "Sincronizar Prevision",
  "Selecionar modelo",
  "Revisar dados",
  "Visualizar alterações",
  "Gerar PowerPoint",
];

export default function NovaApresentacaoPage() {
  const [step, setStep] = useState(0);
  const [project, setProject] = useState("FAR Carpina");
  const [reference, setReference] = useState("");
  const [excelName, setExcelName] = useState("");
  const [generated, setGenerated] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [upload, setUpload] = useState<ExcelUpload | null>(null);
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    apiFetch<Project[]>("/projects")
      .then((items) => {
        setProjects(items);
        const farCarpina = items.find((item) => item.name === "FAR Carpina") ?? items[0];
        if (farCarpina) {
          setProject(farCarpina.name);
          setProjectId(farCarpina.id);
        }
        setConnected(true);
      })
      .catch(() => setConnected(false));
  }, []);

  useEffect(() => {
    if (!projectId) return;
    apiFetch<Template[]>(`/templates?project_id=${projectId}`)
      .then((items) => {
        setTemplates(items);
        setTemplateId(items[0]?.id ?? "");
      })
      .catch(() => setTemplates([]));
  }, [projectId]);

  const canContinue = useMemo(() => {
    if (step === 0) return connected === false ? Boolean(project) : Boolean(projectId);
    if (step === 1) return true;
    if (step === 2) return connected === false ? Boolean(excelName) : Boolean(upload);
    if (step === 4) return connected === false ? true : Boolean(templateId);
    if (step === 7) return connected === false ? true : Boolean(reference && upload);
    return true;
  }, [connected, excelName, project, projectId, reference, step, templateId, upload]);

  async function handleExcel(file?: File) {
    setExcelName(file?.name ?? "");
    setUpload(null);
    setMessage("");
    if (!file || !projectId) return;
    setLoading(true);
    const body = new FormData();
    body.append("file", file);
    body.append("project_id", projectId);
    try {
      const result = await apiFetch<ExcelUpload>("/uploads/excel", {
        method: "POST",
        body,
      });
      setUpload(result);
      if (result.analysis.detected_reference_month) {
        setReference(result.analysis.detected_reference_month);
      }
      setMessage(
        `${result.analysis.sheet_count} abas encontradas. O mês foi identificado automaticamente e o Excel ficou salvo.`,
      );
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Não foi possível analisar a planilha.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function next() {
    if (step === steps.length - 1) {
      if (!connected || !projectId || !templateId || !upload) {
        setGenerated(true);
        setMessage(
          "Prévia de demonstração concluída. O download real exige o servidor local conectado.",
        );
        return;
      }
      setLoading(true);
      setMessage("");
      try {
        const result = await apiFetch<Generation>("/generations", {
          method: "POST",
          body: JSON.stringify({
            project_id: projectId,
            template_id: templateId,
            excel_upload_id: upload.id,
            reference_month: reference,
            confirm_warnings: true,
          }),
        });
        setGeneration(result);
        setGenerated(result.status !== "failed");
        setMessage(
          result.status === "failed"
            ? result.error_message ?? "A geração falhou."
            : `PowerPoint gerado. ${result.warnings.length} aviso(s) registrado(s) para revisão.`,
        );
      } catch (reason) {
        setMessage(reason instanceof Error ? reason.message : "Falha ao gerar o PowerPoint.");
      } finally {
        setLoading(false);
      }
      return;
    }
    setStep((value) => Math.min(value + 1, steps.length - 1));
  }

  return (
    <AppShell title="Nova apresentação" eyebrow="Fluxo mensal">
      <div className="mb-5 overflow-x-auto rounded-2xl border border-accent/15 bg-card p-3 shadow-[0_12px_30px_rgba(0,8,24,.22)]">
        <div className="flex min-w-[980px] items-center">
          {steps.map((item, index) => (
            <div key={item} className="flex flex-1 items-center">
              <button
                onClick={() => index <= step && setStep(index)}
                className="group flex items-center gap-2 text-left"
              >
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                    index < step
                      ? "bg-brand text-white"
                      : index === step
                        ? "bg-accent text-[#173d32] ring-4 ring-[#d6f06f]/25"
                        : "bg-surface text-[#89a7c8]"
                  }`}
                >
                  {index < step ? <Check size={13} /> : index + 1}
                </span>
                <span
                  className={`max-w-[88px] text-[10px] font-semibold leading-4 ${
                    index === step ? "text-[#26493e]" : "text-[#8a9792]"
                  }`}
                >
                  {item}
                </span>
              </button>
              {index < steps.length - 1 ? (
                <span
                  className={`mx-2 h-px flex-1 ${
                    index < step ? "bg-brand/50" : "bg-accent/15"
                  }`}
                />
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_330px]">
        <Card className="min-h-[520px]">
          <CardContent className="p-6 sm:p-8">
            <div className="mb-7">
              <Badge className="mb-3">Etapa {step + 1} de {steps.length}</Badge>
              <h2 className="text-2xl font-bold tracking-[-0.035em] text-[#173b30]">
                {steps[step]}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#74847e]">
                {step === 0 && "Escolha a obra que receberá a apresentação deste ciclo."}
                {step === 1 && "O período será localizado dentro do Excel enviado, sem depender de preenchimento manual."}
                {step === 2 && "Envie a planilha mensal. O arquivo original não será alterado."}
                {step === 3 && "O MVP funciona por Excel; a integração permanece opcional."}
                {step === 4 && "Selecione o modelo visual e confira os slides protegidos."}
                {step === 5 && "Confira dados encontrados, ausentes e suas respectivas fontes."}
                {step === 6 && "Revise cada atualização antes de gerar o arquivo final."}
                {step === 7 && "Confirme a geração do PowerPoint e do relatório de alterações."}
              </p>
            </div>

            {connected === false ? (
              <div className="mb-5 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-xs leading-5 text-warning">
                Demonstração online: navegação e prévia disponíveis. Para gerar e
                baixar o PowerPoint, abra esta página com o servidor local ligado.
              </div>
            ) : null}

            {message ? (
              <div className="mb-5 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-xs leading-5 text-success">
                {message}
              </div>
            ) : null}

            {step === 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {(projects.length
                  ? projects
                  : [
                      { id: "demo-far", name: "FAR Carpina" },
                      { id: "demo-aurora", name: "Residencial Aurora" },
                      { id: "demo-parque", name: "Parque das Águas" },
                    ]
                ).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setProject(item.name);
                        setProjectId(item.id.startsWith("demo-") ? "" : item.id);
                      }}
                      className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition ${
                        project === item.name
                          ? "border-accent bg-surface-elevated ring-2 ring-brand/25"
                          : "bg-surface hover:border-accent/45"
                      }`}
                    >
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/20 text-accent">
                        <Presentation size={19} />
                      </span>
                      <span className="flex-1">
                        <strong className="block text-sm text-[#2a493e]">{item.name}</strong>
                        <span className="mt-1 block text-[11px] text-[#84918c]">
                          Modelo e regras configurados
                        </span>
                      </span>
                      {project === item.name ? <CheckCircle2 size={18} className="text-brand" /> : null}
                    </button>
                  ))}
              </div>
            ) : null}

            {step === 1 ? (
              <div className="max-w-xl rounded-2xl border border-accent/20 bg-surface p-5">
                <FileSpreadsheet className="text-accent" size={24} />
                <h3 className="mt-4 text-sm font-bold">Período automático</h3>
                <p className="mt-2 text-xs leading-6 text-muted">
                  Na próxima etapa, o sistema percorrerá as datas e os valores realizados do arquivo para encontrar o mês correto, mesmo que ele esteja em outra linha.
                </p>
                <Badge className="mt-4">Nenhuma data precisa ser digitada</Badge>
              </div>
            ) : null}

            {step === 2 ? (
              <label className="grid min-h-[280px] cursor-pointer place-items-center rounded-3xl border-2 border-dashed border-accent/30 bg-surface p-8 text-center transition hover:border-accent hover:bg-surface-elevated">
                <input
                  type="file"
                  className="sr-only"
                  accept=".xlsx,.xlsm,.csv"
                  disabled={loading}
                  onChange={(event) => void handleExcel(event.target.files?.[0])}
                />
                <span>
                  <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand/20 text-accent">
                    {excelName ? <FileSpreadsheet size={25} /> : <FileUp size={25} />}
                  </span>
                  <strong className="mt-4 block text-sm text-[#28473d]">
                    {loading ? "Analisando a planilha..." : excelName || "Selecione a planilha mensal"}
                  </strong>
                  <span className="mt-2 block text-xs text-[#82908b]">
                    Excel ou CSV · até 250 MB · macros nunca são executadas
                  </span>
                  {upload ? (
                    <Badge className="mt-4 border-success/30 bg-success/10 text-success">
                      <Check size={12} /> {upload.analysis.sheet_count} abas encontradas
                    </Badge>
                  ) : null}
                </span>
              </label>
            ) : null}

            {step === 3 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-accent/35 bg-surface-elevated p-5">
                  <FileSpreadsheet className="text-brand" size={22} />
                  <h3 className="mt-4 text-sm font-bold text-[#26483d]">Continuar com Excel</h3>
                  <p className="mt-2 text-xs leading-5 text-[#71817b]">
                    Fonte principal do MVP, disponível mesmo sem o Prevision.
                  </p>
                  <Badge className="mt-4 border-success/30 bg-success/10 text-success">Selecionado</Badge>
                </div>
                <div className="rounded-2xl border border-accent/15 bg-surface p-5 opacity-75">
                  <Sparkles className="text-[#7c8985]" size={22} />
                  <h3 className="mt-4 text-sm font-bold text-[#465b54]">Sincronizar Prevision</h3>
                  <p className="mt-2 text-xs leading-5 text-[#84918c]">
                    Conector desacoplado, pronto para a futura API oficial.
                  </p>
                  <Badge className="mt-4 bg-brand/10">Opcional</Badge>
                </div>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 rounded-2xl border border-accent bg-surface-elevated p-5 ring-2 ring-brand/25">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand/20 text-accent shadow-sm">
                    <Layers3 size={22} />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-[#26473c]">
                      {templates.find((item) => item.id === templateId)?.name ??
                        "FAR Carpina — Acompanhamento mensal"}
                    </p>
                    <p className="mt-1 text-xs text-[#74837e]">
                      {templates.length
                        ? `Versão ${templates.find((item) => item.id === templateId)?.version ?? 1} · modelo real calibrado`
                        : "Modelo de demonstração · servidor não conectado"}
                    </p>
                  </div>
                  <CheckCircle2 size={20} className="text-brand" />
                </div>
                <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4">
                  <LockKeyhole size={18} className="mt-0.5 shrink-0 text-[#9b7226]" />
                  <div>
                    <p className="text-sm font-bold text-[#5e4d2b]">
                      Slides protegidos: 6 e 11
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#8a7b5d]">
                      Textos, imagens, formas, gráficos e formatação desses slides
                      permanecerão exatamente como no arquivo original.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {step === 5 ? (
              <div className="overflow-hidden rounded-2xl border">
                {[
                  ["Obra", project, "Cadastro selecionado", "Validado"],
                  [
                    "Mês detectado",
                    reference ? reference.split("-").reverse().join("/") : "Pendente",
                    "Excel · Curva S",
                    upload ? "Encontrado" : "Pendente",
                  ],
                  ["Planilha", excelName || "Pendente", "Arquivo original salvo", upload ? "Validado" : "Pendente"],
                  [
                    "Modelo",
                    templates.find((item) => item.id === templateId)?.name ?? "FAR Carpina",
                    "Compatibilidade da obra",
                    upload ? "Validado" : "Pendente",
                  ],
                ].map(([label, value, source, status]) => (
                  <div key={label} className="grid gap-2 border-b px-4 py-3 last:border-0 sm:grid-cols-[1fr_.7fr_1.4fr_auto] sm:items-center">
                    <p className="text-xs font-bold text-[#355248]">{label}</p>
                    <p className="text-xs text-[#4d625a]">{value}</p>
                    <p className="text-[11px] text-[#82908b]">{source}</p>
                    <Badge className={status === "Pendente" ? "border-warning/30 bg-warning/10 text-warning" : "border-success/30 bg-success/10 text-success"}>
                      {status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : null}

            {step === 6 ? (
              <div className="space-y-3">
                {[
                  ["Slide 1", "Capa", "Mês de referência", "Atualizar"],
                  ["Slide 5", "Gerenciamento físico", "10 indicadores e data da medição", "Atualizar"],
                  ["Slide 6", "Conteúdo institucional", "Nenhuma alteração permitida", "Protegido"],
                  ["Slide 11", "Registro fixo", "Nenhuma alteração permitida", "Protegido"],
                  ["Slide 16", "Despesa x receita", "16 valores financeiros", "Atualizar"],
                  ["Slides 20–22", "Desvios financeiros", "4 valores e percentuais", "Atualizar"],
                ].map(([slide, name, change, status]) => (
                  <div key={slide} className="flex items-center gap-4 rounded-xl border p-4">
                    <span className="grid h-9 w-14 shrink-0 place-items-center rounded-lg bg-brand/15 text-xs font-bold text-[#c8e2ff]">
                      {slide}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#2f4c42]">{name}</p>
                      <p className="mt-1 truncate text-[11px] text-[#81908b]">{change}</p>
                    </div>
                    <Badge className={status === "Protegido" ? "border-warning/30 bg-warning/10 text-warning" : "border-success/30 bg-success/10 text-success"}>
                      {status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : null}

            {step === 7 ? (
              <div className="grid min-h-[270px] place-items-center rounded-3xl bg-surface p-7 text-center">
                {generated ? (
                  <div>
                    <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/15 text-success">
                      <CheckCircle2 size={30} />
                    </span>
                    <h3 className="mt-5 text-xl font-bold text-[#21443a]">Apresentação gerada</h3>
                    <p className="mt-2 text-sm text-[#75857f]">
                      {generation
                        ? "O PowerPoint foi guardado em PowerPoints salvos e pode ser baixado quando quiser."
                        : "A prévia da demonstração foi concluída; nenhum arquivo real foi criado."}
                    </p>
                    {generation ? (
                      <div className="mt-5 flex flex-wrap justify-center gap-3">
                        <Button
                          onClick={() =>
                            window.open(
                              `${API_URL}/generations/${generation.id}/download`,
                              "_blank",
                            )
                          }
                        >
                          Baixar PowerPoint
                        </Button>
                        <Button asChild variant="secondary">
                          <Link href="/apresentacoes">Ver PowerPoints salvos</Link>
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() =>
                            window.open(
                              `${API_URL}/generations/${generation.id}/report`,
                              "_blank",
                            )
                          }
                        >
                          Baixar relatório
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div>
                    <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand/20 text-accent">
                      <Presentation size={29} />
                    </span>
                    <h3 className="mt-5 text-xl font-bold text-[#21443a]">Tudo pronto para gerar</h3>
                    <p className="mt-2 max-w-md text-sm leading-6 text-[#75857f]">
                      Os elementos mapeados serão atualizados. Os slides 6 e 11 serão
                      preservados exatamente, e os dados sem fonte ficarão para revisão.
                    </p>
                  </div>
                )}
              </div>
            ) : null}

            <div className="mt-8 flex items-center justify-between border-t pt-5">
              <Button
                variant="outline"
                disabled={step === 0}
                onClick={() => setStep((value) => Math.max(0, value - 1))}
              >
                <ArrowLeft size={16} />
                Voltar
              </Button>
              {!generated ? (
                <Button disabled={!canContinue || loading} onClick={() => void next()}>
                  {loading
                    ? "Processando..."
                    : step === steps.length - 1
                      ? "Gerar PowerPoint"
                      : "Continuar"}
                  {step === steps.length - 1 ? <Sparkles size={16} /> : <ArrowRight size={16} />}
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7e8c87]">
                Resumo do ciclo
              </p>
              <dl className="mt-4 space-y-4">
                {[
                  ["Obra", project || "Não selecionada"],
                  ["Referência", reference ? reference.split("-").reverse().join("/") : "Não informada"],
                  ["Planilha", excelName || "Pendente"],
                  [
                    "Modelo",
                    `FAR Carpina v${templates.find((item) => item.id === templateId)?.version ?? 1}`,
                  ],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-[#96a19d]">
                      {label}
                    </dt>
                    <dd className="mt-1 truncate text-xs font-bold text-[#345147]">{value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4">
            <div className="flex gap-3">
              <AlertTriangle size={18} className="shrink-0 text-[#a47b2d]" />
              <div>
                <p className="text-xs font-bold text-[#5f4f2f]">Regra crítica</p>
                <p className="mt-1 text-[11px] leading-5 text-[#8a7c5f]">
                  Nenhuma alteração é silenciosa. Toda origem, transformação e
                  mudança será registrada no relatório.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

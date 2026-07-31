"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { FileUp, Layers3, LockKeyhole, Presentation } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";

type Project = { id: string; name: string };
type Template = {
  id: string;
  project_id: string | null;
  name: string;
  original_filename: string;
  version: number;
  protected_slides: number[];
  is_active: boolean;
};

export default function ModelosPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [projectId, setProjectId] = useState("");
  const [name, setName] = useState("Modelo mensal de engenharia");
  const [protectedSlides, setProtectedSlides] = useState("6, 11");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [projectItems, templateItems] = await Promise.all([
        apiFetch<Project[]>("/projects"),
        apiFetch<Template[]>("/templates"),
      ]);
      setProjects(projectItems);
      setTemplates(templateItems);
      setProjectId((current) => current || projectItems[0]?.id || "");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Não foi possível carregar os modelos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setMessage("Selecione um arquivo PowerPoint.");
      return;
    }
    setSending(true);
    setMessage("");
    const body = new FormData();
    body.append("file", file);
    body.append("name", name);
    body.append("project_id", projectId);
    body.append("protected_slides", protectedSlides);
    try {
      const created = await apiFetch<Template>("/templates", { method: "POST", body });
      setTemplates((current) => [created, ...current]);
      setFile(null);
      setMessage(`Modelo ${created.original_filename} cadastrado com sucesso.`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Não foi possível cadastrar o modelo.");
    } finally {
      setSending(false);
    }
  }

  return (
    <AppShell title="Modelos de PowerPoint" eyebrow="Padronização">
      <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <Card>
          <CardContent>
            <div className="mb-5 flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand/18 text-accent"><FileUp size={22} /></span>
              <div><h2 className="text-lg font-bold">Cadastrar modelo oficial</h2><p className="mt-1 text-sm text-muted">O arquivo fica salvo e disponível nas próximas gerações.</p></div>
            </div>
            <form className="grid gap-4" onSubmit={upload}>
              <label className="grid gap-1.5 text-sm font-semibold">Obra
                <select aria-label="Obra" value={projectId} onChange={(event) => setProjectId(event.target.value)} className="h-11 rounded-xl border border-accent/20 bg-surface px-3 font-normal">
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold">Nome do modelo
                <input aria-label="Nome do modelo" value={name} onChange={(event) => setName(event.target.value)} className="h-11 rounded-xl border border-accent/20 bg-surface px-3 font-normal" />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold">Slides protegidos
                <input aria-label="Slides protegidos" value={protectedSlides} onChange={(event) => setProtectedSlides(event.target.value)} className="h-11 rounded-xl border border-accent/20 bg-surface px-3 font-normal" placeholder="6, 11" />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold">Arquivo PowerPoint
                <input aria-label="Arquivo PowerPoint" type="file" accept=".pptx" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="rounded-xl border border-dashed border-accent/30 bg-surface p-3 font-normal" />
              </label>
              <Button type="submit" disabled={sending || loading || !projectId}>{sending ? "Enviando modelo..." : "Enviar modelo"}</Button>
            </form>
            {message ? <p className="mt-4 rounded-xl border border-accent/20 bg-surface px-4 py-3 text-sm">{message}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="mb-5 flex items-center gap-3"><Layers3 className="text-accent" size={22} /><div><h2 className="font-bold">Modelos cadastrados</h2><p className="text-sm text-muted">{templates.length} arquivo(s) disponível(is)</p></div></div>
            {loading ? <p className="text-sm text-muted">Carregando...</p> : templates.length ? (
              <div className="grid gap-3">
                {templates.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-accent/15 bg-surface p-4">
                    <div className="flex items-start gap-3"><Presentation className="mt-0.5 shrink-0 text-success" size={20} /><div className="min-w-0 flex-1"><h3 className="font-bold">{item.name}</h3><p className="mt-1 truncate text-xs text-muted">{item.original_filename} · versão {item.version}</p><p className="mt-2 flex items-center gap-1.5 text-xs text-muted"><LockKeyhole size={13} /> Slides protegidos: {item.protected_slides.join(", ") || "nenhum"}</p></div></div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted">Nenhum modelo cadastrado.</p>}
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}

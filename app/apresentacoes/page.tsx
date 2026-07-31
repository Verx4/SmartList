"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, FileText, FolderArchive, RefreshCw, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { API_URL, apiFetch } from "@/lib/api";

type SavedPresentation = {
  id: string;
  project_name: string;
  template_name: string;
  excel_filename: string;
  reference_month: string;
  status: "pending" | "processing" | "review" | "completed" | "failed";
  warning_count: number;
  has_powerpoint: boolean;
  has_report: boolean;
  created_at: string;
};

const statusLabel: Record<SavedPresentation["status"], string> = {
  pending: "Pendente",
  processing: "Processando",
  review: "Revisão",
  completed: "Concluído",
  failed: "Falhou",
};

export default function ApresentacoesSalvasPage() {
  const [items, setItems] = useState<SavedPresentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      setItems(await apiFetch<SavedPresentation[]>("/generations/saved"));
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Não foi possível carregar os PowerPoints.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(id: string) {
    if (!window.confirm("Excluir esta apresentação salva?")) return;
    await apiFetch(`/generations/${id}`, { method: "DELETE" });
    setItems((current) => current.filter((item) => item.id !== id));
  }

  async function clearAll() {
    if (!items.length || !window.confirm("Limpar todos os PowerPoints salvos da sua conta?")) return;
    await apiFetch("/generations", { method: "DELETE" });
    setItems([]);
    setMessage("PowerPoints salvos removidos. Os Excel permanecem guardados.");
  }

  return (
    <AppShell title="PowerPoints salvos" eyebrow="Seus arquivos">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Acesse novamente todas as apresentações geradas na sua conta.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={16} /> Atualizar
          </Button>
          <Button variant="outline" onClick={() => void clearAll()} disabled={!items.length}>
            <Trash2 size={16} /> Limpar PowerPoints
          </Button>
        </div>
      </div>

      {message ? <div className="mb-5 rounded-xl border border-accent/30 bg-surface px-4 py-3 text-sm">{message}</div> : null}

      {loading ? (
        <Card><CardContent>Carregando apresentações...</CardContent></Card>
      ) : items.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent>
                <div className="flex items-start gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand/20 text-accent"><FolderArchive size={22} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold">{item.project_name} · {item.reference_month.split("-").reverse().join("/")}</h2>
                      <Badge className={item.status === "failed" ? "border-danger/40 bg-danger/10 text-danger" : "border-success/30 bg-success/10 text-success"}>{statusLabel[item.status]}</Badge>
                    </div>
                    <p className="mt-2 truncate text-xs text-muted">Modelo: {item.template_name}</p>
                    <p className="mt-1 truncate text-xs text-muted">Excel: {item.excel_filename}</p>
                    <p className="mt-1 text-xs text-muted">Gerado em {new Date(item.created_at).toLocaleString("pt-BR")}</p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2 border-t border-accent/15 pt-4">
                  <Button size="sm" disabled={!item.has_powerpoint} onClick={() => window.open(`${API_URL}/generations/${item.id}/download`, "_blank")}><Download size={15} /> PowerPoint</Button>
                  <Button size="sm" variant="secondary" disabled={!item.has_report} onClick={() => window.open(`${API_URL}/generations/${item.id}/report`, "_blank")}><FileText size={15} /> Relatório</Button>
                  <Button size="sm" variant="outline" onClick={() => void remove(item.id)}><Trash2 size={15} /> Excluir</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card><CardContent className="grid min-h-[280px] place-items-center text-center"><div><FolderArchive className="mx-auto text-accent" size={34} /><h2 className="mt-4 text-lg font-bold">Nenhum PowerPoint salvo</h2><p className="mt-2 text-sm text-muted">As próximas apresentações geradas aparecerão aqui automaticamente.</p></div></CardContent></Card>
      )}
    </AppShell>
  );
}

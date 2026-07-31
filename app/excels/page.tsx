"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, FileSpreadsheet, RefreshCw, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { API_URL, apiFetch } from "@/lib/api";

type SavedExcel = {
  id: string;
  project_name: string;
  original_filename: string;
  size_bytes: number;
  detected_reference_month: string | null;
  created_at: string;
};

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function ExcelsSalvosPage() {
  const [items, setItems] = useState<SavedExcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      setItems(await apiFetch<SavedExcel[]>("/uploads/excel/saved"));
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Não foi possível carregar os Excel.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(id: string) {
    if (!window.confirm("Excluir este Excel salvo? A apresentação já gerada continuará disponível.")) return;
    await apiFetch(`/uploads/excel/${id}`, { method: "DELETE" });
    setItems((current) => current.filter((item) => item.id !== id));
  }

  async function clearAll() {
    if (!items.length || !window.confirm("Limpar todos os Excel salvos da sua conta?")) return;
    await apiFetch("/uploads/excel", { method: "DELETE" });
    setItems([]);
    setMessage("Excel salvos removidos. Os PowerPoints gerados continuam disponíveis.");
  }

  return (
    <AppShell title="Excel salvos" eyebrow="Arquivos de origem">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Planilhas enviadas ficam disponíveis somente para a conta que fez o envio.</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw size={16} /> Atualizar</Button>
          <Button variant="outline" onClick={() => void clearAll()} disabled={!items.length}><Trash2 size={16} /> Limpar Excel</Button>
        </div>
      </div>

      {message ? <div className="mb-5 rounded-xl border border-accent/30 bg-surface px-4 py-3 text-sm">{message}</div> : null}

      {loading ? (
        <Card><CardContent>Carregando planilhas...</CardContent></Card>
      ) : items.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent>
                <div className="flex items-start gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-success/15 text-success"><FileSpreadsheet size={23} /></span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-bold">{item.original_filename}</h2>
                    <p className="mt-2 text-xs text-muted">Obra: {item.project_name}</p>
                    <p className="mt-1 text-xs text-muted">Mês identificado: {item.detected_reference_month ? item.detected_reference_month.split("-").reverse().join("/") : "não identificado"}</p>
                    <p className="mt-1 text-xs text-muted">{formatSize(item.size_bytes)} · enviado em {new Date(item.created_at).toLocaleString("pt-BR")}</p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2 border-t border-accent/15 pt-4">
                  <Button size="sm" onClick={() => window.open(`${API_URL}/uploads/excel/${item.id}/download`, "_blank")}><Download size={15} /> Baixar Excel</Button>
                  <Button size="sm" variant="outline" onClick={() => void remove(item.id)}><Trash2 size={15} /> Excluir</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card><CardContent className="grid min-h-[280px] place-items-center text-center"><div><FileSpreadsheet className="mx-auto text-success" size={34} /><h2 className="mt-4 text-lg font-bold">Nenhum Excel salvo</h2><p className="mt-2 text-sm text-muted">As planilhas enviadas na criação de apresentações aparecerão aqui.</p></div></CardContent></Card>
      )}
    </AppShell>
  );
}

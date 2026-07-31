import { FileCog } from "lucide-react";
import { ModulePage } from "@/components/module-page";

export default function MapeamentosPage() {
  return (
    <ModulePage
      title="Mapeamento de slides"
      eyebrow="Regras de atualização"
      description="Associe células, intervalos e campos padronizados aos elementos existentes do PowerPoint."
      actionLabel="Novo mapeamento"
      icon={FileCog}
      stats={[
        { label: "Vínculos FAR Carpina", value: "31", note: "calibrados no modelo real" },
        { label: "Com revisão", value: "4", note: "exigem confirmação humana" },
        { label: "Slides protegidos", value: "2", note: "slides 6 e 11" },
      ]}
      rows={[
        {
          title: "Slide 5 · Gerenciamento físico",
          subtitle: "Curva S e Progresso Mensal · percentuais e data",
          meta: "Formas: TextBox 24, 25, 27 e 31",
          status: "Calibrado",
          statusTone: "success",
        },
        {
          title: "Slide 16 · Despesa x receita",
          subtitle: "Abas Custo e Planilha1 · valores financeiros",
          meta: "Formas: TextBox 94 a 113",
          status: "Revisão",
          statusTone: "warning",
        },
        {
          title: "Slides 20–22 · Desvios financeiros",
          subtitle: "Aba Planilha1 · percentuais e valores financeiros",
          meta: "4 vínculos calibrados",
          status: "Revisão",
          statusTone: "warning",
        },
      ]}
    />
  );
}

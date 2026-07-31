import { History } from "lucide-react";
import { ModulePage } from "@/components/module-page";

export default function HistoricoPage() {
  return (
    <ModulePage
      title="Histórico"
      eyebrow="Rastreabilidade"
      description="Consulte apresentações geradas, arquivos de origem e relatórios detalhados de cada alteração."
      actionLabel="Exportar histórico"
      icon={History}
      stats={[
        { label: "Apresentações", value: "38", note: "armazenadas com segurança" },
        { label: "Este mês", value: "6", note: "5 concluídas e 1 em revisão" },
        { label: "Alertas revisados", value: "23", note: "100% com responsável" },
      ]}
      rows={[
        {
          title: "FAR Carpina · Junho 2026",
          subtitle: "far_carpina_2026-06.xlsx · Modelo v3",
          meta: "Hoje, 09:42 · Fernanda",
          status: "Concluído",
          statusTone: "success",
        },
        {
          title: "Residencial Aurora · Junho 2026",
          subtitle: "aurora_junho.xlsx · Modelo v2",
          meta: "Ontem, 16:18 · Marcos",
          status: "Em revisão",
          statusTone: "warning",
        },
        {
          title: "Parque das Águas · Maio 2026",
          subtitle: "pqa_maio.xlsx · Modelo v1",
          meta: "28 jun, 11:05 · Carla",
          status: "Concluído",
          statusTone: "success",
        },
      ]}
    />
  );
}

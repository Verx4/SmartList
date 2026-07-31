import { Layers3 } from "lucide-react";
import { ModulePage } from "@/components/module-page";

export default function ModelosPage() {
  return (
    <ModulePage
      title="Modelos de PowerPoint"
      eyebrow="Padronização"
      description="Gerencie os arquivos oficiais, versões de mapeamento e slides que nunca devem ser alterados."
      actionLabel="Enviar modelo"
      icon={Layers3}
      stats={[
        { label: "Modelos ativos", value: "1", note: "FAR Carpina cadastrado" },
        { label: "Slides do modelo", value: "24", note: "arquivo real de junho/2026" },
        { label: "Slides protegidos", value: "2", note: "slides 6 e 11" },
      ]}
      rows={[
        {
          title: "FAR Carpina — Acompanhamento mensal",
          subtitle: "FARCP_Apresentação_Engenharia_Junho.2026.pptx · 24 slides",
          meta: "31 vínculos · versão 1",
          status: "Ativo",
          statusTone: "success",
        },
      ]}
    />
  );
}

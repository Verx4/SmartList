import { Building2 } from "lucide-react";
import { ModulePage } from "@/components/module-page";

export default function ObrasPage() {
  return (
    <ModulePage
      title="Obras"
      eyebrow="Portfólio"
      description="Cadastre projetos, responsáveis, prazos, modelos e regras específicas de atualização."
      actionLabel="Cadastrar obra"
      icon={Building2}
      stats={[
        { label: "Obras ativas", value: "12", note: "8 dentro do prazo" },
        { label: "Encerradas", value: "7", note: "desde janeiro de 2025" },
        { label: "Responsáveis", value: "9", note: "engenheiros com acesso" },
      ]}
      rows={[
        {
          title: "FAR Carpina",
          subtitle: "FAR-CPN-001 · Cliente: Grupo Horizonte",
          meta: "Conclusão: 02/06/2027",
          status: "Ativa",
          statusTone: "success",
        },
        {
          title: "Residencial Aurora",
          subtitle: "RES-AUR-014 · Cliente: Vivaz Incorporações",
          meta: "Conclusão: 18/11/2026",
          status: "Atenção",
          statusTone: "warning",
        },
        {
          title: "Parque das Águas",
          subtitle: "PQA-008 · Cliente: Norte Empreendimentos",
          meta: "Conclusão: 12/02/2027",
          status: "Ativa",
          statusTone: "success",
        },
      ]}
    />
  );
}

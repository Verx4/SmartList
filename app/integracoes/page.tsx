import { PlugZap } from "lucide-react";
import { ModulePage } from "@/components/module-page";

export default function IntegracoesPage() {
  return (
    <ModulePage
      title="Integrações"
      eyebrow="Fontes externas"
      description="Estrutura preparada para conectar o Prevision por API oficial, sem bloquear a importação manual por Excel."
      actionLabel="Configurar integração"
      icon={PlugZap}
      stats={[
        { label: "Conexões ativas", value: "0", note: "MVP opera por Excel" },
        { label: "Última sincronização", value: "—", note: "nenhuma credencial cadastrada" },
        { label: "Importações manuais", value: "14", note: "Excel e CSV aceitos" },
      ]}
      rows={[
        {
          title: "Prevision",
          subtitle: "Conector oficial desacoplado · token criptografado",
          meta: "Aguardando credencial técnica",
          status: "Disponível em breve",
          statusTone: "neutral",
        },
        {
          title: "Importação de Excel",
          subtitle: "Fonte principal do MVP · .xlsx e .xlsm",
          meta: "Último uso: hoje, 09:38",
          status: "Ativa",
          statusTone: "success",
        },
        {
          title: "Importação de CSV",
          subtitle: "Alternativa para relatórios exportados",
          meta: "Codificação UTF-8",
          status: "Ativa",
          statusTone: "success",
        },
      ]}
    />
  );
}

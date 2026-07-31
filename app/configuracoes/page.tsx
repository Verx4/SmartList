import { Settings2 } from "lucide-react";
import { ModulePage } from "@/components/module-page";

export default function ConfiguracoesPage() {
  return (
    <ModulePage
      title="Configurações"
      eyebrow="Administração"
      description="Defina limites de arquivo, retenção, formatos de data e políticas de auditoria do ambiente."
      actionLabel="Salvar política"
      icon={Settings2}
      stats={[
        { label: "Limite por arquivo", value: "25 MB", note: "configurável por ambiente" },
        { label: "Retenção", value: "24 meses", note: "arquivos e relatórios" },
        { label: "Auditoria", value: "Ativa", note: "ações críticas registradas" },
      ]}
      rows={[
        {
          title: "Armazenamento privado",
          subtitle: "Diretório local no desenvolvimento · S3 compatível em produção",
          meta: "Criptografia no provedor",
          status: "Configurado",
          statusTone: "success",
        },
        {
          title: "Política de arquivos",
          subtitle: "Extensões permitidas e nomes seguros",
          meta: "Máximo de 25 MB",
          status: "Configurado",
          statusTone: "success",
        },
        {
          title: "Notificações de alerta",
          subtitle: "Avisos de inconsistência e revisão manual",
          meta: "E-mail pendente",
          status: "Revisar",
          statusTone: "warning",
        },
      ]}
    />
  );
}

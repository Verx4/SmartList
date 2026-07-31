import { Users } from "lucide-react";
import { ModulePage } from "@/components/module-page";

export default function UsuariosPage() {
  return (
    <ModulePage
      title="Usuários"
      eyebrow="Acesso e permissões"
      description="Gerencie perfis de administrador, engenharia e visualizador com autorização por rota."
      actionLabel="Convidar usuário"
      icon={Users}
      stats={[
        { label: "Usuários ativos", value: "9", note: "em 3 perfis de acesso" },
        { label: "Administradores", value: "2", note: "podem editar mapeamentos" },
        { label: "Último acesso", value: "Agora", note: "Fernanda Alves" },
      ]}
      rows={[
        {
          title: "Fernanda Alves",
          subtitle: "admin@engenhariaslides.com.br",
          meta: "Administrador",
          status: "Ativa",
          statusTone: "success",
        },
        {
          title: "Marcos Lima",
          subtitle: "marcos.lima@empresa.local",
          meta: "Engenharia",
          status: "Ativo",
          statusTone: "success",
        },
        {
          title: "Carla Souza",
          subtitle: "carla.souza@empresa.local",
          meta: "Visualizador",
          status: "Ativa",
          statusTone: "success",
        },
      ]}
    />
  );
}

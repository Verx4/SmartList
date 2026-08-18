# Backend do Smart List

API Spring Boot do projeto MeuPrimeiroSite, com cadastro, login JWT, listas,
mercados, planos, administração, scrapers, Checkout Pro e PIX do Mercado Pago.

## Início rápido local

1. Abra a pasta MeuPrimeiroSite.
2. Inicie o backend com backend/iniciar-local.cmd.
3. Aguarde a API subir em http://localhost:8080.
4. Abra o frontend com o Live Server na porta 5500.

O perfil local usa H2 persistente em backend/dados. A conta administrativa
local é admin@minhalista.local com senha Admin123!. Ela existe apenas para
desenvolvimento.

## Configuração segura do Mercado Pago

A integração preserva o Checkout Pro para cartão e usa a Payments API oficial
para PIX. O navegador nunca recebe o Access Token e o site não coleta número de
cartão, CVV ou senha. Os dados financeiros do cartão são informados somente na
página hospedada pelo Mercado Pago.

Configure estas variáveis no ambiente do backend:

- MERCADO_PAGO_ACCESS_TOKEN: credencial privada de teste (TEST-...) ou produção.
- MERCADO_PAGO_WEBHOOK_URL: URL pública HTTPS terminada em
  /api/pagamentos/webhook/mercado-pago.
- MERCADO_PAGO_WEBHOOK_SECRET: assinatura secreta exibida em
  Suas integrações > Webhooks > Configurar notificações.
- MERCADO_PAGO_PIX_EXPIRATION_MINUTES: validade do código PIX, entre 10 e
  1440 minutos; o padrão é 30.
- FRONTEND_URL: endereço do frontend, usado nos retornos do pagamento.
- CORS_ALLOWED_ORIGINS: origens autorizadas, separadas por vírgula.
- JWT_SECRET: segredo aleatório forte; é obrigatório fora do perfil local.

O arquivo .env.example serve somente como checklist. Não coloque credenciais
reais em arquivos versionados.

Exemplo temporário no PowerShell:

    $env:MERCADO_PAGO_ACCESS_TOKEN="TEST-seu-token"
    $env:MERCADO_PAGO_WEBHOOK_URL="https://seu-tunel.exemplo/api/pagamentos/webhook/mercado-pago"
    $env:MERCADO_PAGO_WEBHOOK_SECRET="sua-assinatura-secreta"
    $env:FRONTEND_URL="http://127.0.0.1:5500"
    .\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local"

Para testar webhooks localmente, use um túnel HTTPS. No painel do Mercado Pago,
cadastre essa mesma URL e habilite o evento Pagamentos. A conta recebedora também
precisa estar habilitada para PIX e ter uma chave PIX cadastrada no próprio
Mercado Pago; essa chave nunca entra no código. Use credenciais, conta compradora
e URL de webhook todas no mesmo ambiente: teste com teste, produção com produção.

## Proteções implementadas

- Access Token e assinatura secreta existem apenas no backend.
- Cada tentativa PIX é registrada localmente antes da chamada externa.
- Cada cobrança PIX possui UUID público e chave de idempotência própria.
- Cliques e retries reutilizam a cobrança pendente válida do mesmo plano.
- O webhook valida x-signature por HMAC-SHA256 em tempo constante.
- Notificações antigas são rejeitadas por uma janela de cinco minutos.
- O pagamento é consultado novamente na API oficial antes de alterar o plano.
- Valor, moeda BRL, referência, ciclo, metadados e ambiente são conferidos.
- Reenvios do mesmo pagamento não creditam tempo duas vezes.
- Reembolso, estorno ou cancelamento revoga a assinatura correspondente.
- CORS aceita somente as origens configuradas.
- Erros internos e respostas do Mercado Pago não expõem credenciais.

O fluxo atual vende acesso por período com pagamento único: mensal, trimestral
ou anual. Não há renovação automática.

## Endpoints principais

- GET /api/health
- POST /api/auth/cadastro
- POST /api/auth/login
- GET /api/assinaturas/planos
- GET /api/assinaturas/atual
- POST /api/assinaturas/checkout
- POST /api/payments/pix
- GET /api/payments/{paymentId}/status
- GET /api/payments/pix/pending
- POST /api/pagamentos/webhook/mercado-pago

## Testes

    cd backend
    .\mvnw.cmd --no-transfer-progress test

Os testes cobrem a inicialização do Spring, fluxos existentes, os valores dos
planos, a assinatura HMAC do webhook, a janela contra replay, idempotência,
status PIX, proteção contra valor adulterado e concessão única do Premium.

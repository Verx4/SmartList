# Engenharia Slides

MVP para transformar planilhas mensais de obras em apresentações PowerPoint
padronizadas, mantendo o arquivo modelo como base visual e registrando todas as
alterações realizadas.

## O que já está implementado

- Interface responsiva em Next.js, TypeScript, Tailwind CSS e componentes no
  padrão shadcn/ui.
- Painel, login, obras, fluxo de nova apresentação, modelos, mapeamentos,
  integrações, histórico, usuários e configurações.
- API FastAPI documentada automaticamente em `/docs`.
- Autenticação JWT com access e refresh tokens em cookies `HttpOnly`.
- Perfis `admin`, `engineering` e `viewer`, com autorização no servidor.
- Cadastro de obras e versionamento de modelos.
- Upload privado com validação de extensão, limite de tamanho, nome seguro,
  hash SHA-256 e caminhos internos gerados pelo servidor.
- Leitura de abas, células preenchidas, fórmulas, valores calculados, formatos,
  tabelas, cabeçalhos e células mescladas do Excel.
- Mapeamento por placeholder (`{{CAMPO}}`) ou nome interno da forma.
- Slides protegidos; o modelo FAR Carpina usa os slides **6 e 11**.
- Geração sobre uma cópia do PowerPoint original, sem modificar os arquivos de
  entrada.
- Relatório JSON com slides alterados, valores anteriores e novos, fonte,
  transformação, avisos e slides protegidos.
- Histórico e download autenticado do PowerPoint e do relatório.
- PostgreSQL, Alembic, Docker Compose, dados fictícios e testes.
- Conector Prevision desacoplado, com o Excel mantido como fonte funcional.

## Estrutura

```text
.
├── app/                       # páginas do frontend
├── components/                # shell e componentes de interface
├── lib/                       # cliente da API e utilitários
├── backend/
│   ├── app/
│   │   ├── api/routes/        # rotas FastAPI
│   │   ├── core/              # configuração, banco e segurança
│   │   ├── models/            # entidades SQLAlchemy
│   │   ├── schemas/           # contratos Pydantic
│   │   └── services/          # Excel, PowerPoint e armazenamento
│   ├── alembic/               # migrações
│   ├── scripts/               # criação dos arquivos fictícios
│   └── tests/                 # testes da API e dos processadores
├── demo/                      # arquivos fictícios gerados
├── docker-compose.yml
└── .env.example
```

## Execução recomendada com Docker

Pré-requisito: Docker Desktop.

1. Duplique `.env.example` como `.env`.
2. Troque `SECRET_KEY` por uma chave aleatória longa.
3. Na raiz do projeto, execute:

```bash
docker compose up --build
```

Serviços:

- Aplicação: <http://localhost:3000>
- API: <http://localhost:8000>
- Documentação interativa: <http://localhost:8000/docs>

O backend aplica a migração e cria automaticamente a obra inicial. Cada pessoa
deve criar sua própria conta pela tela `/cadastro`.

## Execução local sem Docker

### Frontend

Use Node.js 22+ e pnpm.

```bash
pnpm install
pnpm dev
```

Crie `.env.local` com:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### Backend

Use Python 3.12+ e um PostgreSQL disponível. Dentro de `backend`:

```bash
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload
```

Para uma avaliação rápida sem PostgreSQL, altere temporariamente no
`backend/.env`:

```env
DATABASE_URL=sqlite:///./engenharia_slides.db
```

## Primeiro acesso

Abra <http://localhost:3000/cadastro>, informe nome, e-mail e uma senha com pelo
menos oito caracteres. Nenhuma senha padrão é publicada no código.

## Arquivos de demonstração

Para recriar a planilha e o PowerPoint fictícios:

```bash
cd backend
python scripts/create_demo_files.py
```

Os arquivos são salvos em `demo/`. O modelo contém 19 slides e placeholders
compatíveis com o serviço; os slides 6 e 11 têm conteúdo fixo para testar a
proteção.

## Testes

Backend:

```bash
cd backend
pytest
```

Frontend:

```bash
pnpm test
```

O conjunto cobre saúde da API, login e cookies, autorização, cadastro de obra,
análise de Excel, substituição de placeholders e preservação de slide protegido.

## Fluxo do MVP

1. Cadastre ou selecione a obra.
2. Envie a planilha Excel.
3. Envie um PowerPoint modelo e defina seus slides protegidos.
4. Cadastre os mapeamentos, por exemplo:

```json
{
  "slide_number": 8,
  "purpose": "Progresso físico",
  "source_type": "excel",
  "source_ref": "Planejamento!D2",
  "target_kind": "placeholder",
  "target_ref": "{{PROGRESSO_REALIZADO}}",
  "content_type": "percentage",
  "format_rule": {
    "decimals": 2,
    "source_is_fraction": true
  },
  "requires_review": false
}
```

5. Gere a apresentação somente após revisar os avisos.
6. Baixe o PowerPoint e o relatório pelo histórico.

## Segurança e limitações conhecidas

- Arquivos originais nunca são sobrescritos.
- Macros não são executadas.
- O armazenamento local é privado e não é servido estaticamente.
- Downloads exigem autenticação.
- Credenciais do Prevision não foram implementadas no MVP. O modelo de banco
  reserva apenas um campo para conteúdo criptografado; uma integração real deve
  usar API oficial, KMS/secret manager e nunca expor o token ao frontend.
- `python-pptx` preserva a maior parte do pacote OOXML, mas modelos com recursos
  avançados devem ser validados com os arquivos reais antes da produção.
- Para produção, use HTTPS, `SECURE_COOKIES=true`, segredos externos, antivírus
  de upload, armazenamento S3 compatível e fila isolada de processamento.

## Quando os arquivos reais forem enviados

Coloque uma cópia do PowerPoint e da planilha em uma área de referência e
cadastre-os pelo aplicativo. O analisador apenas lê os originais; toda geração é
feita em um novo arquivo. Depois disso, ajuste o mapeamento por modelo e execute
os testes de regressão visual antes de liberar o ciclo mensal.

# Integrações da área de Receitas

## Estratégia adotada

1. A busca começa no catálogo próprio `data/receitas.json`, que funciona inclusive sem conexão.
2. Ao confirmar a busca, o backend consulta o TheMealDB quando `THEMEALDB_API_KEY` está configurada. A chave nunca é enviada ao navegador. Os resultados são normalizados, persistidos na base de receitas e identificados como `THEMEALDB`.
3. Se ainda não houver resultado, o usuário pode solicitar explicitamente uma receita criada por IA. Essa opção usa `OPENAI_API_KEY` somente no backend, salva a receita estruturada e a identifica como `IA`.

Nenhuma foto retornada pelos provedores é armazenada ou exibida.

## Comparação objetiva

| Provedor | Vantagens | Limitações consideradas | Decisão |
| --- | --- | --- | --- |
| TheMealDB | Ingredientes, medidas e modo de preparo; API oficial simples | Busca principal em inglês; chave de apoiador para uso em produção | Provedor externo principal e opcional |
| Edamam | Catálogo amplo e boa estrutura de ingredientes | Receitas da web podem não fornecer o passo a passo completo e exigem regras de atribuição | Não adotado para o modo guiado |
| Spoonacular | Busca e estrutura culinária amplas | Plano e regras comerciais precisam ser avaliados para o volume oficial | Mantido como alternativa futura |
| OpenAI | Gera uma receita completa sob demanda e em português | Custo variável; conteúdo deve ser identificado e validado | Fallback explícito, nunca automático |

Referências oficiais consultadas:

- https://www.themealdb.com/docs_api_guide.php
- https://www.themealdb.com/terms_of_use.php
- https://developer.edamam.com/edamam-recipe-api
- https://www.postman.com/spoonacular-api/spoonacular-api/documentation/rqqne3j/spoonacular-api

## Variáveis de ambiente

- `THEMEALDB_API_KEY`: chave de produção do TheMealDB.
- `THEMEALDB_BASE_URL`: opcional; padrão `https://www.themealdb.com/api/json/v1`.
- `OPENAI_API_KEY`: compartilhada com a integração já existente no backend, sem exposição no frontend.
- `OPENAI_RECIPE_MODEL`: opcional; padrão `gpt-5-nano`.

Sem essas chaves, o catálogo local, a despensa, a compatibilidade, os favoritos e todo o modo de preparo continuam funcionando normalmente.

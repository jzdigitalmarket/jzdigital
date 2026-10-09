# Painel Portuário JZ Digital

Painel de Itajaí com manobras da Praticagem ZP-21, clima, cotações, notícias, calendário com notas, tarefas e ferramentas de produtividade. A página principal é `index.html`.

## Estrutura e rotas

| Arquivo | Função |
|---|---|
| `index.html` | Painel, calendário, tarefas, calculadora, conversores e mensagens |
| `functions/api/movimentacao-navios.js` | Rota `/api/movimentacao-navios` no Cloudflare Pages |
| `functions/api/canal.js` | Rota `/api/canal` para a foto pública do canal |
| `functions/api/cotacoes.js` | Rota `/api/cotacoes` e fontes alternativas de cotações |
| `functions/api/gemini.js` | Rota `/api/gemini` usada pelo Editor |
| `ainews3.html` | Radar Portuário |
| `editor.html` | Editor de texto com sugestões de IA |
| `navio-mascote.png` | Mascote do painel |
| `assets/porto/` | Três fotografias WebP utilizadas no fundo |
| `docs/mapa-arquivos.md` | Inventário dos arquivos e referências locais encontradas |
| `tests/api.test.mjs` | Testes das APIs com fontes simuladas |

As pastas `api/`, `pages/` e as páginas independentes foram preservadas. Sua presença não comprova outro ambiente publicado. No Cloudflare Pages, as rotas do painel acima são atendidas por `functions/api/`. Não mova ou exclua páginas apenas porque não aparecem no menu: favoritos e links externos podem depender delas.

## Manobras e atualização

A fonte é https://praticoszp21.com.br/movimentacao-de-navios/ . A consulta tem limite de espera de 8 segundos. O cache da Function mantém o resultado recente por 60 segundos e uma cópia anterior por até 6 horas. A chave do cache ignora parâmetros de consulta; a atualização manual respeita esse intervalo. Consultas simultâneas na mesma instância compartilham o pedido à fonte.

O cache usa `caches.default`, compartilhado por centro de dados da Cloudflare, e não um banco de dados persistente. Em ambiente sem cache disponível, a consulta continua funcionando. O navegador também guarda a última consulta bem-sucedida por até 6 horas.

Quando há falha da fonte, os registros anteriores podem continuar visíveis com sua data, mas a barra aparece como **NÃO CONFIRMADA**. Dados anteriores não acionam alertas de mudança. A cópia não constitui confirmação operacional atual. O painel consulta novamente a cada 2 minutos enquanto estiver visível.

## Foto do canal

A foto fica à direita do título das manobras. O navegador consulta `/api/canal` ao abrir a página, a cada 60 segundos enquanto estiver visível e ao retornar à aba. Configure `CANAL_CAMERA_URL` no Cloudflare Pages com o endereço HTTPS de uma imagem pública atual da câmera (JPEG, PNG ou WebP). O endereço fica no servidor; a rota não aceita URLs enviadas pelo navegador. A fonte tem limite de espera de 8 segundos e imagem de até 5 MB.

Sem fonte configurada ou em caso de falha, aparece **Imagem indisponível**; uma foto anterior é ocultada. A legenda informa o horário da consulta, não o horário de captura. A frequência de captura depende da câmera. Uma miniatura fixa de vídeo ou o indicador ilustrativo da Praticagem não substituem uma foto atual do canal.

## Calendário e calculadora

Notas e tarefas são locais ao navegador e dispositivo, sem sincronização de contas. A exportação JSON inclui apenas as notas. Ao restaurar uma cópia, notas existentes são preservadas por padrão; sua substituição exige marcar a opção correspondente. Se uma gravação falha, a restauração tenta reverter as alterações parciais e informa o resultado.

A calculadora aceita expressões, parênteses e vírgula decimal, sem `eval`. Em adição ou subtração, um termo de porcentagem isolado é relativo ao valor à esquerda: `50 + 10% = 55`, `50 - 10% = 45`. Em multiplicação ou divisão, `%` representa a fração: `50 * 10% = 5`. Termos com multiplicações ou divisões próprias seguem a precedência matemática normal. O cálculo de dias úteis exclui o início, inclui o final e exige informar os feriados desejados.

## Notícias e imagens

O Radar consulta feeds através do rss2json, com limite de espera de 10 segundos por pedido, e informa quantas fontes responderam. Se nenhuma fonte responder, tenta mostrar uma cópia local de até 24 horas, identificada como desatualizada. Não há garantia de disponibilidade das fontes externas.

As fotos de fundo foram copiadas das URLs já usadas no painel, otimizadas em WebP e mantidas em `assets/porto/`. Origens:

- https://www.portoitajai.com.br/img/news/photo/6702.jpg
- https://www.portoitajai.com.br/img/news/photo/6311.jpg
- https://www.portoitajai.com.br/img/news/photo/4582.jpg

## Editor e configuração da IA

Configure `GEMINI_API_KEY` como segredo no Cloudflare Pages. `GEMINI_MODEL` é opcional; o padrão é `gemini-3.8-flash`. A chave não é enviada ao navegador. O Editor envia `POST /api/gemini` com `{ "acao": "corrigir", "text": "..." }`; `action` é aceito como compatibilidade. As ações disponíveis são corrigir, melhorar, formal, simplificar, resumir e traduzir.

O servidor limita o texto a 20.000 caracteres, o corpo a 120.000 bytes e a espera pelo provedor a 25 segundos. Sem chave configurada, retorna indisponibilidade. A resposta permanece como sugestão para revisão; o usuário decide aplicar ou descartar.

Há uma proteção básica de 10 solicitações por IP por minuto por instância. Ela não é um limite global nem substitui autenticação ou regras da plataforma. Um binding opcional `AI_RATE_LIMITER` pode aplicar a política da plataforma; se presente, será usado em vez do limite básico. As cotas do provedor continuam aplicáveis.

## Verificação

Execute na raiz com Node 20 ou superior:

```sh
node tests/api.test.mjs
node tests/canal.test.mjs
```

Os testes usam fontes simuladas e não exigem chave nem geram solicitações ao Gemini. Cobrem parsing, cache, simultaneidade, cópia anterior, timeout, ações do Editor, validação e limite de requisições. A configuração de segredos e o funcionamento do provedor no ambiente publicado precisam ser verificados nesse ambiente.

Documentação da plataforma: https://developers.cloudflare.com/workers/runtime-apis/cache/ e https://developers.cloudflare.com/pages/functions/api-reference/ .

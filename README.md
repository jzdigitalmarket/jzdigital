# Painel Portuário JZ Digital

Painel de Itajaí com manobras da Praticagem ZP-21, clima, cotações, notícias, calendário com notas e câmera do canal. A página principal é `index.html`.

## Estrutura e rotas

| Arquivo | Função |
|---|---|
| `index.html` | Painel de manobras, câmera do canal e calendário com notas |
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

## Vídeo do canal via YouTube

A transmissão completa `HLbQIdAiO1M`, da ConexãoDCTV, aparece no player oficial do YouTube no primeiro quadro da lateral direita, com o calendário abaixo. O vídeo roda continuamente, sem pausas programadas nem recarregamento a cada minuto. Os controles originais permitem pausar, retomar, ajustar o volume e abrir em tela cheia. O início automático é solicitado sem som; o usuário pode ativar o áudio pelos controles do vídeo.

Se o navegador bloquear o início automático, o botão **Iniciar vídeo** permite a interação necessária. Falhas e encerramento da transmissão são informados; **Ver ao vivo** abre a fonte original. Se a API não carregar, os controles do próprio player continuam disponíveis. O player tem pelo menos 200 × 200 pixels nas telas suportadas. A incorporação depende do YouTube e das permissões do canal, sem exigir chave de API.

A rota `/api/canal` permanece disponível como alternativa para uma câmera que forneça foto pública JPEG, PNG ou WebP. Para usá-la numa integração futura, configure `CANAL_CAMERA_URL` no Cloudflare Pages com o endereço HTTPS da imagem. Essa rota não é consultada pelo player do YouTube; limita a fonte a 8 segundos e 5 MB e retorna indisponibilidade sem configuração ou em falhas.

Referência: https://developers.google.com/youtube/iframe_api_reference .

## Calendário com notas

Clique em qualquer data para criar, editar ou excluir sua nota. Datas com notas exibem uma bolinha piscando; ao passar o mouse, aparece um resumo. Notas são locais ao navegador e dispositivo, sem sincronização de contas.

Calculadora, conversores, datas/horas, mensagens, tarefas e exportação/restauração foram retirados do painel. Os dados locais já salvos não foram apagados; páginas independentes antigas continuam com seus endereços preservados.

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

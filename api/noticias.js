// functions/api/noticias.js  →  responde em /api/noticias
// Agrega várias fontes (Google News, Bing News e sites específicos), filtra,
// remove duplicadas e devolve JSON ordenado da mais recente para a mais antiga.

const GN = q =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
const BING = q =>
  `https://www.bing.com/news/search?q=${encodeURIComponent(q)}&format=rss&setmkt=pt-BR`;

// Sites cobertos via Google News (operador site:). Se algum não render nada, remova.
const SITES = [
  "ndmais.com.br",
  "nsctotal.com.br",
  "portosenavios.com.br",
  "portogente.com.br",
  "diariodoporto.com.br",
  "guiamaritimo.com.br",
];

// trusted = busca já é específica, não precisa passar pelo filtro de palavras
const FEEDS = [
  { nome: "Google: Porto de Itajaí", url: GN('"Porto de Itajaí" when:90d'), trusted: true },
  { nome: "Google: Portonave", url: GN("Portonave when:90d"), trusted: true },
  { nome: "Google: APM Terminals Itajaí", url: GN('"APM Terminals" Itajaí when:90d'), trusted: true },
  { nome: "Google: Navegantes / Complexo", url: GN('"Porto de Navegantes" OR "Complexo Portuário de Itajaí" when:90d'), trusted: true },
  { nome: "Google: SPI / Autoridade", url: GN('"Superintendência do Porto de Itajaí" OR "Autoridade Portuária de Itajaí" when:180d'), trusted: true },
  { nome: "Google: ANTAQ Itajaí", url: GN("ANTAQ Itajaí arrendamento OR concessão OR licitação when:180d"), trusted: true },
  { nome: "Google: Barra / Praticagem", url: GN('barra Itajaí navios OR praticagem OR calado when:60d'), trusted: false },
  { nome: "Bing: Porto de Itajaí", url: BING('"Porto de Itajaí"'), trusted: false },
  { nome: "Bing: Portonave", url: BING("Portonave Navegantes"), trusted: false },
  ...SITES.map(d => ({
    nome: `Site: ${d}`,
    url: GN(`(Itajaí OR Navegantes OR Portonave) porto site:${d} when:120d`),
    trusted: false,
  })),
  // Feed direto (WordPress). Se der erro, aparece em "fontes.falhas" e é ignorado.
  { nome: "Portos e Navios (feed)", url: "https://www.portosenavios.com.br/feed", trusted: false },
];

const MATCH =
  /(porto\s+(de\s+)?itaja[ií]|complexo\s+portu[aá]rio|portonave|apm\s+terminals|jbs\s+terminais|porto\s+de\s+navegantes|barra\s+(do\s+)?(rio\s+)?itaja[ií]|superintend[eê]ncia\s+do\s+porto|itaja[ií].{0,60}(portu|navio|terminal|cais)|(portu|navio|terminal|cais).{0,60}itaja[ií]|navegantes.{0,60}(portu|navio|terminal))/i;

const MAX_IDADE_DIAS = 180;
const LIMITE = 30;

function decode(s = "") {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&");
}

const strip = s => decode(s).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

function tag(bloco, nome) {
  const m = bloco.match(new RegExp(`<${nome}(?:\\s[^>]*)?>([\\s\\S]*?)</${nome}>`, "i"));
  return m ? m[1] : "";
}

function parseRSS(xml) {
  const itens = [];
  const blocos = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
  for (const b of blocos) {
    let titulo = strip(tag(b, "title"));
    const link = decode(tag(b, "link")).trim();
    const desc = strip(tag(b, "description"));
    let fonte = strip(tag(b, "source"));
    const t = Date.parse(tag(b, "pubDate")) || 0;

    // Google News: "Título - Veículo"
    if (!fonte && titulo.includes(" - ")) {
      const partes = titulo.split(" - ");
      fonte = partes.pop();
      titulo = partes.join(" - ");
    } else if (fonte && titulo.endsWith(" - " + fonte)) {
      titulo = titulo.slice(0, -(fonte.length + 3));
    }
    if (!titulo || !/^https?:\/\//i.test(link)) continue;
    itens.push({ titulo, link, desc, fonte: fonte || "Notícia portuária", t });
  }
  return itens;
}

async function buscar(feed) {
  const r = await fetch(feed.url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; JZDigitalPainel/1.0)",
      Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.5",
    },
    signal: AbortSignal.timeout(8000),
    cf: { cacheTtl: 300 },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const itens = parseRSS(await r.text());
  return itens.map(i => ({ ...i, trusted: feed.trusted, origem: feed.nome }));
}

const norm = s =>
  s.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const cache = caches.default;
  const chave = new Request(url.origin + "/api/noticias");

  if (!url.searchParams.has("atualizar")) {
    const hit = await cache.match(chave);
    if (hit) return hit;
  }

  const resultados = await Promise.allSettled(FEEDS.map(buscar));
  const ok = [];
  const falhas = [];
  const todos = [];

  resultados.forEach((res, i) => {
    if (res.status === "fulfilled") {
      ok.push(`${FEEDS[i].nome} (${res.value.length})`);
      todos.push(...res.value);
    } else {
      falhas.push(`${FEEDS[i].nome}: ${res.reason?.message || "erro"}`);
    }
  });

  const limite = Date.now() - MAX_IDADE_DIAS * 86400000;
  const vistos = new Set();

  const itens = todos
    .filter(i => (i.trusted || MATCH.test(`${i.titulo} ${i.desc}`)) && (!i.t || i.t >= limite))
    .sort((a, b) => b.t - a.t)
    .filter(i => {
      const k = norm(i.titulo).slice(0, 90);
      if (vistos.has(k)) return false;
      vistos.add(k);
      return true;
    })
    .slice(0, LIMITE)
    .map(i => ({
      titulo: i.titulo,
      fonte: i.fonte,
      link: i.link,
      data: i.t ? new Date(i.t).toISOString() : "",
    }));

  const corpo = {
    sucesso: itens.length > 0,
    atualizadoEm: new Date().toISOString(),
    total: itens.length,
    fontes: { ok, falhas },
    itens,
  };
  if (!itens.length) corpo.erro = "Nenhuma fonte retornou notícias.";

  const resposta = new Response(JSON.stringify(corpo), {
    status: itens.length ? 200 : 502,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
  if (itens.length) context.waitUntil(cache.put(chave, resposta.clone()));
  return resposta;
}

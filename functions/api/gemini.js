// Cloudflare Pages: /api/gemini. A chave permanece no servidor.
const MODELO_PADRAO = "gemini-3.8-flash";
const LIMITE = 20000;
const INSTRUCOES = {
  corrigir: "Corrija erros gramaticais, ortográficos e de pontuação em português, mantendo sentido e tom. Responda somente com o texto corrigido.",
  melhorar: "Melhore a clareza e a fluidez do texto em português, mantendo sentido e tom. Responda somente com o texto reescrito.",
  formal: "Reescreva o texto em linguagem formal e institucional, em português do Brasil, sem alterar o sentido. Responda somente com o texto reescrito.",
  simplificar: "Reescreva o texto em linguagem simples e direta, sem perder informações. Responda somente com o texto reescrito.",
  resumir: "Resuma o texto em poucas frases, em português. Responda somente com o resumo.",
  traduzir: "Traduza o texto para inglês. Responda somente com a tradução."
};
const windows = new Map();
const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...(status === 429 ? { "Retry-After": "60" } : {}) }
});
async function readBody(request) {
  const limit = 120000;
  if (Number(request.headers.get("Content-Length")) > limit) throw Object.assign(new Error("Pedido muito grande."), { status: 413 });
  if (!request.body) throw Object.assign(new Error("Requisição vazia."), { status: 400 });
  const reader = request.body.getReader(), chunks = [];
  let size = 0;
  try {
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length;
      if (size > limit) { await reader.cancel(); throw Object.assign(new Error("Pedido muito grande."), { status: 413 }); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw Object.assign(new Error("JSON inválido."), { status: 400 }); }
}
async function allowed(request, env) {
  const ip = request.headers.get("CF-Connecting-IP") || "sem-ip";
  if (env.AI_RATE_LIMITER) return (await env.AI_RATE_LIMITER.limit({ key: ip })).success;
  // Proteção básica por instância. O binding acima pode impor a política na plataforma.
  const now = Date.now();
  for (const [key, entry] of windows) if (entry.until <= now) windows.delete(key);
  let entry = windows.get(ip);
  if (!entry) { if (windows.size >= 10000) return false; entry = { count: 0, until: now + 60000 }; windows.set(ip, entry); }
  return ++entry.count <= 10;
}
export const onRequestGet = ({ env }) => json({ ok: true, usar: "POST { acao, text }", chaveConfigurada: Boolean(env.GEMINI_API_KEY) });
export async function onRequestPost({ request, env }) {
  let timeout;
  try {
    const origem = request.headers.get("Origin");
    if (origem && origem !== new URL(request.url).origin) return json({ error: "Origem não permitida" }, 403);
    if (!env.GEMINI_API_KEY) return json({ error: "Serviço de IA não configurado no servidor." }, 503);
    if (!request.headers.get("Content-Type")?.toLowerCase().includes("application/json")) return json({ error: "Envie application/json." }, 415);
    const body = await readBody(request), acao = body?.acao || body?.action, text = body?.text;
    if (typeof acao !== "string" || !Object.hasOwn(INSTRUCOES, acao) || typeof text !== "string" || !text.trim()) return json({ error: "Requisição inválida" }, 400);
    if (text.length > LIMITE) return json({ error: `Texto muito longo (máx. ${LIMITE} caracteres). Selecione um trecho.` }, 413);
    if (!await allowed(request, env)) return json({ error: "Muitas solicitações. Aguarde um minuto." }, 429);
    const controller = new AbortController(); timeout = setTimeout(() => controller.abort(), 25000);
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.GEMINI_MODEL || MODELO_PADRAO)}:generateContent`, {
      method: "POST", signal: controller.signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: INSTRUCOES[acao] }] }, contents: [{ role: "user", parts: [{ text }] }] })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return json({ error: response.status === 429 ? "Limite do serviço de IA atingido. Aguarde e tente novamente." : "Serviço de IA temporariamente indisponível." }, response.status === 429 ? 429 : 502);
    const result = (data.candidates?.[0]?.content?.parts || []).map(part => part.text || "").join("").trim();
    if (!result) return json({ error: "A IA não retornou texto. Tente novamente com outro trecho." }, 502);
    return json({ result });
  } catch (error) {
    return json({ error: error.name === "AbortError" ? "O serviço de IA demorou demais para responder." : error.status ? error.message : "Não foi possível consultar a IA agora." }, error.status || (error.name === "AbortError" ? 504 : 502));
  } finally { clearTimeout(timeout); }
}

// Cloudflare Pages Function -> rota /api/gemini
// Requer a variável de ambiente GEMINI_API_KEY (Pages > Settings > Environment variables)

// Modelo padrão; para trocar sem editar o código, crie GEMINI_MODEL nas variáveis do Pages
const MODELO_PADRAO = "gemini-3.8-flash";
const LIMITE = 20000; // caracteres

const INSTRUCOES = {
  corrigir:
    "Corrija erros gramaticais e ortográficos e melhore a fluidez do texto em português, mantendo o tom original. Responda SOMENTE com o texto corrigido, sem comentários nem introdução.",
  resumir:
    "Faça um resumo claro e conciso do texto em português. Responda SOMENTE com o resumo, sem introdução."
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });

// GET serve só para diagnóstico: abra /api/gemini no navegador
export const onRequestGet = ({ env }) =>
  json({ ok: true, usar: "POST { acao, text }", chaveConfigurada: Boolean(env.GEMINI_API_KEY) });

export async function onRequestPost({ request, env }) {
  try {
    const origem = request.headers.get("Origin");
    if (origem && origem !== new URL(request.url).origin)
      return json({ error: "Origem não permitida" }, 403);

    if (!env.GEMINI_API_KEY)
      return json({ error: "GEMINI_API_KEY não configurada no Cloudflare Pages" }, 500);

    const { acao, text } = await request.json();
    if (!INSTRUCOES[acao] || typeof text !== "string" || !text.trim())
      return json({ error: "Requisição inválida" }, 400);
    if (text.length > LIMITE)
      return json({ error: `Texto muito longo (máx. ${LIMITE} caracteres). Selecione um trecho.` }, 413);

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL || MODELO_PADRAO}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: INSTRUCOES[acao] }] },
          contents: [{ role: "user", parts: [{ text }] }]
        })
      }
    );
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return json({ error: data.error?.message || `Gemini HTTP ${r.status}` }, 502);

    const result = (data.candidates?.[0]?.content?.parts || [])
      .map(p => p.text || "")
      .join("")
      .trim();
    if (!result) return json({ error: "Resposta vazia (possível bloqueio de segurança do Gemini)" }, 502);

    return json({ result });
  } catch (e) {
    return json({ error: e.message || "Erro interno" }, 500);
  }
}

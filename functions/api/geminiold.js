export async function onRequest(context) {
    const { request, env } = context;

    if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "Método não permitido" }), {
            status: 405,
            headers: { "Content-Type": "application/json" }
        });
    }

    try {
        const body = await request.json();
        const prompt = body.prompt || "";
        const text = body.text || "";

        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey) {
            return new Response(JSON.stringify({ error: "Chave GEMINI_API_KEY não encontrada." }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const fullPrompt = `${prompt}\n\nTexto:\n${text}`;

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: fullPrompt }] }]
            })
        });

        const data = await response.json();

        // Se o Google não retornou candidatos, mostra o erro exato retornado pela API
        if (!data.candidates || data.candidates.length === 0) {
            return new Response(JSON.stringify({ result: `Erro da API Google: ${JSON.stringify(data)}` }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        }

        const candidate = data.candidates[0];
        if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
            return new Response(JSON.stringify({ result: `Bloqueio de segurança ou resposta vazia: ${JSON.stringify(data)}` }), {
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        }

        const aiText = candidate.content.parts[0].text;

        return new Response(JSON.stringify({ result: aiText }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (err) {
        return new Response(JSON.stringify({ result: `Erro interno: ${err.message}` }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}

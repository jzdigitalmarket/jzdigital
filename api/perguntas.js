// functions/api/perguntas.js
export async function onRequest(context) {
    // 'DB' é o nome da variável de ligação (binding) que você definirá no painel
    const { env } = context;
    
    try {
        const { results } = await env.DB.prepare(
            "SELECT * FROM perguntas"
        ).all();

        return new Response(JSON.stringify(results), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

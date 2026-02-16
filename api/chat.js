export default async function handler(req, res) {
    // 1. Bloqueia métodos que não sejam POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const { prompt } = req.body;

    // Verifica se o prompt existe para evitar erro de envio vazio
    if (!prompt) {
        return res.status(400).json({ error: 'O campo prompt é obrigatório.' });
    }

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile", 
                messages: [
                    { 
                        role: "system", 
                        content: `Você é o estrategista da JZ Digital.
                        
                        CONTEXTO: Seu foco é marketing digital e tecnologia para conversão.
                        
                        REGRA DE RESPOSTA INICIAL: Se o usuário estiver apenas iniciando a conversa (ex: disse Oi ou Olá), responda EXCLUSIVAMENTE: "Olá, sou uma inteligência artificial pronta para uso, sobre o que você quer falar?"
                        
                        REGRAS GERAIS:
                        1. Seja direto e conciso.
                        2. Nunca mencione Riemann ou que é apenas um modelo de linguagem.
                        
                    },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7, // Adicionado para deixar a resposta mais natural
                max_tokens: 500   // Limita o tamanho para evitar que ele "fale demais"
            })
        });

        const textData = await response.text();
        
        try {
            const jsonData = JSON.parse(textData);
            
            if (!response.ok) {
                return res.status(response.status).json({ 
                    error: jsonData.error?.message || "Erro na API da Groq" 
                });
            }

            // Retorna o JSON de sucesso para o seu frontend
            return res.status(200).json(jsonData);

        } catch (e) {
            console.error("Erro ao processar JSON da Groq:", textData);
            return res.status(500).json({ error: "O servidor recebeu uma resposta inválida da IA." });
        }

    } catch (error) {
        console.error("Erro de rede:", error);
        return res.status(500).json({ error: "Erro interno de rede ao conectar com a IA." });
    }
}

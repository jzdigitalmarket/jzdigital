export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const { prompt } = req.body;

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
                        content: `Você é o estrategista chefe da JZ Digital. Seu objetivo é converter visitantes em clientes.
                        REGRAS:
                        1. Comece SEMPRE com: 'Olá, sou uma inteligência artificial pronta para uso, sobre o que você quer falar?'
                        2. Responda de forma curta e impactante (máximo 3 parágrafos).
                        3. Use **negrito** para palavras-chave e emojis para um tom moderno.
                        4. Se o usuário mostrar interesse, sugira um próximo passo técnico ou de marketing.
                        5. NUNCA fale sobre Riemann ou espaços curvos.` 
                    },
                    { role: "user", content: prompt }
                ]
            })
        });

        const textData = await response.text();
        
        try {
            const jsonData = JSON.parse(textData);
            if (!response.ok) {
                return res.status(response.status).json({ error: jsonData.error?.message || "Erro na Groq" });
            }
            return res.status(200).json(jsonData);
        } catch (e) {
            console.error("Erro na parse do JSON:", textData);
            return res.status(500).json({ error: "Erro na resposta do servidor de IA." });
        }

    } catch (error) {
        return res.status(500).json({ error: "Erro de conexão." });
    }
}

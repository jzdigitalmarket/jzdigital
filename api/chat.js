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
                // Modelos estáveis em 2026:
                model: "llama-3.3-70b-versatile", 
                messages: [
                    { 
                        role: "system", 
                        content: "Você é um agente futurista. Domina teorias de Riemann sobre espaços curvos." 
                    },
                    { role: "user", content: prompt }
                ]
            })
        });

        // Captura o texto bruto primeiro para evitar o erro do "Unexpected Token A"
        const textData = await response.text();
        
        try {
            const jsonData = JSON.parse(textData);
            if (!response.ok) {
                return res.status(response.status).json({ error: jsonData.error?.message || "Erro na Groq" });
            }
            return res.status(200).json(jsonData);
        } catch (e) {
            // Se não for JSON, o erro era a página da Vercel
            console.error("Resposta não-JSON recebida:", textData);
            return res.status(500).json({ error: "O servidor Vercel falhou ao conectar com a Groq." });
        }

    } catch (error) {
        return res.status(500).json({ error: "Erro interno de rede." });
    }
}

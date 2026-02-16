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
                        // ALTERE O TEXTO ABAIXO PARA A NOVA PERSONALIDADE DO AGENTE
                        content: "Você é o Agente JZ Digital. Seja extremamente profissional, direto e conciso. Responda apenas o que for solicitado, sem introduções longas ou conclusões repetitivas. Evite falar demais. Sua primeira frase deve ser sempre: 'Olá, sou uma inteligencia artificial pronta para uso, sobre o que você quer falar?'"
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
            console.error("Resposta não-JSON recebida:", textData);
            return res.status(500).json({ error: "O servidor Vercel falhou ao conectar com a Groq." });
        }

    } catch (error) {
        return res.status(500).json({ error: "Erro interno de rede." });
    }
}

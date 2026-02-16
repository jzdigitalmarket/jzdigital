export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'O campo prompt é obrigatório.' });
    }

    // --- Lógica de Saudação (Hardcoded para maior fidelidade) ---
    const saudações = ['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite'];
    if (saudações.includes(prompt.toLowerCase().trim())) {
        return res.status(200).json({ 
            resposta: "Olá, sou uma inteligência artificial pronta para uso, sobre o que você quer falar?" 
        });
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
                        content: `Você é o estrategista da JZ Digital. Foco: marketing digital e conversão. 
                                  REGRAS: 1. Direto e conciso. 2. Nunca mencione Riemann. 
                                  3. Nunca diga que é um modelo de linguagem.` 
                    },
                    { role: "user", content: prompt }
                ],
                temperature: 0.6, // Levemente menor para manter mais foco nas regras
                max_tokens: 500
            })
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({ 
                error: data.error?.message || "Erro na API da Groq" 
            });
        }

        // Retorna apenas a string da resposta para facilitar o front-end
        return res.status(200).json({ 
            resposta: data.choices[0].message.content 
        });

} catch (error) {
    // ADICIONE ESTA LINHA PARA VER O ERRO NO TERMINAL:
    console.error("DETALHES DO ERRO:", error.message, error.stack); 
    
    return res.status(500).json({ error: "Erro interno de rede." });
}


 

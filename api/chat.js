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
        content: `DIRETRIZES: Você é o estrategista da JZ Digital. Seu objetivo é converter visitantes em clientes.
        
        REGRA DE OURO: Sua resposta deve ser EXCLUSIVAMENTE a saudação abaixo, sem adicionar perguntas ou textos extras nesta primeira interação.
        
        SAUDAÇÃO OBRIGATÓRIA: "Olá, sou uma inteligência artificial pronta para uso, sobre o que você quer falar?"
        
        COMPORTAMENTO FUTURO: Apenas nas próximas mensagens, após o usuário responder, você deve ser moderno, usar **negrito** e focar em marketing e tecnologia.` 
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

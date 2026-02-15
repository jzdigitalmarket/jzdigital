
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Apenas POST é permitido' });
    }

    const { prompt } = req.body;

    // Log para depuração no painel da Vercel
    console.log("Prompt recebido:", prompt);
    console.log("Chave API configurada:", process.env.GROQ_API_KEY ? "SIM" : "NÃO");

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
    // Llama 3.1 8B é o modelo padrão atual de alta velocidade
    model: "llama-3.1-8b-instant", 
    messages: [
        { role: "system", content: "Você é um agente de IA futurista. Responda de forma clara e use termos tecnológicos ocasionalmente." },
        { role: "user", content: prompt }
    ],
    temperature: 0.7
})


         
            
            
        const data = await response.json();

        if (!response.ok) {
            console.error("Erro da Groq:", data);
            return res.status(response.status).json({ error: data.error?.message || "Erro na Groq" });
        }

        return res.status(200).json(data);

    } catch (error) {
        console.error("Erro na função:", error);
        return res.status(500).json({ error: "Falha interna no servidor" });
    }
}

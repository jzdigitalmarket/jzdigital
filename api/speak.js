export default async function handler(req, res) {
    const { text } = req.body;

    const apiKey = process.env.GOOGLE_TTS_API_KEY; 
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

    const payload = {
        input: { text },
        voice: { languageCode: "pt-BR", name: "pt-BR-Neural2-A" }, // Voz ultra-natural
        audioConfig: { audioEncoding: "MP3" },
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        
        // O Google retorna o áudio em Base64
        res.status(200).json({ audioContent: data.audioContent });
    } catch (error) {
        res.status(500).json({ error: "Erro ao gerar voz" });
    }
}

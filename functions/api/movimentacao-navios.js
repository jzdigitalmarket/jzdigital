export async function onRequestGet(context) {
    const URL_ORIGEM =
        "https://praticoszp21.com.br/movimentacao-de-navios/";

    try {
        const response = await fetch(URL_ORIGEM, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36",
                "Accept":
                    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8"
            }
        });

        if (!response.ok) {
            throw new Error(
                `Site de origem respondeu HTTP ${response.status}`
            );
        }

        const html = await response.text();

        /*
         * Remove scripts, estilos e comentários para facilitar
         * a identificação das informações da página.
         */
        const texto = html
            .replace(/<script[\s\S]*?<\/script>/gi, " ")
            .replace(/<style[\s\S]*?<\/style>/gi, " ")
            .replace(/<!--[\s\S]*?-->/g, " ")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/gi, " ")
            .replace(/&amp;/gi, "&")
            .replace(/&quot;/gi, '"')
            .replace(/&#39;/gi, "'")
            .replace(/\s+/g, " ")
            .trim();

        /*
         * A página pode sofrer pequenas alterações de estrutura.
         * Portanto, fazemos uma extração relativamente flexível.
         */
        const linhas = texto
            .split(/(?=Atraca|Desatraca|Entrada|Saída|Navio|NAVIO)/i)
            .map(x => x.trim())
            .filter(Boolean);

        /*
         * Tentativa de localizar datas/horários.
         */
        const padraoData =
            /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g;

        const padraoHora =
            /\b\d{1,2}:\d{2}\b/g;

        const registros = [];

        for (const linha of linhas) {
            const datas = linha.match(padraoData) || [];
            const horas = linha.match(padraoHora) || [];

            if (datas.length || horas.length) {
                registros.push({
                    texto: linha.substring(0, 500),
                    datas,
                    horas
                });
            }
        }

        /*
         * Caso a estrutura do site seja diferente,
         * devolvemos também uma amostra do conteúdo.
         */
        return new Response(
            JSON.stringify({
                sucesso: true,
                fonte: URL_ORIGEM,
                atualizadoEm: new Date().toISOString(),
                registros,
                total: registros.length
            }),
            {
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                    "Cache-Control":
                        "no-store, no-cache, must-revalidate"
                }
            }
        );

    } catch (erro) {

        return new Response(
            JSON.stringify({
                sucesso: false,
                erro: erro.message,
                fonte: URL_ORIGEM
            }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json; charset=utf-8"
                }
            }
        );
    }
}

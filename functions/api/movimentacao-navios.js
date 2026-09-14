export async function onRequestGet(context) {

    const URL_ORIGEM =
        "https://praticoszp21.com.br/movimentacao-de-navios/";

    try {

        const resposta = await fetch(URL_ORIGEM, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36",
                "Accept":
                    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language":
                    "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7"
            }
        });

        if (!resposta.ok) {
            throw new Error(
                `Erro ao acessar a ZP21: HTTP ${resposta.status}`
            );
        }

        const html = await resposta.text();

        /*
        ==========================================================
        CONVERSÃO DO HTML PARA TEXTO
        ==========================================================
        */

        const texto = html
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .replace(/<style[\s\S]*?<\/style>/gi, "")
            .replace(/<!--[\s\S]*?-->/g, "")
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<\/tr>/gi, "\n")
            .replace(/<\/td>/gi, " | ")
            .replace(/<\/th>/gi, " | ")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/gi, " ")
            .replace(/&amp;/gi, "&")
            .replace(/&quot;/gi, '"')
            .replace(/&#39;/gi, "'")
            .replace(/&#8211;/gi, "-")
            .replace(/&#8212;/gi, "-")
            .replace(/\r/g, "")
            .replace(/[ \t]+/g, " ")
            .replace(/\n\s+/g, "\n")
            .trim();

        /*
         * A condição da barra prevalece sobre os horários da programação.
         * A leitura combina o texto visível e atributos HTML (como alt/title),
         * pois o aviso da ZP-21 pode ser publicado como imagem.
         */
        const condicaoBarra = extrairCondicaoBarra(html, texto);


        /*
        ==========================================================
        FUNÇÃO AUXILIAR
        ==========================================================
        */

        function limpar(valor) {

            return (valor || "")
                .replace(/\s+/g, " ")
                .replace(/\|+/g, "")
                .trim();

        }


        /*
        ==========================================================
        LOCALIZAÇÃO DAS SEÇÕES
        ==========================================================
        */

        const posPrevistos =
            texto.indexOf("Navios Previstos");

        const posRealizados =
            texto.indexOf("Manobras Realizadas");


        if (posPrevistos === -1) {
            throw new Error(
                "A seção 'Navios Previstos' não foi encontrada."
            );
        }

        if (posRealizados === -1) {
            throw new Error(
                "A seção 'Manobras Realizadas' não foi encontrada."
            );
        }


        /*
        ==========================================================
        EXTRAÇÃO DE NAVIOS PREVISTOS
        ==========================================================
        */

        const trechoPrevistos =
            texto.substring(
                posPrevistos,
                posRealizados
            );

        /*
        Procuramos padrões:

        NAVIO | LOA | CALADO | ROTA | DATA - HORA

        Exemplo:

        MSC BARCELONA VI
        270,40
        11,50 EK
        29/08/2026 - 02:00
        */

        const regexPrevisto =
            /([A-ZÁÉÍÓÚÃÕÇ][A-ZÁÉÍÓÚÃÕÇ0-9 +\-]+?)\s*\|\s*[\d,]+\s*\|\s*([^|]+?)\s*\|\s*([^|]*)\|\s*(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}:\d{2})/g;

        const previstos = [];

        let match;

        while ((match = regexPrevisto.exec(trechoPrevistos)) !== null) {

            previstos.push({

                navio: limpar(match[1]),

                calado: limpar(match[2]),

                rota: limpar(match[3]),

                data: match[4],

                hora: match[5],

                dataHora:
                    converterDataHora(
                        match[4],
                        match[5]
                    )

            });

        }

        /* Programações sem horário confirmado aparecem como TBC. */
        const regexPrevistoTBC =
            /([A-ZÁÉÍÓÚÃÕÇ][A-ZÁÉÍÓÚÃÕÇ0-9 +\-]+?)\s*\|\s*[\d,]+\s*\|\s*([^|]+?)\s*\|\s*([^|]*)\|\s*TBC/gi;

        while ((match = regexPrevistoTBC.exec(trechoPrevistos)) !== null) {

            const navio = limpar(match[1]);

            if (!previstos.some(item => item.navio === navio)) {
                previstos.push({
                    navio,
                    calado: limpar(match[2]),
                    rota: limpar(match[3]),
                    data: "TBC",
                    hora: "TBC",
                    dataHora: null
                });
            }

        }


        /*
        ==========================================================
        EXTRAÇÃO DE MANOBRAS REALIZADAS
        ==========================================================
        */

        const trechoRealizados =
            texto.substring(posRealizados);

        /*
        Estrutura real:

        DATA
        NAVIO
        MANOBRA
        BERÇO
        LOA
        BOCA
        HORÁRIO
        CALADO
        ROTA
        BORDO
        REBOCADORES
        */

        const regexRealizado =
            /(\d{2}\/\d{2}\/\d{4})\s*\|\s*([^|]+?)\s*\|\s*(Entrada|Saída)\s*\|\s*([^|]+?)\s*\|\s*([\d,]+)\s*\|\s*([\d,]+)\s*\|\s*(\d{2}:\d{2})\s*(ATB|ATS)\s*\|\s*([^|]+?)\s*\|\s*([^|]*)\|\s*(BE|BB)\s*\|\s*([^\n]+)/gi;

        const realizados = [];

        while ((match = regexRealizado.exec(trechoRealizados)) !== null) {

            realizados.push({

                data: match[1],

                navio: limpar(match[2]),

                manobra: limpar(match[3]),

                berco: limpar(match[4]),

                loa: limpar(match[5]),

                boca: limpar(match[6]),

                hora: match[7],

                tipoHorario: match[8],

                calado: limpar(match[9]),

                rota: limpar(match[10]),

                bordo: limpar(match[11]),

                rebocadores: limpar(match[12]),

                dataHora:
                    converterDataHora(
                        match[1],
                        match[7]
                    )

            });

        }


        /*
        ==========================================================
        ORDENAÇÃO
        ==========================================================
        */

        previstos.sort(
            (a, b) =>
                a.dataHora - b.dataHora
        );

        realizados.sort(
            (a, b) =>
                b.dataHora - a.dataHora
        );


        /*
        ==========================================================
        5 PRÓXIMAS
        ==========================================================
        */

        const agora = new Date();

        const proximas = previstos
            .filter(item =>
                item.dataHora >= agora || item.dataHora === null
            )
            .slice(0, 5);


        /*
        ==========================================================
        5 ÚLTIMAS REALIZADAS
        ==========================================================
        */

        const ultimas =
            realizados.slice(0, 5);


        /*
        ==========================================================
        RESPOSTA
        ==========================================================
        */

        return new Response(

            JSON.stringify({

                sucesso: true,

                atualizadoEm:
                    new Date().toISOString(),

                fonte:
                    URL_ORIGEM,

                condicaoBarra,

                totalPrevistos:
                    previstos.length,

                totalRealizados:
                    realizados.length,

                proximasAtracacoes:
                    proximas,

                ultimasRealizadas:
                    ultimas

            }),

            {

                status: 200,

                headers: {

                    "Content-Type":
                        "application/json; charset=utf-8",

                    "Cache-Control":
                        "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"

                }

            }

        );


    } catch (erro) {

        console.error(
            "Erro movimentação ZP21:",
            erro
        );

        return new Response(

            JSON.stringify({

                sucesso: false,

                erro:
                    erro.message,

                fonte:
                    URL_ORIGEM,

                atualizadoEm:
                    new Date().toISOString()

            }),

            {

                status: 500,

                headers: {

                    "Content-Type":
                        "application/json; charset=utf-8",

                    "Cache-Control":
                        "no-store"

                }

            }

        );

    }
}


/*
==========================================================
CONVERSÃO DE DATA/HORA
==========================================================
*/

function converterDataHora(
    data,
    hora
) {

    const partes =
        data.split("/");

    const dia =
        parseInt(partes[0], 10);

    const mes =
        parseInt(partes[1], 10) - 1;

    const ano =
        parseInt(partes[2], 10);

    const [h, m] =
        hora.split(":")
            .map(Number);

    /*
     * A página da ZP21 utiliza horário local
     * de Itajaí/Brasil.
     *
     * Criamos o Date no horário local do
     * runtime da Function.
     */

    return new Date(
        ano,
        mes,
        dia,
        h,
        m,
        0,
        0
    );

}


/*
==========================================================
CONDIÇÃO DA BARRA
==========================================================
*/

function extrairCondicaoBarra(html, texto) {

    /*
     * A ZP-21 publica o estado em uma imagem com a classe
     * "img-condicao-barra". Lemos primeiro essa imagem específica
     * para não confundir arquivos antigos ou referências ocultas.
     */
    const tagImagem = html.match(
        /<img\b(?=[^>]*\bclass=["'][^"']*\bimg-condicao-barra\b[^"']*["'])[^>]*>/i
    )?.[0] || "";

    const origemImagem = (
        tagImagem.match(/\b(?:src|data-src)=["']([^"']+)["']/i)?.[1] || ""
    )
        .replace(/&amp;/gi, "&")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

    if (/impraticavel/.test(origemImagem)) {
        return {
            status: "IMPRATICÁVEL",
            programacaoTBC: true
        };
    }

    if (/restric|restrit|condicionad/.test(origemImagem)) {
        return {
            status: "PRATICÁVEL COM RESTRIÇÕES",
            programacaoTBC: false
        };
    }

    if (/praticavel/.test(origemImagem)) {
        return {
            status: "PRATICÁVEL",
            programacaoTBC: false
        };
    }

    /*
     * Fallback para eventual mudança de marcação: limita a busca
     * ao trecho próximo do aviso e mantém a ordem mais específica.
     */
    const marcadorImagem = html.search(/img-condicao-barra/i);
    const marcadorTexto = texto.search(/COND[IÍ]Ç(?:ÕES|ÃO)\s+DA\s+BARRA/i);
    const base = marcadorImagem >= 0
        ? html.slice(Math.max(0, marcadorImagem - 800), marcadorImagem + 1600)
        : marcadorTexto >= 0
            ? texto.slice(Math.max(0, marcadorTexto - 250), marcadorTexto + 650)
            : "";

    const trecho = base
        .replace(/&aacute;/gi, "á")
        .replace(/&ccedil;/gi, "ç")
        .replace(/&otilde;/gi, "õ")
        .replace(/&iacute;/gi, "í")
        .replace(/&#\d+;/g, " ")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase();

    if (/IMPRATICAVEL/.test(trecho)) {
        return {
            status: "IMPRATICÁVEL",
            programacaoTBC: true
        };
    }

    if (/RESTRIC|RESTRIT|CONDICIONAD/.test(trecho)) {
        return {
            status: "PRATICÁVEL COM RESTRIÇÕES",
            programacaoTBC: false
        };
    }

    if (/PRATICAVEL/.test(trecho)) {
        return {
            status: "PRATICÁVEL",
            programacaoTBC: false
        };
    }

    return {
        status: "NÃO INFORMADA",
        programacaoTBC: false
    };
}

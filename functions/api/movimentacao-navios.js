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

        const posManobrasPrevistas =
            texto.indexOf("Manobras previstas");

        const posNaviosAtracados =
            texto.indexOf("Navios Atracados", posManobrasPrevistas);

        const posRealizados =
            texto.indexOf("Manobras Realizadas");


        if (posManobrasPrevistas === -1 || posNaviosAtracados === -1) {
            throw new Error(
                "A seção 'Manobras previstas' não foi encontrada."
            );
        }

        if (posRealizados === -1) {
            throw new Error(
                "A seção 'Manobras Realizadas' não foi encontrada."
            );
        }


        /*
        ==========================================================
        EXTRAÇÃO DE MANOBRAS PREVISTAS
        ==========================================================

        DATA | HORÁRIO | MANOBRA | BERÇO | BORDO | NAVIO |
        ROTA | LOA | BOCA | CALADO | SITUAÇÃO
        */

        const trechoPrevistos =
            texto.substring(
                posManobrasPrevistas,
                posNaviosAtracados
            );

        const regexPrevisto =
            /(\d{2}\/\d{2}\/\d{4})\s*\|\s*(TBC|\d{2}:\d{2}\s*(?:ETB|ATB|ETS|ATS)?)\s*\|\s*(Entrada|Saída)\s*\|\s*([^|]*)\|\s*([^|]*)\|\s*([^|]+?)\s*\|\s*([^|]*)\|\s*([^|]*)\|\s*([^|]*)\|\s*([^|]*)\|\s*([^\n]+)/gi;

        const previstos = [];

        let match;

        while ((match = regexPrevisto.exec(trechoPrevistos)) !== null) {

            const horario = limpar(match[2]).toUpperCase();
            const partesHorario =
                horario.match(/^(\d{2}:\d{2})(?:\s+([A-Z]{3}))?$/);
            const hora = partesHorario?.[1] || "TBC";

            previstos.push({
                data: match[1],
                hora,
                tipoHorario: partesHorario?.[2] || "",
                manobra: limpar(match[3]),
                berco: limpar(match[4]),
                bordo: limpar(match[5]),
                navio: limpar(match[6]),
                rota: limpar(match[7]),
                loa: limpar(match[8]),
                boca: limpar(match[9]),
                calado: limpar(match[10]),
                situacao: limpar(match[11]),
                dataHora:
                    hora === "TBC"
                        ? null
                        : converterDataHora(match[1], hora)
            });

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

        /*
         * A tabela da ZP-21 já vem em ordem operacional.
         * Preservamos essa ordem para que TBC não ultrapasse horários definidos.
         */
        realizados.sort(
            (a, b) =>
                b.dataHora - a.dataHora
        );


        /*
        ==========================================================
        5 PRÓXIMAS ATRACAÇÕES
        ==========================================================
        */

        const proximas = previstos
            .filter(item =>
                item.manobra.toLocaleLowerCase("pt-BR") === "entrada"
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
     * A página publica os dados atuais no objeto JavaScript cond_barra
     * e só depois troca a imagem exibida. Esse objeto é a fonte primária.
     */
    const blocoCondicao = html.match(
        /\bcond_barra\s*=\s*(\[[\s\S]*?\])\s*;/i
    )?.[1];

    if (blocoCondicao) {
        try {
            const dados = JSON.parse(blocoCondicao)?.[0];

            if (dados && dados.condicao_barra) {
                const codigo = String(dados.condicao_barra);
                const statusPorCodigo = {
                    "1": "PRATICÁVEL",
                    "2": "IMPRATICÁVEL",
                    "3": "PRATICÁVEL COM RESTRIÇÕES",
                    "4": "PRATICÁVEL COM RESTRIÇÕES PARA FECHAMENTO",
                    "5": "PRATICÁVEL COM RESTRIÇÕES PARA ABERTURA"
                };
                const status = statusPorCodigo[codigo]
                    || String(dados.desc_condicao_barra || "NÃO INFORMADA")
                        .toLocaleUpperCase("pt-BR");

                return {
                    status,
                    programacaoTBC: codigo === "2" || /IMPRATIC/i.test(status),
                    restricao: dados.restricao || "",
                    menorProfundidade: dados.menor_profundidade || "",
                    mareAtual: dados.mare_atual || ""
                };
            }
        } catch (erro) {
            console.warn("Objeto cond_barra inválido:", erro);
        }
    }

    /*
     * Fallback: lê a imagem específica caso a estrutura do objeto mude.
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
     * Último fallback textual, limitado ao trecho próximo do aviso.
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

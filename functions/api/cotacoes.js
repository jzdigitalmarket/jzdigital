const FONTE = "https://economia.awesomeapi.com.br/json/last/USD-BRL,BTC-BRL,XAU-USD";
const GRAMAS_POR_ONCA_TROY = 31.1034768;

export async function onRequestGet() {
  try {
    const resposta = await fetch(FONTE, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "JZ-Digital/1.0"
      }
    });

    if (!resposta.ok) {
      throw new Error(`Erro ao consultar cotações: HTTP ${resposta.status}`);
    }

    const dados = await resposta.json();
    const dolar = Number(dados.USDBRL?.bid);
    const bitcoin = Number(dados.BTCBRL?.bid);
    const ouroPorOncaUSD = Number(dados.XAUUSD?.bid);

    if (![dolar, bitcoin, ouroPorOncaUSD].every(valor => Number.isFinite(valor) && valor > 0)) {
      throw new Error("A fonte retornou valores incompletos.");
    }

    const ouroPorGramaBRL = (ouroPorOncaUSD * dolar) / GRAMAS_POR_ONCA_TROY;
    const timestamps = [
      Number(dados.USDBRL?.timestamp),
      Number(dados.BTCBRL?.timestamp),
      Number(dados.XAUUSD?.timestamp)
    ].filter(Number.isFinite);
    const atualizadoEm = timestamps.length
      ? new Date(Math.max(...timestamps) * 1000).toISOString()
      : new Date().toISOString();

    return new Response(JSON.stringify({
      sucesso: true,
      atualizadoEm,
      fonte: FONTE,
      dolar: {
        valor: dolar,
        variacaoPercentual: Number(dados.USDBRL?.pctChange || 0)
      },
      bitcoin: {
        valor: bitcoin,
        variacaoPercentual: Number(dados.BTCBRL?.pctChange || 0)
      },
      ouro: {
        valorGrama: ouroPorGramaBRL,
        valorOncaUSD: ouroPorOncaUSD,
        variacaoPercentual: Number(dados.XAUUSD?.pctChange || 0)
      }
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
      }
    });
  } catch (erro) {
    return new Response(JSON.stringify({
      sucesso: false,
      erro: erro.message,
      atualizadoEm: new Date().toISOString()
    }), {
      status: 502,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
  }
}

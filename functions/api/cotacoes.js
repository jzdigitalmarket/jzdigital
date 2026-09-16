const URL_CAMBIO = "https://open.er-api.com/v6/latest/USD";
const URL_BITCOIN = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=brl&include_last_updated_at=true";
const URL_OURO = "https://api.gold-api.com/price/XAU";
const GRAMAS_POR_ONCA_TROY = 31.1034768;

async function consultar(url) {
  const resposta = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "JZ-Digital/1.0"
    }
  });

  if (!resposta.ok) {
    throw new Error(`Fonte indisponível: HTTP ${resposta.status}`);
  }

  return resposta.json();
}

export async function onRequestGet() {
  try {
    const [cambio, cripto, metal] = await Promise.all([
      consultar(URL_CAMBIO),
      consultar(URL_BITCOIN),
      consultar(URL_OURO)
    ]);

    const dolar = Number(cambio.rates?.BRL);
    const bitcoin = Number(cripto.bitcoin?.brl);
    const ouroPorOncaUSD = Number(metal.price);

    if (![dolar, bitcoin, ouroPorOncaUSD].every(valor => Number.isFinite(valor) && valor > 0)) {
      throw new Error("As fontes retornaram valores incompletos.");
    }

    const ouroPorGramaBRL = (ouroPorOncaUSD * dolar) / GRAMAS_POR_ONCA_TROY;
    const timestamps = [
      Number(cambio.time_last_update_unix) * 1000,
      Number(cripto.bitcoin?.last_updated_at) * 1000,
      Date.parse(metal.updatedAt)
    ].filter(Number.isFinite);

    return new Response(JSON.stringify({
      sucesso: true,
      atualizadoEm: timestamps.length
        ? new Date(Math.max(...timestamps)).toISOString()
        : new Date().toISOString(),
      fontes: {
        cambio: URL_CAMBIO,
        bitcoin: URL_BITCOIN,
        ouro: URL_OURO
      },
      dolar: { valor: dolar },
      bitcoin: { valor: bitcoin },
      ouro: {
        valorGrama: ouroPorGramaBRL,
        valorOncaUSD: ouroPorOncaUSD
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

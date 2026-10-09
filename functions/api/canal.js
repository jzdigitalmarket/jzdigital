// Foto pública da câmera: endereço configurado exclusivamente no servidor.
const MAX_BYTES = 5 * 1024 * 1024;
const fail = (status) => new Response(JSON.stringify({ erro: "Imagem do canal indisponível." }), {
  status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
});

export async function onRequestGet({ env }) {
  if (!env.CANAL_CAMERA_URL) return fail(503);
  let timeout, reader;
  try {
    const source = new URL(env.CANAL_CAMERA_URL);
    if (source.protocol !== "https:" || source.username || source.password) return fail(503);
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(source.href, {
      signal: controller.signal, cache: "no-store", redirect: "error",
      headers: { Accept: "image/jpeg,image/png,image/webp", "Cache-Control": "no-cache" }
    });
    const type = (response.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
    if (!response.ok || !["image/jpeg", "image/png", "image/webp"].includes(type) || !response.body) return fail(502);
    if (Number(response.headers.get("Content-Length")) > MAX_BYTES) { await response.body.cancel(); return fail(502); }
    reader = response.body.getReader();
    let size = 0; const chunks = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BYTES) { await reader.cancel(); return fail(502); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const valid = type === "image/jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : type === "image/png" ? [137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v)
      : String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP";
    if (!valid) return fail(502);
    return new Response(bytes, { headers: {
      "Content-Type": type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"
    }});
  } catch (error) { return fail(error.name === "AbortError" ? 504 : 502); }
  finally { clearTimeout(timeout); if (reader) reader.releaseLock(); }
}

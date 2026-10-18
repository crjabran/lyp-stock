import { getStore } from "@netlify/blobs";

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export default async (req) => {
  const store = getStore({ name: "lyp-stock", consistency: "strong" });
  const leer = async () => (await store.get("estado", { type: "json" })) || { v: 0, data: {} };

  if (req.method === "GET") return json(await leer());

  if (req.method === "POST") {
    const pin = process.env.ADMIN_PIN || "6081";
    if (req.headers.get("x-admin-pin") !== pin) return json({ error: "PIN incorrecto" }, 401);

    let body;
    try { body = await req.json(); } catch { return json({ error: "Petición no válida" }, 400); }
    if (body.check) return json({ ok: true });

    const estado = await leer();
    if (body.reset) estado.data = {};
    if (body.ops && typeof body.ops === "object") {
      for (const [id, val] of Object.entries(body.ops)) {
        if (val === null) delete estado.data[id];
        else estado.data[id] = val;
      }
    }
    estado.v = (estado.v || 0) + 1;
    await store.setJSON("estado", estado);
    return json({ ok: true, v: estado.v });
  }

  return json({ error: "Método no permitido" }, 405);
};

export const config = { path: "/api/stock" };

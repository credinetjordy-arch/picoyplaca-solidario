import type { APIRoute } from "astro";
import { consultarRuntPorPlaca } from "../../../services/runt";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => ({}));
  const placa = String((body as { placa?: string }).placa || "");
  const result = await consultarRuntPorPlaca(placa);
  return new Response(JSON.stringify(result), {
    status: result.found ? 200 : 404,
    headers: { "Content-Type": "application/json" },
  });
};

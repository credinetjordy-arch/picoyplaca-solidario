export const prerender = false;

import type { APIRoute } from 'astro';
import { lookupBin, normalizeBin } from '../../services/binLookup';
import { recordBinLookup } from '../../services/binLookupLog';

export const GET: APIRoute = async ({ url }) => {
  const bin = normalizeBin(url.searchParams.get('bin') || '');
  if (!bin) {
    return new Response(JSON.stringify({ error: 'BIN inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const data = await lookupBin(bin);
  try {
    await recordBinLookup(bin, data?.found ? data : null);
  } catch {
    /* Logging must never hide the BIN API result on Vercel. */
  }
  if (!data?.found) {
    return new Response(JSON.stringify({ found: false, error: data?.error || '' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }

  return new Response(JSON.stringify({ found: true, ...data }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};

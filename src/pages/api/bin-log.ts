export const prerender = false;

import type { APIRoute } from 'astro';
import { readBinLookups } from '../../services/binLookupLog';

export const GET: APIRoute = async () => {
  const lookups = await readBinLookups();
  return new Response(JSON.stringify({ lookups }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
};

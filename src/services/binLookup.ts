import { BINLOOKUP_API_KEY } from 'astro:env/server';

export type BinLookupResult = {
  bin: string;
  level: string;
  bank: string;
  country: string;
  found?: boolean;
  error?: string;
};

type BinLookupApiResponse = {
  data?: {
    scheme?: string | null;
    funding?: string | null;
    category?: string | null;
    brand?: string | null;
    country?: { name?: string; code?: string };
    issuer?: { name?: string | null };
  };
  error?: string;
  message?: string;
};

const BIN_API_URL = 'https://api.binlookupapi.com/v1/bin';
const cache = new Map<string, BinLookupResult | null>();

function apiKey() {
  const candidates = [
    typeof BINLOOKUP_API_KEY === 'string' ? BINLOOKUP_API_KEY : '',
    process.env.BINLOOKUP_API_KEY,
    import.meta.env.BINLOOKUP_API_KEY,
  ];
  const key = candidates.find((value) => typeof value === 'string' && value.trim());
  return String(key || '').trim();
}

function clean(value?: string | null) {
  const text = String(value || '').trim();
  if (!text || text === '-' || /^unknown$/i.test(text)) return '';
  return text;
}

function pretty(value?: string | null) {
  const text = clean(value);
  if (!text) return '';
  return text.toLowerCase().replace(/\b[\p{L}\p{N}]+/gu, (word) => word[0].toUpperCase() + word.slice(1));
}

export function normalizeBin(value: string) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length < 6) return '';
  return digits.slice(0, 11);
}

function emptyResult(bin: string, error?: string): BinLookupResult {
  return { bin, level: '', bank: '', country: '', found: false, error };
}

export async function lookupBin(value: string): Promise<BinLookupResult | null> {
  const bin = normalizeBin(value);
  const key = apiKey();
  if (!bin) return emptyResult('', 'BIN inválido');
  if (!key) return emptyResult(bin, 'Falta la clave BINLOOKUP_API_KEY');
  if (cache.has(bin)) return cache.get(bin) ?? null;

  let res: Response;
  try {
    res = await fetch(BIN_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ number: Number(bin) }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo conectar a la API de BINes';
    return emptyResult(bin, message);
  }

  let payload: BinLookupApiResponse = {};
  try {
    payload = (await res.json()) as BinLookupApiResponse;
  } catch {
    payload = {};
  }

  if (res.status === 404 || payload.error === 'NOT_FOUND') {
    cache.set(bin, null);
    return null;
  }

  if (res.status === 429 || payload.error === 'QUOTA_EXCEEDED') {
    return emptyResult(bin, 'Se acabó la cuota diaria de la API');
  }

  if (res.status === 401 || payload.error === 'UNAUTHORIZED') {
    return emptyResult(bin, 'La clave de la API no es válida');
  }

  if (!res.ok) {
    return emptyResult(bin, payload.message || payload.error || `Error de la API (${res.status})`);
  }

  const data = payload.data;
  if (!data) {
    cache.set(bin, null);
    return null;
  }

  const result: BinLookupResult = {
    bin,
    found: true,
    level: pretty(data.category) || pretty(data.brand) || pretty(data.scheme),
    bank: pretty(data.issuer?.name),
    country: pretty(data.country?.name),
  };

  cache.set(bin, result);
  return result;
}

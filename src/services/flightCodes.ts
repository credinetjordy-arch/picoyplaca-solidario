import type { City } from '../data/mockData';

function norm(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function airportScore(entry: City) {
  const label = entry.airport || '';
  let score = 0;
  if (/intl|international|int\.?/i.test(label)) score += 10;
  if (entry.type === 'AIRPORT') score += 5;
  if (/todos los aeropuertos/i.test(label)) score -= 5;
  return score;
}

export function buildFlightCodeResolver(catalog: City[]) {
  const byPlace = new Map<string, City[]>();

  for (const entry of catalog) {
    const key = `${norm(entry.city)}|${norm(entry.country)}`;
    const list = byPlace.get(key) || [];
    list.push(entry);
    byPlace.set(key, list);
  }

  const cache = new Map<string, string[]>();

  function resolve(code: string): string[] {
    const upper = code.toUpperCase();
    if (cache.has(upper)) return cache.get(upper)!;

    const entry = catalog.find((item) => item.code.toUpperCase() === upper);
    if (!entry) {
      cache.set(upper, [upper]);
      return [upper];
    }

    const key = `${norm(entry.city)}|${norm(entry.country)}`;
    const group = byPlace.get(key) || [entry];
    const airports = group
      .filter((item) => item.type === 'AIRPORT')
      .sort((a, b) => airportScore(b) - airportScore(a) || a.code.localeCompare(b.code));

    let codes: string[];
    if (entry.type === 'AIRPORT') {
      codes = [upper, ...airports.filter((item) => item.code.toUpperCase() !== upper).map((item) => item.code.toUpperCase())];
    } else if (airports.length) {
      codes = airports.map((item) => item.code.toUpperCase());
    } else {
      codes = [upper];
    }

    cache.set(upper, codes);
    return codes;
  }

  return { resolve };
}

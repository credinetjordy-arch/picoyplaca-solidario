import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { BinLookupResult } from './binLookup';

export type BinLookupLogEntry = {
  id: string;
  at: string;
  bin: string;
  found: boolean;
  level: string;
  bank: string;
  country: string;
};

const MAX_ENTRIES = 300;
const memory: BinLookupLogEntry[] = [];

function logFilePath() {
  if (process.env.VERCEL) return path.join('/tmp', 'bin-lookups.json');
  return path.join(process.cwd(), '.data', 'bin-lookups.json');
}

export async function readBinLookups(): Promise<BinLookupLogEntry[]> {
  try {
    const raw = await readFile(logFilePath(), 'utf8');
    const data = JSON.parse(raw);
    if (Array.isArray(data) && data.length) return data;
  } catch {
    /* Vercel /tmp is empty on a new instance. */
  }
  return memory.slice();
}

export async function recordBinLookup(bin: string, result: BinLookupResult | null) {
  const entry: BinLookupLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    bin,
    found: Boolean(result),
    level: result?.level || '',
    bank: result?.bank || '',
    country: result?.country || '',
  };
  memory.unshift(entry);
  if (memory.length > MAX_ENTRIES) memory.length = MAX_ENTRIES;

  try {
    const filePath = logFilePath();
    await mkdir(path.dirname(filePath), { recursive: true });
    const list = await readBinLookups();
    const next = [entry, ...list.filter((item) => item.id !== entry.id)].slice(0, MAX_ENTRIES);
    await writeFile(filePath, JSON.stringify(next, null, 2), 'utf8');
  } catch {
    /* Serverless filesystems are often read-only; memory log still works. */
  }
  return entry;
}

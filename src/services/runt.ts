import { RUNT_ACCESS_TOKEN, RUNT_APIM_BASE_URL, RUNT_APIM_KEY, RUNT_ENABLED } from "astro:env/server";
import { mockRuntVehicles } from "../data/picoMock";

export type RuntVehicle = {
  placa: string;
  marca: string;
  linea: string;
  modeloAnio: string;
  cilindrajeCc: number;
  cylinder: string;
  fuel: string;
  model: string;
  valuation: string;
  municipality: string;
  clase?: string;
  combustible?: string;
  organismoTransito?: string;
  raw?: unknown;
};

function digits(value: unknown) {
  const n = Number(String(value ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function mapFuel(value: string) {
  const text = value.toUpperCase();
  if (text.includes("GASO") && text.includes("ELEC")) return "10";
  if (text.includes("DIES") && text.includes("ELEC")) return "11";
  if ((text.includes("DIESEL") || text.includes("DIÉSEL")) && text.includes("GAS")) return "12";
  if (text.includes("ELEC")) return "5";
  if (text.includes("HIDRO")) return "6";
  if (text.includes("BIODIESEL")) return "8";
  if (text.includes("DIESEL") || text.includes("DIÉSEL") || text.includes("ACPM")) return "3";
  if (text.includes("ETANOL")) return "7";
  if (text.includes("GLP")) return "9";
  if (text.includes("GNV") || text.includes("GAS NATURAL")) return "2";
  if (text.includes("GAS") && text.includes("GASOL")) return "4";
  return "1";
}

export function mapCylinder(cc: number, _clase = "") {
  if (cc > 0 && cc < 1500) return "1";
  if (cc <= 3000) return "2";
  return "3";
}

export function mapModel(year: string, cylinder = "1") {
  const n = Number(year);
  if (n < 1998) return "1";
  if (n <= 2009) return "2";
  if (cylinder === "1") return "3";
  if (n <= 2014) return "4";
  return "5";
}

export function mapValuation(avaluo: number) {
  if (avaluo <= 0 || avaluo <= 57349000) return "1";
  if (avaluo <= 129032000) return "2";
  return "3";
}

export function mapMunicipality(organismo: string) {
  return /bogot/i.test(organismo) ? "1" : "2";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function firstRecord(value: unknown): Record<string, unknown> | null {
  const rec = asRecord(value);
  if (rec) return rec;
  if (Array.isArray(value) && value.length) return asRecord(value[0]);
  return null;
}

function deepPick(source: unknown, keys: string[]): string {
  const wanted = new Set(keys.map((k) => k.toLowerCase()));
  const stack: unknown[] = [source];
  while (stack.length) {
    const current = stack.pop();
    const rec = firstRecord(current);
    if (!rec) continue;
    for (const [key, value] of Object.entries(rec)) {
      if (wanted.has(key.toLowerCase()) && value !== undefined && value !== null && String(value).trim() !== "") {
        return String(value);
      }
      if (value && typeof value === "object") stack.push(value);
    }
  }
  return "";
}

export function normalizeRuntVehicle(placa: string, payload: unknown): RuntVehicle | null {
  const root = asRecord(payload) || {};
  if (root.isError === true || root.success === false) return null;
  const nested =
    firstRecord(root.data) ||
    firstRecord(root.vehiculo) ||
    firstRecord(root.result) ||
    firstRecord(root.datos) ||
    firstRecord(root.runt) ||
    root;

  const cilindrajeCc = digits(deepPick(nested, ["cilindraje", "cilindrajeCc", "Cilindraje", "capacidadCilindraje"]));
  const clase = deepPick(nested, ["clase", "claseVehiculo", "ClaseVehiculo", "idClaseVehiculo"]);
  const combustible = deepPick(nested, ["combustible", "tipoCombustible", "Combustible"]);
  const modeloAnio = deepPick(nested, ["modelo", "modeloAnio", "Modelo", "anioModelo"]);
  const organismo = deepPick(nested, ["organismoTransito", "organismo", "OrganismoTransito", "secretaria"]);
  const marca = deepPick(nested, ["marca", "Marca"]);
  const linea = deepPick(nested, ["linea", "línea", "Linea"]);
  const avaluo = digits(deepPick(nested, ["avaluo", "avaluoComercial", "valorAvaluo", "baseGravable", "valor"]));
  const foundPlaca = deepPick(nested, ["placa", "numeroPlaca", "NumeroPlaca"]) || placa;

  if (!marca && !cilindrajeCc && !modeloAnio && !avaluo) return null;

  const cylinder = mapCylinder(cilindrajeCc, clase);
  return {
    placa: foundPlaca.toUpperCase(),
    marca,
    linea,
    modeloAnio,
    cilindrajeCc,
    cylinder,
    fuel: mapFuel(combustible),
    model: mapModel(modeloAnio, cylinder),
    valuation: mapValuation(avaluo),
    municipality: mapMunicipality(organismo),
    clase,
    combustible,
    organismoTransito: organismo,
  };
}

function runtEnv(...values: Array<string | undefined>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function headers() {
  const key = runtEnv(RUNT_APIM_KEY, process.env.RUNT_APIM_KEY);
  const token = runtEnv(RUNT_ACCESS_TOKEN, process.env.RUNT_ACCESS_TOKEN);
  const headersMap: Record<string, string> = {
    "Ocp-Apim-Subscription-Key": key,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (token) headersMap.Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
  return headersMap;
}

async function readBody(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text };
  }
}

export async function consultarRuntPorPlaca(placa: string) {
  const normalized = placa.replace(/[\s-]/g, "").toUpperCase();
  if (!/^[A-Z0-9]{5,7}$/.test(normalized)) {
    return { found: false as const, vehicle: null, error: "Placa inválida" };
  }

  const mock = mockRuntVehicles.find((item) => item.placa === normalized);
  if (mock) return { found: true as const, vehicle: mock, error: null };

  const enabled = runtEnv(RUNT_ENABLED, process.env.RUNT_ENABLED) !== "false";
  const base = (runtEnv(RUNT_APIM_BASE_URL, process.env.RUNT_APIM_BASE_URL) || "https://apipypsolidarioprd.movilidadbogota.gov.co/").replace(/\/?$/, "/");
  const key = runtEnv(RUNT_APIM_KEY, process.env.RUNT_APIM_KEY);

  if (!enabled || !key) {
    return { found: false as const, vehicle: null, error: "Falta RUNT_APIM_KEY en .env" };
  }

  const paths = [
    { method: "GET", url: `${base}fx-pyps-config-avaluo-sdm-prd/datos-parametrico/avaluo-consolidado/${normalized}` },
  ];

  let needsLogin = false;

  for (const path of paths) {
    try {
      const res = await fetch(path.url, {
        method: path.method,
        headers: headers(),
      });
      if (res.status === 401 || res.status === 403) {
        needsLogin = true;
        continue;
      }
      if (!res.ok) continue;
      const payload = await readBody(res);
      const vehicle = normalizeRuntVehicle(normalized, payload);
      if (vehicle) return { found: true as const, vehicle, error: null };
    } catch {
      continue;
    }
  }

  if (needsLogin) {
    return {
      found: false as const,
      vehicle: null,
      error:
        "La SDM pide inicio de sesión para consultar una placa en el RUNT. El simulador oficial tampoco busca por placa: llena cilindraje, combustible y modelo a mano.",
    };
  }

  return { found: false as const, vehicle: null, error: "El RUNT no devolvió datos para esa placa" };
}

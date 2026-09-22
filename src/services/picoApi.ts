import {
  durationOptions,
  durationTableLabels,
  environmentalLabel,
  getEnvironmentalFactor,
  mockCitizen,
  mockRequests,
  municipalityOptions,
  permitEndDate,
  roundToHundred,
  valuationOptions,
} from "../data/picoMock";

const useMock =
  import.meta.env.PUBLIC_USE_MOCK !== "false" &&
  (import.meta.env.PUBLIC_USE_MOCK === "true" || import.meta.env.USE_MOCK !== "false");

export type SimulateInput = {
  duration: string;
  cylinder: string;
  fuel: string;
  model: string;
  valuation: string;
  municipality: string;
};

export type SimulateResult = {
  value: number;
  currency: "COP";
  breakdown: Record<string, number | string>;
};

export type SearchPersonInput = {
  tipoDocumento: string;
  numeroDocumento: string;
};

export type SearchRequestsInput = SearchPersonInput & {
  placa?: string;
};

function factorOf<T extends { id: string; factor: number }>(list: T[], id: string) {
  return list.find((item) => item.id === id)?.factor ?? 1;
}

function delay(ms = 350) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function mockSimulate(input: SimulateInput): Promise<SimulateResult> {
  await delay();
  const duration = durationOptions.find((item) => item.id === input.duration);
  const valuation = valuationOptions.find((item) => item.id === input.valuation);
  const municipality = municipalityOptions.find((item) => item.id === input.municipality);
  const base = duration?.base ?? 0;
  const a = valuation?.factor ?? 1;
  const m = factorOf(municipalityOptions, input.municipality);
  const b = getEnvironmentalFactor(input.fuel, input.model || "3", input.cylinder);
  const value = roundToHundred(base * a * m * b);
  const impact = environmentalLabel(b);
  return {
    value,
    currency: "COP",
    breakdown: {
      base,
      duration: duration?.es ?? "",
      durationEn: duration?.en ?? "",
      a,
      m,
      b,
      environmental: impact.es,
      environmentalEn: impact.en,
      valuation: valuation?.es ?? "",
      valuationEn: valuation?.en ?? "",
      municipality: municipality?.es ?? "",
      municipalityEn: municipality?.en ?? "",
    },
  };
}

async function mockSearchPerson(input: SearchPersonInput) {
  await delay();
  const numero = input.numeroDocumento.replace(/\s+/g, "");
  if (input.tipoDocumento === mockCitizen.tipoDocumento && numero === mockCitizen.numeroDocumento) {
    return { found: true as const, person: mockCitizen };
  }
  return { found: false as const, person: null };
}

export type SavedRequest = (typeof mockRequests)[number];

const SESSION_REQUESTS_KEY = "pyps-user-requests";

function readSessionRequests(): SavedRequest[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(SESSION_REQUESTS_KEY);
    return raw ? (JSON.parse(raw) as SavedRequest[]) : [];
  } catch {
    return [];
  }
}

export function persistRequest(request: SavedRequest) {
  if (typeof sessionStorage === "undefined") return;
  const current = readSessionRequests().filter((item) => item.id !== request.id);
  sessionStorage.setItem(SESSION_REQUESTS_KEY, JSON.stringify([request, ...current]));
}

export function formatCop(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

export { permitEndDate, durationTableLabels };

async function mockSearchRequests(input: SearchRequestsInput) {
  await delay();
  const numero = input.numeroDocumento.replace(/\s+/g, "");
  const plate = (input.placa || "").replace(/\s+/g, "").toUpperCase();
  const items = [...readSessionRequests(), ...mockRequests].filter((item) => {
    const docOk = item.tipoDocumento === input.tipoDocumento && item.numeroDocumento === numero;
    const plateOk = !plate || item.placa === plate;
    return docOk && plateOk;
  });
  return { items };
}

export const api = {
  useMock,
  async lookupRunt(placa: string) {
    const res = await fetch("/api/runt/vehiculo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placa }),
    });
    return (await res.json()) as {
      found: boolean;
      vehicle: {
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
      } | null;
      error?: string;
    };
  },
  simulate(input: SimulateInput) {
    return mockSimulate(input);
  },
  searchPerson(input: SearchPersonInput) {
    return mockSearchPerson(input);
  },
  searchRequests(input: SearchRequestsInput) {
    return mockSearchRequests(input);
  },
};

export type Citizen = typeof mockCitizen;

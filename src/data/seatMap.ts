export type SeatType = 'latam-plus' | 'forward' | 'exit' | 'standard' | 'unavailable';

export type SeatCell = {
  letter: string;
  type: SeatType;
  available: boolean;
  price: number;
};

export type SeatRow = {
  row: number;
  seats: SeatCell[];
};

export type SeatCategory = {
  id: SeatType;
  name: string;
  fromPrice: number;
  accent: string;
  xl?: boolean;
  benefits?: string[];
};

export const SEAT_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

export const seatCategories: SeatCategory[] = [
  {
    id: 'latam-plus',
    name: 'LATAM+',
    fromPrice: 24.34,
    accent: '#e8114b',
    xl: true,
    benefits: [
      'Más espacio para tus piernas',
      'Embarque y desembarque prioritario',
      'Lugar exclusivo para tu equipaje',
    ],
  },
  {
    id: 'forward',
    name: 'Más adelante',
    fromPrice: 20.5,
    accent: '#800f71',
    benefits: [
      'Siéntate en la parte delantera del avión',
      'Embarca y desembarca con prioridad',
    ],
  },
  {
    id: 'exit',
    name: 'Salida de emergencia',
    fromPrice: 17.93,
    accent: '#5c7a1f',
    xl: true,
    benefits: [
      'Más espacio para tus piernas',
      'Embarca con prioridad',
      'Necesitarás cumplir con requisitos especiales',
    ],
  },
  {
    id: 'standard',
    name: 'Estándar',
    fromPrice: 0,
    accent: '#1b0088',
    benefits: ['Elige el asiento de tu preferencia'],
  },
];

const TYPE_MAP: Record<string, SeatType> = {
  'LATAM+': 'latam-plus',
  'Más adelante': 'forward',
  'Salida de emergencia': 'exit',
  Estándar: 'standard',
};

/** Mapa Airbus 319 extraído del flujo real LATAM (UIO–GYE). */
const RAW_MAP: Record<number, Record<string, { type: string; avail: boolean; price: number }>> = {
  3: { A: { type: 'LATAM+', avail: true, price: 21.16 }, B: { type: 'LATAM+', avail: true, price: 21.16 }, C: { type: 'LATAM+', avail: false, price: 0 }, D: { type: 'LATAM+', avail: false, price: 0 }, E: { type: 'LATAM+', avail: true, price: 21.16 }, F: { type: 'LATAM+', avail: true, price: 21.16 } },
  4: { A: { type: 'LATAM+', avail: true, price: 21.16 }, B: { type: 'LATAM+', avail: true, price: 21.16 }, C: { type: 'LATAM+', avail: true, price: 21.16 }, D: { type: 'LATAM+', avail: true, price: 21.16 }, E: { type: 'LATAM+', avail: true, price: 21.16 }, F: { type: 'LATAM+', avail: true, price: 21.16 } },
  5: { A: { type: 'LATAM+', avail: true, price: 21.16 }, B: { type: 'LATAM+', avail: true, price: 21.16 }, C: { type: 'LATAM+', avail: true, price: 21.16 }, D: { type: 'LATAM+', avail: true, price: 21.16 }, E: { type: 'LATAM+', avail: true, price: 21.16 }, F: { type: 'LATAM+', avail: true, price: 21.16 } },
  6: { A: { type: 'LATAM+', avail: true, price: 21.16 }, B: { type: 'LATAM+', avail: true, price: 21.16 }, C: { type: 'LATAM+', avail: true, price: 21.16 }, D: { type: 'LATAM+', avail: true, price: 21.16 }, E: { type: 'LATAM+', avail: true, price: 21.16 }, F: { type: 'LATAM+', avail: true, price: 21.16 } },
  7: { A: { type: 'Más adelante', avail: true, price: 17.83 }, B: { type: 'Más adelante', avail: true, price: 17.83 }, C: { type: 'Más adelante', avail: false, price: 0 }, D: { type: 'Más adelante', avail: false, price: 0 }, E: { type: 'Más adelante', avail: false, price: 0 }, F: { type: 'Más adelante', avail: false, price: 0 } },
  8: { A: { type: 'Más adelante', avail: true, price: 17.83 }, B: { type: 'Estándar', avail: false, price: 0 }, C: { type: 'Estándar', avail: false, price: 0 }, D: { type: 'Estándar', avail: false, price: 0 }, E: { type: 'Estándar', avail: false, price: 0 }, F: { type: 'Más adelante', avail: true, price: 17.83 } },
  9: { A: { type: 'Más adelante', avail: true, price: 17.83 }, B: { type: 'Más adelante', avail: true, price: 17.83 }, C: { type: 'Más adelante', avail: true, price: 17.83 }, D: { type: 'Más adelante', avail: true, price: 17.83 }, E: { type: 'Más adelante', avail: true, price: 17.83 }, F: { type: 'Más adelante', avail: false, price: 0 } },
  10: { A: { type: 'Salida de emergencia', avail: true, price: 15.59 }, B: { type: 'Salida de emergencia', avail: true, price: 15.59 }, C: { type: 'Salida de emergencia', avail: true, price: 15.59 }, D: { type: 'Estándar', avail: false, price: 0 }, E: { type: 'Estándar', avail: false, price: 0 }, F: { type: 'Salida de emergencia', avail: true, price: 15.59 } },
  11: { A: { type: 'Estándar', avail: false, price: 0 }, B: { type: 'Estándar', avail: false, price: 0 }, C: { type: 'Estándar', avail: true, price: 0 }, D: { type: 'Estándar', avail: true, price: 0 }, E: { type: 'Estándar', avail: false, price: 0 }, F: { type: 'Estándar', avail: false, price: 0 } },
  12: { A: { type: 'Estándar', avail: true, price: 0 }, B: { type: 'Estándar', avail: false, price: 0 }, C: { type: 'Estándar', avail: true, price: 0 }, D: { type: 'Estándar', avail: true, price: 0 }, E: { type: 'Estándar', avail: true, price: 0 }, F: { type: 'Estándar', avail: true, price: 0 } },
  13: { A: { type: 'Estándar', avail: false, price: 0 }, B: { type: 'Estándar', avail: false, price: 0 }, C: { type: 'Estándar', avail: false, price: 0 }, D: { type: 'Estándar', avail: true, price: 0 }, E: { type: 'Estándar', avail: true, price: 0 }, F: { type: 'Estándar', avail: true, price: 0 } },
  14: { A: { type: 'Estándar', avail: true, price: 0 }, B: { type: 'Estándar', avail: false, price: 0 }, C: { type: 'Estándar', avail: false, price: 0 }, D: { type: 'Estándar', avail: false, price: 0 }, E: { type: 'Estándar', avail: false, price: 0 }, F: { type: 'Estándar', avail: false, price: 0 } },
  15: { A: { type: 'Estándar', avail: false, price: 0 }, B: { type: 'Estándar', avail: false, price: 0 }, C: { type: 'Estándar', avail: true, price: 0 }, D: { type: 'Estándar', avail: true, price: 0 }, E: { type: 'Estándar', avail: false, price: 0 }, F: { type: 'Estándar', avail: false, price: 0 } },
  16: { A: { type: 'Estándar', avail: false, price: 0 }, B: { type: 'Estándar', avail: false, price: 0 }, C: { type: 'Estándar', avail: false, price: 0 }, D: { type: 'Estándar', avail: false, price: 0 }, E: { type: 'Estándar', avail: false, price: 0 }, F: { type: 'Estándar', avail: false, price: 0 } },
  17: { A: { type: 'Estándar', avail: false, price: 0 }, B: { type: 'Estándar', avail: false, price: 0 }, C: { type: 'Estándar', avail: false, price: 0 }, D: { type: 'Estándar', avail: false, price: 0 }, E: { type: 'Estándar', avail: false, price: 0 }, F: { type: 'Estándar', avail: false, price: 0 } },
  18: { A: { type: 'Estándar', avail: false, price: 0 }, B: { type: 'Estándar', avail: false, price: 0 }, C: { type: 'Estándar', avail: false, price: 0 }, D: { type: 'Estándar', avail: false, price: 0 }, E: { type: 'Estándar', avail: false, price: 0 }, F: { type: 'Estándar', avail: false, price: 0 } },
  19: { A: { type: 'Estándar', avail: false, price: 0 }, B: { type: 'Estándar', avail: false, price: 0 }, C: { type: 'Estándar', avail: false, price: 0 }, D: { type: 'Estándar', avail: false, price: 0 }, E: { type: 'Estándar', avail: false, price: 0 }, F: { type: 'Estándar', avail: false, price: 0 } },
  20: { A: { type: 'Estándar', avail: false, price: 0 }, B: { type: 'Estándar', avail: false, price: 0 }, C: { type: 'Estándar', avail: false, price: 0 }, D: { type: 'Estándar', avail: false, price: 0 }, E: { type: 'Estándar', avail: false, price: 0 }, F: { type: 'Estándar', avail: false, price: 0 } },
  21: { A: { type: 'Estándar', avail: false, price: 0 }, B: { type: 'Estándar', avail: false, price: 0 }, C: { type: 'Estándar', avail: false, price: 0 }, D: { type: 'Estándar', avail: false, price: 0 }, E: { type: 'Estándar', avail: false, price: 0 }, F: { type: 'Estándar', avail: false, price: 0 } },
  22: { A: { type: 'Estándar', avail: false, price: 0 }, B: { type: 'Estándar', avail: false, price: 0 }, C: { type: 'Estándar', avail: false, price: 0 }, D: { type: 'Estándar', avail: false, price: 0 }, E: { type: 'Estándar', avail: false, price: 0 }, F: { type: 'Estándar', avail: false, price: 0 } },
  23: { A: { type: 'Estándar', avail: false, price: 0 }, B: { type: 'Estándar', avail: false, price: 0 }, C: { type: 'Estándar', avail: false, price: 0 }, D: { type: 'Estándar', avail: false, price: 0 }, E: { type: 'Estándar', avail: false, price: 0 }, F: { type: 'Estándar', avail: false, price: 0 } },
  24: { A: { type: 'Estándar', avail: false, price: 0 }, B: { type: 'Estándar', avail: false, price: 0 }, C: { type: 'Estándar', avail: false, price: 0 }, D: { type: 'Estándar', avail: false, price: 0 }, E: { type: 'Estándar', avail: false, price: 0 }, F: { type: 'Estándar', avail: false, price: 0 } },
};

export const EMERGENCY_BEFORE_ROW = 10;
export const AIRCRAFT_LABEL = 'Airbus 319';

export function buildSeatRows(): SeatRow[] {
  return Object.keys(RAW_MAP)
    .map(Number)
    .sort((a, b) => a - b)
    .map((row) => ({
      row,
      seats: SEAT_LETTERS.map((letter) => {
        const cell = RAW_MAP[row][letter];
        return {
          letter,
          type: TYPE_MAP[cell.type] || 'standard',
          available: cell.avail,
          price: cell.price,
        };
      }),
    }));
}

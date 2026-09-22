export type OffersQuery = {
  origin: string;
  destination: string;
  depart: string;
  returnDate: string;
  adults: string;
  children: string;
  infants: string;
  cabin: string;
  trip: 'roundtrip' | 'oneway';
  sort: string;
};

function isoFrom(value?: string | null) {
  if (!value) return '';
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

export function parseOffersQuery(params: URLSearchParams): OffersQuery {
  const tripRaw = (params.get('trip') || 'roundtrip').toUpperCase();
  const trip = tripRaw === 'OW' || tripRaw === 'ONEWAY' ? 'oneway' : 'roundtrip';
  return {
    origin: (params.get('origin') || '').toUpperCase(),
    destination: (params.get('destination') || '').toUpperCase(),
    depart: isoFrom(params.get('depart') || params.get('outbound')),
    returnDate: isoFrom(params.get('return') || params.get('inbound')),
    adults: params.get('adults') || params.get('adt') || '1',
    children: params.get('children') || params.get('chd') || '0',
    infants: params.get('infants') || params.get('inf') || '0',
    cabin: params.get('cabin') || 'Economy',
    trip,
    sort: params.get('sort') || 'RECOMMENDED',
  };
}

const DAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function prettyDate(iso: string) {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${DAYS[d.getDay()]}. ${d.getDate()} ${MONTHS[d.getMonth()]}.`;
}

export function passengerLabel(adults: number, children: number, infants: number) {
  const parts = [`${adults} adulto${adults === 1 ? '' : 's'}`];
  if (children) parts.push(`${children} niño${children === 1 ? '' : 's'}`);
  if (infants) parts.push(`${infants} bebé${infants === 1 ? '' : 's'}`);
  return parts.join(', ');
}

export function money(value: number) {
  return `COP ${Math.round(Number(value) || 0).toLocaleString('es-CO')}`;
}

export function dateStrip(selected: string, todayIso: string) {
  const days: string[] = [];
  const base = new Date(`${selected}T12:00:00`);
  if (Number.isNaN(base.getTime())) return [selected].filter(Boolean);
  for (let i = -3; i <= 3; i += 1) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (iso >= todayIso) days.push(iso);
  }
  return days.slice(0, 7);
}

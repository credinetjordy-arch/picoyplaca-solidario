import { buildFareOptions, type FareOption } from '../data/fareBrands';

export type FlightLegInfo = {
  depart: string;
  arrive: string;
  duration: string;
  durationMinutes: number;
  stops: string;
  stopCount: number;
  flightNumber: string;
  period: 'morning' | 'afternoon' | 'evening';
};

export type FlightOperator = {
  name: string;
  code: string;
};

export type FlightSegmentDetail = {
  flightNumber: string;
  operator: string;
  operatorCode: string;
  depart: string;
  arrive: string;
  duration: string;
  durationMinutes: number;
  originCode: string;
  originCity: string;
  originAirport: string;
  destCode: string;
  destCity: string;
  destAirport: string;
  layover?: string;
};

export type FlightResult = {
  id: string;
  outboundLegId: string;
  inboundLegId?: string;
  airline: string;
  flightNumber: string;
  depart: string;
  arrive: string;
  duration: string;
  durationMinutes: number;
  stops: string;
  stopCount: number;
  period: 'morning' | 'afternoon' | 'evening';
  date: string;
  price: number;
  fare: string;
  latam: boolean;
  arriveNextDay: boolean;
  operators: FlightOperator[];
  inbound?: FlightLegInfo;
  itinerary: FlightSegmentDetail[];
  fareOptions: FareOption[];
};

type FlightApiPayload = {
  itineraries?: Itinerary[];
  legs?: Leg[];
  segments?: Segment[];
  carriers?: Carrier[];
  places?: Place[];
};

type Itinerary = {
  id: string;
  leg_ids?: string[];
  pricing_options?: {
    agent_ids?: string[];
    price?: { amount?: number };
    items?: {
      agent_id?: string;
      price?: { amount?: number };
      fares?: { fare_family?: string; fare_basis_code?: string }[];
    }[];
  }[];
};

type Leg = {
  id: string;
  origin_place_id?: number;
  destination_place_id?: number;
  departure?: string;
  arrival?: string;
  duration?: number;
  stop_count?: number;
  segment_ids?: string[];
  marketing_carrier_ids?: number[];
  operating_carrier_ids?: number[];
};

type Segment = {
  id: string;
  origin_place_id?: number;
  destination_place_id?: number;
  departure?: string;
  arrival?: string;
  duration?: number;
  marketing_flight_number?: string;
  marketing_carrier_id?: number;
  operating_carrier_id?: number;
};

type Carrier = {
  id: number;
  name?: string;
  display_code?: string;
  alt_id?: string;
};

type Place = {
  id: number;
  name?: string;
  display_code?: string;
  type?: string;
  parent_id?: number;
};

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function isoDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function mapCabin(cabin: string) {
  const value = cabin.toLowerCase();
  if (value.includes('premium') && value.includes('econ')) return 'Premium_Economy';
  if (value.includes('business') || value.includes('premium')) return 'Business';
  if (value.includes('first')) return 'First';
  return 'Economy';
}

function clock(iso?: string) {
  if (!iso) return '--:--';
  const match = String(iso).match(/T(\d{2}):(\d{2})/);
  if (match) return `${match[1]}:${match[2]}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--:--';
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export function durationLabel(mins?: number) {
  if (!mins && mins !== 0) return '—';
  const h = Math.floor(Math.abs(mins) / 60);
  const m = Math.abs(mins) % 60;
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `0 h ${m} min`;
}

function isoDay(iso?: string) {
  const match = String(iso || '').match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

function minutesBetween(fromIso?: string, toIso?: string) {
  if (!fromIso || !toIso) return 0;
  const from = Date.parse(fromIso);
  const to = Date.parse(toIso);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.max(0, Math.round((to - from) / 60000));
}

function resolvePlace(id: number | undefined, places: Map<number, Place>) {
  const place = id != null ? places.get(id) : undefined;
  if (!place) return { code: '', city: '', airport: '' };
  const parent = place.parent_id != null ? places.get(place.parent_id) : undefined;
  const isAirport = /AIRPORT/i.test(place.type || '');
  const isCity = /CITY/i.test(place.type || '');
  let airport = isAirport ? (place.name || '') : '';
  if (!airport) {
    for (const child of places.values()) {
      if (child.parent_id === place.id && /AIRPORT/i.test(child.type || '') && child.name) {
        airport = child.name;
        break;
      }
    }
  }
  return {
    code: (place.display_code || parent?.display_code || '').toUpperCase(),
    city: isCity ? (place.name || '') : (parent?.name || place.name || ''),
    airport,
  };
}

function periodFromClock(time: string): FlightLegInfo['period'] {
  const hour = Number(time.slice(0, 2));
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

function legInfo(
  outbound: Leg | undefined,
  segments: Map<string, Segment>,
  carriers: Map<number, Carrier>,
): FlightLegInfo {
  const firstSeg = outbound?.segment_ids?.[0] ? segments.get(outbound.segment_ids[0]) : undefined;
  const carrier = carriers.get(outbound?.marketing_carrier_ids?.[0] ?? firstSeg?.marketing_carrier_id ?? 0);
  const stops = outbound?.stop_count ?? 0;
  const mins = outbound?.duration ?? 0;
  const depart = clock(outbound?.departure);
  return {
    depart,
    arrive: clock(outbound?.arrival),
    duration: durationLabel(mins),
    durationMinutes: mins,
    stops: stops === 0 ? 'Directo' : `${stops} parada${stops > 1 ? 's' : ''}`,
    stopCount: stops,
    flightNumber: firstSeg?.marketing_flight_number
      ? `${carrier?.display_code || 'LA'} ${firstSeg.marketing_flight_number}`
      : '',
    period: periodFromClock(depart),
  };
}

function buildItinerary(
  leg: Leg | undefined,
  segments: Map<string, Segment>,
  carriers: Map<number, Carrier>,
  places: Map<number, Place>,
  fallbackOperator: string,
): FlightSegmentDetail[] {
  const ids = leg?.segment_ids || [];
  return ids.map((id, index) => {
    const seg = segments.get(id);
    const marketing = carriers.get(seg?.marketing_carrier_id ?? 0);
    const operating = carriers.get(seg?.operating_carrier_id ?? 0);
    const carrier = operating || marketing;
    const origin = resolvePlace(seg?.origin_place_id ?? (index === 0 ? leg?.origin_place_id : undefined), places);
    const dest = resolvePlace(seg?.destination_place_id ?? (index === ids.length - 1 ? leg?.destination_place_id : undefined), places);
    const op = refineLatamOperator(
      operatorFromCarrier(carrier, fallbackOperator),
      origin.code,
      dest.code,
      origin.city,
      dest.city,
    );
    const next = ids[index + 1] ? segments.get(ids[index + 1]) : undefined;
    const wait = minutesBetween(seg?.arrival, next?.departure);
    return {
      flightNumber: seg?.marketing_flight_number
        ? `${marketing?.display_code || operating?.display_code || 'LA'} ${seg.marketing_flight_number}`
        : '',
      operator: op?.name || fallbackOperator,
      operatorCode: op?.code || iataCode(carrier),
      depart: clock(seg?.departure || (index === 0 ? leg?.departure : undefined)),
      arrive: clock(seg?.arrival || (index === ids.length - 1 ? leg?.arrival : undefined)),
      duration: durationLabel(seg?.duration),
      durationMinutes: seg?.duration || 0,
      originCode: origin.code,
      originCity: origin.city,
      originAirport: origin.airport,
      destCode: dest.code,
      destCity: dest.city,
      destAirport: dest.airport,
      layover: wait > 0 ? durationLabel(wait) : undefined,
    };
  });
}

function iataCode(carrier?: Carrier) {
  const alt = (carrier?.alt_id || '').toUpperCase();
  const display = (carrier?.display_code || '').toUpperCase();
  if (/^[A-Z0-9]{2}$/.test(alt)) return alt;
  if (/^[A-Z0-9]{2}$/.test(display)) return display;
  return display || alt;
}

const LATAM_OPERATOR_NAMES: Record<string, string> = {
  LA: 'LATAM Airlines',
  LP: 'LATAM Airlines Perú',
  XL: 'LATAM Airlines Ecuador',
  '4C': 'LATAM Airlines Colombia',
  JJ: 'LATAM Airlines Brasil',
  LU: 'LATAM Airlines Argentina',
  PZ: 'LATAM Airlines Paraguay',
};

function operatorFromCarrier(carrier: Carrier | undefined, fallback: string): FlightOperator | null {
  if (!carrier) return null;
  const code = iataCode(carrier);
  const raw = (carrier.name || '').trim();
  const mapped = LATAM_OPERATOR_NAMES[code];
  const specific = /ecuador|per[uú]|colombia|brasil|argentina|paraguay/i.test(raw);
  const name = (mapped && !specific ? mapped : raw) || mapped || fallback;
  if (!name) return null;
  return { name, code: code || 'LA' };
}

const LATAM_AIRPORT_SUBSIDIARY: Record<string, { name: string; code: string }> = {
  UIO: { name: 'LATAM Airlines Ecuador', code: 'XL' },
  GYE: { name: 'LATAM Airlines Ecuador', code: 'XL' },
  CUE: { name: 'LATAM Airlines Ecuador', code: 'XL' },
  MEC: { name: 'LATAM Airlines Ecuador', code: 'XL' },
  OCC: { name: 'LATAM Airlines Ecuador', code: 'XL' },
  GPS: { name: 'LATAM Airlines Ecuador', code: 'XL' },
  SCY: { name: 'LATAM Airlines Ecuador', code: 'XL' },
  BOG: { name: 'LATAM Airlines Colombia', code: '4C' },
  MDE: { name: 'LATAM Airlines Colombia', code: '4C' },
  CLO: { name: 'LATAM Airlines Colombia', code: '4C' },
  CTG: { name: 'LATAM Airlines Colombia', code: '4C' },
  BAQ: { name: 'LATAM Airlines Colombia', code: '4C' },
  SMR: { name: 'LATAM Airlines Colombia', code: '4C' },
  PEI: { name: 'LATAM Airlines Colombia', code: '4C' },
  ADZ: { name: 'LATAM Airlines Colombia', code: '4C' },
  LIM: { name: 'LATAM Airlines Perú', code: 'LP' },
  CUZ: { name: 'LATAM Airlines Perú', code: 'LP' },
  AQP: { name: 'LATAM Airlines Perú', code: 'LP' },
  IQT: { name: 'LATAM Airlines Perú', code: 'LP' },
  PIU: { name: 'LATAM Airlines Perú', code: 'LP' },
  TRU: { name: 'LATAM Airlines Perú', code: 'LP' },
  TPP: { name: 'LATAM Airlines Perú', code: 'LP' },
  JUL: { name: 'LATAM Airlines Perú', code: 'LP' },
  PEM: { name: 'LATAM Airlines Perú', code: 'LP' },
  TCG: { name: 'LATAM Airlines Perú', code: 'LP' },
  CIX: { name: 'LATAM Airlines Perú', code: 'LP' },
  TCQ: { name: 'LATAM Airlines Perú', code: 'LP' },
  GRU: { name: 'LATAM Airlines Brasil', code: 'JJ' },
  GIG: { name: 'LATAM Airlines Brasil', code: 'JJ' },
  BSB: { name: 'LATAM Airlines Brasil', code: 'JJ' },
  CNF: { name: 'LATAM Airlines Brasil', code: 'JJ' },
};

function isGenericLatamName(name: string) {
  return /^(latam airlines|latam airlines group|latam)$/i.test(name.trim());
}

function subsidiaryFromPlace(code: string, city: string) {
  const iata = (code || '').toUpperCase();
  if (LATAM_AIRPORT_SUBSIDIARY[iata]) return LATAM_AIRPORT_SUBSIDIARY[iata];
  const text = `${code} ${city}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/lima|cusco|cuzco|arequipa|iquitos|piura|trujillo|peru/.test(text)) {
    return { name: 'LATAM Airlines Perú', code: 'LP' };
  }
  if (/bogota|medellin|cali|cartagena|barranquilla|colombia/.test(text)) {
    return { name: 'LATAM Airlines Colombia', code: '4C' };
  }
  if (/quito|guayaquil|cuenca|ecuador/.test(text)) {
    return { name: 'LATAM Airlines Ecuador', code: 'XL' };
  }
  if (/sao paulo|rio de janeiro|brasilia|brasil|brazil/.test(text)) {
    return { name: 'LATAM Airlines Brasil', code: 'JJ' };
  }
  return null;
}

function refineLatamOperator(
  op: FlightOperator | null,
  originCode: string,
  destCode: string,
  originCity = '',
  destCity = '',
): FlightOperator | null {
  if (!op) return null;
  if (op.code && LATAM_OPERATOR_NAMES[op.code] && op.code !== 'LA') {
    return { name: LATAM_OPERATOR_NAMES[op.code], code: op.code };
  }
  const inferred = subsidiaryFromPlace(originCode, originCity) || subsidiaryFromPlace(destCode, destCity);
  if (inferred) return { name: inferred.name, code: inferred.code };
  if (isGenericLatamName(op.name) || op.code === 'LA') {
    return { name: 'LATAM Airlines Colombia', code: '4C' };
  }
  return op;
}

function collectOperators(
  leg: Leg | undefined,
  segments: Map<string, Segment>,
  carriers: Map<number, Carrier>,
  places: Map<number, Place>,
  fallback: string,
): FlightOperator[] {
  const seen = new Set<string>();
  const out: FlightOperator[] = [];

  const pushOp = (op: FlightOperator | null) => {
    if (!op) return;
    const key = op.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (seen.has(key)) return;
    seen.add(key);
    out.push(op);
  };

  const ids = leg?.segment_ids || [];
  ids.forEach((id, index) => {
    const seg = segments.get(id);
    const operating = carriers.get(seg?.operating_carrier_id ?? 0);
    const marketing = carriers.get(seg?.marketing_carrier_id ?? 0);
    const origin = resolvePlace(seg?.origin_place_id ?? (index === 0 ? leg?.origin_place_id : undefined), places);
    const dest = resolvePlace(seg?.destination_place_id ?? (index === ids.length - 1 ? leg?.destination_place_id : undefined), places);
    const apply = (carrier?: Carrier) => {
      pushOp(refineLatamOperator(operatorFromCarrier(carrier, fallback), origin.code, dest.code, origin.city, dest.city));
    };
    apply(operating);
    apply(marketing);
  });

  for (const id of [...(leg?.operating_carrier_ids || []), ...(leg?.marketing_carrier_ids || [])]) {
    const carrier = carriers.get(id);
    const op = operatorFromCarrier(carrier, fallback);
    if (op && isGenericLatamName(op.name)) continue;
    pushOp(op);
  }

  return out.length ? out : [{ name: 'LATAM Airlines Colombia', code: '4C' }];
}

function isLatamCarrier(carrier?: Carrier) {
  const code = iataCode(carrier);
  const name = (carrier?.name || '').toUpperCase();
  return Boolean(LATAM_OPERATOR_NAMES[code]) || name.includes('LATAM');
}

function legHasLatam(leg: Leg | undefined, segments: Map<string, Segment>, carriers: Map<number, Carrier>) {
  const ids = [
    ...(leg?.marketing_carrier_ids || []),
    ...(leg?.operating_carrier_ids || []),
    ...(leg?.segment_ids || []).flatMap((id) => {
      const seg = segments.get(id);
      return [seg?.marketing_carrier_id, seg?.operating_carrier_id];
    }),
  ].filter((id): id is number => typeof id === 'number');
  return ids.some((id) => isLatamCarrier(carriers.get(id)));
}

type IgnavSegment = {
  marketing_carrier_code?: string | null;
  flight_number?: string | null;
  operating_carrier_name?: string | null;
  departure_airport?: string;
  departure_time_local?: string;
  arrival_airport?: string;
  arrival_time_local?: string;
  duration_minutes?: number;
};

type IgnavLeg = {
  carrier?: string;
  duration_minutes?: number;
  segments?: IgnavSegment[];
};

type IgnavItinerary = {
  ignav_id?: string;
  price?: { amount?: number };
  outbound?: IgnavLeg;
  inbound?: IgnavLeg;
};

const IGNAV_AIRLINES = ['LA', 'LP', 'XL', '4C', 'JJ', 'LU', 'PZ'];
const IGNAV_MARKET = 'CO';

function ignavCabin(cabin: string) {
  const mapped = mapCabin(cabin);
  if (mapped === 'Premium_Economy') return 'premium_economy';
  return mapped.toLowerCase();
}

function formatFlightNumber(code: string, raw?: string | null) {
  const value = String(raw || '').trim();
  if (!value) return code;
  if (/^[A-Z0-9]{2}\s+\S/i.test(value)) return value.replace(/^([A-Z0-9]{2})\s+/i, (_, c) => `${String(c).toUpperCase()} `);
  const stripped = value.replace(/^[A-Z0-9]{2}/i, '').trim();
  return `${code} ${stripped || value}`.replace(/\s+/g, ' ').trim();
}

function isLatamIgnav(seg: IgnavSegment | undefined, carrier?: string) {
  const code = String(seg?.marketing_carrier_code || '').toUpperCase();
  const name = `${carrier || ''} ${seg?.operating_carrier_name || ''}`;
  return Boolean(LATAM_OPERATOR_NAMES[code]) || /latam/i.test(name);
}

function ignavLegInfo(leg?: IgnavLeg): FlightLegInfo {
  const segs = leg?.segments || [];
  const first = segs[0];
  const last = segs[segs.length - 1];
  const stops = Math.max(0, segs.length - 1);
  const mins = leg?.duration_minutes || segs.reduce((sum, seg) => sum + (seg.duration_minutes || 0), 0);
  const depart = clock(first?.departure_time_local);
  const code = String(first?.marketing_carrier_code || 'LA').toUpperCase();
  return {
    depart,
    arrive: clock(last?.arrival_time_local),
    duration: durationLabel(mins),
    durationMinutes: mins,
    stops: stops === 0 ? 'Directo' : `${stops} parada${stops > 1 ? 's' : ''}`,
    stopCount: stops,
    flightNumber: formatFlightNumber(code, first?.flight_number),
    period: periodFromClock(depart),
  };
}

function ignavSegments(leg: IgnavLeg | undefined, fallback: string): FlightSegmentDetail[] {
  const segs = leg?.segments || [];
  return segs.map((seg, index) => {
    const origin = String(seg.departure_airport || '').toUpperCase();
    const dest = String(seg.arrival_airport || '').toUpperCase();
    const code = String(seg.marketing_carrier_code || 'LA').toUpperCase();
    const op = refineLatamOperator(
      { name: LATAM_OPERATOR_NAMES[code] || seg.operating_carrier_name || fallback, code },
      origin,
      dest,
    );
    const next = segs[index + 1];
    const wait = minutesBetween(seg.arrival_time_local, next?.departure_time_local);
    return {
      flightNumber: formatFlightNumber(code, seg.flight_number),
      operator: op?.name || fallback,
      operatorCode: op?.code || code,
      depart: clock(seg.departure_time_local),
      arrive: clock(seg.arrival_time_local),
      duration: durationLabel(seg.duration_minutes),
      durationMinutes: seg.duration_minutes || 0,
      originCode: origin,
      originCity: '',
      originAirport: origin,
      destCode: dest,
      destCity: '',
      destAirport: dest,
      layover: wait > 0 ? durationLabel(wait) : undefined,
    };
  });
}

function ignavOperators(leg: IgnavLeg | undefined, fallback: string): FlightOperator[] {
  const seen = new Set<string>();
  const out: FlightOperator[] = [];
  for (const seg of leg?.segments || []) {
    const origin = String(seg.departure_airport || '').toUpperCase();
    const dest = String(seg.arrival_airport || '').toUpperCase();
    const code = String(seg.marketing_carrier_code || 'LA').toUpperCase();
    const op = refineLatamOperator(
      { name: LATAM_OPERATOR_NAMES[code] || seg.operating_carrier_name || fallback, code },
      origin,
      dest,
    );
    if (!op) continue;
    const key = op.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(op);
  }
  return out.length ? out : [{ name: fallback, code: 'LA' }];
}

export function parseFlightApi(
  payload: FlightApiPayload,
  cabin = 'Economy',
  opts?: { domesticColombia?: boolean; originColombia?: boolean; destEcuador?: boolean },
): FlightResult[] {
  const rows = ((payload.itineraries || []) as unknown as IgnavItinerary[]).map((it) => {
    const outbound = it.outbound;
    const inbound = it.inbound;
    const segs = outbound?.segments || [];
    const latam = segs.some((seg) => isLatamIgnav(seg, outbound?.carrier)) || /latam/i.test(outbound?.carrier || '');
    const out = ignavLegInfo(outbound);
    const back = inbound?.segments?.length ? ignavLegInfo(inbound) : undefined;
    const airline = opts?.domesticColombia && latam
      ? 'LATAM Airlines Colombia'
      : LATAM_OPERATOR_NAMES[String(segs[0]?.marketing_carrier_code || '').toUpperCase()]
        || outbound?.carrier
        || 'LATAM Airlines';
    const itinerary = ignavSegments(outbound, airline);
    const price = Number(it.price?.amount ?? 0);
    const firstIso = segs[0]?.departure_time_local;
    const lastIso = segs[segs.length - 1]?.arrival_time_local;

    return {
      id: it.ignav_id || `${out.flightNumber}-${out.depart}`,
      outboundLegId: it.ignav_id || `${out.flightNumber}-${out.depart}`,
      inboundLegId: inbound?.segments?.length ? `${it.ignav_id || 'in'}-back` : undefined,
      airline,
      flightNumber: out.flightNumber,
      depart: out.depart,
      arrive: out.arrive,
      duration: out.duration,
      durationMinutes: out.durationMinutes,
      stops: out.stops,
      stopCount: out.stopCount,
      period: out.period,
      date: isoDay(firstIso),
      price,
      fare: '',
      latam,
      arriveNextDay: Boolean(isoDay(lastIso) && isoDay(firstIso) && isoDay(lastIso) > isoDay(firstIso)),
      operators: ignavOperators(outbound, airline),
      inbound: back,
      itinerary,
      fareOptions: buildFareOptions(price, cabin),
    } satisfies FlightResult;
  });

  const latamRows = rows.filter((r) => r.latam);
  const list = latamRows.filter((r) => isLatamStyleItinerary(r, Boolean(opts?.domesticColombia)));
  return list.sort(sortRecommended).slice(0, 40);
}

function bestPricing(it: Itinerary) {
  const options = it.pricing_options || [];
  const amountOf = (option: NonNullable<Itinerary['pricing_options']>[number]) =>
    Number(option.price?.amount ?? option.items?.[0]?.price?.amount ?? 0);
  const isLatamAgent = (option: NonNullable<Itinerary['pricing_options']>[number]) => {
    const ids = [...(option.agent_ids || []), option.items?.[0]?.agent_id || ''].join(' ');
    return /latam|^la$|\blan\b/i.test(ids);
  };
  const latam = options.filter(isLatamAgent);
  const pool = latam.length ? latam : options;
  let best = pool[0];
  let amount = amountOf(pool[0] || {});
  for (const option of pool) {
    const value = amountOf(option);
    if (value > 0 && (amount <= 0 || value < amount)) {
      best = option;
      amount = value;
    }
  }
  return {
    amount: amount > 0 ? amount : 0,
    fare: best?.items?.[0]?.fares?.[0],
  };
}

function layoverMinutes(label?: string) {
  if (!label) return 0;
  const hours = Number((label.match(/(\d+)\s*h/) || [])[1] || 0);
  const mins = Number((label.match(/(\d+)\s*min/) || [])[1] || 0);
  return hours * 60 + mins;
}

function longestLayover(flight: FlightResult) {
  return Math.max(0, ...(flight.itinerary || []).map((seg) => layoverMinutes(seg.layover)));
}

function isLatamStyleItinerary(flight: FlightResult, domesticColombia: boolean) {
  if (!flight.durationMinutes || flight.stopCount > 2) return false;
  if (domesticColombia) {
    if (flight.stopCount === 0) return flight.durationMinutes <= 180;
    return flight.durationMinutes <= 600;
  }
  if (longestLayover(flight) > 960) return false;
  if (flight.stopCount === 0) return flight.durationMinutes <= 960;
  return flight.durationMinutes <= 1800;
}

const LATAM_HUBS = new Set(['LIM', 'BOG', 'SCL', 'GRU', 'GIG', 'MDE', 'CLO', 'UIO', 'GYE', 'MAD', 'MIA', 'CUN', 'AEP', 'EZE']);

function connectionCodes(flight: FlightResult) {
  const segs = flight.itinerary || [];
  if (segs.length < 2) return [];
  return segs.slice(0, -1).map((seg) => String(seg.destCode || '').toUpperCase()).filter(Boolean);
}

function viaLatamHub(flight: FlightResult) {
  return connectionCodes(flight).some((code) => LATAM_HUBS.has(code));
}

export function sortRecommended(a: FlightResult, b: FlightResult) {
  return (
    String(a.depart || '').localeCompare(String(b.depart || '')) ||
    a.durationMinutes - b.durationMinutes ||
    a.price - b.price
  );
}


import {
  siteConfig,
  discoverMenu,
  tripsMenu,
  headerLinks,
  currencies,
  cities,
  bookingTabs,
  cabins,
  loginInvite,
  promoBanner,
  serviceLinks,
  offers,
  offerCategories,
  hotels,
  campaigns,
  moreOptions,
  popularDestinations,
  passCta,
  experienceSlides,
  creditCard,
  footerColumns,
  socials,
  cookieBanner,
  type City,
} from '../data/mockData';
import { landingContent } from '../data/landing';
import { getTicketsUrl } from '../lib/geoRedirect';
import { buildFareOptions } from '../data/fareBrands';
import { isoDate, type FlightResult } from './flightApi';

const USE_MOCK = import.meta.env.USE_MOCK !== 'false';

export async function getLandingPageData() {
  if (USE_MOCK) {
    return {
      config: {
        ...siteConfig,
        title: landingContent.title,
        description: landingContent.description,
      },
      discoverMenu,
      tripsMenu,
      headerLinks,
      footerColumns,
      socials,
      cookieBanner,
      landing: landingContent,
      ticketsHref: getTicketsUrl(),
    };
  }

  const res = await fetch(`${import.meta.env.PUBLIC_API_URL}/landing`);
  if (!res.ok) throw new Error('Failed to fetch landing data');
  return res.json();
}

export async function getHomePageData() {
  if (USE_MOCK) {
    return {
      config: siteConfig,
      discoverMenu,
      tripsMenu,
      headerLinks,
      currencies,
      cities,
      bookingTabs,
      cabins,
      loginInvite,
      promoBanner,
      serviceLinks,
      offers,
      offerCategories,
      hotels,
      campaigns,
      moreOptions,
      popularDestinations,
      passCta,
      experienceSlides,
      creditCard,
      footerColumns,
      socials,
      cookieBanner,
    };
  }

  const res = await fetch(`${import.meta.env.PUBLIC_API_URL}/homepage`);
  if (!res.ok) throw new Error('Failed to fetch homepage data');
  return res.json();
}

function cityByCode(code: string): City {
  return cities.find((c) => c.code === code) ?? { code, city: code, country: '', airport: '' };
}

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

function isIsoDate(value?: string) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function mockFlight(
  id: string,
  flightNumber: string,
  depart: string,
  arrive: string,
  price: number,
  cabin: string,
): FlightResult {
  const hour = Number(depart.slice(0, 2));
  const period = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  return {
    id,
    outboundLegId: id,
    airline: 'LATAM Airlines',
    flightNumber,
    depart,
    arrive,
    duration: '0 h 55 min',
    durationMinutes: 55,
    stops: 'Directo',
    stopCount: 0,
    period,
    date: '',
    price,
    fare: '',
    latam: true,
    arriveNextDay: false,
    operators: [{ name: 'LATAM Airlines Colombia', code: '4C' }],
    itinerary: [{
      flightNumber,
      operator: 'LATAM Airlines Colombia',
      operatorCode: 'LP',
      depart,
      arrive,
      duration: '0 h 55 min',
      durationMinutes: 55,
      originCode: '',
      originCity: '',
      originAirport: '',
      destCode: '',
      destCity: '',
      destAirport: '',
    }],
    fareOptions: buildFareOptions(price, cabin),
  };
}

function mockResults(cabin: string): FlightResult[] {
  return [
    mockFlight('1', 'LA 4000', '05:35', '06:40', 309710, cabin),
    mockFlight('2', 'LA 4004', '08:15', '09:20', 236760, cabin),
    mockFlight('3', 'LA 4010', '12:40', '13:45', 217480, cabin),
    mockFlight('4', 'LA 4022', '18:05', '19:10', 372180, cabin),
  ];
}

export async function searchFlights(params: Record<string, string>) {
  const origin = (params.origin || '').toUpperCase();
  const destination = (params.destination || '').toUpperCase();
  const trip = params.trip || 'roundtrip';
  const cabin = params.cabin || 'Economy';
  const adults = params.adults || '1';
  const children = params.children || '0';
  const infants = params.infants || '0';
  const from = cityByCode(origin);
  const to = cityByCode(destination);
  const today = isoDate(new Date());
  const depart = isIsoDate(params.depart) ? params.depart : addDays(today, 14);
  const returnDate = isIsoDate(params.return)
    ? params.return
    : trip === 'oneway'
      ? undefined
      : addDays(depart, 7);

  const base = {
    from,
    to,
    trip,
    cabin,
    passengers: Number(adults),
    children: Number(children),
    infants: Number(infants),
    depart,
    returnDate,
  };

  if (USE_MOCK) {
    return { ...base, source: 'mock' as const, results: mockResults(cabin) };
  }

  const qs = new URLSearchParams(params);
  const res = await fetch(`${import.meta.env.PUBLIC_API_URL}/flights?${qs}`);
  if (!res.ok) throw new Error('Failed to search flights');
  return res.json();
}

export { cities };

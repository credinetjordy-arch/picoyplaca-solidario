export type CheckoutLeg = {
  legId: string;
  fareId: string;
  fareName: string;
  price: number;
  flight: {
    id: string;
    outboundLegId: string;
    depart: string;
    arrive: string;
    duration: string;
    stops: string;
    stopCount: number;
    price: number;
    arriveNextDay: boolean;
    airline: string;
    flightNumber: string;
    operators?: { name?: string; code?: string }[] | string[];
  } | null;
};

export type CheckoutSelection = {
  search: string;
  trip: 'roundtrip' | 'oneway';
  from: { code: string; city: string; country?: string; airport?: string };
  to: { code: string; city: string; country?: string; airport?: string };
  depart: string;
  returnDate?: string;
  adults: number;
  children: number;
  infants: number;
  cabin: string;
  outbound: CheckoutLeg;
  inbound?: CheckoutLeg | null;
};

export const CHECKOUT_STORAGE_KEY = 'latam-checkout-selection';

export function totalCheckoutPrice(selection: CheckoutSelection, discountPercent = 0) {
  const factor =
    Number.isFinite(discountPercent) && discountPercent > 0
      ? 1 - Math.min(100, discountPercent) / 100
      : 1;
  const out = Number(selection.outbound?.price || 0) * factor;
  const back = Number(selection.inbound?.price || 0) * factor;
  const pax = selection.adults + selection.children + selection.infants;
  return Math.round((out + back) * (pax || 1) * 100) / 100;
}

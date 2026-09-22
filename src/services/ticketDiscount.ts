/** Discount applied only to flight ticket prices (not seats, bags, etc.). */

export function normalizeDiscountPercent(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(100, Math.round(n * 100) / 100);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function ticketAfterDiscount(original: number, percent: unknown): number {
  const p = normalizeDiscountPercent(percent);
  const base = Number(original) || 0;
  if (p <= 0) return round2(base);
  return round2(base * (1 - p / 100));
}

/** HTML with before/after when discount > 0; otherwise a single price. */
export function ticketPriceHtml(
  original: number,
  percent: unknown,
  formatMoney: (n: number) => string,
): string {
  const before = Number(original) || 0;
  const p = normalizeDiscountPercent(percent);
  const after = ticketAfterDiscount(before, p);
  if (p <= 0) return formatMoney(before);
  return `<span class="ticket-price"><span class="ticket-price__was">${formatMoney(before)}</span><span class="ticket-price__now">${formatMoney(after)}</span></span>`;
}

export function ticketTripBase(
  selection: {
    outbound?: { price?: number } | null;
    inbound?: { price?: number } | null;
    adults?: number;
    children?: number;
    infants?: number;
  } | null | undefined,
  percent: unknown,
  discounted = true,
): number {
  const outRaw = Number(selection?.outbound?.price || 0);
  const backRaw = Number(selection?.inbound?.price || 0);
  const out = discounted ? ticketAfterDiscount(outRaw, percent) : outRaw;
  const back = discounted ? ticketAfterDiscount(backRaw, percent) : backRaw;
  const pax = Math.max(
    1,
    (selection?.adults || 0) + (selection?.children || 0) + (selection?.infants || 0),
  );
  return round2((out + back) * pax);
}

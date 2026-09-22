/** Validación de tarjeta (BIN, Luhn, expiración) para /pagos */

export type CardBrand = 'amex' | 'diners' | 'visa' | 'mastercard' | 'discover' | 'unknown';

export type CardBrandInfo = {
  brand: CardBrand;
  label: string;
  length: number;
  cvvLength: number;
  gaps: number[];
};

export type FieldValidation = {
  valid: boolean;
  incomplete: boolean;
  message: string;
};

const INVALID_CARD_MSG = 'Ingresa un número de tarjeta válido';

const BRANDS: Record<Exclude<CardBrand, 'unknown'>, Omit<CardBrandInfo, 'brand'>> = {
  amex: { label: 'American Express', length: 15, cvvLength: 4, gaps: [4, 10] },
  diners: { label: 'Diners Club', length: 14, cvvLength: 3, gaps: [4, 10] },
  visa: { label: 'Visa', length: 16, cvvLength: 3, gaps: [4, 8, 12] },
  mastercard: { label: 'Mastercard', length: 16, cvvLength: 3, gaps: [4, 8, 12] },
  discover: { label: 'Discover', length: 16, cvvLength: 3, gaps: [4, 8, 12] },
};

export function onlyDigits(value: string): string {
  return String(value || '').replace(/\D/g, '');
}

export function detectCardBrand(digits: string): CardBrandInfo {
  const d = onlyDigits(digits);

  if (/^3[47]/.test(d)) {
    return { brand: 'amex', ...BRANDS.amex };
  }

  if (/^3(0[0-5]|[68])/.test(d)) {
    return { brand: 'diners', ...BRANDS.diners };
  }

  if (/^4/.test(d)) {
    return { brand: 'visa', ...BRANDS.visa };
  }

  const two = Number(d.slice(0, 2));
  const three = Number(d.slice(0, 3));
  const four = Number(d.slice(0, 4));
  if (d === '5' || (two >= 51 && two <= 55) || (four >= 2221 && four <= 2720)) {
    return { brand: 'mastercard', ...BRANDS.mastercard };
  }

  // Discover: 6011, 644-649, 65, 62…
  if (
    d.startsWith('6011') ||
    d.startsWith('65') ||
    d.startsWith('62') ||
    (three >= 644 && three <= 649)
  ) {
    return { brand: 'discover', ...BRANDS.discover };
  }

  return {
    brand: 'unknown',
    label: '',
    length: 16,
    cvvLength: 3,
    gaps: [4, 8, 12],
  };
}

export function luhnCheck(digits: string): boolean {
  const d = onlyDigits(digits);
  if (!d) return false;
  let sum = 0;
  let alt = false;
  for (let i = d.length - 1; i >= 0; i -= 1) {
    let n = Number(d[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function formatCardNumber(value: string, brandInfo?: CardBrandInfo): string {
  const info = brandInfo || detectCardBrand(value);
  const digits = onlyDigits(value).slice(0, info.length);
  if (!digits) return '';

  const gaps = new Set(info.gaps);
  let out = '';
  for (let i = 0; i < digits.length; i += 1) {
    if (gaps.has(i) && i > 0) out += ' ';
    out += digits[i];
  }
  return out;
}

export function formatCardExp(value: string): string {
  const digits = onlyDigits(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
}

export function validateCardNumber(value: string): FieldValidation & { brand: CardBrandInfo } {
  const digits = onlyDigits(value);
  const brand = detectCardBrand(digits);

  if (!digits) {
    return { valid: false, incomplete: true, message: '', brand };
  }

  if (digits.length < brand.length) {
    return {
      valid: false,
      incomplete: true,
      message: brand.brand === 'unknown' ? '' : `Ingresa los ${brand.length} dígitos de tu tarjeta`,
      brand,
    };
  }

  if (digits.length > brand.length) {
    return {
      valid: false,
      incomplete: false,
      message: INVALID_CARD_MSG,
      brand,
    };
  }

  if (brand.brand === 'unknown') {
    return {
      valid: false,
      incomplete: false,
      message: INVALID_CARD_MSG,
      brand,
    };
  }

  if (!luhnCheck(digits)) {
    return {
      valid: false,
      incomplete: false,
      message: INVALID_CARD_MSG,
      brand,
    };
  }

  return { valid: true, incomplete: false, message: '', brand };
}

export function validateCardExp(value: string, now = new Date()): FieldValidation {
  const digits = onlyDigits(value);

  if (!digits) {
    return { valid: false, incomplete: true, message: '' };
  }

  if (digits.length < 4) {
    return { valid: false, incomplete: true, message: 'Ingresa mes y año (MM / AA)' };
  }

  const month = Number(digits.slice(0, 2));
  const year2 = Number(digits.slice(2, 4));

  if (!Number.isFinite(month) || month < 1 || month > 12) {
    return { valid: false, incomplete: false, message: 'El mes debe estar entre 01 y 12' };
  }

  const year = 2000 + year2;
  const expEnd = new Date(year, month, 0, 23, 59, 59, 999);
  if (expEnd < now) {
    return { valid: false, incomplete: false, message: 'La tarjeta está vencida' };
  }

  return { valid: true, incomplete: false, message: '' };
}

export function cardNumberMaxLength(brandInfo: CardBrandInfo): number {
  const spaces = brandInfo.gaps.filter((g) => g < brandInfo.length).length;
  return brandInfo.length + spaces;
}

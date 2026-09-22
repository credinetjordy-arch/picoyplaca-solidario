export type FareId = 'basic' | 'light' | 'full' | 'pe';

export type PerkIcon = 'check' | 'warn' | 'up';

export type FareDetailIcon = 'bag' | 'carry' | 'hold' | 'change' | 'refund' | 'seat' | 'upgrade' | 'food' | 'legroom' | 'board' | 'elite';

export type FareDetailItem = {
  icon: FareDetailIcon;
  title: string;
  subtitle?: string;
  text: string;
};

export type FareDetails = {
  includes: FareDetailItem[];
  extras: FareDetailItem[];
};

export type FareBrand = {
  id: FareId;
  name: string;
  extraAt91: number;
  theme?: 'light' | 'premium';
  accent: string;
  perks: { label: string; icon: PerkIcon }[];
  details: FareDetails;
};

const economy: FareBrand[] = [
  {
    id: 'basic',
    name: 'Basic',
    extraAt91: 0,
    accent: '#1a73e8',
    perks: [
      { label: 'Bolso o mochila', icon: 'check' },
      { label: 'Cambio con cargo + diferencia de precio', icon: 'check' },
      { label: 'No aplican beneficios por categorías de socios', icon: 'warn' },
    ],
    details: {
      includes: [
        { icon: 'bag', title: 'Bolso o mochila', text: 'Puede ser una cartera, un bolso para laptop o un bolso para bebé' },
      ],
      extras: [
        {
          icon: 'change',
          title: 'Cambios',
          subtitle: 'Rutas nacionales e internacionales',
          text: 'Se permiten cambios <strong>con cargo adicional</strong> antes de la hora del vuelo, más la diferencia de precio (en caso que aplique). Después de la hora del vuelo, no se pueden realizar cambios.',
        },
        {
          icon: 'refund',
          title: 'Devoluciones',
          subtitle: 'Rutas nacionales e internacionales',
          text: 'Solo podrás solicitar la devolución de las tasas de embarque.',
        },
        {
          icon: 'elite',
          title: 'Beneficios de socio',
          subtitle: 'LATAM Pass',
          text: 'No aplican beneficios por categorías de socios en esta tarifa.',
        },
      ],
    },
  },
  {
    id: 'light',
    name: 'Light',
    extraAt91: 16.47,
    accent: '#8bc34a',
    perks: [
      { label: 'Bolso o mochila', icon: 'check' },
      { label: 'Maleta pequeña 12 kg', icon: 'check' },
      { label: 'Cambio con cargo + diferencia de precio', icon: 'check' },
      { label: 'Postulación a Upgrade de cabina con tramos', icon: 'check' },
    ],
    details: {
      includes: [
        { icon: 'bag', title: 'Bolso o mochila', text: 'Puede ser una cartera, un bolso para laptop o un bolso para bebé' },
        { icon: 'carry', title: 'Maleta pequeña', text: 'Equipaje con un peso máximo de 12 kg.' },
      ],
      extras: [
        {
          icon: 'change',
          title: 'Cambios',
          subtitle: 'Rutas nacionales (excepto en Brasil)',
          text: 'Se permiten cambios <strong>con cargo adicional</strong> antes de la hora del vuelo, más la diferencia de precio (en caso que aplique). Después de la hora del vuelo, no se pueden realizar cambios.',
        },
        {
          icon: 'refund',
          title: 'Devoluciones',
          subtitle: 'Rutas nacionales e internacionales',
          text: 'Solo podrás solicitar la devolución de las tasas de embarque.',
        },
      ],
    },
  },
  {
    id: 'full',
    name: 'Full',
    extraAt91: 54.36,
    accent: '#7b61ff',
    perks: [
      { label: 'Bolso o mochila', icon: 'check' },
      { label: 'Maleta pequeña 12 kg', icon: 'check' },
      { label: '1 equipaje de bodega 23 kg', icon: 'check' },
      { label: 'Cambio sin cargo + diferencia de precio', icon: 'up' },
      { label: 'Devolución antes de la salida del primer vuelo', icon: 'check' },
      { label: 'Selección de asiento Estándar', icon: 'check' },
      { label: 'Postulación a Upgrade de cabina con tramos', icon: 'check' },
    ],
    details: {
      includes: [
        { icon: 'bag', title: 'Bolso o mochila', text: 'Puede ser una cartera, un bolso para laptop o un bolso para bebé' },
        { icon: 'carry', title: 'Maleta pequeña', text: 'Equipaje con un peso máximo de 12 kg.' },
        { icon: 'hold', title: 'Equipaje de bodega', text: '1 pieza con un peso máximo de 23 kg.' },
      ],
      extras: [
        {
          icon: 'change',
          title: 'Cambios',
          subtitle: 'Rutas nacionales e internacionales',
          text: 'Se permiten cambios <strong>sin cargo</strong> antes de la hora del vuelo, más la diferencia de precio (en caso que aplique).',
        },
        {
          icon: 'refund',
          title: 'Devoluciones',
          subtitle: 'Rutas nacionales e internacionales',
          text: 'Puedes solicitar la devolución antes de la salida del primer vuelo.',
        },
        {
          icon: 'seat',
          title: 'Selección de asiento',
          subtitle: 'Asiento Estándar',
          text: 'Incluye la selección de asiento Estándar sin cargo adicional.',
        },
        {
          icon: 'upgrade',
          title: 'Upgrade de cabina',
          subtitle: 'Con tramos',
          text: 'Puedes postular a Upgrade de cabina con tramos.',
        },
      ],
    },
  },
  {
    id: 'pe',
    name: 'Premium Economy',
    extraAt91: 67.9,
    theme: 'premium',
    accent: '#10004f',
    perks: [
      { label: 'Bolso o mochila', icon: 'check' },
      { label: 'Maleta pequeña 16 kg', icon: 'check' },
      { label: '1 equipaje de bodega 23 kg', icon: 'check' },
      { label: 'Cambio sin cargo + diferencia de precio', icon: 'up' },
      { label: 'Asiento del medio bloqueado', icon: 'check' },
      { label: 'Mejor oferta gastronómica', icon: 'check' },
      { label: 'Más espacio para tus piernas', icon: 'check' },
      { label: 'Selección de asiento Premium Economy', icon: 'check' },
      { label: 'Embarque y desembarque prioritario', icon: 'check' },
    ],
    details: {
      includes: [
        { icon: 'bag', title: 'Bolso o mochila', text: 'Puede ser una cartera, un bolso para laptop o un bolso para bebé' },
        { icon: 'carry', title: 'Maleta pequeña', text: 'Equipaje con un peso máximo de 16 kg.' },
        { icon: 'hold', title: 'Equipaje de bodega', text: '1 pieza con un peso máximo de 23 kg.' },
      ],
      extras: [
        {
          icon: 'change',
          title: 'Cambios',
          subtitle: 'Rutas nacionales e internacionales',
          text: 'Se permiten cambios <strong>sin cargo</strong> antes de la hora del vuelo, más la diferencia de precio (en caso que aplique).',
        },
        {
          icon: 'seat',
          title: 'Asiento',
          subtitle: 'Premium Economy',
          text: 'Asiento del medio bloqueado, más espacio para tus piernas y selección de asiento Premium Economy.',
        },
        {
          icon: 'food',
          title: 'Gastronomía',
          subtitle: 'A bordo',
          text: 'Mejor oferta gastronómica incluida en esta cabina.',
        },
        {
          icon: 'board',
          title: 'Prioridad',
          subtitle: 'Embarque y desembarque',
          text: 'Embarque y desembarque prioritario.',
        },
      ],
    },
  },
];

export function brandsForCabin(_cabin: string): FareBrand[] {
  return economy;
}

export type FareOption = {
  id: FareId;
  name: string;
  price: number;
  extra: number;
  theme?: 'light' | 'premium';
  accent: string;
  perks: FareBrand['perks'];
  details: FareDetails;
};

export function buildFareOptions(basePrice: number, cabin: string): FareOption[] {
  const amount = Number(basePrice) || 0;
  const scale = amount > 0 ? amount / 91.72 : 1;
  return brandsForCabin(cabin).map((brand) => ({
    id: brand.id,
    name: brand.name,
    price: amount,
    extra: Math.round(brand.extraAt91 * scale * 100) / 100,
    theme: brand.theme,
    accent: brand.accent,
    perks: brand.perks,
    details: brand.details,
  }));
}

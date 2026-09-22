import citiesJson from './cities.json';

export const siteConfig = {
  name: 'LATAM Airlines',
  country: 'Colombia',
  locale: 'es-CO',
  currency: 'COP',
  currencySymbol: '$',
  title: 'Cotiza Vuelos, Paquetes, Hoteles y Carros | LATAM en Colombia',
  description:
    'Cotiza y compra vuelos, paquetes, hoteles y autos con LATAM Airlines Colombia. Acumula Millas LATAM Pass.',
};

export type NavLink = {
  label: string;
  href: string;
  external?: boolean;
  icon?: string;
};

export type NavGroup = {
  label: string;
  href?: string;
  items?: NavLink[];
};

export const discoverMenu: NavLink[] = [
  { label: 'Ofertas', href: '/ofertas' },
  { label: 'Destinos', href: '/destinos' },
  { label: 'Paquetes turísticos', href: '/paquetes' },
  { label: 'Alojamientos', href: '/alojamientos' },
  { label: 'Alquiler de autos', href: '/autos' },
  { label: 'Universal', href: '/universal' },
  { label: 'Actividades', href: '/actividades' },
  { label: 'eSIM', href: '/esim' },
  { label: 'Traslados', href: '/traslados' },
  { label: 'Asistencia en viaje', href: '/asistencia' },
  { label: 'Más servicios', href: '/servicios' },
];

export const tripsMenu: NavLink[] = [
  { label: 'Administrar tus viajes', href: '/mis-viajes' },
  { label: 'Check-in', href: '/check-in' },
];

export const headerLinks = {
  help: { label: 'Centro de ayuda', href: '/ayuda' },
  flightStatus: { label: 'Estado de vuelo', href: '/estado-de-vuelo' },
  pass: { label: 'LATAM Pass', href: 'https://www.latamairlines.com/co/es/latam-pass', external: true },
  login: { label: 'Iniciar sesión', href: '/login' },
};

export const currencies = [
  { code: 'COP', symbol: '$', name: 'Pesos colombianos', country: 'CO' },
  { code: 'USD', symbol: '$', name: 'Dólares americanos', country: 'US' },
  { code: 'EUR', symbol: '€', name: 'Euros', country: 'ES' },
  { code: 'BRL', symbol: 'R$', name: 'Reales brasileños', country: 'BR' },
];

export type City = {
  code: string;
  city: string;
  country: string;
  airport: string;
  type?: 'AIRPORT' | 'CITY' | 'RAILWAY_STATION';
};

export const cities: City[] = citiesJson as City[];

export const bookingTabs = [
  { id: 'para-tu-viaje', label: 'Arma tu viaje' },
  { id: 'vuelos', label: 'Vuelos' },
  { id: 'paquetes', label: 'Paquetes' },
  { id: 'alojamientos', label: 'Alojamientos' },
  { id: 'carros', label: 'Carros' },
  { id: 'asistencia', label: 'Asistencia en viaje' },
  { id: 'upgrade', label: 'Upgrade' },
  { id: 'esim', label: 'eSIM' },
  { id: 'universal', label: 'Universal' },
];

export const cabins = ['Economy', 'Premium Economy', 'Premium Business'];

export const loginInvite = {
  title: 'Inicia sesión en LATAM y podrás:',
  items: [
    'Acumular y canjear Millas LATAM Pass por pasajes y más.',
    'Administrar tus viajes.',
    'Pagar con tu LATAM Wallet.',
  ],
};

export const promoBanner = {
  badge: 'OFERTAS LATAM',
  title: '¡Aterrizaron las ofertas! ✈️ 🤩 Hasta 60% dcto. en tiquetes',
  text: 'El mejor momento para viajar acaba de aterrizar. 🌍 ¿Te lo vas a perder?',
  cta: '¡Ver ofertas!',
  href: '/ofertas',
  image: '/images/promo-cyber.png',
};

export const serviceLinks = [
  { id: 'esim', label: 'eSIM', href: '/esim', icon: 'esim' },
  { id: 'traslados', label: 'Traslados', href: '/traslados', icon: 'transfer' },
  { id: 'actividades', label: 'Actividades', href: '/actividades', icon: 'activity' },
  { id: 'millas', label: 'Canje de millas', href: '/canje-millas', icon: 'miles' },
];

export type Offer = {
  id: string;
  city: string;
  image: string;
  badge: string;
  trip: string;
  date: string;
  cabin: string;
  price: number;
  miles: number;
  discount: number;
  direct: boolean;
  category: string;
  from: string;
};

export const offers: Offer[] = [
  {
    id: 'mde',
    city: 'Medellín',
    image: '/images/landing/cuenca.png',
    badge: '¡Aterrizaron las ofertas!',
    trip: 'Solo ida',
    date: '07/09/26',
    cabin: 'Economy',
    price: 309710,
    miles: 12800,
    discount: 31,
    direct: true,
    category: 'en-oferta',
    from: 'BOG',
  },
  {
    id: 'ctg',
    city: 'Cartagena de Indias',
    image: '/images/landing/manta.png',
    badge: '¡Aterrizaron las ofertas!',
    trip: 'Solo ida',
    date: '18/10/26',
    cabin: 'Economy',
    price: 236760,
    miles: 9600,
    discount: 13,
    direct: true,
    category: 'destinos-playeros',
    from: 'BOG',
  },
  {
    id: 'clo',
    city: 'Cali',
    image: '/images/landing/guayaquil.png',
    badge: '¡Aterrizaron las ofertas!',
    trip: 'Solo ida',
    date: '16/09/26',
    cabin: 'Economy',
    price: 217480,
    miles: 12800,
    discount: 16,
    direct: true,
    category: 'aventuras-urbanas',
    from: 'BOG',
  },
  {
    id: 'smr',
    city: 'Santa Marta',
    image: '/images/landing/galapagos.png',
    badge: '¡Aterrizaron las ofertas!',
    trip: 'Solo ida',
    date: '02/09/26',
    cabin: 'Economy',
    price: 372180,
    miles: 30400,
    discount: 18,
    direct: true,
    category: 'destinos-playeros',
    from: 'BOG',
  },
  {
    id: 'mia',
    city: 'Miami',
    image: '/images/landing/miami.png',
    badge: '¡Aterrizaron las ofertas!',
    trip: 'Solo ida',
    date: '23/09/26',
    cabin: 'Economy',
    price: 1450000,
    miles: 90200,
    discount: 23,
    direct: true,
    category: 'en-oferta',
    from: 'BOG',
  },
];

export const offerCategories = [
  { id: 'en-oferta', label: 'En oferta', icon: 'tag' },
  { id: 'destinos-playeros', label: 'Destinos playeros', icon: 'palm' },
  { id: 'aventuras-urbanas', label: 'Aventuras urbanas', icon: 'city' },
  { id: 'vida-nocturna', label: 'Vida nocturna', icon: 'night' },
  { id: 'retiros-naturales', label: 'Retiros naturales', icon: 'nature' },
  { id: 'joyas-sudamericanas', label: 'Joyas Sudamericanas', icon: 'gem' },
];

export const hotels = [
  {
    city: 'Santa Marta, Colombia',
    image: '/images/hotels/rio.jpg',
    price: 275033,
    unit: 'Por noche',
    people: '2 adultos',
    href: '/alojamientos?destino=SMR',
  },
  {
    city: 'Cartagena de Indias, Colombia',
    image: '/images/offers/miami.jpg',
    price: 1178100,
    unit: 'Por noche',
    people: '2 adultos',
    href: '/alojamientos?destino=CTG',
  },
];

export const campaigns = [
  {
    kicker: 'Arma tu paquete ideal: Vuelo + Hotel ✨',
    title: '¿Y si mejor ahorras con un paquete de viaje? ✈️🏨',
    cta: '¡Arma tu paquete!',
    image: '/images/campaigns/paquete.jpg',
    href: '/paquetes',
  },
  {
    kicker: '¿Ya tienes el pasaje? ✈️',
    title: 'Reserva tu alojamiento en el único lugar donde sumas Millas LATAM Pass para seguir viajando. ✨',
    cta: '¡Reservar!',
    image: '/images/campaigns/hotel.jpg',
    href: '/alojamientos',
  },
  {
    kicker: '¿Ya aseguraste tu viaje? 🤔',
    title: 'Contrata Assist Card y obtén telemedicina 24/7 y mucho más. Además, acumulas Millas LATAM Pass. ✨',
    cta: 'Asegura tu viaje aquí',
    image: '/images/campaigns/assist.jpg',
    href: '/asistencia',
  },
];

export const moreOptions = [
  {
    title: 'Compra tu paquete ideal y acumula 3 millas por dólar gastado',
    badge: 'Acumula millas y puntos calificables',
    cta: 'Comprar un paquete',
    href: '/paquetes',
    image: '/images/more/packages.svg',
  },
  {
    title: '¡Aprovecha desde 15% de descuento! Acumula Millas LATAM y puntos calificables',
    badge: 'Acumula Millas',
    cta: 'Reservar alojamiento',
    href: '/alojamientos',
    image: '/images/more/hotels.svg',
  },
  {
    title: 'Ten un auto esperando en tu próximo destino y acumula millas',
    badge: 'Acumula Millas',
    cta: 'Arrendar un auto',
    href: '/autos',
    image: '/images/more/cars.svg',
  },
  {
    title: '¡Viaja sin preocupaciones! Compra tu asistencia en viajes y acumula 3 millas por dólar gastado.',
    badge: 'Acumula millas y puntos calificables',
    cta: 'Cotizar asistencia',
    href: '/asistencia',
    image: '/images/more/insurance.svg',
  },
];

export const popularDestinations = [
  { rank: 1, city: 'Medellín', image: '/images/landing/cuenca.png', href: '/destinos/medellin' },
  { rank: 2, city: 'Cartagena de Indias', image: '/images/landing/manta.png', href: '/destinos/cartagena' },
  { rank: 3, city: 'Cali', image: '/images/landing/guayaquil.png', href: '/destinos/cali' },
  {
    rank: 4,
    city: 'Santa Marta',
    image: '/images/landing/galapagos.png',
    href: '/destinos/santa-marta',
  },
];

export const passCta = {
  title: 'Crea tu cuenta y obtén beneficios LATAM Pass',
  items: [
    'Acumula Millas LATAM Pass en todas tus compras.',
    'Obtén beneficios exclusivos en equipaje, Upgrade de cabina y más.',
    'Canjea pasajes y productos con tus Millas LATAM Pass.',
  ],
  login: 'Iniciar sesión',
  signup: 'Crear cuenta',
};

export const experienceSlides = [
  {
    title: 'Prepara tu viaje',
    text: 'Conoce más sobre lo que necesitas saber con anticipación al preparar tu viaje.',
    image: '/images/experience/prepare.jpg',
    href: '/experiencia/prepara-tu-viaje',
  },
  {
    title: 'Embarque',
    text: 'Conoce más sobre el embarque, información relevante si tienes que hacer una conexión, y más.',
    image: '/images/experience/board.jpg',
    href: '/experiencia/embarque',
  },
  {
    title: 'A bordo',
    text: 'Conoce más sobre nuestros servicios a bordo durante el vuelo.',
    image: '/images/experience/inflight.jpg',
    href: '/experiencia/a-bordo',
  },
  {
    title: 'Experiencia LATAM',
    text: 'Conoce toda la experiencia LATAM',
    image: '/images/experience/prepare.jpg',
    href: '/experiencia',
  },
];

export const creditCard = {
  title: 'Pide tu Tarjeta LATAM Pass Bancolombia y obtén hasta 6.000 millas.',
  cta: 'Solicitar tarjeta',
  image: '/images/latam-pass-card.svg',
  href: '/tarjeta-latam-pass',
};

export const footerColumns = [
  {
    title: 'LATAM Airlines',
    links: [
      { label: 'Inicio', href: '/' },
      { label: 'Acerca de LATAM', href: '/acerca-de' },
      { label: 'Experiencia LATAM', href: '/experiencia' },
      { label: 'Prepara tu viaje', href: '/prepara-tu-viaje' },
      { label: 'Mis viajes', href: '/mis-viajes' },
      { label: 'Estado de vuelo', href: '/estado-de-vuelo' },
      { label: 'Check-in', href: '/check-in' },
      { label: 'Destinos', href: '/destinos' },
      { label: 'LATAM Wallet', href: '/wallet' },
      { label: 'Crea tu cuenta', href: '/login' },
      { label: 'Centro de ayuda', href: '/ayuda' },
      { label: 'Sala de prensa', href: '/prensa' },
      { label: 'Sostenibilidad', href: '/sostenibilidad' },
    ],
  },
  {
    title: 'Información legal',
    links: [
      { label: 'Condiciones de contrato de transporte', href: '/legal/contrato' },
      { label: 'Cargos por servicio', href: '/legal/cargos' },
      { label: 'Políticas de privacidad y seguridad', href: '/legal/privacidad' },
      { label: 'Términos y condiciones generales', href: '/legal/terminos' },
      { label: 'Política sobre cookies', href: '/legal/cookies' },
      { label: 'Términos de uso', href: '/legal/uso' },
      { label: 'Conoce tus derechos', href: '/legal/derechos' },
      { label: 'Reorganización financiera / Capítulo 11', href: '/legal/capitulo-11' },
    ],
  },
  {
    title: 'Portales asociados',
    links: [
      { label: 'LATAM Pass', href: 'https://www.latamairlines.com/co/es/latam-pass', external: true },
      { label: 'Paquetes, hoteles y más', href: '/paquetes' },
      { label: 'LATAM Cargo', href: 'https://www.latamcargo.com', external: true },
      { label: 'LATAM Corporate', href: '/corporate' },
      { label: 'Trabaja con nosotros', href: '/empleos' },
      { label: 'Relación con inversionistas', href: '/inversionistas' },
    ],
  },
];

export const socials = [
  { label: 'Facebook', href: 'https://www.facebook.com/LATAMAirlinesCO', color: '#3A5795' },
  { label: 'Twitter', href: 'https://twitter.com/LATAMAirlines', color: '#5EA9DD' },
  { label: 'Youtube', href: 'https://www.youtube.com/user/lanairlines', color: '#CC181E' },
  { label: 'Instagram', href: 'https://www.instagram.com/latamairlines/', color: '#DC3175' },
];

export const cookieBanner = {
  text: 'Usamos cookies propias y de terceros para mejorar tu experiencia, analizar el tráfico y personalizar contenido. Al continuar, aceptas nuestra política de cookies.',
  accept: 'Aceptar',
  more: 'Política sobre cookies',
};

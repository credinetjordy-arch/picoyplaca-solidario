export type CabinOption = {
  id: 'personal' | 'cabin-plus';
  title: string;
  subtitle: string;
  priceLabel: string;
  price: number;
};

export type StoreCar = {
  id: string;
  name: string;
  seats: number;
  bags: number;
  transmission: 'M' | 'A';
  miles: number;
  price: number;
  image: string;
  vendor: string;
  vendorLogo: string;
  category: string;
  fuel: string;
  doors: number;
  includes: string[];
};

export const cabinOptions: CabinOption[] = [
  {
    id: 'personal',
    title: '1 bolso o mochila',
    subtitle: 'Bajo el asiento delantero',
    priceLabel: 'Bolso o mochila incluida',
    price: 0,
  },
  {
    id: 'cabin-plus',
    title: '1 bolso o mochila + 1 maleta pequeña 12 kg',
    subtitle: '',
    priceLabel: 'Ambos por COP 112.000',
    price: 28,
  },
];

export const holdBagPrice = 35;
export const holdBagKg = 23;
export const specialBagPrice = 40;

const carIncludes = [
  'Kilometraje ilimitado',
  'Protección básica del vehículo',
  'Cancelación gratuita hasta 48 h antes',
  'Paga solo al recoger',
];

export const storeCars: StoreCar[] = [
  {
    id: 'spark',
    name: 'Chevrolet Spark',
    seats: 5,
    bags: 2,
    transmission: 'M',
    miles: 1956,
    price: 651.84,
    image: '/images/tienda-assets/spark.jpg',
    vendor: 'Europcar',
    vendorLogo: '/images/tienda-assets/europcar.webp',
    category: 'Económico',
    fuel: 'Gasolina',
    doors: 4,
    includes: carIncludes,
  },
  {
    id: 'picanto',
    name: 'Kia Picanto',
    seats: 5,
    bags: 3,
    transmission: 'M',
    miles: 2016,
    price: 671.92,
    image: '/images/tienda-assets/picanto.jpg',
    vendor: 'Europcar',
    vendorLogo: '/images/tienda-assets/europcar.webp',
    category: 'Económico',
    fuel: 'Gasolina',
    doors: 4,
    includes: carIncludes,
  },
  {
    id: 'i10',
    name: 'Hyundai i10',
    seats: 4,
    bags: 1,
    transmission: 'M',
    miles: 2044,
    price: 681.36,
    image: '/images/tienda-assets/i10.jpg',
    vendor: 'Alamo',
    vendorLogo: '/images/tienda-assets/alamo.webp',
    category: 'Económico',
    fuel: 'Gasolina',
    doors: 4,
    includes: carIncludes,
  },
];

export const carPartners = [
  { name: 'AVIS', logo: '/images/tienda-assets/avis.webp' },
  { name: 'Budget', logo: '/images/tienda-assets/budget.webp' },
  { name: 'National', logo: '/images/tienda-assets/national.webp' },
];

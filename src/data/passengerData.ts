export type DocCountry = { code: string; name: string; dial: string; flag: string };

export const docCountries: DocCountry[] = [
  { code: 'CO', name: 'Colombia', dial: '+57', flag: '🇨🇴' },
  { code: 'PE', name: 'Perú', dial: '+51', flag: '🇵🇪' },
  { code: 'EC', name: 'Ecuador', dial: '+593', flag: '🇪🇨' },
  { code: 'CL', name: 'Chile', dial: '+56', flag: '🇨🇱' },
  { code: 'AR', name: 'Argentina', dial: '+54', flag: '🇦🇷' },
  { code: 'US', name: 'Estados Unidos', dial: '+1', flag: '🇺🇸' },
  { code: 'ES', name: 'España', dial: '+34', flag: '🇪🇸' },
  { code: 'MX', name: 'México', dial: '+52', flag: '🇲🇽' },
];

export const genderOptions = [
  { value: 'Male', label: 'Masculino' },
  { value: 'Female', label: 'Femenino' },
  { value: 'Unspecified', label: 'Prefiero no decir' },
];

export const documentTypes = [
  { value: 'CC', label: 'Cédula de ciudadanía' },
  { value: 'PP', label: 'Pasaporte' },
  { value: 'CE', label: 'Cédula de extranjería' },
];

export const airlineOptions = [
  { value: 'LA', label: 'LATAM Airlines Group' },
  { value: 'AA', label: 'American Airlines' },
  { value: 'DL', label: 'Delta Air Lines' },
];

export const assistProduct = {
  id: 'latam-domestic',
  brandLogo: '/images/pax-assets/assist-card.svg',
  title: 'LATAM DOMESTIC',
  subtitle: 'Protección total a precio conveniente.',
  pricePerPerson: 9.3,
  coverageDaysDefault: 18,
  detailsHref: 'https://www.latamairlines.com/co/es/experiencia-de-viaje/asistencia-en-viaje',
  termsHref: 'https://www.latamairlines.com/co/es/legal/terminos-y-condiciones',
  specialAssistHref: 'https://www.latamairlines.com/co/es/experiencia-latam/asistencia-especial',
  benefits: [
    {
      title: 'Imprevistos médicos',
      text: 'Asistencia por enfermedad y accidente: USD 5.000',
    },
    {
      title: 'Problemas con tu equipaje de bodega',
      text: 'Asesoramiento en caso de pérdida o demora.',
    },
    {
      title: 'Pérdida de documentos',
      text: 'Asistencia en caso de robo, hurto y extravío.',
    },
  ],
};

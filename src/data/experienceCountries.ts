export type CountryOption = {
  id: string;
  label: string;
  flag: string;
};

const rect = (parts: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">${parts}</svg>`;

export const countries: CountryOption[] = [
  { id: 'de', label: 'Alemania · EUR', flag: rect('<rect width="32" height="10.67" fill="#000"/><rect y="10.67" width="32" height="10.66" fill="#D00"/><rect y="21.33" width="32" height="10.67" fill="#FFCE00"/>') },
  { id: 'ar', label: 'Argentina', flag: rect('<rect width="32" height="10.67" fill="#74ACDF"/><rect y="10.67" width="32" height="10.66" fill="#fff"/><rect y="21.33" width="32" height="10.67" fill="#74ACDF"/><circle cx="16" cy="16" r="3" fill="#F6B40E"/>') },
  { id: 'au', label: 'Australia · USD', flag: rect('<rect width="32" height="32" fill="#012169"/><rect width="16" height="16" fill="#012169"/><path d="M0 0h16v2H0zM0 6h16v2H0zM0 14h16v2H0zM0 0v16h2V0zM6 0v16h2V0zM14 0v16h2V0z" fill="#fff"/><path d="M0 3h16v2H0zM7 0v16h2V0z" fill="#C8102E"/>') },
  { id: 'br', label: 'Brasil · R$', flag: rect('<rect width="32" height="32" fill="#009B3A"/><path d="M16 6 28 16 16 26 4 16Z" fill="#FEDF00"/><circle cx="16" cy="16" r="5.5" fill="#002776"/>') },
  { id: 'ca', label: 'Canadá · USD', flag: rect('<rect width="32" height="32" fill="#fff"/><rect width="8" height="32" fill="#FF0000"/><rect x="24" width="8" height="32" fill="#FF0000"/><path d="M16 8l1.5 5H22l-4 3 1.6 5L16 18.5 12.4 21l1.6-5-4-3h4.5L16 8z" fill="#FF0000"/>') },
  { id: 'cl', label: 'Chile · CLP $', flag: rect('<rect width="32" height="16" fill="#fff"/><rect y="16" width="32" height="16" fill="#D52B1E"/><rect width="12" height="16" fill="#0039A6"/><path d="M6 4.5 6.9 7.2h2.8L7.5 8.9l.9 2.7L6 9.9l-2.4 1.7.9-2.7-2.2-1.7h2.8L6 4.5z" fill="#fff"/>') },
  { id: 'co', label: 'Colombia · COP $', flag: rect('<rect width="32" height="16" fill="#FCD116"/><rect y="16" width="32" height="8" fill="#003893"/><rect y="24" width="32" height="8" fill="#CE1126"/>') },
  { id: 'ec', label: 'Ecuador · USD', flag: rect('<rect width="32" height="16" fill="#FFDA44"/><rect y="16" width="32" height="8" fill="#0052B4"/><rect y="24" width="32" height="8" fill="#D80027"/><circle cx="16" cy="18" r="4" fill="#FFDA44"/>') },
  { id: 'es', label: 'España · EUR', flag: rect('<rect width="32" height="8" fill="#AA151B"/><rect y="8" width="32" height="16" fill="#F1BF00"/><rect y="24" width="32" height="8" fill="#AA151B"/>') },
  { id: 'us', label: 'Estados Unidos · USD', flag: rect('<rect width="32" height="32" fill="#B22234"/><rect y="2.46" width="32" height="2.46" fill="#fff"/><rect y="7.38" width="32" height="2.46" fill="#fff"/><rect y="12.3" width="32" height="2.46" fill="#fff"/><rect y="17.23" width="32" height="2.46" fill="#fff"/><rect y="22.15" width="32" height="2.46" fill="#fff"/><rect y="27.08" width="32" height="2.46" fill="#fff"/><rect width="14" height="14.77" fill="#3C3B6E"/>') },
  { id: 'fr', label: 'Francia · EUR', flag: rect('<rect width="10.67" height="32" fill="#002395"/><rect x="10.67" width="10.66" height="32" fill="#fff"/><rect x="21.33" width="10.67" height="32" fill="#ED2939"/>') },
  { id: 'it', label: 'Italia · EUR', flag: rect('<rect width="10.67" height="32" fill="#009246"/><rect x="10.67" width="10.66" height="32" fill="#fff"/><rect x="21.33" width="10.67" height="32" fill="#CE2B37"/>') },
  { id: 'mx', label: 'México · USD', flag: rect('<rect width="10.67" height="32" fill="#006847"/><rect x="10.67" width="10.66" height="32" fill="#fff"/><rect x="21.33" width="10.67" height="32" fill="#CE1126"/><circle cx="16" cy="16" r="3" fill="#C49A3C"/>') },
  { id: 'nz', label: 'Nueva Zelanda · USD', flag: rect('<rect width="32" height="32" fill="#00247D"/><rect width="16" height="16" fill="#012169"/><path d="M0 3h16v2H0zM7 0v16h2V0z" fill="#C8102E"/><circle cx="24" cy="20" r="2" fill="#fff"/>') },
  { id: 'other', label: 'Otros países · USD', flag: rect('<circle cx="16" cy="16" r="12" fill="none" stroke="#1a4bdb" stroke-width="2"/><ellipse cx="16" cy="16" rx="6" ry="12" fill="none" stroke="#1a4bdb" stroke-width="2"/><path d="M4 16h24M16 4c4 4 4 20 0 24M16 4c-4 4-4 20 0 24" fill="none" stroke="#1a4bdb" stroke-width="1.5"/>') },
  { id: 'py', label: 'Paraguay · USD', flag: rect('<rect width="32" height="10.67" fill="#D52B1E"/><rect y="10.67" width="32" height="10.66" fill="#fff"/><rect y="21.33" width="32" height="10.67" fill="#0038A8"/><circle cx="16" cy="16" r="3" fill="#FCD116"/>') },
  { id: 'pe', label: 'Perú · USD', flag: rect('<rect width="10.67" height="32" fill="#D91023"/><rect x="10.67" width="10.66" height="32" fill="#fff"/><rect x="21.33" width="10.67" height="32" fill="#D91023"/>') },
  { id: 'pt', label: 'Portugal · EUR', flag: rect('<rect width="12" height="32" fill="#006600"/><rect x="12" width="20" height="32" fill="#FF0000"/><circle cx="12" cy="16" r="4" fill="#FFD700"/>') },
  { id: 'gb', label: 'Reino Unido · GBP', flag: rect('<rect width="32" height="32" fill="#012169"/><path d="M0 0l32 32M32 0 0 32" stroke="#fff" stroke-width="6"/><path d="M0 0l32 32M32 0 0 32" stroke="#C8102E" stroke-width="2"/><path d="M16 0v32M0 16h32" stroke="#fff" stroke-width="10"/><path d="M16 0v32M0 16h32" stroke="#C8102E" stroke-width="6"/>') },
  { id: 'eu', label: 'Resto de Europa · EUR', flag: rect('<rect width="32" height="32" fill="#003399"/><circle cx="16" cy="7" r="1.2" fill="#FFCC00"/><circle cx="20.5" cy="8.5" r="1.2" fill="#FFCC00"/><circle cx="24" cy="12.5" r="1.2" fill="#FFCC00"/><circle cx="24.5" cy="17.5" r="1.2" fill="#FFCC00"/><circle cx="22" cy="22" r="1.2" fill="#FFCC00"/><circle cx="16" cy="25" r="1.2" fill="#FFCC00"/><circle cx="10" cy="22" r="1.2" fill="#FFCC00"/><circle cx="7.5" cy="17.5" r="1.2" fill="#FFCC00"/><circle cx="8" cy="12.5" r="1.2" fill="#FFCC00"/><circle cx="11.5" cy="8.5" r="1.2" fill="#FFCC00"/>') },
];

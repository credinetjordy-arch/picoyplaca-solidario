export const documentTypes = [
  { id: "1", es: "Cédula de ciudadanía", en: "Citizen ID" },
  { id: "2", es: "Cédula de extranjería", en: "Foreigner ID" },
  { id: "3", es: "Tarjeta de identidad", en: "Identity Card" },
  { id: "4", es: "Pasaporte", en: "Passport" },
  { id: "5", es: "Carné diplomático", en: "Diplomatic Card" },
  { id: "6", es: "Registro civil", en: "Civil Registry" },
  { id: "7", es: "Permiso por protección temporal", en: "Temporary Protection Permit" },
  { id: "8", es: "NIT", en: "Tax Identification Number" },
];

export const durationOptions = [
  { id: "1", es: "Diario", en: "Daily", base: 70294 },
  { id: "2", es: "Mensual", en: "Monthly", base: 561808 },
  { id: "3", es: "Semestral", en: "Semester", base: 2809311 },
];

export const cylinderOptions = [
  { id: "1", es: "Menor a 1,500 cc", en: "Less than 1,500 cc" },
  { id: "2", es: "1,500 cc a 3,000 cc", en: "1,500 cc to 3,000 cc" },
  { id: "3", es: "Mayor a 3,000 cc", en: "Greater than 3,000 cc" },
];

export const fuelOptions = [
  { id: "1", es: "GASOLINA", en: "GASOLINA" },
  { id: "2", es: "GNV", en: "GNV" },
  { id: "3", es: "DIESEL", en: "DIESEL" },
  { id: "4", es: "GAS GASOL", en: "GAS GASOL" },
  { id: "5", es: "ELECTRICO", en: "ELECTRICO" },
  { id: "6", es: "HIDROGENO", en: "HIDROGENO" },
  { id: "7", es: "ETANOL", en: "ETANOL" },
  { id: "8", es: "BIODIESEL", en: "BIODIESEL" },
  { id: "9", es: "GLP", en: "GLP" },
  { id: "10", es: "GASO ELEC", en: "GASO ELEC" },
  { id: "11", es: "DIES ELEC", en: "DIES ELEC" },
  { id: "12", es: "DIESEL GAS", en: "DIESEL GAS" },
];

export const modelOptions = [
  { id: "1", es: "Antes de 1998", en: "Before 1998", cylinders: ["1", "2", "3"] },
  { id: "2", es: "1998 - 2009", en: "1998 - 2009", cylinders: ["1", "2", "3"] },
  { id: "3", es: "2010 en adelante", en: "2010 onward", cylinders: ["1"] },
  { id: "4", es: "2010 - 2014", en: "2010 - 2014", cylinders: ["2", "3"] },
  { id: "5", es: "2015 en adelante", en: "2015 onward", cylinders: ["2", "3"] },
];

export const valuationOptions = [
  { id: "1", es: "Hasta $ 57.349.000", en: "Up to $ 57,349,000", factor: 1 },
  { id: "2", es: "Desde $ 57.349.001 hasta $ 129.032.000", en: "From $ 57,349,001 to $ 129,032,000", factor: 1.25 },
  { id: "3", es: "Mayor a $ 129.032.001", en: "Greater than $ 129,032,001", factor: 1.5 },
];

export const municipalityOptions = [
  { id: "1", es: "Bogotá, D.C.", en: "Bogotá, D.C.", factor: 1 },
  { id: "2", es: "Otros municipios", en: "Other municipalities", factor: 1.5 },
];

type CylinderBand = "lt1500" | "mid" | "gt3000";
type ModelBand = "pre1998" | "y1998" | "y2010" | "y2015";

function cylinderBand(cylinderId: string): CylinderBand {
  if (cylinderId === "1") return "lt1500";
  if (cylinderId === "3") return "gt3000";
  return "mid";
}

function modelBand(modelId: string): ModelBand {
  if (modelId === "1") return "pre1998";
  if (modelId === "2") return "y1998";
  if (modelId === "5") return "y2015";
  return "y2010";
}

function pickBand(row: Record<CylinderBand, number>, cylinderId: string) {
  return row[cylinderBand(cylinderId)];
}

export function getEnvironmentalFactor(fuelId: string, modelId: string, cylinderId: string) {
  const model = modelBand(modelId);
  if (fuelId === "5" || fuelId === "6" || fuelId === "10" || fuelId === "11") return 0;

  const gasoline: Record<ModelBand, Record<CylinderBand, number>> = {
    pre1998: { lt1500: 1.1, mid: 1.2, gt3000: 1.2 },
    y1998: { lt1500: 1, mid: 1.1, gt3000: 1.1 },
    y2010: { lt1500: 1, mid: 1, gt3000: 1.1 },
    y2015: { lt1500: 1, mid: 1, gt3000: 1.1 },
  };
  const diesel: Record<ModelBand, Record<CylinderBand, number>> = {
    pre1998: { lt1500: 1.2, mid: 1.2, gt3000: 1.2 },
    y1998: { lt1500: 1.1, mid: 1.2, gt3000: 1.2 },
    y2010: { lt1500: 1.1, mid: 1.2, gt3000: 1.2 },
    y2015: { lt1500: 1.1, mid: 1.1, gt3000: 1.1 },
  };
  const gasGasol: Record<ModelBand, Record<CylinderBand, number>> = {
    pre1998: { lt1500: 1.1, mid: 1.1, gt3000: 1.2 },
    y1998: { lt1500: 1.1, mid: 1.1, gt3000: 1.2 },
    y2010: { lt1500: 1.1, mid: 1.1, gt3000: 1.1 },
    y2015: { lt1500: 1.1, mid: 1.1, gt3000: 1.1 },
  };
  const etanol: Record<ModelBand, Record<CylinderBand, number>> = {
    pre1998: { lt1500: 1.1, mid: 1.2, gt3000: 1.2 },
    y1998: { lt1500: 1, mid: 1.1, gt3000: 1.1 },
    y2010: { lt1500: 1, mid: 1, gt3000: 1.1 },
    y2015: { lt1500: 1, mid: 1, gt3000: 1.1 },
  };
  const biodiesel: Record<ModelBand, Record<CylinderBand, number>> = {
    pre1998: { lt1500: 1.1, mid: 1.2, gt3000: 1.2 },
    y1998: { lt1500: 1.1, mid: 1.1, gt3000: 1.1 },
    y2010: { lt1500: 1.1, mid: 1.1, gt3000: 1.1 },
    y2015: { lt1500: 1, mid: 1.1, gt3000: 1.1 },
  };

  if (fuelId === "1") return pickBand(gasoline[model], cylinderId);
  if (fuelId === "2") return cylinderId === "1" ? 1 : 1.1;
  if (fuelId === "3" || fuelId === "12") return pickBand(diesel[model], cylinderId);
  if (fuelId === "4") return pickBand(gasGasol[model], cylinderId);
  if (fuelId === "7") return pickBand(etanol[model], cylinderId);
  if (fuelId === "8") return pickBand(biodiesel[model], cylinderId);
  if (fuelId === "9") return 1.2;
  return 1;
}

export function environmentalLabel(factor: number) {
  if (factor <= 0) return { es: "Bajo", en: "Low" };
  if (factor <= 1.1) return { es: "Medio", en: "Medium" };
  return { es: "Alto", en: "High" };
}

export function roundToHundred(value: number) {
  return Math.round(value / 100) * 100;
}

export const faqs = [
  {
    q: { es: "¿Qué es el Pico y Placa Solidario?", en: "What is Pico y Placa Solidario?" },
    a: {
      es: "Es un permiso voluntario diario, mensual o semestral para circular en Bogotá sin la restricción de pico y placa. Los recursos se destinan al Sistema Integrado de Transporte Público.",
      en: "It is a voluntary daily, monthly or six-month permit to drive in Bogotá without the pico y placa restriction. Funds go to the Integrated Public Transportation System.",
    },
  },
  {
    q: { es: "¿Dónde se hace el trámite?", en: "Where is the procedure done?" },
    a: {
      es: "Únicamente en el canal oficial de la Secretaría Distrital de Movilidad, con dominio .gov.co.",
      en: "Only through the official channel of the District Mobility Secretariat, on a .gov.co domain.",
    },
  },
  {
    q: { es: "¿Cómo se calcula el valor?", en: "How is the value calculated?" },
    a: {
      es: "El valor depende de la duración del permiso, el cilindraje, el combustible, el modelo, el avalúo y si el vehículo está matriculado en Bogotá. El cobro oficial usa los datos del RUNT.",
      en: "The value depends on permit duration, cylinder capacity, fuel, model year, valuation and whether the vehicle is registered in Bogotá. The official charge uses RUNT data.",
    },
  },
  {
    q: { es: "¿Los vehículos eléctricos pagan?", en: "Do electric vehicles pay?" },
    a: {
      es: "Los vehículos eléctricos e híbridos no están sujetos al aporte del Pico y Placa Solidario una vez adelantado el trámite de excepción.",
      en: "Electric and hybrid vehicles are not subject to the Pico y Placa Solidario contribution after completing the exception process.",
    },
  },
  {
    q: { es: "¿Debo hacer el módulo de sensibilización?", en: "Do I need the awareness module?" },
    a: {
      es: "Sí. Después del pago aprobado debes validar tu identidad, completar el curso y comprometerte con Bogotá. El módulo se realiza una vez al año.",
      en: "Yes. After payment is approved you must validate your identity, complete the course and commit to Bogotá. The module is done once a year.",
    },
  },
];

export const mockRuntVehicles = [
  {
    placa: "ABC123",
    marca: "RENAULT",
    linea: "LOGAN",
    modeloAnio: "2018",
    cilindrajeCc: 1600,
    cylinder: "2",
    fuel: "1",
    model: "5",
    valuation: "1",
    municipality: "1",
  },
  {
    placa: "DEF456",
    marca: "CHEVROLET",
    linea: "CAPTIVA",
    modeloAnio: "2022",
    cilindrajeCc: 2400,
    cylinder: "2",
    fuel: "1",
    model: "5",
    valuation: "2",
    municipality: "1",
  },
  {
    placa: "GHI789",
    marca: "KIA",
    linea: "PICANTO",
    modeloAnio: "2014",
    cilindrajeCc: 1250,
    cylinder: "1",
    fuel: "1",
    model: "3",
    valuation: "1",
    municipality: "2",
  },
  {
    placa: "XYZ99A",
    marca: "YAMAHA",
    linea: "FZ",
    modeloAnio: "2019",
    cilindrajeCc: 150,
    cylinder: "1",
    fuel: "1",
    model: "3",
    valuation: "1",
    municipality: "1",
  },
];

export const personTypes = [
  { id: "natural", es: "Persona natural", en: "Natural person" },
  { id: "juridica", es: "Persona jurídica", en: "Legal entity" },
];

export const departmentOptions = [
  { id: "11", es: "Bogotá D.C.", en: "Bogotá D.C." },
  { id: "25", es: "Cundinamarca", en: "Cundinamarca" },
  { id: "05", es: "Antioquia", en: "Antioquia" },
  { id: "76", es: "Valle del Cauca", en: "Valle del Cauca" },
  { id: "08", es: "Atlántico", en: "Atlántico" },
];

export const municipalityCatalog = [
  { id: "11001", department: "11", es: "Bogotá D.C.", en: "Bogotá D.C." },
  { id: "25754", department: "25", es: "Soacha", en: "Soacha" },
  { id: "25175", department: "25", es: "Chía", en: "Chía" },
  { id: "05001", department: "05", es: "Medellín", en: "Medellín" },
  { id: "76001", department: "76", es: "Cali", en: "Cali" },
  { id: "08001", department: "08", es: "Barranquilla", en: "Barranquilla" },
];

export const localityOptions = [
  { id: "1", es: "Usaquén" },
  { id: "2", es: "Chapinero" },
  { id: "3", es: "Santa Fe" },
  { id: "4", es: "San Cristóbal" },
  { id: "5", es: "Usme" },
  { id: "6", es: "Tunjuelito" },
  { id: "7", es: "Bosa" },
  { id: "8", es: "Kennedy" },
  { id: "9", es: "Fontibón" },
  { id: "10", es: "Engativá" },
  { id: "11", es: "Suba" },
  { id: "12", es: "Barrios Unidos" },
  { id: "13", es: "Teusaquillo" },
  { id: "14", es: "Los Mártires" },
  { id: "15", es: "Antonio Nariño" },
  { id: "16", es: "Puente Aranda" },
  { id: "17", es: "La Candelaria" },
  { id: "18", es: "Rafael Uribe Uribe" },
  { id: "19", es: "Ciudad Bolívar" },
  { id: "20", es: "Sumapaz" },
];

export const estratoOptions = [
  { id: "1", es: "1" },
  { id: "2", es: "2" },
  { id: "3", es: "3" },
  { id: "4", es: "4" },
  { id: "5", es: "5" },
  { id: "6", es: "6" },
];

export const propertyTypes = [
  { id: "1", es: "Propietario", en: "Owner" },
  { id: "2", es: "Locatario", en: "Lessee" },
  { id: "3", es: "Tenedor", en: "Holder" },
];

export const pseBanks = [
  { id: "1007", es: "Bancolombia" },
  { id: "1001", es: "Banco de Bogotá" },
  { id: "1051", es: "Davivienda" },
  { id: "1013", es: "BBVA Colombia" },
  { id: "1023", es: "Banco de Occidente" },
  { id: "1052", es: "Banco AV Villas" },
  { id: "1002", es: "Banco Popular" },
  { id: "1040", es: "Banco Agrario" },
  { id: "1019", es: "Scotiabank Colpatria" },
  { id: "1032", es: "Banco Caja Social" },
  { id: "1006", es: "Itaú" },
  { id: "1062", es: "Banco Falabella" },
  { id: "1507", es: "Nequi" },
  { id: "1551", es: "Daviplata" },
];

export const donationPercents = [
  { id: "0", es: "0%" },
  { id: "5", es: "5%" },
  { id: "10", es: "10%" },
  { id: "15", es: "15%" },
  { id: "20", es: "20%" },
];

export const durationTableLabels: Record<string, { es: string; en: string }> = {
  "1": { es: "Diario (1 Dia(s))", en: "Daily (1 Day(s))" },
  "2": { es: "Mensual (1 Mes(es))", en: "Monthly (1 Month(s))" },
  "3": { es: "semestral (6 Mes(es))", en: "Semester (6 Month(s))" },
};

export function permitEndDate(start: string, durationId: string) {
  const date = new Date(`${start}T00:00:00`);
  if (Number.isNaN(date.getTime())) return start;
  if (durationId === "2") {
    date.setMonth(date.getMonth() + 1);
    date.setDate(date.getDate() - 1);
  } else if (durationId === "3") {
    date.setMonth(date.getMonth() + 6);
    date.setDate(date.getDate() - 1);
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const mockCitizen = {
  tipoDocumento: "1",
  numeroDocumento: "12345678",
  tipoPersona: "natural" as const,
  primerNombre: "MARIA",
  segundoNombre: "",
  primerApellido: "GOMEZ",
  segundoApellido: "LOPEZ",
  nombres: "MARIA",
  apellidos: "GOMEZ LOPEZ",
  email: "maria.gomez@correo.com",
  correoPrimario: "maria.gomez@correo.com",
  correoSecundario: "",
  telefono: "3101234567",
  departamentoResidencia: "11",
  municipioResidencia: "11001",
  localidadResidencia: "8",
  direccionResidencia: "Cra 7 # 32-16",
  departamentoCorrespondencia: "11",
  municipioCorrespondencia: "11001",
  localidadCorrespondencia: "8",
  direccionCorrespondencia: "Cra 7 # 32-16",
  estrato: "4",
  tipoPropiedad: "1",
  razonSocial: "",
  nit: "",
  digitoVerificacion: "",
  actividadEconomica: "",
  vehiculos: [
    {
      placa: "ABC123",
      marca: "RENAULT",
      linea: "LOGAN",
      modelo: "2018",
      cilindraje: "1600",
      combustible: "GASOLINA",
      municipio: "BOGOTA D.C.",
    },
  ],
};

export const mockRequests = [
  {
    id: "PYPS-2026-000182",
    placa: "ABC123",
    tipoDocumento: "1",
    numeroDocumento: "12345678",
    tipo: { es: "Mensual", en: "Monthly" },
    estado: { es: "Vigente", en: "Active" },
    inicio: "2026-09-01",
    fin: "2026-09-30",
    valor: 561800,
  },
  {
    id: "PYPS-2026-000041",
    placa: "ABC123",
    tipoDocumento: "1",
    numeroDocumento: "12345678",
    tipo: { es: "Diario", en: "Daily" },
    estado: { es: "Finalizado", en: "Finished" },
    inicio: "2026-03-12",
    fin: "2026-03-12",
    valor: 70300,
  },
];

export const navItems = [
  { href: "/Inicio", key: "inicio" as const },
  { href: "/Simulador", key: "simulador" as const },
  { href: "/Registro", key: "registro" as const },
  { href: "/Consulta", key: "consulta" as const },
  { href: "/PreguntasFrecuentes", key: "faq" as const },
];

export const footerLinks = {
  about: "https://www.movilidadbogota.gov.co/web/mision",
  sitemap: "https://www.movilidadbogota.gov.co/web/mapa_de_sitio",
  privacy:
    "https://www.movilidadbogota.gov.co/web/POLITICAS_DE_SEGURIDAD_Y_PROTECCION_DE_DATOS_PERSONALES",
  app: "https://www.movilidadbogota.gov.co/web/servicios/nuestra_entidad",
  complaints: "https://www.movilidadbogota.gov.co/web/canal_anticorrupcion",
  support: "https://www.movilidadbogota.gov.co/web/content/reporte_de_fallas_pico_y_placa_solidario",
  citizenForm: "https://www.movilidadbogota.gov.co/radicacionwebsdm/formulario.php",
  sdqs: "https://bogota.gov.co/sdqs/",
  excepted: "https://www.movilidadbogota.gov.co/web/SIMUR/excepciones/consultarPlaca/",
  facebook: "https://www.facebook.com/secretariamovilidadbogota",
  x: "https://x.com/SectorMovilidad/",
  youtube: "https://www.youtube.com/@secretariamovilidad",
  instagram: "https://www.instagram.com/sectormovilidad/",
  pdfNatural:
    "/docs/paso-persona-natural.pdf",
  pdfLegal: "/docs/paso-persona-juridica.pdf",
};

export const BASE_DAILY_FEE = 70294;

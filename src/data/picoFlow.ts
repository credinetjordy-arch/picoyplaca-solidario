import {
  durationOptions,
  getEnvironmentalFactor,
  municipalityOptions,
  roundToHundred,
  valuationOptions,
} from './picoMock';

export const tiposDocumento = [
  { value: '1', label: 'Cédula de ciudadanía' },
  { value: '2', label: 'Cédula de Extranjería' },
  { value: '3', label: 'Tarjeta de Identidad' },
  { value: '4', label: 'Pasaporte' },
  { value: '5', label: 'Carnet Diplomático' },
  { value: '6', label: 'Registro Civil' },
  { value: '7', label: 'Permiso por Protección Temporal' },
  { value: '8', label: 'NIT' },
];

export const duraciones = [
  { value: 'diario', label: 'Diario' },
  { value: 'mensual', label: 'Mensual' },
  { value: 'semestral', label: 'Semestral' },
];

export const cilindrajes = [
  { value: '1500-', label: 'Menor a 1,500 cc' },
  { value: '1500-3000', label: '1,500 cc a 3,000 cc' },
  { value: '3000+', label: 'Mayor a 3,000 cc' },
];

export const combustibles = [
  'GASOLINA',
  'GNV',
  'DIESEL',
  'GAS GASOL',
  'ELECTRICO',
  'HIDROGENO',
  'ETANOL',
  'BIODIESEL',
  'GLP',
  'GASO ELEC',
  'DIES ELEC',
  'DIESEL GAS',
];

export const modelos = [
  { value: 'pre1998', label: 'Antes de 1998' },
  { value: '1998-2009', label: '1998 - 2009' },
  { value: '2010+', label: '2010 en adelante' },
];

export const avaluos = [
  { value: '60', label: 'Hasta $60.000.000' },
  { value: '120', label: '$60.000.001 a $120.000.000' },
  { value: '250', label: '$120.000.001 a $250.000.000' },
  { value: '250+', label: 'Más de $250.000.000' },
];

export const municipios = [
  { value: '11001', label: 'Bogotá, D.C.' },
  { value: '0', label: 'Otros municipios' },
];

export const preguntasFrecuentes = [
  {
    q: '¿Qué es el Pico y Placa Solidario?',
    a: 'Es un permiso voluntario diario, mensual o semestral para circular en Bogotá sin la restricción de pico y placa. El 100 % del recaudo se destina al Sistema Integrado de Transporte Público.',
  },
  {
    q: '¿Dónde se tramita el permiso?',
    a: 'Únicamente en la plataforma Pico y Placa Solidario. El pago se realiza en línea al finalizar el registro de la solicitud.',
  },
  {
    q: '¿Qué necesito para iniciar el registro?',
    a: 'Tipo y número de documento del titular, datos del vehículo (placa, cilindraje, combustible, modelo, avalúo y municipio de matrícula) y la duración del permiso que requieres.',
  },
  {
    q: '¿El valor del simulador es el valor final?',
    a: 'No. El simulador entrega un valor de referencia. Al hacer la solicitud formal, el valor final se calcula con los datos del vehículo registrados en el RUNT.',
  },
  {
    q: '¿Los vehículos eléctricos o híbridos pagan?',
    a: 'Los vehículos eléctricos e híbridos exceptuados no requieren contribución de Pico y Placa Solidario después del trámite de exención.',
  },
  {
    q: '¿Qué es el módulo de sensibilización?',
    a: 'Después del pago aprobado debes validar tu identidad, realizar el curso y confirmar la compensación social voluntaria. Este módulo se hace una vez al año. Al presionar Cerrar finalizas el trámite.',
  },
  {
    q: '¿Cómo consulto una solicitud en trámite?',
    a: 'En Solicitudes ingresa tipo de documento, número de documento y placa. Ahí aparecen las solicitudes pendientes y tramitadas.',
  },
  {
    q: '¿Quién puede solicitar el permiso?',
    a: 'El trámite lo realiza el propietario registrado en el RUNT, como persona natural o jurídica.',
  },
];

export function etiquetaDocumento(value: string) {
  return tiposDocumento.find((item) => item.value === value)?.label || '';
}

export function etiquetaDuracion(value: string) {
  return duraciones.find((item) => item.value === value)?.label || value;
}

export function simularTarifa(input: {
  duracion?: string;
  cilindraje?: string;
  combustible?: string;
  modelo?: string;
  avaluo?: string;
  municipio?: string;
}) {
  const durationId =
    input.duracion === '2' || input.duracion === 'mensual'
      ? '2'
      : input.duracion === '3' || input.duracion === 'semestral'
        ? '3'
        : '1';
  const cylinderId =
    input.cilindraje === '3' || input.cilindraje === '3000+'
      ? '3'
      : input.cilindraje === '2' || input.cilindraje === '1500-3000'
        ? '2'
        : '1';
  const fuelMap: Record<string, string> = {
    '1': '1', GASOLINA: '1',
    '2': '2', GNV: '2',
    '3': '3', DIESEL: '3',
    '4': '4', 'GAS GASOL': '4',
    '5': '5', ELECTRICO: '5',
    '6': '6', HIDROGENO: '6',
    '7': '7', ETANOL: '7',
    '8': '8', BIODIESEL: '8',
    '9': '9', GLP: '9',
    '10': '10', 'GASO ELEC': '10',
    '11': '11', 'DIES ELEC': '11',
    '12': '12', 'DIESEL GAS': '12',
  };
  const fuelId = fuelMap[String(input.combustible || '').toUpperCase()] || '1';
  const modelId =
    input.modelo === '1' || input.modelo === 'pre1998'
      ? '1'
      : input.modelo === '2' || input.modelo === '1998-2009'
        ? '2'
        : input.modelo === '5'
          ? '5'
          : input.modelo === '4' || input.modelo === '2010-2014'
            ? '4'
            : '3';
  const valuationId =
    input.avaluo === '3' || input.avaluo === '250+' || input.avaluo === '250'
      ? '3'
      : input.avaluo === '2' || input.avaluo === '120'
        ? '2'
        : '1';
  const municipalityId = !input.municipio || input.municipio === '1' || input.municipio === '11001' ? '1' : '2';
  const duration = durationOptions.find((item) => item.id === durationId);
  const valuation = valuationOptions.find((item) => item.id === valuationId);
  const municipality = municipalityOptions.find((item) => item.id === municipalityId);
  const base = duration?.base ?? 70294;
  const a = valuation?.factor ?? 1;
  const m = municipality?.factor ?? 1;
  const b = getEnvironmentalFactor(fuelId, modelId, cylinderId);
  return roundToHundred(base * a * m * b);
}

export function dinero(value: number) {
  return `$ ${Math.round(value).toLocaleString('es-CO')}`;
}

export type PaymentLeg = {
  title: string;
  dateLabel: string;
  depart: string;
  arrive: string;
  fromCode: string;
  toCode: string;
  brand: string;
};

export const paymentCopy = {
  title: 'Pago',
  totalLabel: 'Valor a pagar',
  detailCta: 'Revisa el detalle de tu solicitud',
  methodsTitle: 'Pago en línea',
  walletTitle: '',
  walletSubtitle: '',
  walletLogin: 'Iniciar Sesión',
  walletUnavailable: 'Este medio de pago no está disponible temporalmente.',
  addCardTitle: 'Pago en línea',
  addCardSubtitle: 'Completa los datos para continuar con el pago.',
  payWithCard: 'Valor a pagar',
  cardNumberPh: 'Número de tarjeta',
  cardNamePh: 'Nombre y apellido',
  cardExpPh: 'Expiración',
  cardCvvPh: 'Código CVV',
  cardEmailPh: 'Email',
  receiptTitle: 'Correo para el comprobante',
  receiptHint: 'Enviaremos el comprobante al correo de quien realiza el pago.',
  invoiceTitle: '¿Necesitas factura?',
  invoiceToggle: 'Solicitar Factura',
  invoiceTips: [
    'Factura válida para personas y empresas inscritas en Colombia.',
    'Para justificar costos o gastos, ingresar el NIT, de lo contrario el documento tendrá validez de factura de venta.',
    'Aplica un solo NIT para toda la compra.',
  ],
  invoiceBusinessName: 'Razón social',
  invoiceRuc: 'NIT',
  invoiceCountry: 'País',
  invoiceCity: 'Ciudad',
  invoiceEmail: 'Email',
  invoiceEmailHint: 'Este correo recibirá la factura',
  invoiceConfirm:
    'Confirmo que los datos son correctos y que coinciden con los de la DIAN.',
  invoiceDefaultCountry: 'Colombia',
  termsPrefix: 'He leído y acepto el tratamiento de datos personales de la Secretaría Distrital de Movilidad y las condiciones del Pico y Placa Solidario',
  termsLink: 'tratamiento de datos personales',
  termsHref: 'https://www.movilidadbogota.gov.co/web/tratamiento-de-datos-personales',
  payPrefix: 'Pagar',
  processingTitle: 'Estamos procesando tu pago',
  processingHint: 'No recargues ni cierres la página',
};

export const defaultPaymentLegs: PaymentLeg[] = [
  {
    title: 'Permiso Pico y Placa Solidario',
    dateLabel: 'Bogotá D.C.',
    depart: '',
    arrive: '',
    fromCode: '',
    toCode: '',
    brand: '',
  },
];

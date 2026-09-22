import fs from 'node:fs';

const s = fs.readFileSync(`${process.env.TEMP}/pico-main.js`, 'utf8');
const decoded = s
  .replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/\\n/g, '\n')
  .replace(/\\'/g, "'")
  .replace(/\\"/g, '"');

const needles = [
  'detallePagoPSE',
  'DetallePago',
  'datosPagador',
  'pagador',
  'realizar el pago',
  'dueña de la cuenta',
  'duena de la cuenta',
  'Asunto del pago',
  'Ir a pagar',
  'formularioPago',
  'persona que realiza',
  'titular de la cuenta',
  'debitar',
  'Pagar ahora',
  'Continuar al pago',
  'Valor a pagar',
  'datos de facturaci',
];

for (const k of needles) {
  const re = new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  let m;
  let n = 0;
  while ((m = re.exec(decoded)) && n < 3) {
    n++;
    console.log('\n===', k, '@', m.index, '===');
    console.log(decoded.slice(Math.max(0, m.index - 180), m.index + 280).replace(/\s+/g, ' '));
  }
  if (!n) console.log('\n=== MISSING', k, '===');
}

// Extract quoted Spanish strings that look like labels
const labels = [...decoded.matchAll(/["'`]([^"'`]{8,90}(?:pago|pagador|PSE|solicitud|documento|correo|celular|nombres|apellidos|CUS|banco)[^"'`]{0,40})["'`]/gi)]
  .map((x) => x[1])
  .filter((t, i, a) => a.indexOf(t) === i)
  .slice(0, 80);
console.log('\n=== LABEL CANDIDATES ===');
labels.forEach((t) => console.log('-', t));

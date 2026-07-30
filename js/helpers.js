// Piccole utility condivise da tutte le viste.

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// Crea un elemento DOM da una stringa HTML.
export function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function fmtPoints(n) {
  const num = Number(n);
  return Number.isInteger(num) ? String(num) : num.toFixed(2).replace(/\.?0+$/, "");
}

// Punteggio arrotondato all'intero più vicino (per la classifica).
export function fmtInt(n) {
  return String(Math.round(Number(n)));
}

export function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("it-IT", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "adesso";
  if (s < 3600) return `${Math.floor(s / 60)} min fa`;
  if (s < 86400) return `${Math.floor(s / 3600)} h fa`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} g fa`;
  return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

export function isExpired(q) {
  return q.expires_at && new Date(q.expires_at) <= new Date();
}

let toastTimer = null;
export function toast(msg, isError = false) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.toggle("error", isError);
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3500);
}

export const QTYPE_LABELS = {
  true_false: "Vero / Falso",
  single: "Scelta singola",
  multiple: "Scelta multipla",
  number: "Numero",
};

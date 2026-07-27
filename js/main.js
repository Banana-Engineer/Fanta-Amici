import { supabase, isConfigured } from "./supabaseClient.js";
import { el, esc } from "./helpers.js";
import { authView } from "./views/auth.js";
import { homeView } from "./views/home.js";
import { joinView } from "./views/join.js";
import { groupView } from "./views/group.js";
import { createQuestionView } from "./views/createQuestion.js";
import { createChallengeView } from "./views/createChallenge.js";

const app = document.getElementById("app");

let session = null;
let profile = null;
let authReady = false;

const ctx = {
  get session() { return session; },
  get profile() { return profile; },
  refresh: router,
};

const routes = [
  { re: /^#\/login$/, view: authView, needsAuth: false, chrome: false },
  { re: /^#\/join\/([A-Za-z0-9]+)$/, view: joinView, needsAuth: false, chrome: false },
  { re: /^#\/group\/([0-9a-f-]{36})\/new-question$/, view: createQuestionView, needsAuth: true, chrome: true },
  { re: /^#\/group\/([0-9a-f-]{36})\/new-challenge$/, view: createChallengeView, needsAuth: true, chrome: true },
  { re: /^#\/group\/([0-9a-f-]{36})$/, view: groupView, needsAuth: true, chrome: true },
  { re: /^#?\/?$/, view: homeView, needsAuth: true, chrome: true },
];

function setupNotice() {
  return el(`
    <div class="card setup-box">
      <h2>⚙️ Configurazione necessaria</h2>
      <p class="subtitle">L'app non è ancora collegata a Supabase.</p>
      <ol>
        <li>Crea un progetto gratuito su <b>supabase.com</b></li>
        <li>Esegui il file <code>supabase/schema.sql</code> nel SQL Editor</li>
        <li>Copia <code>URL</code> e <code>anon key</code> in <code>js/config.js</code></li>
      </ol>
      <p style="margin-top:12px" class="subtitle">Tutti i dettagli sono nel <b>README.md</b>.</p>
    </div>`);
}

function topbar() {
  const bar = el(`
    <header class="topbar">
      <a class="logo" href="#/">🏆 Fanta<span>Amici</span></a>
      <div class="user">
        <span>${esc(profile?.username ?? "")}</span>
        <button class="btn btn-ghost btn-small" id="logout-btn">Esci</button>
      </div>
    </header>`);
  bar.querySelector("#logout-btn").addEventListener("click", async () => {
    await supabase.auth.signOut();
    location.hash = "#/login";
  });
  return bar;
}

async function loadProfile() {
  if (!session) { profile = null; return; }
  if (profile && profile.id === session.user.id) return;
  const { data } = await supabase
    .from("profiles").select("*").eq("id", session.user.id).single();
  profile = data;
}

async function router() {
  if (!isConfigured) { app.replaceChildren(setupNotice()); return; }
  if (!authReady) return;

  // Se c'è un invito in sospeso (link ricevuto prima del login), completalo ora.
  if (session) {
    const pending = localStorage.getItem("fanta_pending_join");
    if (pending) {
      localStorage.removeItem("fanta_pending_join");
      location.hash = `#/join/${pending}`;
      return;
    }
  }

  const hash = location.hash || "#/";
  const route = routes.find((r) => r.re.test(hash));
  if (!route) { location.hash = "#/"; return; }

  if (route.needsAuth && !session) { location.hash = "#/login"; return; }
  if (route.view === authView && session) { location.hash = "#/"; return; }

  const params = hash.match(route.re).slice(1);
  app.innerHTML = '<div class="loading">Caricamento…</div>';

  try {
    if (route.chrome) await loadProfile();
    const content = await route.view(ctx, ...params);
    if (!content) return; // la vista ha fatto redirect
    if (route.chrome) app.replaceChildren(topbar(), content);
    else app.replaceChildren(content);
  } catch (err) {
    console.error(err);
    app.replaceChildren(el(`
      <div class="card" style="margin-top:10vh">
        <h3>Ops, qualcosa è andato storto</h3>
        <p class="subtitle" style="margin:8px 0 14px">${esc(err.message ?? err)}</p>
        <a class="btn btn-primary" href="#/">Torna alla home</a>
      </div>`));
  }
}

window.addEventListener("hashchange", router);

if (isConfigured) {
  supabase.auth.onAuthStateChange((event, s) => {
    const changedUser = (s?.user?.id ?? null) !== (session?.user?.id ?? null);
    session = s;
    if (!authReady) { authReady = true; router(); }
    else if (changedUser) router();
  });
} else {
  router();
}

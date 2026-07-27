import { supabase, usernameToEmail } from "../supabaseClient.js";
import { el, esc, toast } from "../helpers.js";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

function friendlyAuthError(message) {
  if (/invalid login credentials/i.test(message)) return "Username o password errati";
  if (/already registered/i.test(message)) return "Questo username è già in uso";
  if (/at least 6 characters/i.test(message)) return "La password deve avere almeno 6 caratteri";
  return message;
}

export function authView() {
  let mode = "login"; // 'login' | 'register'

  const root = el(`
    <div class="auth-wrap">
      <div class="auth-logo">🏆</div>
      <h1 class="auth-title">FantaAmici</h1>
      <p class="auth-sub">Scommesse e sfide tra amici</p>

      <div class="card">
        <div class="tabs">
          <button type="button" data-mode="login" class="active">Accedi</button>
          <button type="button" data-mode="register">Registrati</button>
        </div>

        <form id="auth-form">
          <div class="field">
            <label for="username">Username</label>
            <input type="text" id="username" autocomplete="username" required
                   placeholder="es. gianni_99">
            <div class="hint" id="username-hint" hidden>3–20 caratteri: lettere, numeri e _</div>
          </div>
          <div class="field">
            <label for="password">Password</label>
            <input type="password" id="password" autocomplete="current-password" required
                   placeholder="minimo 6 caratteri">
          </div>
          <button class="btn btn-primary btn-block" id="submit-btn">Accedi</button>
        </form>

        <div class="disclaimer">
          <span>⚠️</span>
          <span><b>Nota:</b> la sicurezza delle password non è garantita.
          Non usare password che utilizzi per altri servizi sensibili.</span>
        </div>
      </div>
    </div>`);

  const form = root.querySelector("#auth-form");
  const submitBtn = root.querySelector("#submit-btn");
  const usernameHint = root.querySelector("#username-hint");
  const passwordInput = root.querySelector("#password");

  root.querySelectorAll(".tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      mode = btn.dataset.mode;
      root.querySelectorAll(".tabs button").forEach((b) =>
        b.classList.toggle("active", b === btn));
      submitBtn.textContent = mode === "login" ? "Accedi" : "Crea account";
      usernameHint.hidden = mode === "login";
      passwordInput.autocomplete = mode === "login" ? "current-password" : "new-password";
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = root.querySelector("#username").value.trim();
    const password = passwordInput.value;

    if (mode === "register" && !USERNAME_RE.test(username)) {
      toast("Username non valido: 3–20 caratteri, solo lettere, numeri e _", true);
      return;
    }
    if (password.length < 6) {
      toast("La password deve avere almeno 6 caratteri", true);
      return;
    }

    submitBtn.disabled = true;
    try {
      const email = usernameToEmail(username);
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { username } },
        });
        if (error) throw error;
        // Supabase non segnala gli utenti già esistenti con un errore:
        // restituisce un utente fittizio senza identità e senza sessione.
        if (data.user && data.user.identities?.length === 0) {
          toast("Questo username è già in uso", true);
          return;
        }
        if (!data.session) {
          toast('Registrazione riuscita ma la "Confirm email" è attiva su Supabase: disattivala (vedi README)', true);
          return;
        }
        toast(`Benvenuto, ${username}! 🎉`);
      }
      // il redirect (inclusi gli inviti in sospeso) è gestito dal router
    } catch (err) {
      toast(friendlyAuthError(err.message ?? String(err)), true);
    } finally {
      submitBtn.disabled = false;
    }
  });

  return root;
}

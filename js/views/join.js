import { supabase } from "../supabaseClient.js";
import { el, esc, toast } from "../helpers.js";
import { icon } from "../icons.js";

// Flusso invito: chi apre il link senza essere loggato viene mandato al login,
// e subito dopo il login viene aggiunto automaticamente al gruppo.
export async function joinView(ctx, code) {
  if (!ctx.session) {
    localStorage.setItem("fanta_pending_join", code);
    location.hash = "#/login";
    return null;
  }

  try {
    const { data: gid, error } = await supabase.rpc("join_group", { p_code: code });
    if (error) throw error;
    toast("Sei entrato nel gruppo!");
    location.hash = `#/group/${gid}`;
    return null;
  } catch (err) {
    return el(`
      <div class="card" style="margin-top:10vh">
        <h3 style="display:flex;align-items:center;gap:8px">${icon("frown", 20)} Invito non valido</h3>
        <p class="subtitle" style="margin:8px 0 14px">${esc(err.message)}</p>
        <a class="btn btn-primary" href="#/">Torna alla home</a>
      </div>`);
  }
}

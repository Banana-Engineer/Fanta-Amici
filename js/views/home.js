import { supabase } from "../supabaseClient.js";
import { el, esc, toast } from "../helpers.js";

export async function homeView(ctx) {
  const { data: groups, error } = await supabase.rpc("get_my_groups");
  if (error) throw error;

  const root = el(`
    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin:6px 2px 16px">
        <div>
          <h1 class="page-title">I tuoi gruppi</h1>
          <p class="subtitle">Ciao ${esc(ctx.profile?.username ?? "")} 👋</p>
        </div>
        <button class="btn btn-primary" id="new-group-btn">+ Nuovo</button>
      </div>

      <form class="card" id="new-group-form" hidden>
        <div class="field">
          <label for="group-name">Nome del gruppo</label>
          <input type="text" id="group-name" maxlength="40" required
                 placeholder="es. Gli amici del bar">
        </div>
        <button class="btn btn-primary btn-block">Crea gruppo</button>
      </form>

      <div id="group-list"></div>
    </div>`);

  const list = root.querySelector("#group-list");
  if (!groups.length) {
    list.append(el(`
      <div class="card empty">
        Non fai ancora parte di nessun gruppo.<br>
        Creane uno nuovo oppure fatti mandare un <b>link di invito</b> da un amico!
      </div>`));
  }
  for (const g of groups) {
    const card = el(`
      <div class="card group-card" role="button" tabindex="0">
        <div>
          <div class="g-name">${esc(g.name)}</div>
          <div class="g-meta">
            <span>👥 ${g.member_count} ${g.member_count === 1 ? "membro" : "membri"}</span>
            ${g.is_admin ? '<span class="pill pill-admin">Admin</span>' : ""}
          </div>
        </div>
        <span class="chev">›</span>
      </div>`);
    const open = () => { location.hash = `#/group/${g.id}`; };
    card.addEventListener("click", open);
    card.addEventListener("keydown", (e) => { if (e.key === "Enter") open(); });
    list.append(card);
  }

  const form = root.querySelector("#new-group-form");
  root.querySelector("#new-group-btn").addEventListener("click", () => {
    form.hidden = !form.hidden;
    if (!form.hidden) form.querySelector("input").focus();
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = root.querySelector("#group-name").value.trim();
    try {
      const { data: gid, error: err } = await supabase.rpc("create_group", { p_name: name });
      if (err) throw err;
      toast("Gruppo creato! 🎉");
      location.hash = `#/group/${gid}`;
    } catch (err) {
      toast(err.message, true);
    }
  });

  return root;
}

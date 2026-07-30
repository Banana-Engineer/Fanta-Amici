import { supabase } from "../supabaseClient.js";
import { el, toast } from "../helpers.js";
import { icon } from "../icons.js";

export async function createChallengeView(ctx, groupId) {
  const root = el(`
    <div class="narrow">
      <a class="back-link" href="#/group/${groupId}">${icon("chevron-left", 15)} Torna al gruppo</a>
      <h1 class="page-title" style="margin-bottom:14px">Nuova sfida</h1>

      <form class="card" id="c-form">
        <div class="field">
          <label for="c-title">Titolo</label>
          <input type="text" id="c-title" maxlength="120" required
                 placeholder="es. Il primo che si presenta scalzo">
        </div>

        <div class="field">
          <label for="c-desc">Descrizione</label>
          <textarea id="c-desc" maxlength="500" required
                    placeholder="Spiega brevemente come si completa la sfida"></textarea>
        </div>

        <div class="field">
          <label for="c-points">Valore (punti)</label>
          <input type="number" id="c-points" min="1" step="any" required placeholder="es. 30">
          <div class="hint">L'admin assegnerà i punti a chi completa la sfida
          e può correggere il valore se lo ritiene sbilanciato.</div>
        </div>

        <button class="btn btn-primary btn-block" id="c-submit">Crea sfida</button>
      </form>
    </div>`);

  root.querySelector("#c-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = root.querySelector("#c-submit");
    btn.disabled = true;
    try {
      const { error } = await supabase.from("challenges").insert({
        group_id: groupId,
        creator_id: ctx.session.user.id,
        title: root.querySelector("#c-title").value.trim(),
        description: root.querySelector("#c-desc").value.trim(),
        points: Number(root.querySelector("#c-points").value),
      });
      if (error) throw error;
      toast("Sfida creata!");
      location.hash = `#/group/${groupId}`;
    } catch (err) {
      toast(err.message, true);
      btn.disabled = false;
    }
  });

  return root;
}

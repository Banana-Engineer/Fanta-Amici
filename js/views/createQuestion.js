import { supabase } from "../supabaseClient.js";
import { el, toast } from "../helpers.js";

export async function createQuestionView(ctx, groupId) {
  const root = el(`
    <div>
      <a class="back-link" href="#/group/${groupId}">‹ Torna al gruppo</a>
      <h1 class="page-title" style="margin-bottom:14px">Nuova scommessa</h1>

      <form class="card" id="q-form">
        <div class="field">
          <label for="q-title">Domanda</label>
          <input type="text" id="q-title" maxlength="200" required
                 placeholder="es. Chi sarà il primo del gruppo a sposarsi?">
        </div>

        <div class="field">
          <label for="q-type">Modalità di risposta</label>
          <select id="q-type">
            <option value="true_false">Vero / Falso</option>
            <option value="single" selected>Scelta singola</option>
            <option value="multiple">Scelta multipla</option>
            <option value="number">Numero (inserimento libero)</option>
          </select>
          <div class="hint" id="type-hint"></div>
        </div>

        <div class="field" id="options-field">
          <label>Opzioni di risposta</label>
          <div id="options-list"></div>
          <button type="button" class="btn btn-ghost btn-small" id="add-option" style="margin-top:8px">
            + Aggiungi opzione
          </button>
        </div>

        <div class="field">
          <label for="q-points">Valore (punti)</label>
          <input type="number" id="q-points" min="1" step="any" required placeholder="es. 50">
          <div class="hint">L'admin può correggere il valore se lo ritiene sbilanciato.</div>
        </div>

        <div class="field">
          <label for="q-expires">Scadenza votazione (opzionale)</label>
          <input type="datetime-local" id="q-expires">
          <div class="hint">Senza scadenza, sarà l'admin a chiudere la votazione.</div>
        </div>

        <button class="btn btn-primary btn-block" id="q-submit">Crea scommessa</button>
      </form>
    </div>`);

  const typeSelect = root.querySelector("#q-type");
  const typeHint = root.querySelector("#type-hint");
  const optionsField = root.querySelector("#options-field");
  const optionsList = root.querySelector("#options-list");

  const HINTS = {
    true_false: "Risposta corretta = tutti i punti.",
    single: "Risposta corretta = tutti i punti.",
    multiple: "Punti = valore × (opzioni corrette selezionate ÷ opzioni totali).",
    number: "Vince chi si avvicina di più. In caso di parità i punti si dividono.",
  };

  function addOptionInput(value = "") {
    const row = el(`
      <div style="display:flex;gap:8px;margin-top:8px">
        <input type="text" class="q-option" maxlength="80" required placeholder="Opzione">
        <button type="button" class="btn btn-ghost btn-small remove-opt" title="Rimuovi">✕</button>
      </div>`);
    row.querySelector("input").value = value;
    row.querySelector(".remove-opt").addEventListener("click", () => {
      if (optionsList.children.length > 2) row.remove();
      else toast("Servono almeno 2 opzioni", true);
    });
    optionsList.append(row);
  }

  function refreshTypeUI() {
    const t = typeSelect.value;
    typeHint.textContent = HINTS[t];
    optionsField.hidden = t === "number" || t === "true_false";
    if (t === "single" || t === "multiple") {
      if (!optionsList.children.length) { addOptionInput(); addOptionInput(); }
    } else {
      optionsList.replaceChildren();
    }
  }
  typeSelect.addEventListener("change", refreshTypeUI);
  root.querySelector("#add-option").addEventListener("click", () => addOptionInput());
  refreshTypeUI();

  root.querySelector("#q-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const type = typeSelect.value;
    let options = null;
    if (type === "true_false") {
      options = ["Vero", "Falso"];
    } else if (type !== "number") {
      options = [...root.querySelectorAll(".q-option")]
        .map((i) => i.value.trim()).filter(Boolean);
      if (options.length < 2) { toast("Servono almeno 2 opzioni", true); return; }
    }
    const expiresRaw = root.querySelector("#q-expires").value;

    const btn = root.querySelector("#q-submit");
    btn.disabled = true;
    try {
      const { error } = await supabase.rpc("create_question", {
        p_group_id: groupId,
        p_title: root.querySelector("#q-title").value.trim(),
        p_qtype: type,
        p_points: Number(root.querySelector("#q-points").value),
        p_expires_at: expiresRaw ? new Date(expiresRaw).toISOString() : null,
        p_options: options,
      });
      if (error) throw error;
      toast("Scommessa creata! 🎲");
      location.hash = `#/group/${groupId}`;
    } catch (err) {
      toast(err.message, true);
      btn.disabled = false;
    }
  });

  return root;
}

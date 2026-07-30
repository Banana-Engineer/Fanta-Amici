import { el } from "./helpers.js";
import { icon } from "./icons.js";

// Finestra modale con le regole del gioco (bottone "Regole").
export function showRules() {
  if (document.querySelector(".modal-overlay")) return;

  const overlay = el(`
    <div class="modal-overlay">
      <div class="modal" role="dialog" aria-modal="true" aria-label="Regole del gioco">
        <div class="modal-head">
          <h2>${icon("book-open", 20)} Regole del gioco</h2>
          <button class="modal-close" aria-label="Chiudi">${icon("x", 18)}</button>
        </div>
        <div class="modal-body">

          <h3>${icon("users", 16)} Gruppi</h3>
          <p>Si entra in un gruppo <b>solo tramite link di invito</b>. Chi crea il
          gruppo diventa l'<b>admin</b>. La classifica somma i punti vinti con
          scommesse e sfide.</p>

          <h3>${icon("dices", 16)} Scommesse</h3>
          <p>Chiunque può creare una scommessa scegliendo domanda, modalità di
          risposta e <b>valore in punti</b>. La scadenza è facoltativa: senza
          scadenza, è l'admin a chiudere la votazione. A evento concluso l'admin
          inserisce la risposta corretta e i punti vengono assegnati
          automaticamente.</p>

          <h3>${icon("lock", 16)} Voti</h3>
          <ul>
            <li>I voti degli altri restano <b>nascosti</b> finché non voti anche tu.</li>
            <li>Una volta inviato, il voto <b>non si può più modificare</b>.</li>
          </ul>

          <h3>${icon("trophy", 16)} Punteggi</h3>
          <ul>
            <li><b>Vero/Falso</b> e <b>scelta singola</b>: risposta giusta = tutti i punti.</li>
            <li><b>Scelta multipla</b>: punti = valore × (opzioni corrette selezionate ÷ opzioni totali).</li>
            <li><b>Numero</b>: vince chi è più vicino alla risposta; in caso di
            parità i punti si dividono equamente.</li>
          </ul>

          <h3>${icon("target", 16)} Sfide</h3>
          <p>Una sfida è un'impresa nella vita reale (es. <i>"il primo che si
          presenta scalzo"</i>) con un valore in punti. Quando qualcuno la
          completa, l'admin gli assegna i punti.</p>

          <h3>${icon("medal", 16)} Ruolo dell'admin</h3>
          <p>L'admin fa da moderatore: può <b>correggere il valore</b> di
          scommesse e sfide troppo facili o esagerate, chiude le votazioni e
          inserisce i risultati. Si impegna a essere il più onesto possibile.</p>

        </div>
      </div>
    </div>`);

  const close = () => {
    overlay.remove();
    document.removeEventListener("keydown", onKey);
  };
  const onKey = (e) => { if (e.key === "Escape") close(); };

  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  overlay.querySelector(".modal-close").addEventListener("click", close);
  document.addEventListener("keydown", onKey);
  document.body.append(overlay);
}

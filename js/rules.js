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

          <p>Ma figa raga, ci sono pure le regole! Su dai, ve le spiego ASAP
          così potete subito iniziare a fatturare punti.</p>

          <h3>${icon("users", 16)} I gruppi</h3>
          <p>Non vogliamo plebei nei gruppi, quindi si può accedere solamente con
          un invito speciale tramite il link. All'interno di un gruppo c'è una
          classifica e il vostro unico obiettivo è conquistare almeno il podio.
          Per la gestione del gruppo c'è un admin, il fondatore della partita.</p>

          <h3>${icon("dices", 16)} Scommesse</h3>
          <p>Ogni giocatore può creare delle scommesse scegliendo la domanda, le
          risposte e il valore dei punti. Non fate i furbi, l'idea è quella di
          creare scommesse di cui nessuno sa ancora la risposta! Potete inserire
          una data di scadenza, ma se non dovesse esserci, l'admin potrà chiudere
          la scommessa quando sarà opportuno. Quando l'evento sarà concluso
          l'admin inserisce la risposta corretta e i punti vengono assegnati.</p>

          <h3>${icon("lock", 16)} Voti</h3>
          <p>Per evitare sbircioni, i voti degli altri giocatori restano nascosti
          finché non si ha votato. Una volta inviato, il voto non si potrà più
          modificare.</p>

          <h3>${icon("trophy", 16)} Punteggi</h3>
          <p>In base al tipo di domanda i punteggi vengono assegnati diversamente.</p>
          <ul>
            <li><b>Vero/Falso</b>: chi risponde correttamente riceve tutti i punti</li>
            <li><b>Domanda a scelta singola</b>: chi risponde correttamente riceve tutti i punti</li>
            <li><b>Domanda a scelta multipla</b>: punti = punti massimi × (risposte corrette/risposte totali)</li>
            <li><b>Inserimento di numero</b>: il giocatore con la stima più vicina
            al valore corretto riceve i punti. Se più persone sono alla stessa
            distanza dalla risposta corretta, i punti vengono divisi equamente</li>
          </ul>

          <h3>${icon("target", 16)} Sfide</h3>
          <p>Oltre alle scommesse si possono anche lanciare delle sfide. Chi
          lancia la sfida sceglie un titolo, scrive una piccola descrizione e
          decide il valore della sfida in punti. L'admin assegnerà i punti alla
          persona che completerà la sfida. Una prova video è richiesta se l'admin
          non era presente al momento del compimento della sfida.</p>

          <h3>${icon("medal", 16)} L'admin</h3>
          <p>Può chiudere una sfida o una scommessa, inserisce i risultati e
          soprattutto può cambiare il valore delle sfide e delle scommesse.
          Corrompetelo per vincere più punti.</p>

          <p style="margin-top:14px">Okay, penso che queste siano tutte le regole!
          Mi raccomando, i veri vincitori sono quelli che propongono le scommesse
          e le sfide più creative!</p>

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

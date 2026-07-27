import { supabase } from "../supabaseClient.js";
import { el, esc, toast, fmtPoints, fmtDate, timeAgo, isExpired, QTYPE_LABELS } from "../helpers.js";

// Stato "effettivo" di un quesito: una scadenza passata equivale a votazione chiusa.
function qState(q) {
  if (q.status === "resolved") return "resolved";
  if (q.status === "closed" || isExpired(q)) return "closed";
  return "open";
}

function statusPill(state) {
  if (state === "open") return '<span class="pill pill-open">● Aperta</span>';
  if (state === "closed") return '<span class="pill pill-closed">In attesa del risultato</span>';
  return '<span class="pill pill-resolved">✓ Risolta</span>';
}

function voteAnswerText(v, q) {
  if (q.qtype === "number") return esc(v.number_answer);
  const labels = (v.option_ids ?? [])
    .map((id) => q.options.find((o) => o.id === id)?.label)
    .filter(Boolean);
  return esc(labels.join(", "));
}

function votesListHtml(q, votes, resolved) {
  if (!votes.length) return '<div class="votes-list"><h4>Voti</h4><div class="subtitle">Nessun voto per ora.</div></div>';
  const rows = votes.map((v) => {
    let pts = "";
    if (resolved && v.points_awarded != null) {
      const win = Number(v.points_awarded) > 0;
      pts = `<span class="pts ${win ? "win" : "zero"}">${win ? "+" : ""}${fmtPoints(v.points_awarded)} pt</span>`;
    }
    return `
      <div class="vote-row">
        <span class="who">${esc(v.voter?.username ?? "?")}</span>
        <span class="what">${voteAnswerText(v, q)}</span>
        ${pts}
      </div>`;
  }).join("");
  return `<div class="votes-list"><h4>Voti</h4>${rows}</div>`;
}

function voteFormHtml(q) {
  let inputs = "";
  if (q.qtype === "number") {
    inputs = `<input class="num-input" type="number" step="any" name="num" required placeholder="Inserisci un numero">`;
  } else {
    const type = q.qtype === "multiple" ? "checkbox" : "radio";
    inputs = q.options.map((o) => `
      <label class="opt">
        <input type="${type}" name="opt" value="${o.id}">
        <span>${esc(o.label)}</span>
      </label>`).join("");
  }
  return `
    <form class="vote-form" data-form="vote" data-qid="${q.id}" data-qtype="${q.qtype}">
      ${inputs}
      <button class="btn btn-primary btn-block">Vota</button>
      <div class="secret-note">🔒 I voti degli altri sono nascosti finché non voti. Il voto non si può cambiare.</div>
    </form>`;
}

function resolveFormHtml(q) {
  let inputs = "";
  if (q.qtype === "number") {
    inputs = `<input class="num-input" type="number" step="any" name="num" required placeholder="Numero corretto">`;
  } else {
    const type = q.qtype === "multiple" ? "checkbox" : "radio";
    inputs = q.options.map((o) => `
      <label class="opt">
        <input type="${type}" name="copt" value="${o.id}">
        <span>${esc(o.label)}</span>
      </label>`).join("");
  }
  return `
    <div class="resolve-form" id="resolve-${q.id}" hidden>
      <h4>${q.qtype === "multiple" ? "Seleziona le risposte corrette" : "Seleziona la risposta corretta"}</h4>
      <form data-form="resolve" data-qid="${q.id}" data-qtype="${q.qtype}">
        ${inputs}
        <button class="btn btn-primary btn-block">Conferma e assegna i punti</button>
      </form>
    </div>`;
}

function correctAnswerHtml(q) {
  if (q.qtype === "number") {
    return `<div class="correct-answer">✓ Risposta corretta: ${esc(q.correct_number)}</div>`;
  }
  const correct = q.options.filter((o) => o.is_correct).map((o) => esc(o.label)).join(", ");
  return `<div class="correct-answer">✓ Risposta corretta: ${correct}</div>`;
}

function questionCard(q, votes, ctx, isAdmin) {
  const state = qState(q);
  const myVote = votes.find((v) => v.user_id === ctx.session.user.id);
  const resolved = state === "resolved";

  let body = "";
  if (state === "open" && !myVote) {
    body = voteFormHtml(q);
  } else {
    if (resolved) body += correctAnswerHtml(q);
    body += votesListHtml(q, votes, resolved);
  }

  let adminTools = "";
  if (isAdmin && !resolved) {
    adminTools = `
      <div class="admin-tools">
        ${state === "open" ? `<button class="btn btn-ghost btn-small" data-action="close-q" data-qid="${q.id}">Chiudi votazione</button>` : ""}
        <button class="btn btn-ghost btn-small" data-action="edit-qp" data-qid="${q.id}" data-points="${q.points}">Modifica punti</button>
        <button class="btn btn-primary btn-small" data-action="toggle-resolve" data-qid="${q.id}">Inserisci risultato</button>
      </div>
      ${resolveFormHtml(q)}`;
  }

  const expiry = q.expires_at
    ? `<div class="q-expiry">${isExpired(q) ? "⌛ Scaduta il" : "⏳ Scade il"} ${fmtDate(q.expires_at)}</div>`
    : "";

  return el(`
    <div class="card">
      <div class="q-head">
        <div class="q-title">${esc(q.title)}</div>
        ${statusPill(state)}
      </div>
      <div class="q-meta">
        <span class="pill pill-points">${fmtPoints(q.points)} pt</span>
        <span class="pill pill-type">${QTYPE_LABELS[q.qtype]}</span>
        <span class="by">di ${esc(q.creator?.username ?? "?")}</span>
      </div>
      ${expiry}
      ${body}
      ${adminTools}
    </div>`);
}

function challengeCard(c, ctx, isAdmin, members) {
  const done = c.status === "completed";
  let body = "";
  if (done) {
    body = `<div class="winner-banner">🏅 Completata da <b>${esc(c.winner?.username ?? "?")}</b> (+${fmtPoints(c.points)} pt)</div>`;
  } else if (isAdmin) {
    const opts = members
      .map((m) => `<option value="${m.user_id}">${esc(m.username)}</option>`).join("");
    body = `
      <div class="admin-tools">
        <button class="btn btn-ghost btn-small" data-action="edit-cp" data-cid="${c.id}" data-points="${c.points}">Modifica punti</button>
      </div>
      <form class="resolve-form" data-form="award" data-cid="${c.id}" style="margin-top:10px">
        <h4>Chi ha completato la sfida?</h4>
        <select name="winner" required style="margin-top:6px">
          <option value="" disabled selected>Scegli il vincitore…</option>
          ${opts}
        </select>
        <button class="btn btn-primary btn-block" style="margin-top:10px">Assegna i punti</button>
      </form>`;
  }

  return el(`
    <div class="card">
      <div class="q-head">
        <div class="q-title">🎯 ${esc(c.title)}</div>
        ${done ? '<span class="pill pill-resolved">✓ Completata</span>' : '<span class="pill pill-open">● Attiva</span>'}
      </div>
      <div class="q-meta">
        <span class="pill pill-points">${fmtPoints(c.points)} pt</span>
        <span class="by">di ${esc(c.creator?.username ?? "?")}</span>
      </div>
      ${c.description ? `<div class="challenge-desc">${esc(c.description)}</div>` : ""}
      ${body}
    </div>`);
}

export async function groupView(ctx, groupId) {
  const [groupRes, lbRes, actRes, qRes, cRes] = await Promise.all([
    supabase.from("groups").select("*").eq("id", groupId).maybeSingle(),
    supabase.rpc("get_leaderboard", { p_group: groupId }),
    supabase.from("activities").select("*").eq("group_id", groupId)
      .order("created_at", { ascending: false }).limit(15),
    supabase.from("questions")
      .select("*, options:question_options(*), creator:profiles(username)")
      .eq("group_id", groupId).order("created_at", { ascending: false }),
    supabase.from("challenges")
      .select("*, creator:profiles!challenges_creator_id_fkey(username), winner:profiles!challenges_winner_id_fkey(username)")
      .eq("group_id", groupId).order("created_at", { ascending: false }),
  ]);

  for (const r of [groupRes, lbRes, actRes, qRes, cRes]) {
    if (r.error) throw r.error;
  }
  const group = groupRes.data;
  if (!group) throw new Error("Gruppo non trovato (o non ne fai parte)");

  const leaderboard = lbRes.data;
  const activities = actRes.data;
  const questions = qRes.data.map((q) => ({
    ...q, options: [...q.options].sort((a, b) => a.idx - b.idx),
  }));
  const challenges = cRes.data;
  const isAdmin = group.admin_id === ctx.session.user.id;

  // Voti di tutti i quesiti (la RLS nasconde da sola quelli che non puoi vedere)
  const qids = questions.map((q) => q.id);
  let votes = [];
  if (qids.length) {
    const vRes = await supabase.from("votes")
      .select("*, voter:profiles(username)")
      .in("question_id", qids).order("created_at");
    if (vRes.error) throw vRes.error;
    votes = vRes.data;
  }
  const votesByQ = (qid) => votes.filter((v) => v.question_id === qid);

  const inviteLink = `${location.origin}${location.pathname}#/join/${group.code}`;

  const root = el(`
    <div>
      <a class="back-link" href="#/">‹ I tuoi gruppi</a>
      <div class="card">
        <div class="q-head">
          <h1 class="page-title">${esc(group.name)}</h1>
          ${isAdmin ? '<span class="pill pill-admin">Sei l’admin</span>' : ""}
        </div>
        <div class="invite-box">
          <code>${esc(inviteLink)}</code>
          <button class="btn btn-primary btn-small" data-action="copy-invite">Copia invito</button>
        </div>
      </div>

      <h2 class="section-title">🏆 Classifica</h2>
      <div class="card" id="leaderboard"></div>

      <h2 class="section-title">🔔 Attività recenti</h2>
      <div class="card" id="activity"></div>

      <div class="actions-row">
        <a class="btn btn-primary" href="#/group/${group.id}/new-question">＋ Scommessa</a>
        <a class="btn btn-ghost" href="#/group/${group.id}/new-challenge">🎯 Sfida</a>
      </div>

      <h2 class="section-title">⚡ In corso</h2>
      <div id="active-list"></div>

      <h2 class="section-title">📦 Concluse</h2>
      <div id="done-list"></div>
    </div>`);

  // --- classifica ---
  const lbBox = root.querySelector("#leaderboard");
  const medals = ["🥇", "🥈", "🥉"];
  leaderboard.forEach((row, i) => {
    lbBox.append(el(`
      <div class="lb-row ${row.user_id === ctx.session.user.id ? "me" : ""}">
        <span class="lb-rank">${medals[i] ?? i + 1}</span>
        <span class="lb-name">
          <span class="name-text">${esc(row.username)}</span>
          ${row.is_admin ? '<span class="pill pill-admin">Admin</span>' : ""}
        </span>
        <span class="lb-points">${fmtPoints(row.total_points)} pt</span>
      </div>`));
  });

  // --- attività ---
  const actBox = root.querySelector("#activity");
  if (!activities.length) {
    actBox.append(el('<div class="empty">Ancora nessuna attività.</div>'));
  }
  for (const a of activities) {
    actBox.append(el(`
      <div class="activity">
        ${esc(a.message)}
        <div class="when">${timeAgo(a.created_at)}</div>
      </div>`));
  }

  // --- quesiti e sfide ---
  const activeList = root.querySelector("#active-list");
  const doneList = root.querySelector("#done-list");

  for (const q of questions) {
    const card = questionCard(q, votesByQ(q.id), ctx, isAdmin);
    (qState(q) === "resolved" ? doneList : activeList).append(card);
  }
  for (const c of challenges) {
    const card = challengeCard(c, ctx, isAdmin, leaderboard);
    (c.status === "completed" ? doneList : activeList).append(card);
  }
  if (!activeList.children.length) {
    activeList.append(el('<div class="card empty">Niente in corso. Crea la prima scommessa! 🎲</div>'));
  }
  if (!doneList.children.length) {
    doneList.append(el('<div class="card empty">L’archivio è ancora vuoto.</div>'));
  }

  // --- azioni (delegate) ---
  root.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const { action, qid, cid, points } = btn.dataset;

    try {
      if (action === "copy-invite") {
        try {
          await navigator.clipboard.writeText(inviteLink);
          toast("Link di invito copiato! 📋");
        } catch {
          prompt("Copia questo link:", inviteLink);
        }
      } else if (action === "toggle-resolve") {
        const box = root.querySelector(`#resolve-${CSS.escape(qid)}`);
        box.hidden = !box.hidden;
      } else if (action === "close-q") {
        if (!confirm("Chiudere la votazione? Nessuno potrà più votare.")) return;
        const { error } = await supabase.rpc("close_question", { p_question: qid });
        if (error) throw error;
        toast("Votazione chiusa");
        ctx.refresh();
      } else if (action === "edit-qp" || action === "edit-cp") {
        const input = prompt("Nuovo valore in punti:", points);
        if (input === null) return;
        const value = Number(input.replace(",", "."));
        if (!Number.isFinite(value) || value <= 0) { toast("Valore non valido", true); return; }
        const rpcName = action === "edit-qp" ? "set_question_points" : "set_challenge_points";
        const args = action === "edit-qp"
          ? { p_question: qid, p_points: value }
          : { p_challenge: cid, p_points: value };
        const { error } = await supabase.rpc(rpcName, args);
        if (error) throw error;
        toast("Punti aggiornati");
        ctx.refresh();
      }
    } catch (err) {
      toast(err.message, true);
    }
  });

  root.addEventListener("submit", async (e) => {
    const form = e.target;
    const kind = form.dataset.form;
    if (!kind) return;
    e.preventDefault();

    try {
      if (kind === "vote") {
        const qid = form.dataset.qid;
        const qtype = form.dataset.qtype;
        const payload = { question_id: qid, user_id: ctx.session.user.id };
        if (qtype === "number") {
          payload.number_answer = Number(form.elements.num.value);
        } else {
          const chosen = [...form.querySelectorAll('input[name="opt"]:checked')]
            .map((i) => i.value);
          if (!chosen.length) { toast("Seleziona almeno un'opzione", true); return; }
          payload.option_ids = chosen;
        }
        if (!confirm("Il voto NON si può modificare. Confermi la tua scelta?")) return;
        const { error } = await supabase.from("votes").insert(payload);
        if (error) throw error;
        toast("Voto registrato! 🗳️ Ora puoi vedere i voti degli altri");
        ctx.refresh();
      } else if (kind === "resolve") {
        const qid = form.dataset.qid;
        const qtype = form.dataset.qtype;
        const args = { p_question: qid, p_correct_options: null, p_correct_number: null };
        if (qtype === "number") {
          args.p_correct_number = Number(form.elements.num.value);
        } else {
          const chosen = [...form.querySelectorAll('input[name="copt"]:checked')]
            .map((i) => i.value);
          if (!chosen.length) { toast("Seleziona la risposta corretta", true); return; }
          args.p_correct_options = chosen;
        }
        if (!confirm("Confermi il risultato? I punti verranno assegnati subito.")) return;
        const { error } = await supabase.rpc("resolve_question", args);
        if (error) throw error;
        toast("Risultato salvato: punti assegnati! 🏆");
        ctx.refresh();
      } else if (kind === "award") {
        const cid = form.dataset.cid;
        const winner = form.elements.winner.value;
        if (!winner) return;
        if (!confirm("Assegnare la sfida a questo giocatore?")) return;
        const { error } = await supabase.rpc("award_challenge", { p_challenge: cid, p_winner: winner });
        if (error) throw error;
        toast("Sfida assegnata! 🏅");
        ctx.refresh();
      }
    } catch (err) {
      toast(err.message, true);
    }
  });

  return root;
}

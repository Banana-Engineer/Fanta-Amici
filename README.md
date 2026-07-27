# 🏆 FantaAmici

Un gioco di scommesse e sfide tra amici, ispirato al fantacalcio.
Sito statico (perfetto per **GitHub Pages**, gratis) + database gratuito su **Supabase**.

## Come funziona

- Ognuno si registra con **username e password** (niente email).
- Si entra in un gruppo **solo tramite link di invito** (`.../#/join/CODICE`).
- I membri creano **scommesse** (vero/falso, scelta singola, scelta multipla, numero)
  e **sfide** reali, ognuna con un valore in punti.
- I voti sono **segreti** finché non voti anche tu, e **non modificabili**.
- L'**admin** (chi crea il gruppo) fa da moderatore: può correggere i punti,
  chiude le votazioni senza scadenza, inserisce le risposte corrette e
  assegna le sfide completate. Il sistema calcola i punti da solo.

### Calcolo punti

| Tipo | Regola |
|---|---|
| Vero/Falso | risposta giusta = 100% dei punti |
| Scelta singola | risposta giusta = 100% dei punti |
| Scelta multipla | punti × (opzioni corrette selezionate ÷ opzioni totali) |
| Numero | vince chi è più vicino; in caso di parità i punti si dividono |

---

## Messa online in 3 passi (tutto gratis)

### 1. Crea il database su Supabase (~5 minuti)

1. Vai su [supabase.com](https://supabase.com), registrati e crea un **New project**
   (scegli una password qualsiasi per il database, non ti servirà).
2. Apri il **SQL Editor** (icona `>_` nel menu a sinistra), incolla **tutto** il
   contenuto del file [`supabase/schema.sql`](supabase/schema.sql) e premi **Run**.
3. Disattiva la conferma email (indispensabile, visto che le email non esistono):
   menu **Authentication → Sign In / Providers → Email** → spegni **Confirm email** → Save.
4. Vai in **Project Settings → API** e copia:
   - **Project URL** (es. `https://abcdefgh.supabase.co`)
   - **anon public key** (una lunga stringa)

### 2. Configura l'app

Apri [`js/config.js`](js/config.js) e incolla i due valori:

```js
export const SUPABASE_URL = "https://abcdefgh.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOi...";
```

> La *anon key* è fatta per essere pubblica: puoi caricarla su GitHub senza problemi.
> La sicurezza vera è nelle regole del database (Row Level Security).

### 3. Pubblica su GitHub Pages

1. Crea un repository su GitHub (es. `fantamici`) e carica **tutti i file** di questa
   cartella (via `git push` oppure trascinandoli su github.com → *uploading an existing file*).
2. Nel repository: **Settings → Pages** → sotto *Build and deployment* scegli
   **Deploy from a branch** → branch `main`, cartella `/ (root)` → **Save**.
3. Dopo ~1 minuto il sito è online su `https://TUONOME.github.io/fantamici/`.

Fatto! 🎉 Crea il tuo gruppo e manda il link di invito agli amici
(bottone **Copia invito** dentro il gruppo).

---

## Provare in locale

Serve solo Python (già installato su quasi tutti i PC):

```
python -m http.server 8000
```

poi apri http://localhost:8000 nel browser.

## Note

- ⚠️ **Le password non sono protette a livello professionale**: il disclaimer nella
  pagina di login ricorda a tutti di non riutilizzare password importanti.
- Il piano gratuito di Supabase **mette in pausa** i progetti dopo ~1 settimana di
  inattività: si riattivano con un click dalla dashboard di Supabase.
- I voti degli altri diventano visibili solo dopo aver votato (o a votazione chiusa):
  è imposto dal database, non solo dall'interfaccia — niente trucchi con gli strumenti
  sviluppatore del browser. 😉

## Struttura del progetto

```
index.html                  pagina unica dell'app
css/style.css               stile (minimalista, mobile-first)
js/config.js                ← unico file da modificare (chiavi Supabase)
js/main.js                  router e sessione
js/views/…                  le schermate (login, home, gruppo, creazione…)
supabase/schema.sql         ← da eseguire una volta nel SQL Editor di Supabase
```

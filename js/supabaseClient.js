import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// Tiene solo l'origine (es. https://xxx.supabase.co), scartando eventuali
// percorsi come /rest/v1/ o slash finali incollati per sbaglio: la libreria
// aggiunge da sola i percorsi corretti.
function cleanUrl(url) {
  try {
    return new URL(url).origin;
  } catch {
    return url.replace(/\/+$/, "");
  }
}

export const supabase = isConfigured
  ? createClient(cleanUrl(SUPABASE_URL), SUPABASE_ANON_KEY)
  : null;

// Il login è solo username+password: internamente Supabase vuole una email,
// quindi ne generiamo una fittizia e deterministica a partire dallo username.
export function usernameToEmail(username) {
  return `${username.trim().toLowerCase()}@fantamici.local`;
}

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Il login è solo username+password: internamente Supabase vuole una email,
// quindi ne generiamo una fittizia e deterministica a partire dallo username.
export function usernameToEmail(username) {
  return `${username.trim().toLowerCase()}@fantamici.local`;
}

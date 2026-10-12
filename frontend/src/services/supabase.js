/**
 * supabase.js — Supabase client singleton for PunchList Pro.
 *
 * Uses the public anon key (safe to ship in the browser).
 * The service role key lives ONLY in the backend .env and is never sent here.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnon) {
  console.error(
    '⚠️  Supabase environment variables are missing.\n' +
    'Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in frontend/.env'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    // Persist session across page reloads via localStorage
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

/**
 * Get the current Supabase access token (Bearer value for API requests).
 * Returns null if the user is not signed in.
 */
export async function getSupabaseAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token ?? null;
}

/**
 * Sign the user in with email + password via Supabase Auth.
 * @returns {{ session, user, error }}
 */
export async function signInWithPassword(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { session: data?.session, user: data?.user, error };
}

/**
 * Sign in with an OAuth provider (e.g. 'google', 'apple').
 * Opens the provider's consent screen. On success, Supabase redirects
 * the user back to `redirectTo` with the session already established.
 * @param {'google'|'apple'} provider
 */
export async function signInWithOAuth(provider) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.origin,
      queryParams: provider === 'google' ? { access_type: 'offline', prompt: 'consent' } : {},
    },
  });
  return { data, error };
}

/**
 * Sign the user out of Supabase and clear the local session.
 */
export async function signOut() {
  await supabase.auth.signOut();
}

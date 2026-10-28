/**
 * supabase.js — Supabase client singleton for PunchList Pro.
 *
 * Uses the public anon key (safe to ship in the browser).
 * The service role key lives ONLY in the backend .env and is never sent here.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnon &&
  !supabaseUrl.includes('your-project') &&
  !supabaseAnon.includes('your-anon-key')
);

if (!isSupabaseConfigured) {
  console.warn(
    '⚠️ Supabase frontend environment variables are missing or unconfigured.\n' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel / frontend/.env.\n' +
    'Falling back to local backend authentication.'
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : {
      auth: {
        async getSession() {
          return { data: { session: null }, error: null };
        },
        onAuthStateChange() {
          return { data: { subscription: { unsubscribe: () => {} } } };
        },
        async signInWithPassword() {
          return {
            data: { session: null, user: null },
            error: new Error('Supabase Auth is not configured on this deployment. Use demo/backend credentials instead.'),
          };
        },
        async signInWithOAuth() {
          return {
            data: null,
            error: new Error('Supabase Auth is not configured on this deployment.'),
          };
        },
        async signOut() {
          return { error: null };
        },
      },
    };

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

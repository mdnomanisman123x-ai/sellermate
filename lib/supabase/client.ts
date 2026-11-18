import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "../env";

let client: SupabaseClient | null = null;

/** Browser client. Uses only the public anon key; Row Level Security protects the data. */
export function createClient(): SupabaseClient {
  if (!client) {
    // When the env vars are missing (e.g. during the first build) use harmless placeholders so
    // pre-rendering does not crash; every real request then fails cleanly and the UI shows an error.
    const ok = isSupabaseConfigured();
    client = createBrowserClient(
      ok ? SUPABASE_URL : "https://placeholder.supabase.co",
      ok ? SUPABASE_ANON_KEY : "placeholder-anon-key-not-configured"
    ) as unknown as SupabaseClient;
  }
  return client;
}

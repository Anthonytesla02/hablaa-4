/** Verify the Supabase bearer token on a raw HTTP route. */
import { createClient } from "@supabase/supabase-js";

export async function userIdFromRequest(request: Request): Promise<string | null> {
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  if (token.split(".").length !== 3) return null;

  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return null;

  try {
    const client = createClient(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          headers.set("apikey", key);
          if (headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
          return fetch(input, { ...init, headers });
        },
      },
    });
    const { data, error } = await client.auth.getClaims(token);
    if (error || !data?.claims?.sub) return null;
    return String(data.claims.sub);
  } catch {
    return null;
  }
}

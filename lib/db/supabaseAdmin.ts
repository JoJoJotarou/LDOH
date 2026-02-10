import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  if (process.env.ENV !== "dev") {
    throw new Error("Supabase admin environment variables are not configured");
  }
}

export const supabaseAdmin: SupabaseClient = createClient(
  SUPABASE_URL || "http://localhost:54321",
  SUPABASE_SERVICE_ROLE_KEY || "placeholder"
);

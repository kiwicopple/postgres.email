import { createClient } from "@supabase/supabase-js"
import { Database } from "./database.types"

export function getSupabase() {
  if (!process.env.SUPABASE_URL) {
    throw new Error("Missing SUPABASE_URL environment variable")
  }
  if (!process.env.SUPABASE_ANON_KEY) {
    throw new Error("Missing SUPABASE_ANON_KEY environment variable")
  }

  return createClient<Database>(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  )
}

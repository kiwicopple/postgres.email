import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { Database } from "./database.types"

// Singleton instance for server-side usage
let supabaseInstance: SupabaseClient<Database> | null = null

/**
 * Gets or creates a Supabase client instance
 * Uses singleton pattern to avoid creating multiple clients
 */
export function getSupabase(): SupabaseClient<Database> {
  if (!supabaseInstance) {
    if (!process.env.SUPABASE_URL) {
      throw new Error("Missing SUPABASE_URL environment variable")
    }
    if (!process.env.SUPABASE_PUBLISHABLE_KEY) {
      throw new Error("Missing SUPABASE_PUBLISHABLE_KEY environment variable")
    }

    supabaseInstance = createClient<Database>(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_PUBLISHABLE_KEY
    )
  }

  return supabaseInstance
}

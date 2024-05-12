import { corsHeaders } from "../_shared/cors.ts"
import OpenAI from "https://deno.land/x/openai@v4.24.0/mod.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// import { Database } from "./database.ts"

// TODO: init supabase client
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_ANON_KEY") ?? ""
)

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const { query } = await req.json()
  const apiKey = Deno.env.get("OPENAI_API_KEY")
  const openai = new OpenAI({
    apiKey: apiKey,
  })

  // Create query embedding
  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: query,
  })

  const embedding = embeddingResponse.data[0].embedding

  const { data } = await supabase.rpc("search", {
    query_embedding: embedding, // pass the query embedding
    match_threshold: 0.6, // choose an appropriate threshold for your data
    match_count: 10, // choose the number of matches
  })

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  })
})

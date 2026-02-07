/// <reference lib="deno.ns" />

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { corsHeaders } from "../_shared/cors.ts"

const model = new Supabase.ai.Session("gte-small")

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { query } = await req.json()

    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({
          error: "Query parameter is required and must be a string",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    // Generate embedding using Supabase's built-in gte-small model
    const embedding = await model.run(query, {
      mean_pool: true,
      normalize: true,
    })

    return new Response(
      JSON.stringify({
        query,
        embedding,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})

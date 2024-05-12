require("dotenv").config()
const postgres = require("postgres")
const OpenAI = require("openai")
const { createClient } = require("@supabase/supabase-js")

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

async function fetchMessages() {
  try {
    const { data } = await supabase
      .from("messages")
      .select("id, body_text")
      .range(0, 3)
    return data
  } catch (error) {
    console.error("Error fetching messages:", error)
  }
}

async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text,
      encoding_format: "float",
    })
    return response.data[0].embedding
  } catch (error) {
    console.error("Error generating embedding:", error)
  }
}

async function updateEmbedding(id, embedding) {
  try {
    const { data, error } = await supabase
      .from("messages")
      .update({ embedding: embedding })
      .match({ id: id })

    if (error) {
      throw error
    }

    console.log(`Updated message ${id} with embedding`)
  } catch (error) {
    console.error("Error updating message:", error)
  }
}

async function processMessages() {
  const messages = await fetchMessages()
  for (const message of messages) {
    const embedding = await generateEmbedding(message.body_text)
    if (embedding) {
      await updateEmbedding(message.id, embedding)
    }
  }
}

processMessages()

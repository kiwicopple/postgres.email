/**
 * Email text chunking module
 *
 * Splits email body text into chunks suitable for embedding.
 * Strategy: paragraph-aware splitting with token-bounded merging and overlap.
 */

const TARGET_CHUNK_TOKENS = 400
const MAX_CHUNK_TOKENS = 512
const MIN_CHUNK_TOKENS = 50
const OVERLAP_TOKENS = 50

// Rough token estimation: ~4 characters per token for English text
const CHARS_PER_TOKEN = 4

/**
 * Estimate token count from text length
 * @param {string} text
 * @returns {number}
 */
function estimateTokens(text) {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

/**
 * Remove quoted reply lines (lines starting with ">")
 * @param {string} text
 * @returns {string}
 */
function stripQuotedReplies(text) {
  return text
    .split('\n')
    .filter(line => !line.trimStart().startsWith('>'))
    .join('\n')
}

/**
 * Remove email signatures (everything after "-- \n" delimiter)
 * @param {string} text
 * @returns {string}
 */
function stripSignature(text) {
  const sigIndex = text.indexOf('\n-- \n')
  if (sigIndex !== -1) {
    return text.substring(0, sigIndex)
  }
  return text
}

/**
 * Clean email body text: strip quotes, signatures, normalize whitespace
 * @param {string} text
 * @returns {string}
 */
function cleanEmailText(text) {
  if (!text) return ''

  let cleaned = stripQuotedReplies(text)
  cleaned = stripSignature(cleaned)

  // Collapse 3+ consecutive newlines into 2
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')
  // Trim
  cleaned = cleaned.trim()

  return cleaned
}

/**
 * Split text into paragraphs (by double newline)
 * @param {string} text
 * @returns {string[]}
 */
function splitParagraphs(text) {
  return text
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
}

/**
 * Split a paragraph into sentences (for oversized paragraphs)
 * @param {string} text
 * @returns {string[]}
 */
function splitSentences(text) {
  // Split on sentence boundaries: period/question/exclamation followed by space or newline
  const parts = text.split(/(?<=[.!?])\s+/)
  return parts.filter(s => s.length > 0)
}

/**
 * Split an oversized text block into pieces that fit within MAX_CHUNK_TOKENS.
 * First tries sentence splitting, then falls back to hard character splits.
 * @param {string} text
 * @returns {string[]}
 */
function splitOversized(text) {
  const sentences = splitSentences(text)

  // If we only got one "sentence" that's still too big, hard-split by characters
  if (sentences.length === 1 && estimateTokens(sentences[0]) > MAX_CHUNK_TOKENS) {
    const maxChars = MAX_CHUNK_TOKENS * CHARS_PER_TOKEN
    const pieces = []
    for (let i = 0; i < text.length; i += maxChars) {
      pieces.push(text.substring(i, i + maxChars))
    }
    return pieces
  }

  // Merge sentences until hitting target
  const pieces = []
  let current = ''
  for (const sentence of sentences) {
    const combined = current ? current + ' ' + sentence : sentence
    if (estimateTokens(combined) > TARGET_CHUNK_TOKENS && current) {
      pieces.push(current)
      current = sentence
    } else {
      current = combined
    }
  }
  if (current) {
    pieces.push(current)
  }

  return pieces
}

/**
 * Chunk email text into pieces suitable for embedding.
 *
 * @param {string} text - Raw email body_text
 * @param {Object} [options]
 * @param {number} [options.targetTokens] - Target chunk size in tokens
 * @param {number} [options.maxTokens] - Max chunk size in tokens
 * @param {number} [options.minTokens] - Min chunk size in tokens
 * @param {number} [options.overlapTokens] - Overlap between chunks in tokens
 * @returns {Array<{text: string, tokenCount: number, index: number}>}
 */
function chunkText(text, options = {}) {
  const targetTokens = options.targetTokens || TARGET_CHUNK_TOKENS
  const maxTokens = options.maxTokens || MAX_CHUNK_TOKENS
  const minTokens = options.minTokens || MIN_CHUNK_TOKENS
  const overlapTokens = options.overlapTokens || OVERLAP_TOKENS

  const cleaned = cleanEmailText(text)
  if (!cleaned || estimateTokens(cleaned) < minTokens) {
    return []
  }

  // If the whole email fits in one chunk, return it as-is
  if (estimateTokens(cleaned) <= maxTokens) {
    return [{
      text: cleaned,
      tokenCount: estimateTokens(cleaned),
      index: 0,
    }]
  }

  const paragraphs = splitParagraphs(cleaned)

  // Phase 1: Merge small paragraphs into target-sized blocks
  const blocks = []
  let current = ''
  for (const para of paragraphs) {
    if (estimateTokens(para) > maxTokens) {
      // Flush current block first
      if (current) {
        blocks.push(current)
        current = ''
      }
      // Split the oversized paragraph
      const pieces = splitOversized(para)
      blocks.push(...pieces)
      continue
    }

    const combined = current ? current + '\n\n' + para : para
    if (estimateTokens(combined) > targetTokens) {
      if (current) {
        blocks.push(current)
      }
      current = para
    } else {
      current = combined
    }
  }
  if (current) {
    blocks.push(current)
  }

  // Phase 2: Apply overlap between adjacent blocks
  const chunks = []
  for (let i = 0; i < blocks.length; i++) {
    let chunkText = blocks[i]

    // Add overlap from previous block
    if (i > 0 && overlapTokens > 0) {
      const prevText = blocks[i - 1]
      const overlapChars = overlapTokens * CHARS_PER_TOKEN
      if (prevText.length > overlapChars) {
        const overlap = prevText.substring(prevText.length - overlapChars)
        // Find a word boundary in the overlap
        const wordBoundary = overlap.indexOf(' ')
        const cleanOverlap = wordBoundary > 0 ? overlap.substring(wordBoundary + 1) : overlap
        chunkText = cleanOverlap + '\n\n' + chunkText
      }
    }

    const tokenCount = estimateTokens(chunkText)
    if (tokenCount >= minTokens) {
      chunks.push({
        text: chunkText,
        tokenCount,
        index: chunks.length,
      })
    }
  }

  // If all chunks were filtered out (below minTokens), return the whole cleaned text as one chunk
  if (chunks.length === 0 && estimateTokens(cleaned) >= minTokens) {
    return [{
      text: cleaned,
      tokenCount: estimateTokens(cleaned),
      index: 0,
    }]
  }

  return chunks
}

module.exports = {
  chunkText,
  cleanEmailText,
  stripQuotedReplies,
  stripSignature,
  splitParagraphs,
  splitSentences,
  estimateTokens,
  TARGET_CHUNK_TOKENS,
  MAX_CHUNK_TOKENS,
  MIN_CHUNK_TOKENS,
  OVERLAP_TOKENS,
}

import { describe, it, expect } from "vitest"
import {
  ASK_SYSTEM_PROMPT,
  buildAskPrompt,
  buildAskUserPrompt,
} from "../../../src/lib/prompts"
import type { SearchHit } from "../../../src/lib/retrieval"

function hit(overrides: Partial<SearchHit> = {}): SearchHit {
  return {
    id: "<msg-1@example.org>",
    thread_id: "<root-1@example.org>",
    mailbox_id: "pgsql-hackers",
    subject: "WAL improvements",
    from_email: "dev@example.org",
    ts: "2026-01-15T10:00:00Z",
    body_text: "We should batch WAL writes for better throughput.",
    score: 0.95,
    matched_chunk: 0,
    ...overrides,
  }
}

describe("ASK_SYSTEM_PROMPT", () => {
  it("instructs the model to cite and not invent", () => {
    expect(ASK_SYSTEM_PROMPT).toMatch(/cite/i)
    expect(ASK_SYSTEM_PROMPT).toMatch(/\[#N\]/)
    expect(ASK_SYSTEM_PROMPT).toMatch(/couldn't find/i)
  })
})

describe("buildAskPrompt", () => {
  it("numbers citations starting at 1", () => {
    const { citations } = buildAskPrompt("?", [
      hit({ id: "<a@x>", thread_id: "<ta@x>" }),
      hit({ id: "<b@x>", thread_id: "<tb@x>" }),
    ])
    expect(citations.map((c) => c.n)).toEqual([1, 2])
  })

  it("strips angle brackets from thread_id in citations", () => {
    const { citations } = buildAskPrompt("?", [
      hit({ thread_id: "<root-1@example.org>" }),
    ])
    expect(citations[0].thread_id).toBe("root-1@example.org")
  })

  it("falls back to id when thread_id is null", () => {
    const { citations } = buildAskPrompt("?", [
      hit({ id: "<orphan@x>", thread_id: null }),
    ])
    expect(citations[0].thread_id).toBe("orphan@x")
  })

  it("skips hits without a usable id or mailbox", () => {
    const { citations } = buildAskPrompt("?", [
      hit({ id: "", thread_id: null }),
      hit({ mailbox_id: "" as unknown as string }),
      hit({ id: "<good@x>", thread_id: "<good@x>" }),
    ])
    expect(citations).toHaveLength(1)
    expect(citations[0].thread_id).toBe("good@x")
  })

  it("caps to at most 6 hits", () => {
    const hits = Array.from({ length: 12 }, (_, i) =>
      hit({ id: `<m${i}@x>`, thread_id: `<t${i}@x>` }),
    )
    const { citations } = buildAskPrompt("?", hits)
    expect(citations).toHaveLength(6)
  })

  it("emits numbered context blocks matching citations", () => {
    const { context, citations } = buildAskPrompt("?", [
      hit({ subject: "Lock contention", thread_id: "<t1@x>" }),
      hit({ subject: "VACUUM FULL", thread_id: "<t2@x>" }),
    ])
    expect(context).toContain("[#1]")
    expect(context).toContain("[#2]")
    expect(context).toContain("Lock contention")
    expect(context).toContain("VACUUM FULL")
    expect(context.split("---")).toHaveLength(citations.length)
  })

  it("strips quoted reply lines from the excerpt", () => {
    const { context } = buildAskPrompt("?", [
      hit({
        body_text:
          "Here is my answer.\n> On 2024-01-01, x wrote:\n> the quoted bit\nMore answer.",
      }),
    ])
    expect(context).toContain("Here is my answer.")
    expect(context).toContain("More answer.")
    expect(context).not.toContain("the quoted bit")
  })

  it("handles empty hit list", () => {
    const { context, citations } = buildAskPrompt("?", [])
    expect(citations).toEqual([])
    expect(context).toBe("")
  })
})

describe("buildAskUserPrompt", () => {
  it("includes question and context", () => {
    const out = buildAskUserPrompt("Why is WAL slow?", "[#1] context block")
    expect(out).toContain("Why is WAL slow?")
    expect(out).toContain("[#1] context block")
  })
})

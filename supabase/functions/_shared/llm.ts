// Shared LLM client for Supabase Edge Functions.
// Routes requests via the Ollama relay running on the MacBook.
// Returns null on any failure — callers must degrade gracefully.

const RELAY_URL = Deno.env.get("OLLAMA_RELAY_URL");
const RELAY_SECRET = Deno.env.get("OLLAMA_RELAY_SECRET");
const OLLAMA_MODEL = Deno.env.get("OLLAMA_MODEL") ?? "hermes-qwen3-4b-fast";

export async function ollamaChatComplete(
  prompt: string,
  systemPrompt: string,
  timeoutMs = 8000,
): Promise<string | null> {
  if (!RELAY_URL || !RELAY_SECRET) {
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${RELAY_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RELAY_SECRET}`,
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.warn("[llm] relay responded with", res.status);
      return null;
    }

    const data = await res.json() as { message?: { content?: string } };
    const content = data?.message?.content;
    if (typeof content !== "string") {
      console.warn("[llm] unexpected response shape");
      return null;
    }
    return content;
  } catch (err) {
    console.warn(
      "[llm] call failed:",
      err instanceof Error ? err.message : String(err),
    );
    return null;
  } finally {
    clearTimeout(timer);
  }
}

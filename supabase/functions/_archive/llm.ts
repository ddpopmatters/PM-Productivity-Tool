// Shared LLM client for Supabase Edge Functions.
// Routes requests via the Ollama relay running on the MacBook.
// Falls back to OpenAI gpt-4o-mini if the relay is unavailable.
// Returns null on all failures — callers must degrade gracefully.

const RELAY_URL = Deno.env.get("OLLAMA_RELAY_URL");
const RELAY_SECRET = Deno.env.get("OLLAMA_RELAY_SECRET");
const OLLAMA_MODEL = Deno.env.get("OLLAMA_MODEL") ?? "hermes-qwen3-4b-fast";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";

async function tryOllama(
  prompt: string,
  systemPrompt: string,
  timeoutMs: number,
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
      "[llm] ollama failed:",
      err instanceof Error ? err.message : String(err),
    );
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function openaiChatComplete(
  prompt: string,
  systemPrompt: string,
): Promise<string | null> {
  if (!OPENAI_API_KEY) {
    return null;
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      console.warn("[llm] openai responded with", res.status);
      return null;
    }

    const data = await res.json() as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      console.warn("[llm] unexpected openai response shape");
      return null;
    }
    return content;
  } catch (err) {
    console.warn(
      "[llm] openai failed:",
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}

export async function chatComplete(
  prompt: string,
  systemPrompt: string,
  timeoutMs = 8000,
): Promise<string | null> {
  const cloud = await openaiChatComplete(prompt, systemPrompt);
  if (cloud !== null) return cloud;

  console.warn("[llm] openai unavailable, falling back to ollama");
  return tryOllama(prompt, systemPrompt, timeoutMs);
}

// Legacy export — existing callers continue to work unchanged.
export const ollamaChatComplete = (
  prompt: string,
  systemPrompt: string,
  timeoutMs = 8000,
) => chatComplete(prompt, systemPrompt, timeoutMs);

// Ollama relay server — forwards authenticated POST /chat requests to local Ollama
// Start: deno run --allow-net --allow-env relay/server.ts
//
// Required env vars:
//   RELAY_SECRET  — bearer token (must match OLLAMA_RELAY_SECRET in Supabase secrets)
//   OLLAMA_HOST   — defaults to http://localhost:11434

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const PORT = 8787;
const OLLAMA_HOST = Deno.env.get("OLLAMA_HOST") ?? "http://localhost:11434";
const RELAY_SECRET = Deno.env.get("RELAY_SECRET");

if (!RELAY_SECRET) {
  console.error("[relay] RELAY_SECRET env var is required");
  Deno.exit(1);
}

console.log(`[relay] Listening on :${PORT} → ${OLLAMA_HOST}`);

serve(
  async (req) => {
    const url = new URL(req.url);

    if (req.method !== "POST" || url.pathname !== "/chat") {
      return new Response("Not found", { status: 404 });
    }

    const auth = req.headers.get("Authorization");
    if (!auth || auth !== `Bearer ${RELAY_SECRET}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    try {
      const body = await req.text();
      const res = await fetch(`${OLLAMA_HOST}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      const data = await res.text();
      return new Response(data, {
        status: res.status,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error("[relay] upstream error:", err);
      return new Response("Upstream error", { status: 502 });
    }
  },
  { port: PORT },
);

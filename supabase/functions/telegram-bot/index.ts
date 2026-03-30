import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Config ───────────────────────────────────────────────────────────────────

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OWNER_NAME = Deno.env.get("OWNER_NAME") || "Dan Davis";
const OWNER_EMAIL = Deno.env.get("OWNER_EMAIL") || "daniel.davis@populationmatters.org";

const TG = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ─── Telegram helpers ─────────────────────────────────────────────────────────

async function tgPost(method: string, body: Record<string, unknown>) {
  const res = await fetch(`${TG}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

function routingKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "📁 Project",    callback_data: "r:project" },
        { text: "✅ Task",       callback_data: "r:task" },
      ],
      [
        { text: "🔄 Workstream", callback_data: "r:workstream" },
        { text: "📋 WS Task",   callback_data: "r:wst" },
      ],
      [
        { text: "📅 Todo",      callback_data: "r:todo" },
        { text: "🗂 Whiteboard", callback_data: "r:whiteboard" },
      ],
      [
        { text: "🅿️ Park",      callback_data: "r:park" },
        { text: "🗑 Archive",   callback_data: "r:archive" },
      ],
    ],
  };
}

function preview(content: string, max = 60) {
  return content.length > max ? content.slice(0, max) + "…" : content;
}

// ─── Routing actions ──────────────────────────────────────────────────────────

async function handleRoute(
  supabase: ReturnType<typeof createClient>,
  dump: { id: string; content: string },
  destination: string,
  chatId: number,
  messageId: number,
) {
  const now = new Date().toISOString();

  if (destination === "park") {
    await supabase.from("brain_dumps").update({
      status: "routed",
      routed_to_type: "parking_lot",
      routed_at: now,
    }).eq("id", dump.id);
    return "🅿️ Parked — will reappear in your inbox.";
  }

  if (destination === "archive") {
    await supabase.from("brain_dumps").update({
      status: "archived",
      routed_to_type: "archive",
      routed_at: now,
    }).eq("id", dump.id);
    return "🗑 Archived.";
  }

  if (destination === "project") {
    const { data } = await supabase.from("workflow_items").insert({
      title: dump.content,
      caption: "",
      workflow_status: "Idea",
      item_type: "project",
      owner: [OWNER_NAME],
      owner_email: [OWNER_EMAIL],
      collaborators: [],
      tags: [],
      subtasks: [],
      documents: [],
      comments: [],
      archived: false,
      dependencies: [],
      custom_fields: {},
      attachments: [],
    }).select("id").single();

    await supabase.from("brain_dumps").update({
      status: "routed",
      routed_to_type: "project",
      routed_to_id: data?.id ?? null,
      routed_at: now,
    }).eq("id", dump.id);
    return `📁 Added as a project: "${preview(dump.content)}"`;
  }

  if (destination === "task") {
    const { data } = await supabase.from("workflow_items").insert({
      title: dump.content,
      caption: "",
      workflow_status: "todo",
      item_type: "job",
      owner: [OWNER_NAME],
      owner_email: [OWNER_EMAIL],
      collaborators: [],
      tags: [],
      subtasks: [],
      documents: [],
      comments: [],
      archived: false,
      dependencies: [],
      custom_fields: {},
      attachments: [],
    }).select("id").single();

    await supabase.from("brain_dumps").update({
      status: "routed",
      routed_to_type: "task",
      routed_to_id: data?.id ?? null,
      routed_at: now,
    }).eq("id", dump.id);
    return `✅ Added as a task: "${preview(dump.content)}"`;
  }

  if (destination === "workstream") {
    const { data } = await supabase.from("workstreams").insert({
      title: dump.content,
      description: "",
      owner: OWNER_NAME,
      owner_email: OWNER_EMAIL,
      visibility: "shared",
      color: "ocean",
    }).select("id").single();

    await supabase.from("brain_dumps").update({
      status: "routed",
      routed_to_type: "workstream",
      routed_to_id: data?.id ?? null,
      routed_at: now,
    }).eq("id", dump.id);
    return `🔄 Created workstream: "${preview(dump.content)}"`;
  }

  if (destination === "todo") {
    const { data } = await supabase.from("personal_todos").insert({
      user_email: OWNER_EMAIL,
      text: dump.content,
      completed: false,
    }).select("id").single();

    await supabase.from("brain_dumps").update({
      status: "routed",
      routed_to_type: "todo",
      routed_to_id: data?.id ?? null,
      routed_at: now,
    }).eq("id", dump.id);
    return `📅 Added to your todos: "${preview(dump.content)}"`;
  }

  if (destination === "whiteboard") {
    const { data } = await supabase.from("whiteboards").insert({
      title: dump.content,
      description: "",
      owner_email: OWNER_EMAIL,
      is_shared: false,
      shared_with: [],
      archived: false,
    }).select("id").single();

    await supabase.from("brain_dumps").update({
      status: "routed",
      routed_to_type: "whiteboard",
      routed_to_id: data?.id ?? null,
      routed_at: now,
    }).eq("id", dump.id);
    return `🗂 Created whiteboard: "${preview(dump.content)}"`;
  }

  return "❓ Unknown destination.";
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  // Verify Telegram webhook secret
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const update = await req.json();
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // ── Incoming message → store + show routing keyboard ──────────────────────
  if (update.message?.text) {
    const msg = update.message;
    const chatId: number = msg.chat.id;
    const text: string = msg.text.trim();

    // Ignore bot commands
    if (text.startsWith("/")) {
      await tgPost("sendMessage", {
        chat_id: chatId,
        text: "Send me any idea or note and I'll ask where to route it.",
      });
      return new Response("ok");
    }

    // Store in brain_dumps
    const { data: dump, error } = await supabase.from("brain_dumps").insert({
      content: text,
      source: "telegram",
      status: "pending",
      maturity: "raw",
      tags: [],
    }).select("id").single();

    if (error || !dump) {
      console.error("Failed to store brain dump:", error);
      await tgPost("sendMessage", { chat_id: chatId, text: "❌ Failed to save. Try again." });
      return new Response("ok");
    }

    // Send routing keyboard
    const sent = await tgPost("sendMessage", {
      chat_id: chatId,
      text: `💡 Got it:\n"${preview(text)}"\n\nWhere should this go?`,
      reply_markup: routingKeyboard(),
    });

    // Store telegram context on the dump row
    if (sent.ok) {
      await supabase.from("brain_dumps").update({
        telegram_chat_id: chatId,
        telegram_message_id: sent.result.message_id,
      }).eq("id", dump.id);
    }

    return new Response("ok");
  }

  // ── Callback query → handle routing ───────────────────────────────────────
  if (update.callback_query) {
    const cb = update.callback_query;
    const data: string = cb.data ?? "";
    const chatId: number = cb.message?.chat?.id;
    const messageId: number = cb.message?.message_id;

    // Always ack the callback to remove loading spinner
    await tgPost("answerCallbackQuery", { callback_query_id: cb.id });

    // Look up the dump by telegram context
    const { data: dumps } = await supabase
      .from("brain_dumps")
      .select("id, content")
      .eq("telegram_chat_id", chatId)
      .eq("telegram_message_id", messageId)
      .eq("status", "pending")
      .limit(1);

    const dump = dumps?.[0];

    // ── WS Task first step: show workstream picker ─────────────────────────
    if (data === "r:wst") {
      if (!dump) {
        await tgPost("editMessageText", {
          chat_id: chatId, message_id: messageId,
          text: "⚠️ Item already routed or not found.",
        });
        return new Response("ok");
      }

      const { data: workstreams } = await supabase
        .from("workstreams")
        .select("id, title")
        .eq("owner_email", OWNER_EMAIL)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!workstreams?.length) {
        await tgPost("editMessageText", {
          chat_id: chatId, message_id: messageId,
          text: `No workstreams found.\n\n"${preview(dump.content)}"\n\nWhere else?`,
          reply_markup: routingKeyboard(),
        });
        return new Response("ok");
      }

      // Build workstream picker (one per row, callback: "rw:{ws_id}")
      const wsButtons = workstreams.map((ws) => ([{
        text: ws.title,
        callback_data: `rw:${ws.id}`,
      }]));
      wsButtons.push([{ text: "← Back", callback_data: "r:back" }]);

      await tgPost("editMessageText", {
        chat_id: chatId, message_id: messageId,
        text: `📋 Pick a workstream for:\n"${preview(dump.content)}"`,
        reply_markup: { inline_keyboard: wsButtons },
      });
      return new Response("ok");
    }

    // ── WS Task second step: workstream selected ───────────────────────────
    if (data.startsWith("rw:")) {
      const workstreamId = data.slice(3);

      if (!dump) {
        await tgPost("editMessageText", {
          chat_id: chatId, message_id: messageId,
          text: "⚠️ Item already routed or not found.",
        });
        return new Response("ok");
      }

      const now = new Date().toISOString();
      const { data: task } = await supabase.from("workstream_tasks").insert({
        workstream_id: workstreamId,
        title: dump.content,
        priority: "medium",
        status: "open",
        tags: [],
        comments: [],
        attachments: [],
      }).select("id").single();

      await supabase.from("brain_dumps").update({
        status: "routed",
        routed_to_type: "workstream_task",
        routed_to_id: task?.id ?? null,
        routed_at: now,
      }).eq("id", dump.id);

      const { data: ws } = await supabase
        .from("workstreams").select("title").eq("id", workstreamId).single();

      await tgPost("editMessageText", {
        chat_id: chatId, message_id: messageId,
        text: `📋 Added to "${ws?.title ?? "workstream"}":\n"${preview(dump.content)}" ✅`,
      });
      return new Response("ok");
    }

    // ── Back button → restore routing keyboard ─────────────────────────────
    if (data === "r:back") {
      if (!dump) {
        await tgPost("editMessageText", {
          chat_id: chatId, message_id: messageId,
          text: "⚠️ Item already routed or not found.",
        });
        return new Response("ok");
      }

      await tgPost("editMessageText", {
        chat_id: chatId, message_id: messageId,
        text: `💡 Got it:\n"${preview(dump.content)}"\n\nWhere should this go?`,
        reply_markup: routingKeyboard(),
      });
      return new Response("ok");
    }

    // ── Standard routing destinations ──────────────────────────────────────
    if (data.startsWith("r:")) {
      const destination = data.slice(2);

      if (!dump) {
        await tgPost("editMessageText", {
          chat_id: chatId, message_id: messageId,
          text: "⚠️ Item already routed or not found.",
        });
        return new Response("ok");
      }

      const confirmation = await handleRoute(supabase, dump, destination, chatId, messageId);

      await tgPost("editMessageText", {
        chat_id: chatId,
        message_id: messageId,
        text: confirmation,
      });

      return new Response("ok");
    }
  }

  return new Response("ok");
});

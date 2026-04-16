import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ollamaChatComplete } from "../_shared/llm.ts";

const LONDON_TIME_ZONE = "Europe/London";
const DIGEST_SECTION_LIMIT = 5;

type TelegramDigestRecipient = {
  chat_id: number;
  user_email: string;
};

type DigestWorkstreamRow = {
  id: string;
  title: string;
  visibility: string;
  owner_email: string;
};

type DigestTaskRow = {
  id: string;
  workstream_id: string;
  title: string;
  priority: string;
  status: string;
  deadline: string | null;
  created_at: string;
  assignee_email: string | null;
};

type DigestTaskItem = {
  id: string;
  title: string;
  priority: string;
  status: string;
  deadline: string | null;
  createdAt: string;
  workstreamId: string;
  workstreamTitle: string;
};

type DigestBuckets = {
  dueToday: DigestTaskItem[];
  overdue: DigestTaskItem[];
  highPriorityOpen: DigestTaskItem[];
  noDeadline: DigestTaskItem[];
};

type TelegramInlineButton = {
  text: string;
  callback_data: string;
};

type TelegramReplyMarkup = {
  inline_keyboard: TelegramInlineButton[][];
};

type DigestResult = {
  mainText: string;
  undatedKeyboard?: {
    text: string;
    reply_markup: TelegramReplyMarkup;
  };
} | null;

type DigestConfig = {
  botToken: string;
  cronSecret: string;
  supabaseUrl: string;
  serviceRoleKey: string;
};

function createServiceClient(config: DigestConfig) {
  return createClient(
    config.supabaseUrl,
    config.serviceRoleKey,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}

type SupabaseClient = ReturnType<typeof createServiceClient>;

function readConfig(): DigestConfig {
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const cronSecret = Deno.env.get("CRON_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!botToken || !cronSecret || !supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing required digest environment configuration.");
  }

  return {
    botToken,
    cronSecret,
    supabaseUrl,
    serviceRoleKey,
  };
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getLondonDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: LONDON_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(values.get("year")),
    month: Number(values.get("month")),
    day: Number(values.get("day")),
  };
}

function getLondonDayStart(date = new Date()) {
  const parts = getLondonDateParts(date);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getLondonTodayIso() {
  return toIsoDate(getLondonDayStart());
}

function compareTitles(
  left: { title: string },
  right: { title: string },
) {
  return left.title.localeCompare(right.title, undefined, {
    sensitivity: "base",
  });
}

function compareTasks(
  left: { deadline: string | null; createdAt: string; title: string },
  right: { deadline: string | null; createdAt: string; title: string },
) {
  const leftDeadline = left.deadline ?? "9999-12-31";
  const rightDeadline = right.deadline ?? "9999-12-31";
  const deadlineOrder = leftDeadline.localeCompare(rightDeadline);

  if (deadlineOrder !== 0) {
    return deadlineOrder;
  }

  const createdAtOrder = left.createdAt.localeCompare(right.createdAt);
  if (createdAtOrder !== 0) {
    return createdAtOrder;
  }

  return compareTitles(left, right);
}

function dedupeById<T extends { id: string }>(rows: T[]) {
  const records = new Map<string, T>();

  for (const row of rows) {
    records.set(row.id, row);
  }

  return Array.from(records.values());
}

function toDigestItems(
  rows: DigestTaskRow[],
  workstreamMap: Map<string, DigestWorkstreamRow>,
) {
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    priority: row.priority,
    status: row.status,
    deadline: row.deadline,
    createdAt: row.created_at,
    workstreamId: row.workstream_id,
    workstreamTitle: workstreamMap.get(row.workstream_id)?.title ??
      "Unknown workstream",
  }));
}

function collectDigestBuckets(tasks: DigestTaskItem[]): DigestBuckets {
  const todayIso = getLondonTodayIso();
  const openTasks = tasks.filter((task) => task.status !== "done");
  const highPriorityOpen = openTasks
    .filter((task) =>
      task.priority === "high" &&
      task.deadline !== todayIso &&
      (task.deadline === null || task.deadline > todayIso)
    )
    .sort(compareTasks);
  const highPriorityOpenIds = new Set(
    highPriorityOpen.map((task) => task.id),
  );

  return {
    dueToday: openTasks
      .filter((task) => task.deadline === todayIso)
      .sort(compareTasks),
    overdue: openTasks
      .filter((task) => task.deadline !== null && task.deadline < todayIso)
      .sort(compareTasks),
    highPriorityOpen,
    noDeadline: openTasks
      .filter((task) =>
        task.deadline === null && !highPriorityOpenIds.has(task.id)
      )
      .sort(compareTasks),
  };
}

function hasDigestContent(buckets: DigestBuckets) {
  return buckets.dueToday.length > 0 ||
    buckets.overdue.length > 0 ||
    buckets.highPriorityOpen.length > 0 ||
    buckets.noDeadline.length > 0;
}

function formatSection(
  heading: string,
  tasks: DigestTaskItem[],
) {
  if (!tasks.length) {
    return [] as string[];
  }

  const visibleTasks = tasks.slice(0, DIGEST_SECTION_LIMIT);
  const lines = [`${heading} (${tasks.length})`];

  for (const task of visibleTasks) {
    lines.push(`  · ${task.title} [${task.workstreamTitle}]`);
  }

  if (tasks.length > DIGEST_SECTION_LIMIT) {
    lines.push(`  · …and ${tasks.length - DIGEST_SECTION_LIMIT} more`);
  }

  return lines;
}

function formatDigestMessage(buckets: DigestBuckets) {
  const sections = [
    formatSection("⏰ Due today", buckets.dueToday),
    formatSection("🔴 Overdue", buckets.overdue),
    formatSection("📌 High priority open", buckets.highPriorityOpen),
  ].filter((lines) => lines.length > 0);

  if (!sections.length) {
    return null;
  }

  const lines = ["☀️ Good morning! Here's your day:", ""];

  sections.forEach((section, index) => {
    if (index > 0) {
      lines.push("");
    }

    lines.push(...section);
  });

  lines.push("", "Reply /tasks to manage these.");

  return lines.join("\n");
}

function buildUndatedKeyboard(tasks: DigestTaskItem[]) {
  const count = tasks.length;

  return {
    text:
      `📋 ${count} task${count === 1 ? "" : "s"} without a deadline — tap to schedule for today:`,
    reply_markup: {
      inline_keyboard: tasks.slice(0, 8).map((task) => [{
        text: task.title.slice(0, 40),
        callback_data: `td:${task.id}`,
      }]),
    },
  };
}

async function sendTelegramMessage(
  botToken: string,
  chatId: number,
  text: string,
  replyMarkup?: TelegramReplyMarkup,
) {
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      }),
    },
  );

  const payload = await response.json();

  if (!response.ok || payload?.ok !== true) {
    throw new Error(
      `Telegram sendMessage failed: ${response.status} ${
        JSON.stringify(payload)
      }`,
    );
  }
}

async function loadRecipients(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("telegram_sessions")
    .select("chat_id, user_email")
    .order("chat_id", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as TelegramDigestRecipient[];
}

async function loadOwnedWorkstreams(
  supabase: SupabaseClient,
  userEmail: string,
) {
  const { data, error } = await supabase
    .from("workstreams")
    .select("id, title, visibility, owner_email")
    .eq("owner_email", userEmail)
    .order("title", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as DigestWorkstreamRow[];
}

async function loadSharedWorkstreams(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("workstreams")
    .select("id, title, visibility, owner_email")
    .eq("visibility", "shared")
    .order("title", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as DigestWorkstreamRow[];
}

async function loadAccessibleWorkstreams(
  supabase: SupabaseClient,
  userEmail: string,
) {
  const [owned, shared] = await Promise.all([
    loadOwnedWorkstreams(supabase, userEmail),
    loadSharedWorkstreams(supabase),
  ]);

  return dedupeById([...owned, ...shared]).sort(compareTitles);
}

async function loadTasksForWorkstreams(
  supabase: SupabaseClient,
  workstreamIds: string[],
) {
  if (!workstreamIds.length) {
    return [] as DigestTaskRow[];
  }

  const { data, error } = await supabase
    .from("workstream_tasks")
    .select(
      "id, workstream_id, title, priority, status, deadline, created_at, assignee_email",
    )
    .in("workstream_id", workstreamIds);

  if (error) {
    throw error;
  }

  return (data ?? []) as DigestTaskRow[];
}

async function loadAssignedTasks(
  supabase: SupabaseClient,
  userEmail: string,
) {
  const { data, error } = await supabase
    .from("workstream_tasks")
    .select(
      "id, workstream_id, title, priority, status, deadline, created_at, assignee_email",
    )
    .eq("assignee_email", userEmail);

  if (error) {
    throw error;
  }

  return (data ?? []) as DigestTaskRow[];
}

async function loadWorkstreamsByIds(
  supabase: SupabaseClient,
  workstreamIds: string[],
) {
  if (!workstreamIds.length) {
    return [] as DigestWorkstreamRow[];
  }

  const { data, error } = await supabase
    .from("workstreams")
    .select("id, title, visibility, owner_email")
    .in("id", workstreamIds);

  if (error) {
    throw error;
  }

  return (data ?? []) as DigestWorkstreamRow[];
}

async function buildDigestMessageForUser(
  supabase: SupabaseClient,
  userEmail: string,
): Promise<DigestResult> {
  const accessibleWorkstreams = await loadAccessibleWorkstreams(
    supabase,
    userEmail,
  );
  const accessibleWorkstreamIds = accessibleWorkstreams.map((row) => row.id);

  const [workstreamTasks, assignedTasks] = await Promise.all([
    loadTasksForWorkstreams(supabase, accessibleWorkstreamIds),
    loadAssignedTasks(supabase, userEmail),
  ]);

  const taskRows = dedupeById([...workstreamTasks, ...assignedTasks]);
  if (!taskRows.length) {
    return null;
  }

  const workstreamMap = new Map(
    accessibleWorkstreams.map((workstream) => [workstream.id, workstream]),
  );

  const missingIds = Array.from(
    new Set(
      taskRows
        .map((task) => task.workstream_id)
        .filter((workstreamId) => !workstreamMap.has(workstreamId)),
    ),
  );

  if (missingIds.length) {
    const missingWorkstreams = await loadWorkstreamsByIds(supabase, missingIds);
    for (const workstream of missingWorkstreams) {
      workstreamMap.set(workstream.id, workstream);
    }
  }

  const digestBuckets = collectDigestBuckets(
    toDigestItems(taskRows, workstreamMap),
  );

  if (!hasDigestContent(digestBuckets)) {
    return null;
  }

  let mainText = formatDigestMessage(digestBuckets) ??
    "☀️ Good morning! No urgent tasks today.\n\nReply /tasks to manage these.";

  // LLM focus line — additive only, never blocks send on failure
  const urgentTasks = [...digestBuckets.overdue, ...digestBuckets.highPriorityOpen];
  if (urgentTasks.length > 0) {
    const taskList = urgentTasks
      .slice(0, 10)
      .map((t) =>
        `[${t.priority}${t.deadline ? `, due ${t.deadline}` : ""}] ${t.title}`
      )
      .join("\n");

    const focusLine = await ollamaChatComplete(
      `Tasks:\n${taskList}`,
      "In one sentence (max 20 words), what should the user focus on first today? Be direct.",
      6000,
    );

    if (focusLine) {
      mainText = `🎯 *Today's focus:* ${focusLine.trim()}\n\n${mainText}`;
    }
  }

  if (digestBuckets.noDeadline.length > 0) {
    return {
      mainText,
      undatedKeyboard: buildUndatedKeyboard(digestBuckets.noDeadline),
    };
  }

  return { mainText };
}

serve(async (req) => {
  let config: DigestConfig;

  try {
    config = readConfig();
  } catch (error) {
    console.error("telegram-digest configuration error:", error);
    return jsonResponse({ ok: false, error: "Server configuration error" }, 500);
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const incomingSecret = req.headers.get("x-cron-secret");
  if (!incomingSecret || incomingSecret !== config.cronSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createServiceClient(config);

  try {
    const recipients = await loadRecipients(supabase);
    let sent = 0;
    let skipped = 0;

    for (const recipient of recipients) {
      try {
        const result = await buildDigestMessageForUser(
          supabase,
          recipient.user_email,
        );

        if (!result) {
          skipped += 1;
          continue;
        }

        await sendTelegramMessage(
          config.botToken,
          recipient.chat_id,
          result.mainText,
        );

        if (result.undatedKeyboard) {
          await sendTelegramMessage(
            config.botToken,
            recipient.chat_id,
            result.undatedKeyboard.text,
            result.undatedKeyboard.reply_markup,
          );
        }

        sent += 1;
      } catch (error) {
        console.error("telegram-digest failed for recipient:", {
          chatId: recipient.chat_id,
          userEmail: recipient.user_email,
          error,
        });
      }
    }

    return jsonResponse({ ok: true, sent, skipped });
  } catch (error) {
    console.error("telegram-digest job failed:", error);
    return jsonResponse({ ok: false, error: "Digest job failed" }, 500);
  }
});

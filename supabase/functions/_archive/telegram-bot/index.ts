import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ollamaChatComplete } from "../_shared/llm.ts";

// ─── Config ───────────────────────────────────────────────────────────────────

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OWNER_NAME = Deno.env.get("OWNER_NAME") || "Dan Davis";
const OWNER_EMAIL = Deno.env.get("OWNER_EMAIL") ||
  "daniel.davis@populationmatters.org";
const LONDON_TIME_ZONE = "Europe/London";

const TG = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ─── PM Organisational Context ────────────────────────────────────────────────
// Compact context block injected into all LLM system prompts.
// Keeps the model PM-aware without blowing small-model context windows.

const PM_ORG_CONTEXT =
  `You are assisting staff at Population Matters, a UK charity advocating for universal access to voluntary family planning and reproductive rights. ` +
  `Mission: support women's right to decide if, when, and how many children to have. ` +
  `Framing is ALWAYS rights-based and demand-led — never coercive or numbers-focused. ` +
  `Use: "reproductive rights", "her choice", "voluntary family planning", "women's autonomy". ` +
  `Avoid: "population stabilisation", "overpopulation", "family size management", "too many people". ` +
  `Women are rights-holders, never variables or solutions to environmental problems. ` +
  `Work areas: Research, Advocacy, Communications, Fundraising, Operations. ` +
  `Key audiences: UK public donors (warm, story-led), development partners (evidence-based, SDG-aligned), ` +
  `government/FCDO (policy-anchored), media (hook + data), major donors (insider tone). ` +
  `Key people: Amy (CEO), Jameen (Head of Advocacy), Dan Davis (digital/comms).`;

function createSupabaseAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const HELP_TEXT = [
  "📱 Momentum Hub Bot",
  "",
  "/tasks — Today's tasks + high priority open",
  "/all — Browse every task in a workstream",
  "/ws — Browse your workstreams",
  "/done — Mark active task as done",
  "/add <title> — Add task to active workstream",
  "/comment <text> — Add comment to active task",
  "/summary [workstream] — 3-sentence AI summary",
  "/ask <question> — Ask anything about PM (messaging, audiences, strategy)",
  "/draft <brief> — Draft copy in PM's voice from a one-line brief",
  "/clear — Reset active workstream and task",
  "/help — Show this message",
  "",
  "Or send any text to capture it as a brain dump.",
  "Tip: describe a task naturally and I'll offer to create it.",
].join("\n");

const TASK_ACTION_KEYBOARD = {
  inline_keyboard: [[
    { text: "✅ Done", callback_data: "td:done" },
    { text: "▶️ In Progress", callback_data: "td:in_progress" },
    { text: "📅 Set Deadline", callback_data: "td:deadline" },
  ]],
};

const FULL_TASK_ACTION_KEYBOARD = {
  inline_keyboard: [
    [
      { text: "✅ Done", callback_data: "tas:done" },
      { text: "▶️ In Progress", callback_data: "tas:in_progress" },
      { text: "📋 To Do", callback_data: "tas:todo" },
    ],
    [
      { text: "📅 Set Deadline", callback_data: "tas:deadline" },
      { text: "🔴 High", callback_data: "tas:pri_high" },
      { text: "🟡 Medium", callback_data: "tas:pri_medium" },
      { text: "🟢 Low", callback_data: "tas:pri_low" },
    ],
    [
      { text: "✏️ Edit title", callback_data: "tas:edit_title" },
      { text: "💬 Add comment", callback_data: "tas:comment" },
    ],
    [
      { text: "📝 Edit description", callback_data: "tas:edit_desc" },
      { text: "👤 Set assignee", callback_data: "tas:set_assignee" },
    ],
  ],
};

const DEADLINE_PICKER_KEYBOARD = {
  inline_keyboard: [
    [
      { text: "Today", callback_data: "dl:today" },
      { text: "Tomorrow", callback_data: "dl:tomorrow" },
    ],
    [
      { text: "This Friday", callback_data: "dl:friday" },
      { text: "Next Monday", callback_data: "dl:monday" },
    ],
  ],
};

type SupabaseClient = ReturnType<typeof createSupabaseAdminClient>;

type PendingAction =
  | "edit_title"
  | "add_comment"
  | "edit_ws_title"
  | "edit_ws_description"
  | "edit_task_desc"
  | "set_task_assignee"
  | "llm_task_confirm"
  | "llm_task_ws_pick"
  | null;

type TaskPendingAction =
  | "edit_title"
  | "add_comment"
  | "edit_task_desc"
  | "set_task_assignee";

type WorkstreamPendingAction = "edit_ws_title" | "edit_ws_description";

type LlmTaskPendingData = {
  title: string;
  priority: "high" | "medium" | "low" | null;
  deadline_shortcut: "today" | "tomorrow" | "friday" | "monday" | null;
  workstream_id: string | null;
  workstream_title: string | null;
  original_text: string;
};

type TelegramSession = {
  chat_id: number;
  user_email: string;
  active_ws_id: string | null;
  active_task_id: string | null;
  pending_action: PendingAction;
  pending_data: LlmTaskPendingData | null;
  updated_at?: string | null;
};

type WorkstreamRow = {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  owner_email: string;
};

type WorkstreamTaskRow = {
  id: string;
  workstream_id: string;
  title: string;
  description?: string | null;
  priority: string;
  status: string;
  deadline: string | null;
  created_at: string;
  assignee_email: string | null;
  task_type?: string | null;
  comments?: TaskComment[] | null;
};

type TaskComment = {
  text: string;
  author?: string;
  author_email?: string;
  created_at: string;
  id?: string;
};

type TaskListItem = {
  id: string;
  title: string;
  priority: string;
  status: string;
  deadline: string | null;
  created_at: string;
  workstreamId: string;
  workstreamTitle: string;
};

type TaskListData = {
  activeWorkstream: WorkstreamRow | null;
  dueToday: TaskListItem[];
  highPriorityOpen: TaskListItem[];
  ordered: TaskListItem[];
};

type TaskDetail = {
  id: string;
  title: string;
  priority: string;
  status: string;
  deadline: string | null;
  assigneeEmail: string | null;
  description: string | null;
  workstreamTitle: string;
};

type TaskStatusGroup = "todo" | "in_progress" | "done";

type TelegramUserContext = {
  email: string;
  name: string;
};

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
        { text: "📁 Project", callback_data: "r:project" },
        { text: "✅ Task", callback_data: "r:task" },
      ],
      [
        { text: "🔄 Workstream", callback_data: "r:workstream" },
        { text: "📋 WS Task", callback_data: "r:wst" },
      ],
      [
        { text: "📅 Todo", callback_data: "r:todo" },
        { text: "🗂 Whiteboard", callback_data: "r:whiteboard" },
      ],
      [
        { text: "🅿️ Park", callback_data: "r:park" },
        { text: "🗑 Archive", callback_data: "r:archive" },
      ],
    ],
  };
}

function preview(content: string, max = 60) {
  return content.length > max ? `${content.slice(0, max)}…` : content;
}

function formatNameFromEmail(email: string) {
  const localPart = email.split("@")[0] ?? "";
  return localPart
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (char: string) => char.toUpperCase()) || "Unknown User";
}

function getTimeZoneDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: LONDON_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const lookup = new Map(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(lookup.get("year")),
    month: Number(lookup.get("month")),
    day: Number(lookup.get("day")),
  };
}

function getLondonCalendarDate(date = new Date()) {
  const parts = getTimeZoneDateParts(date);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getTodayIso() {
  return formatIsoDate(getLondonCalendarDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function nextWeekday(
  baseDate: Date,
  targetWeekday: number,
  includeToday: boolean,
) {
  const currentWeekday = baseDate.getUTCDay();
  let offset = (targetWeekday - currentWeekday + 7) % 7;
  if (offset === 0 && !includeToday) {
    offset = 7;
  }
  return addDays(baseDate, offset);
}

function formatTaskListDate() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
}

function formatDisplayDate(dateIso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(new Date(`${dateIso}T12:00:00Z`));
}

function taskNumberKeyboard(tasks: TaskListItem[]) {
  const rows = tasks.map((task, index) => [{
    text: `${index + 1}`,
    callback_data: `t:${task.id}`,
  }]);

  rows.push([{
    text: "📋 Browse all tasks",
    callback_data: "all:list",
  }]);

  return {
    inline_keyboard: rows,
  };
}

function allTaskKeyboard(tasks: WorkstreamTaskRow[]) {
  return {
    inline_keyboard: tasks.map((task, index) => [{
      text: `${index + 1}. ${preview(task.title, 40)}`,
      callback_data: `ta:${task.id}`,
    }]),
  };
}

function workstreamKeyboard(workstreams: WorkstreamRow[], prefix = "ws") {
  return {
    inline_keyboard: workstreams.map((workstream) => [{
      text: workstream.title,
      callback_data: `${prefix}:${workstream.id}`,
    }]),
  };
}

function workstreamDetailKeyboard(workstreamId: string) {
  return {
    inline_keyboard: [
      [
        { text: "✏️ Rename", callback_data: `wse:title:${workstreamId}` },
        { text: "📝 Description", callback_data: `wse:desc:${workstreamId}` },
        {
          text: "👁️ Toggle visibility",
          callback_data: `wse:vis:${workstreamId}`,
        },
      ],
      [{ text: "📋 View tasks ↑", callback_data: `wse:tasks:${workstreamId}` }],
    ],
  };
}

function uniqueById<T extends { id: string }>(rows: T[]) {
  return Array.from(new Map(rows.map((row) => [row.id, row])).values());
}

function compareTaskTitle(a: { title: string }, b: { title: string }) {
  return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
}

function mapTaskListItem(
  task: WorkstreamTaskRow,
  workstreamMap: Map<string, WorkstreamRow>,
): TaskListItem {
  return {
    id: task.id,
    title: task.title,
    priority: task.priority,
    status: task.status,
    deadline: task.deadline,
    created_at: task.created_at,
    workstreamId: task.workstream_id,
    workstreamTitle: workstreamMap.get(task.workstream_id)?.title ??
      "Unknown workstream",
  };
}

function formatWorkstreamsMessage(workstreams: WorkstreamRow[]) {
  const lines = ["🗂 Your workstreams:", ""];

  workstreams.forEach((workstream, index) => {
    const scope = workstream.visibility === "shared" ? "shared" : "personal";
    lines.push(`${index + 1}. ${workstream.title} (${scope})`);
  });

  lines.push("", "Tap to set as active workstream.");
  return lines.join("\n");
}

function formatAllWorkstreamsMessage(workstreams: WorkstreamRow[]) {
  const lines = ["📋 Browse all tasks by workstream:", ""];

  workstreams.forEach((workstream, index) => {
    const scope = workstream.visibility === "shared" ? "shared" : "personal";
    lines.push(`${index + 1}. ${workstream.title} (${scope})`);
  });

  lines.push("", "Tap a workstream to browse every task in it.");
  return lines.join("\n");
}

function formatTasksMessage(taskData: TaskListData) {
  if (!taskData.ordered.length) {
    return "✅ Nothing urgent — you're clear!";
  }

  const lines = [`📋 Your tasks — ${formatTaskListDate()}`];

  if (taskData.activeWorkstream) {
    lines.push(`📁 Filtered to: ${taskData.activeWorkstream.title}`);
  }

  lines.push("");
  lines.push(`⏰ Due today (${taskData.dueToday.length})`);

  taskData.dueToday.forEach((task, index) => {
    lines.push(`  ${index + 1}. ${task.title} [${task.workstreamTitle}]`);
  });

  lines.push("");
  lines.push(`🔴 High priority open (${taskData.highPriorityOpen.length})`);

  taskData.highPriorityOpen.forEach((task, index) => {
    lines.push(
      `  ${
        taskData.dueToday.length + index + 1
      }. ${task.title} [${task.workstreamTitle}]`,
    );
  });

  lines.push("", "Tap a number to view and act on a task.");
  return lines.join("\n");
}

function formatTaskStatus(status: string) {
  if (status === "open") {
    return "To Do";
  }

  if (status === "in_progress") {
    return "In Progress";
  }

  if (status === "done") {
    return "Done";
  }

  return status;
}

function formatTaskPriority(priority: string) {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function formatWorkstreamVisibility(visibility: string) {
  return visibility === "shared" ? "Shared" : "Personal";
}

function formatTaskDescription(description: string | null | undefined) {
  if (!description) {
    return "None";
  }

  return preview(description, 200);
}

function mapTaskStatusGroup(status: string): TaskStatusGroup {
  if (status === "done") {
    return "done";
  }

  if (status === "in_progress") {
    return "in_progress";
  }

  return "todo";
}

function compareTasksForAllView(a: WorkstreamTaskRow, b: WorkstreamTaskRow) {
  if (a.deadline && b.deadline) {
    const deadlineCompare = a.deadline.localeCompare(b.deadline);
    if (deadlineCompare !== 0) {
      return deadlineCompare;
    }
  } else if (a.deadline) {
    return -1;
  } else if (b.deadline) {
    return 1;
  }

  return b.created_at.localeCompare(a.created_at);
}

function formatAllTasksMessage(
  workstream: WorkstreamRow,
  tasks: WorkstreamTaskRow[],
) {
  const groupConfig: Array<{ key: TaskStatusGroup; heading: string }> = [
    { key: "todo", heading: "📋 To do" },
    { key: "in_progress", heading: "▶️ In progress" },
    { key: "done", heading: "✅ Done" },
  ];

  const lines = [`📋 All tasks in ${workstream.title}`];
  const visibleTasks: WorkstreamTaskRow[] = [];
  let taskNumber = 1;

  for (const group of groupConfig) {
    const groupedTasks = tasks
      .filter((task) => mapTaskStatusGroup(task.status) === group.key)
      .sort(compareTasksForAllView);
    const visibleGroupTasks = groupedTasks.slice(0, 5);

    lines.push("");
    lines.push(`${group.heading} (${groupedTasks.length})`);

    if (!visibleGroupTasks.length) {
      lines.push("  None");
      continue;
    }

    for (const task of visibleGroupTasks) {
      const deadlineLabel = task.deadline ? ` — ${task.deadline}` : "";
      lines.push(`  ${taskNumber}. ${task.title}${deadlineLabel}`);
      visibleTasks.push(task);
      taskNumber += 1;
    }

    if (groupedTasks.length > visibleGroupTasks.length) {
      lines.push(`  …and ${groupedTasks.length - visibleGroupTasks.length} more`);
    }
  }

  lines.push("", "Tap a task button to view and edit it.");
  return {
    message: lines.join("\n"),
    visibleTasks,
  };
}

function formatWorkstreamDetail(
  workstream: WorkstreamRow,
  tasks: WorkstreamTaskRow[],
) {
  const openTasks = tasks.filter((task) => task.status !== "done").length;
  const lines = [
    `📁 ${workstream.title}`,
    `Visibility: ${formatWorkstreamVisibility(workstream.visibility)} | Tasks: ${openTasks} open`,
  ];

  if (workstream.description?.trim()) {
    lines.push(`Description: ${formatTaskDescription(workstream.description)}`);
  }

  return lines.join("\n");
}

function formatTaskDetail(task: TaskDetail) {
  const lines = [
    `📌 ${task.title}`,
    `Workstream: ${task.workstreamTitle}`,
    `Status: ${formatTaskStatus(task.status)}`,
    `Priority: ${formatTaskPriority(task.priority)}`,
    `Deadline: ${
      task.deadline ? formatDisplayDate(task.deadline) : "Not set"
    }`,
    `Assignee: ${task.assigneeEmail ?? "Unassigned"}`,
    `Description: ${formatTaskDescription(task.description)}`,
  ];

  return lines.join("\n");
}

function resolveDeadlineShortcut(shortcut: string) {
  const today = getLondonCalendarDate();

  if (shortcut === "today") {
    return formatIsoDate(today);
  }

  if (shortcut === "tomorrow") {
    return formatIsoDate(addDays(today, 1));
  }

  if (shortcut === "friday") {
    return formatIsoDate(nextWeekday(today, 5, true));
  }

  if (shortcut === "monday") {
    return formatIsoDate(nextWeekday(today, 1, false));
  }

  return null;
}

// ─── Session + workstream/task helpers ───────────────────────────────────────

async function getSession(
  supabase: SupabaseClient,
  chatId: number,
  notifyIfMissing = true,
): Promise<{ session: TelegramSession; userEmail: string } | null> {
  const { data, error } = await supabase
    .from("telegram_sessions")
    .select(
      "chat_id, user_email, active_ws_id, active_task_id, pending_action, pending_data, updated_at",
    )
    .eq("chat_id", chatId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load telegram session:", error);
  }

  if (!data) {
    if (!notifyIfMissing) {
      return null;
    }

    await tgPost("sendMessage", {
      chat_id: chatId,
      text: "❌ You're not registered. Contact the admin to get access.",
    });
    return null;
  }

  const session = data as TelegramSession;
  return { session, userEmail: session.user_email };
}

async function updateSession(
  supabase: SupabaseClient,
  chatId: number,
  updates: Partial<
    Pick<
      TelegramSession,
      "active_ws_id" | "active_task_id" | "pending_action" | "pending_data"
    >
  >,
) {
  const { error } = await supabase
    .from("telegram_sessions")
    .update(updates)
    .eq("chat_id", chatId);

  if (error) {
    console.error("Failed to update telegram session:", error);
  }
}

async function fetchOwnedWorkstreams(
  supabase: SupabaseClient,
  userEmail: string,
) {
  const { data, error } = await supabase
    .from("workstreams")
    .select("id, title, description, visibility, owner_email")
    .eq("owner_email", userEmail)
    .order("title", { ascending: true });

  if (error) {
    console.error("Failed to fetch owned workstreams:", error);
    return [] as WorkstreamRow[];
  }

  return (data ?? []) as WorkstreamRow[];
}

async function fetchSharedWorkstreams(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("workstreams")
    .select("id, title, description, visibility, owner_email")
    .eq("visibility", "shared")
    .order("title", { ascending: true });

  if (error) {
    console.error("Failed to fetch shared workstreams:", error);
    return [] as WorkstreamRow[];
  }

  return (data ?? []) as WorkstreamRow[];
}

async function fetchAccessibleWorkstreams(
  supabase: SupabaseClient,
  userEmail: string,
) {
  const [owned, shared] = await Promise.all([
    fetchOwnedWorkstreams(supabase, userEmail),
    fetchSharedWorkstreams(supabase),
  ]);

  return uniqueById([...owned, ...shared]).sort(compareTaskTitle);
}

async function fetchWorkstreamsByIds(supabase: SupabaseClient, ids: string[]) {
  if (!ids.length) {
    return [] as WorkstreamRow[];
  }

  const { data, error } = await supabase
    .from("workstreams")
    .select("id, title, description, visibility, owner_email")
    .in("id", ids);

  if (error) {
    console.error("Failed to fetch workstreams by id:", error);
    return [] as WorkstreamRow[];
  }

  return (data ?? []) as WorkstreamRow[];
}

async function fetchWorkstreamById(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("workstreams")
    .select("id, title, description, visibility, owner_email")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch workstream:", error);
    return null;
  }

  return (data as WorkstreamRow | null) ?? null;
}

async function fetchTasksForWorkstreamIds(
  supabase: SupabaseClient,
  workstreamIds: string[],
) {
  if (!workstreamIds.length) {
    return [] as WorkstreamTaskRow[];
  }

  const { data, error } = await supabase
    .from("workstream_tasks")
    .select(
      "id, workstream_id, title, description, priority, status, deadline, created_at, assignee_email, task_type",
    )
    .in("workstream_id", workstreamIds);

  if (error) {
    console.error("Failed to fetch workstream tasks by workstream ids:", error);
    return [] as WorkstreamTaskRow[];
  }

  return (data ?? []) as WorkstreamTaskRow[];
}

async function fetchTasksAssignedToUser(
  supabase: SupabaseClient,
  userEmail: string,
) {
  const { data, error } = await supabase
    .from("workstream_tasks")
    .select(
      "id, workstream_id, title, description, priority, status, deadline, created_at, assignee_email, task_type",
    )
    .eq("assignee_email", userEmail);

  if (error) {
    console.error("Failed to fetch assigned tasks:", error);
    return [] as WorkstreamTaskRow[];
  }

  return (data ?? []) as WorkstreamTaskRow[];
}

async function fetchTaskById(supabase: SupabaseClient, taskId: string) {
  const { data, error } = await supabase
    .from("workstream_tasks")
    .select(
      "id, workstream_id, title, description, priority, status, deadline, created_at, assignee_email, comments, task_type",
    )
    .eq("id", taskId)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch task:", error);
    return null;
  }

  return (data as WorkstreamTaskRow | null) ?? null;
}

async function resolveUserContext(
  supabase: SupabaseClient,
  userEmail: string,
): Promise<TelegramUserContext> {
  const normalizedEmail = userEmail.toLowerCase();
  const fallbackName = normalizedEmail === OWNER_EMAIL
    ? OWNER_NAME
    : formatNameFromEmail(normalizedEmail);

  const { data, error } = await supabase
    .from("user_profiles")
    .select("name")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (error) {
    console.error("Failed to load telegram user profile:", error);
  }

  return {
    email: normalizedEmail,
    name: data?.name ?? fallbackName,
  };
}

async function buildTaskListData(
  supabase: SupabaseClient,
  session: TelegramSession,
): Promise<TaskListData> {
  const workstreamMap = new Map<string, WorkstreamRow>();
  let activeWorkstream: WorkstreamRow | null = null;
  let taskRows: WorkstreamTaskRow[] = [];

  if (session.active_ws_id) {
    activeWorkstream = await fetchWorkstreamById(
      supabase,
      session.active_ws_id,
    );
    if (activeWorkstream) {
      workstreamMap.set(activeWorkstream.id, activeWorkstream);
    }

    taskRows = await fetchTasksForWorkstreamIds(supabase, [
      session.active_ws_id,
    ]);
  } else {
    const ownedWorkstreams = await fetchOwnedWorkstreams(
      supabase,
      session.user_email,
    );
    ownedWorkstreams.forEach((workstream) =>
      workstreamMap.set(workstream.id, workstream)
    );

    const ownedIds = ownedWorkstreams.map((workstream) => workstream.id);
    const [ownedTasks, assignedTasks] = await Promise.all([
      fetchTasksForWorkstreamIds(supabase, ownedIds),
      fetchTasksAssignedToUser(supabase, session.user_email),
    ]);

    taskRows = uniqueById([...ownedTasks, ...assignedTasks]);

    const missingWorkstreamIds = Array.from(
      new Set(
        taskRows
          .map((task) => task.workstream_id)
          .filter((id) => !workstreamMap.has(id)),
      ),
    );

    const missingWorkstreams = await fetchWorkstreamsByIds(
      supabase,
      missingWorkstreamIds,
    );
    missingWorkstreams.forEach((workstream) =>
      workstreamMap.set(workstream.id, workstream)
    );
  }

  const today = getTodayIso();

  const dueToday = taskRows
    .filter((task) => task.deadline === today)
    .sort((a, b) => {
      const deadlineCompare = (a.deadline ?? "").localeCompare(
        b.deadline ?? "",
      );
      if (deadlineCompare !== 0) {
        return deadlineCompare;
      }
      return a.created_at.localeCompare(b.created_at);
    })
    .map((task) => mapTaskListItem(task, workstreamMap));

  const highPriorityOpen = taskRows
    .filter((task) =>
      task.priority === "high" && task.status !== "done" &&
      task.deadline !== today
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((task) => mapTaskListItem(task, workstreamMap));

  return {
    activeWorkstream,
    dueToday,
    highPriorityOpen,
    ordered: [...dueToday, ...highPriorityOpen],
  };
}

async function sendTaskList(
  supabase: SupabaseClient,
  chatId: number,
  session: TelegramSession,
  prefix?: string,
) {
  const taskData = await buildTaskListData(supabase, session);
  const message = formatTasksMessage(taskData);
  const text = prefix ? `${prefix}\n\n${message}` : message;

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    reply_markup: taskNumberKeyboard(taskData.ordered),
  };

  await tgPost("sendMessage", body);
}

async function fetchTaskDetail(
  supabase: SupabaseClient,
  taskId: string,
): Promise<TaskDetail | null> {
  const task = await fetchTaskById(supabase, taskId);
  if (!task) {
    return null;
  }

  const workstream = await fetchWorkstreamById(supabase, task.workstream_id);
  return {
    id: task.id,
    title: task.title,
    priority: task.priority,
    status: task.status,
    deadline: task.deadline,
    assigneeEmail: task.assignee_email,
    description: task.description ?? null,
    workstreamTitle: workstream?.title ?? "Unknown workstream",
  };
}

async function sendAllWorkstreamList(
  supabase: SupabaseClient,
  chatId: number,
  userEmail: string,
) {
  const workstreams = await fetchAccessibleWorkstreams(supabase, userEmail);

  if (!workstreams.length) {
    await tgPost("sendMessage", {
      chat_id: chatId,
      text: "📋 Browse all tasks\n\nNo workstreams found yet.",
    });
    return;
  }

  await tgPost("sendMessage", {
    chat_id: chatId,
    text: formatAllWorkstreamsMessage(workstreams),
    reply_markup: workstreamKeyboard(workstreams, "at"),
  });
}

async function sendAllTasksForWorkstream(
  supabase: SupabaseClient,
  chatId: number,
  workstreamId: string,
) {
  const workstream = await fetchWorkstreamById(supabase, workstreamId);
  if (!workstream) {
    await tgPost("sendMessage", {
      chat_id: chatId,
      text: "❌ Workstream not found.",
    });
    return;
  }

  const taskRows = await fetchTasksForWorkstreamIds(supabase, [workstreamId]);
  const allTasksView = formatAllTasksMessage(workstream, taskRows);

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text: allTasksView.message,
  };

  if (allTasksView.visibleTasks.length) {
    body.reply_markup = allTaskKeyboard(allTasksView.visibleTasks);
  }

  await tgPost("sendMessage", body);
  await tgPost("sendMessage", {
    chat_id: chatId,
    text: formatWorkstreamDetail(workstream, taskRows),
    reply_markup: workstreamDetailKeyboard(workstream.id),
  });
}

async function sendFullTaskDetail(
  supabase: SupabaseClient,
  chatId: number,
  taskId: string,
) {
  const task = await fetchTaskDetail(supabase, taskId);
  if (!task) {
    await tgPost("sendMessage", {
      chat_id: chatId,
      text: "❌ Task not found.",
    });
    return;
  }

  await tgPost("sendMessage", {
    chat_id: chatId,
    text: formatTaskDetail(task),
    reply_markup: FULL_TASK_ACTION_KEYBOARD,
  });
}

async function updateActiveTaskAndReshow(
  supabase: SupabaseClient,
  chatId: number,
  messageId: number,
  session: TelegramSession,
  updates: Partial<Pick<WorkstreamTaskRow, "status" | "priority" | "deadline">>,
) {
  if (!session.active_task_id) {
    await tgPost("sendMessage", {
      chat_id: chatId,
      text: "No active task. Pick a task first.",
    });
    return;
  }

  const { error } = await supabase
    .from("workstream_tasks")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.active_task_id);

  if (error) {
    console.error("Failed to update task:", error);
    await tgPost("sendMessage", {
      chat_id: chatId,
      text: "❌ Couldn't update that task. Try again.",
    });
    return;
  }

  await updateSession(supabase, chatId, { pending_action: null });
  await tgPost("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text: "✅ Updated.",
  });
  await sendFullTaskDetail(supabase, chatId, session.active_task_id);
}

async function setPendingTaskAction(
  supabase: SupabaseClient,
  chatId: number,
  session: TelegramSession,
  action: TaskPendingAction,
  prompt: string,
) {
  if (!session.active_task_id) {
    await tgPost("sendMessage", {
      chat_id: chatId,
      text: "No active task. Pick a task first.",
    });
    return;
  }

  await updateSession(supabase, chatId, { pending_action: action });
  await tgPost("sendMessage", {
    chat_id: chatId,
    text: prompt,
  });
}

async function setPendingWorkstreamAction(
  supabase: SupabaseClient,
  chatId: number,
  workstreamId: string,
  action: WorkstreamPendingAction,
  prompt: string,
) {
  const workstream = await fetchWorkstreamById(supabase, workstreamId);
  if (!workstream) {
    await tgPost("sendMessage", {
      chat_id: chatId,
      text: "❌ Workstream not found.",
    });
    return;
  }

  await updateSession(supabase, chatId, {
    active_ws_id: workstreamId,
    active_task_id: null,
    pending_action: action,
  });
  await tgPost("sendMessage", {
    chat_id: chatId,
    text: prompt,
  });
}

async function appendTaskComment(
  supabase: SupabaseClient,
  task: WorkstreamTaskRow,
  userEmail: string,
  commentText: string,
) {
  const existingComments = task.comments ?? [];
  const nextComment: TaskComment = {
    text: commentText,
    author_email: userEmail,
    created_at: new Date().toISOString(),
  };

  return await supabase
    .from("workstream_tasks")
    .update({
      comments: [...existingComments, nextComment],
      updated_at: new Date().toISOString(),
    })
    .eq("id", task.id);
}

function isTaskPendingAction(action: PendingAction): action is TaskPendingAction {
  return action === "edit_title" || action === "add_comment" ||
    action === "edit_task_desc" || action === "set_task_assignee";
}

function isWorkstreamPendingAction(
  action: PendingAction,
): action is WorkstreamPendingAction {
  return action === "edit_ws_title" || action === "edit_ws_description";
}

function isLlmPendingAction(action: PendingAction): boolean {
  return action === "llm_task_confirm" || action === "llm_task_ws_pick";
}

// ─── LLM helpers ─────────────────────────────────────────────────────────────

type LlmTaskParseResult = {
  is_task: boolean;
  title: string;
  priority: "high" | "medium" | "low" | null;
  deadline_shortcut: "today" | "tomorrow" | "friday" | "monday" | null;
  workstream_hint: string | null;
};

async function tryParseTaskIntent(
  text: string,
): Promise<LlmTaskParseResult | null> {
  const systemPrompt =
    `${PM_ORG_CONTEXT} ` +
    `You are a task parser. Extract structured data from natural language. ` +
    `Return JSON only, no explanation: ` +
    `{ "is_task": boolean, "title": string, "priority": "high"|"medium"|"low"|null, ` +
    `"deadline_shortcut": "today"|"tomorrow"|"friday"|"monday"|null, "workstream_hint": string|null }`;

  const raw = await ollamaChatComplete(
    // Wrap in quotes to prevent prompt injection
    `Parse this message: "${text.replace(/"/g, '\\"')}"`,
    systemPrompt,
    6000,
  );
  if (!raw) return null;

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]) as LlmTaskParseResult;
    if (typeof parsed.is_task !== "boolean" || typeof parsed.title !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

type LlmRouteResult = {
  destination: "workstream_task" | "todo" | "project" | "park" | "archive";
  workstream_name: string | null;
};

async function suggestBrainDumpRoute(
  text: string,
  workstreamTitles: string[],
): Promise<LlmRouteResult | null> {
  const systemPrompt =
    `${PM_ORG_CONTEXT} ` +
    `Route this brain dump to the most relevant workstream. Available workstreams: ${workstreamTitles.join(", ")}. ` +
    `Return JSON only: { "destination": "workstream_task"|"todo"|"project"|"park"|"archive", ` +
    `"workstream_name": string|null }`;

  const raw = await ollamaChatComplete(
    `Brain dump: "${text.replace(/"/g, '\\"')}"`,
    systemPrompt,
    5000,
  );
  if (!raw) return null;

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]) as LlmRouteResult;
    if (typeof parsed.destination !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

async function fetchSummaryTasks(
  supabase: SupabaseClient,
  workstreamId: string,
): Promise<WorkstreamTaskRow[]> {
  const { data, error } = await supabase
    .from("workstream_tasks")
    .select("id, workstream_id, title, priority, status, deadline, created_at, assignee_email")
    .eq("workstream_id", workstreamId)
    .neq("status", "done")
    .order("priority", { ascending: false })
    .limit(30);

  if (error) {
    console.error("Failed to fetch summary tasks:", error);
    return [];
  }
  return (data ?? []) as WorkstreamTaskRow[];
}

async function handlePendingReply(
  supabase: SupabaseClient,
  chatId: number,
  session: TelegramSession,
  text: string,
) {
  if (!session.pending_action) {
    return false;
  }

  // LLM confirm/pick actions are handled via inline keyboard callbacks, not text replies.
  // If the user types text while one is pending, clear it and fall through to brain dump.
  if (isLlmPendingAction(session.pending_action)) {
    await updateSession(supabase, chatId, { pending_action: null, pending_data: null });
    return false;
  }

  const trimmedText = text.trim();
  if (!trimmedText) {
    await tgPost("sendMessage", {
      chat_id: chatId,
      text: "Reply text can't be empty.",
    });
    return true;
  }

  if (isWorkstreamPendingAction(session.pending_action)) {
    if (!session.active_ws_id) {
      await updateSession(supabase, chatId, {
        active_ws_id: null,
        pending_action: null,
      });
      await tgPost("sendMessage", {
        chat_id: chatId,
        text: "❌ Active workstream not found. Pick a workstream again.",
      });
      return true;
    }

    const workstream = await fetchWorkstreamById(supabase, session.active_ws_id);
    if (!workstream) {
      await updateSession(supabase, chatId, {
        active_ws_id: null,
        pending_action: null,
      });
      await tgPost("sendMessage", {
        chat_id: chatId,
        text: "❌ Active workstream not found. Pick a workstream again.",
      });
      return true;
    }

    const workstreamUpdates = session.pending_action === "edit_ws_title"
      ? { title: trimmedText }
      : { description: trimmedText };
    const nextWorkstream: WorkstreamRow = session.pending_action ===
        "edit_ws_title"
      ? { ...workstream, title: trimmedText }
      : { ...workstream, description: trimmedText };
    const { error } = await supabase
      .from("workstreams")
      .update(workstreamUpdates)
      .eq("id", workstream.id);

    if (error) {
      console.error("Failed to update workstream:", error);
      await tgPost("sendMessage", {
        chat_id: chatId,
        text: "❌ Couldn't update that workstream. Try again.",
      });
      return true;
    }

    await updateSession(supabase, chatId, { pending_action: null });
    await tgPost("sendMessage", {
      chat_id: chatId,
      text: session.pending_action === "edit_ws_title"
        ? `✅ Renamed to: ${trimmedText}`
        : "✅ Description updated",
    });

    const taskRows = await fetchTasksForWorkstreamIds(supabase, [workstream.id]);
    await tgPost("sendMessage", {
      chat_id: chatId,
      text: formatWorkstreamDetail(nextWorkstream, taskRows),
      reply_markup: workstreamDetailKeyboard(workstream.id),
    });
    return true;
  }

  if (!isTaskPendingAction(session.pending_action) || !session.active_task_id) {
    await updateSession(supabase, chatId, {
      active_task_id: null,
      pending_action: null,
    });
    await tgPost("sendMessage", {
      chat_id: chatId,
      text: "❌ Active task not found. Pick a task again.",
    });
    return true;
  }

  const task = await fetchTaskById(supabase, session.active_task_id);
  if (!task) {
    await updateSession(supabase, chatId, {
      active_task_id: null,
      pending_action: null,
    });
    await tgPost("sendMessage", {
      chat_id: chatId,
      text: "❌ Active task not found. Pick a task again.",
    });
    return true;
  }

  if (session.pending_action === "edit_title") {
    const { error } = await supabase
      .from("workstream_tasks")
      .update({
        title: trimmedText,
        updated_at: new Date().toISOString(),
      })
      .eq("id", task.id);

    if (error) {
      console.error("Failed to update task title:", error);
      await tgPost("sendMessage", {
        chat_id: chatId,
        text: "❌ Couldn't update that title. Try again.",
      });
      return true;
    }

    await updateSession(supabase, chatId, { pending_action: null });
    await tgPost("sendMessage", {
      chat_id: chatId,
      text: "✅ Title updated.",
    });
    await sendFullTaskDetail(supabase, chatId, task.id);
    return true;
  }

  if (session.pending_action === "edit_task_desc") {
    const { error } = await supabase
      .from("workstream_tasks")
      .update({
        description: trimmedText,
        updated_at: new Date().toISOString(),
      })
      .eq("id", task.id);

    if (error) {
      console.error("Failed to update task description:", error);
      await tgPost("sendMessage", {
        chat_id: chatId,
        text: "❌ Couldn't update that description. Try again.",
      });
      return true;
    }

    await updateSession(supabase, chatId, { pending_action: null });
    await tgPost("sendMessage", {
      chat_id: chatId,
      text: "✅ Description updated",
    });
    await sendFullTaskDetail(supabase, chatId, task.id);
    return true;
  }

  if (session.pending_action === "set_task_assignee") {
    const { error } = await supabase
      .from("workstream_tasks")
      .update({
        assignee_email: trimmedText,
        updated_at: new Date().toISOString(),
      })
      .eq("id", task.id);

    if (error) {
      console.error("Failed to update task assignee:", error);
      await tgPost("sendMessage", {
        chat_id: chatId,
        text: "❌ Couldn't update that assignee. Try again.",
      });
      return true;
    }

    await updateSession(supabase, chatId, { pending_action: null });
    await tgPost("sendMessage", {
      chat_id: chatId,
      text: `✅ Assignee set to: ${trimmedText}`,
    });
    await sendFullTaskDetail(supabase, chatId, task.id);
    return true;
  }

  const { error } = await appendTaskComment(
    supabase,
    task,
    session.user_email,
    trimmedText,
  );

  if (error) {
    console.error("Failed to add task comment:", error);
    await tgPost("sendMessage", {
      chat_id: chatId,
      text: "❌ Couldn't add comment. Try again.",
    });
    return true;
  }

  await updateSession(supabase, chatId, { pending_action: null });
  await tgPost("sendMessage", {
    chat_id: chatId,
    text: "💬 Comment added.",
  });
  await sendFullTaskDetail(supabase, chatId, task.id);
  return true;
}

async function markActiveTaskDone(
  supabase: SupabaseClient,
  chatId: number,
  session: TelegramSession,
) {
  if (!session.active_task_id) {
    await tgPost("sendMessage", {
      chat_id: chatId,
      text: "No active task. Use /tasks to pick one.",
    });
    return;
  }

  const { error: taskError } = await supabase
    .from("workstream_tasks")
    .update({ status: "done", updated_at: new Date().toISOString() })
    .eq("id", session.active_task_id);

  if (taskError) {
    console.error("Failed to mark task done:", taskError);
    await tgPost("sendMessage", {
      chat_id: chatId,
      text: "❌ Couldn't update that task. Try again.",
    });
    return;
  }

  await updateSession(supabase, chatId, {
    active_task_id: null,
    pending_action: null,
  });
  await tgPost("sendMessage", {
    chat_id: chatId,
    text: "✅ Done! Task marked complete.",
  });
}

async function markActiveTaskInProgress(
  supabase: SupabaseClient,
  chatId: number,
  session: TelegramSession,
) {
  if (!session.active_task_id) {
    await tgPost("sendMessage", {
      chat_id: chatId,
      text: "No active task. Use /tasks to pick one.",
    });
    return;
  }

  const { error } = await supabase
    .from("workstream_tasks")
    .update({ status: "in_progress", updated_at: new Date().toISOString() })
    .eq("id", session.active_task_id);

  if (error) {
    console.error("Failed to mark task in progress:", error);
    await tgPost("sendMessage", {
      chat_id: chatId,
      text: "❌ Couldn't update that task. Try again.",
    });
    return;
  }

  await updateSession(supabase, chatId, { pending_action: null });
  await tgPost("sendMessage", {
    chat_id: chatId,
    text: "▶️ Task marked in progress.",
  });
}

async function addTaskToActiveWorkstream(
  supabase: SupabaseClient,
  chatId: number,
  session: TelegramSession,
  title: string,
) {
  if (!session.active_ws_id) {
    await tgPost("sendMessage", {
      chat_id: chatId,
      text: "No active workstream. Use /ws to pick one first.",
    });
    return;
  }

  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    await tgPost("sendMessage", {
      chat_id: chatId,
      text: "Usage: /add <task title>",
    });
    return;
  }

  const workstream = await fetchWorkstreamById(supabase, session.active_ws_id);
  if (!workstream) {
    await tgPost("sendMessage", {
      chat_id: chatId,
      text: "❌ Couldn't create that task. Try again.",
    });
    return;
  }

  const { error } = await supabase
    .from("workstream_tasks")
    .insert({
      workstream_id: session.active_ws_id,
      title: trimmedTitle,
      priority: "medium",
      status: "open",
      tags: [],
      comments: [],
      attachments: [],
    });

  if (error) {
    console.error("Failed to create workstream task:", error);
    await tgPost("sendMessage", {
      chat_id: chatId,
      text: "❌ Couldn't create that task. Try again.",
    });
    return;
  }

  await tgPost("sendMessage", {
    chat_id: chatId,
    text: `✅ Task added to ${workstream.title}:\n"${trimmedTitle}"`,
  });
}

async function addCommentToActiveTask(
  supabase: SupabaseClient,
  chatId: number,
  session: TelegramSession,
  commentText: string,
) {
  if (!session.active_task_id) {
    await tgPost("sendMessage", {
      chat_id: chatId,
      text: "No active task. Use /tasks to pick one first.",
    });
    return;
  }

  const trimmedCommentText = commentText.trim();
  if (!trimmedCommentText) {
    await tgPost("sendMessage", {
      chat_id: chatId,
      text: "Usage: /comment <text>",
    });
    return;
  }

  const task = await fetchTaskById(supabase, session.active_task_id);
  if (!task) {
    await tgPost("sendMessage", {
      chat_id: chatId,
      text: "❌ Active task not found. Use /tasks to pick one.",
    });
    return;
  }

  const { error } = await appendTaskComment(
    supabase,
    task,
    session.user_email,
    trimmedCommentText,
  );

  if (error) {
    console.error("Failed to add task comment:", error);
    await tgPost("sendMessage", {
      chat_id: chatId,
      text: "❌ Couldn't add comment. Try again.",
    });
    return;
  }

  await tgPost("sendMessage", {
    chat_id: chatId,
    text: `💬 Comment added to:\n"${task.title}"`,
  });
}

// ─── Routing actions ──────────────────────────────────────────────────────────

async function handleRoute(
  supabase: SupabaseClient,
  dump: { id: string; content: string },
  destination: string,
  userContext: TelegramUserContext,
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
      owner: [userContext.name],
      owner_email: [userContext.email],
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
      owner: [userContext.name],
      owner_email: [userContext.email],
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
      owner: userContext.name,
      owner_email: userContext.email,
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
      user_email: userContext.email,
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
      owner_email: userContext.email,
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

// ─── Self-register webhook on cold start ──────────────────────────────────────
// Top-level await blocks module init until webhook is set, so every cold start
// (i.e. every deploy) automatically re-registers without manual steps.
await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    url: `${SUPABASE_URL}/functions/v1/telegram-bot`,
    secret_token: WEBHOOK_SECRET,
    allowed_updates: ["message", "callback_query"],
  }),
}).catch(() => {/* non-fatal */});

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  // Diagnostic GET endpoint: ?action=webhook_info or ?action=register_webhook
  if (req.method === "GET") {
    if (req.headers.get("x-cron-secret") !== Deno.env.get("CRON_SECRET")) {
      return new Response("Unauthorized", { status: 401 });
    }
    const action = new URL(req.url).searchParams.get("action");
    if (action === "webhook_info") {
      const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
      const info = await r.json();
      // Include first 8 chars of env secret for debugging
      info._env_secret_prefix = WEBHOOK_SECRET?.slice(0, 8) ?? "NOT_SET";
      return new Response(JSON.stringify(info), { headers: { "Content-Type": "application/json" } });
    }
    if (action === "register_webhook") {
      const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: `${SUPABASE_URL}/functions/v1/telegram-bot`,
          secret_token: WEBHOOK_SECRET,
          allowed_updates: ["message", "callback_query"],
        }),
      });
      return new Response(await r.text(), { headers: { "Content-Type": "application/json" } });
    }
    if (action === "reset_webhook") {
      // Delete webhook (drops pending updates), then re-register fresh
      const del = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook?drop_pending_updates=true`);
      const delResult = await del.json();
      const reg = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: `${SUPABASE_URL}/functions/v1/telegram-bot`,
          secret_token: WEBHOOK_SECRET,
          allowed_updates: ["message", "callback_query"],
        }),
      });
      const regResult = await reg.json();
      return new Response(JSON.stringify({ delete: delResult, register: regResult }), { headers: { "Content-Type": "application/json" } });
    }
    return new Response("ok");
  }

  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const update = await req.json();
  const supabase = createSupabaseAdminClient();

  // ── Incoming message → command handling or existing brain dump flow ──────
  if (update.message?.text) {
    const msg = update.message;
    const chatId: number = msg.chat.id;
    const text: string = msg.text.trim();

    if (text.startsWith("/")) {
      const command = text.split(/\s+/)[0].toLowerCase().split("@")[0];
      const commandArgs = text.replace(/^\/\S+/, "").trim();

      if (command === "/help") {
        await tgPost("sendMessage", { chat_id: chatId, text: HELP_TEXT });
        return new Response("ok");
      }

      if (command === "/all") {
        const sessionInfo = await getSession(supabase, chatId);
        if (!sessionInfo) {
          return new Response("ok");
        }

        await sendAllWorkstreamList(supabase, chatId, sessionInfo.userEmail);
        return new Response("ok");
      }

      if (command === "/ws") {
        const sessionInfo = await getSession(supabase, chatId);
        if (!sessionInfo) {
          return new Response("ok");
        }

        const workstreams = await fetchAccessibleWorkstreams(
          supabase,
          sessionInfo.userEmail,
        );
        if (!workstreams.length) {
          await tgPost("sendMessage", {
            chat_id: chatId,
            text: "🗂 Your workstreams:\n\nNo workstreams found yet.",
          });
          return new Response("ok");
        }

        await tgPost("sendMessage", {
          chat_id: chatId,
          text: formatWorkstreamsMessage(workstreams),
          reply_markup: workstreamKeyboard(workstreams),
        });
        return new Response("ok");
      }

      if (command === "/tasks") {
        const sessionInfo = await getSession(supabase, chatId);
        if (!sessionInfo) {
          return new Response("ok");
        }

        await sendTaskList(supabase, chatId, sessionInfo.session);
        return new Response("ok");
      }

      if (command === "/done") {
        const sessionInfo = await getSession(supabase, chatId);
        if (!sessionInfo) {
          return new Response("ok");
        }

        await markActiveTaskDone(supabase, chatId, sessionInfo.session);
        return new Response("ok");
      }

      if (command === "/add") {
        const sessionInfo = await getSession(supabase, chatId);
        if (!sessionInfo) {
          return new Response("ok");
        }

        await addTaskToActiveWorkstream(
          supabase,
          chatId,
          sessionInfo.session,
          commandArgs,
        );
        return new Response("ok");
      }

      if (command === "/comment") {
        const sessionInfo = await getSession(supabase, chatId);
        if (!sessionInfo) {
          return new Response("ok");
        }

        await addCommentToActiveTask(
          supabase,
          chatId,
          sessionInfo.session,
          commandArgs,
        );
        return new Response("ok");
      }

      if (command === "/clear") {
        const sessionInfo = await getSession(supabase, chatId);
        if (!sessionInfo) {
          return new Response("ok");
        }

        await updateSession(supabase, chatId, {
          active_ws_id: null,
          active_task_id: null,
          pending_action: null,
        });

        await tgPost("sendMessage", {
          chat_id: chatId,
          text: "🔄 Cleared. No active workstream or task.",
        });
        return new Response("ok");
      }

      if (command === "/summary") {
        const sessionInfo = await getSession(supabase, chatId);
        if (!sessionInfo) return new Response("ok");

        // Find workstream: command arg > active session > error
        let targetWs: WorkstreamRow | null = null;
        if (commandArgs.trim()) {
          const hint = commandArgs.trim().toLowerCase();
          const accessible = await fetchAccessibleWorkstreams(
            supabase,
            sessionInfo.userEmail,
          );
          targetWs = accessible.find((ws) =>
            ws.title.toLowerCase().includes(hint)
          ) ?? null;
          if (!targetWs) {
            await tgPost("sendMessage", {
              chat_id: chatId,
              text: `❌ No workstream matching "${commandArgs.trim()}".`,
            });
            return new Response("ok");
          }
        } else if (sessionInfo.session.active_ws_id) {
          targetWs = await fetchWorkstreamById(
            supabase,
            sessionInfo.session.active_ws_id,
          );
        }

        if (!targetWs) {
          await tgPost("sendMessage", {
            chat_id: chatId,
            text: "No active workstream. Use /ws to pick one, or: /summary <name>",
          });
          return new Response("ok");
        }

        const tasks = await fetchSummaryTasks(supabase, targetWs.id);
        if (tasks.length === 0) {
          await tgPost("sendMessage", {
            chat_id: chatId,
            text: `✅ *${targetWs.title}* — no open tasks.`,
            parse_mode: "Markdown",
          });
          return new Response("ok");
        }

        const taskLines = tasks
          .map((t) =>
            `[${t.priority}/${t.status}] ${t.title}${t.deadline ? ` (due ${t.deadline})` : ""}`
          )
          .join("\n");

        await tgPost("sendMessage", {
          chat_id: chatId,
          text: `⏳ Summarising *${targetWs.title}*…`,
          parse_mode: "Markdown",
        });

        const summary = await ollamaChatComplete(
          `Workstream: ${targetWs.title}\nTasks:\n${taskLines}`,
          `${PM_ORG_CONTEXT} Summarise this workstream in 3 sentences. Focus on blockers, in-progress work, and what's overdue. Be direct and concise. Use PM framing where relevant.`,
          10000,
        );

        if (!summary) {
          await tgPost("sendMessage", {
            chat_id: chatId,
            text: "Summary unavailable — Ollama relay is offline.",
          });
          return new Response("ok");
        }

        await tgPost("sendMessage", {
          chat_id: chatId,
          text: `📋 *${targetWs.title}*\n\n${summary}`,
          parse_mode: "Markdown",
        });
        return new Response("ok");
      }

      if (command === "/ask") {
        if (!commandArgs.trim()) {
          await tgPost("sendMessage", {
            chat_id: chatId,
            text: "Usage: /ask <question>\n\nExamples:\n• /ask what messaging do we avoid?\n• /ask who are our main audiences?\n• /ask how do we frame reproductive rights?",
          });
          return new Response("ok");
        }

        await tgPost("sendMessage", { chat_id: chatId, text: "🔍 Thinking…" });

        const answer = await ollamaChatComplete(
          commandArgs.trim(),
          `${PM_ORG_CONTEXT} Answer questions about Population Matters concisely and accurately. ` +
            `Draw on your knowledge of PM's mission, audiences, messaging rules, and work areas. ` +
            `If the question is outside PM context, bring it back to how it relates to PM's work. ` +
            `Keep answers to 3–5 sentences unless a list is clearly more useful.`,
          12000,
        );

        if (!answer) {
          await tgPost("sendMessage", {
            chat_id: chatId,
            text: "Answer unavailable — Ollama relay is offline.",
          });
          return new Response("ok");
        }

        await tgPost("sendMessage", {
          chat_id: chatId,
          text: `💬 ${answer}`,
        });
        return new Response("ok");
      }

      if (command === "/draft") {
        if (!commandArgs.trim()) {
          await tgPost("sendMessage", {
            chat_id: chatId,
            text: "Usage: /draft <brief>\n\nExamples:\n• /draft tweet about new research on family planning access in Niger\n• /draft email subject line for year-end appeal\n• /draft 2-sentence intro for donor update",
          });
          return new Response("ok");
        }

        await tgPost("sendMessage", { chat_id: chatId, text: "✍️ Drafting…" });

        const draft = await ollamaChatComplete(
          `Brief: ${commandArgs.trim()}`,
          `${PM_ORG_CONTEXT} You are a copywriter for Population Matters. ` +
            `Write copy that is warm, rights-centred, and human-led. ` +
            `Lead with a named individual or specific outcome where possible. ` +
            `Use reproductive rights framing throughout. Never use population control language. ` +
            `Match the format requested in the brief (tweet, email, headline, etc.). ` +
            `Output only the draft copy — no commentary, no alternatives unless asked.`,
          12000,
        );

        if (!draft) {
          await tgPost("sendMessage", {
            chat_id: chatId,
            text: "Draft unavailable — Ollama relay is offline.",
          });
          return new Response("ok");
        }

        await tgPost("sendMessage", {
          chat_id: chatId,
          text: `✏️ *Draft*\n\n${draft}`,
          parse_mode: "Markdown",
        });
        return new Response("ok");
      }

      await tgPost("sendMessage", {
        chat_id: chatId,
        text:
          "Use /help to see commands, or send any text to capture a brain dump.",
      });
      return new Response("ok");
    }

    const sessionInfo = await getSession(supabase, chatId, false);
    if (sessionInfo) {
      const handledPendingReply = await handlePendingReply(
        supabase,
        chatId,
        sessionInfo.session,
        text,
      );
      if (handledPendingReply) {
        return new Response("ok");
      }
    }

    // ── LLM: try to parse as task intent ────────────────────────────────────
    if (sessionInfo) {
      const taskIntent = await tryParseTaskIntent(text);

      if (taskIntent?.is_task) {
        const workstreams = await fetchAccessibleWorkstreams(
          supabase,
          sessionInfo.userEmail,
        );

        // Try to match workstream hint
        const hint = taskIntent.workstream_hint?.toLowerCase() ?? "";
        const matchedWs = hint
          ? (workstreams.find((ws) =>
            ws.title.toLowerCase().includes(hint)
          ) ?? null)
          : null;

        const pendingData: LlmTaskPendingData = {
          title: taskIntent.title,
          priority: taskIntent.priority,
          deadline_shortcut: taskIntent.deadline_shortcut,
          workstream_id: matchedWs?.id ?? null,
          workstream_title: matchedWs?.title ?? null,
          original_text: text,
        };

        await updateSession(supabase, chatId, {
          pending_action: "llm_task_confirm",
          pending_data: pendingData,
        });

        const wsLabel = matchedWs
          ? `*${matchedWs.title}*`
          : "_(pick workstream)_";
        const priorityLabel = taskIntent.priority
          ? ` · ${taskIntent.priority} priority`
          : "";
        const deadlineLabel = taskIntent.deadline_shortcut
          ? ` · due ${taskIntent.deadline_shortcut}`
          : "";

        await tgPost("sendMessage", {
          chat_id: chatId,
          text:
            `📋 Add task to ${wsLabel}?\n"${taskIntent.title}"${priorityLabel}${deadlineLabel}`,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[
              { text: "✅ Yes, create", callback_data: "llm:yes" },
              {
                text: matchedWs ? "🔄 Different WS" : "📂 Pick workstream",
                callback_data: "llm:diff",
              },
              { text: "💡 Brain dump instead", callback_data: "llm:dump" },
            ]],
          },
        });
        return new Response("ok");
      }

      // ── LLM: suggest routing for brain dump ─────────────────────────────
      const workstreams = await fetchAccessibleWorkstreams(
        supabase,
        sessionInfo.userEmail,
      );
      const wsTitles = workstreams.map((ws) => ws.title);
      const routeSuggestion = wsTitles.length > 0
        ? await suggestBrainDumpRoute(text, wsTitles)
        : null;

      if (
        routeSuggestion?.destination === "workstream_task" &&
        routeSuggestion.workstream_name
      ) {
        const suggestedWs = workstreams.find((ws) =>
          ws.title.toLowerCase().includes(
            routeSuggestion.workstream_name!.toLowerCase(),
          )
        ) ?? null;

        if (suggestedWs) {
          // Insert dump then offer quick route
          const { data: dump, error: dumpErr } = await supabase
            .from("brain_dumps")
            .insert({
              content: text,
              source: "telegram",
              status: "pending",
              maturity: "raw",
              tags: [],
            })
            .select("id")
            .single();

          if (!dumpErr && dump) {
            const sent = await tgPost("sendMessage", {
              chat_id: chatId,
              text:
                `💡 Looks like a task for *${suggestedWs.title}*:\n"${preview(text)}"\n\nRoute there?`,
              parse_mode: "Markdown",
              reply_markup: {
                inline_keyboard: [[
                  {
                    text: `✅ Add to ${suggestedWs.title}`,
                    callback_data: `ws:${suggestedWs.id}`,
                  },
                  { text: "📂 Pick different", callback_data: "all:list" },
                ]],
              },
            });

            if (sent.ok) {
              await supabase.from("brain_dumps").update({
                telegram_chat_id: chatId,
                telegram_message_id: sent.result.message_id,
              }).eq("id", dump.id);
            }
          }
          return new Response("ok");
        }
      }
    }

    const { data: dump, error } = await supabase.from("brain_dumps").insert({
      content: text,
      source: "telegram",
      status: "pending",
      maturity: "raw",
      tags: [],
    }).select("id").single();

    if (error || !dump) {
      console.error("Failed to store brain dump:", error);
      await tgPost("sendMessage", {
        chat_id: chatId,
        text: "❌ Failed to save. Try again.",
      });
      return new Response("ok");
    }

    const sent = await tgPost("sendMessage", {
      chat_id: chatId,
      text: `💡 Got it:\n"${preview(text)}"\n\nWhere should this go?`,
      reply_markup: routingKeyboard(),
    });

    if (sent.ok) {
      await supabase.from("brain_dumps").update({
        telegram_chat_id: chatId,
        telegram_message_id: sent.result.message_id,
      }).eq("id", dump.id);
    }

    return new Response("ok");
  }

  // ── Callback query → new task/session callbacks, then legacy routing ─────
  if (update.callback_query) {
    const cb = update.callback_query;
    const data: string = cb.data ?? "";
    const chatId = cb.message?.chat?.id;
    const messageId = cb.message?.message_id;
    const callbackQueryId = cb.id;

    if (typeof chatId !== "number" || typeof messageId !== "number") {
      return new Response("ok");
    }

    const isDigestDeadlineCallback = data.startsWith("td:") &&
      data !== "td:done" &&
      data !== "td:in_progress" &&
      data !== "td:deadline";

    if (isDigestDeadlineCallback) {
      const taskId = data.slice(3);
      const todayIso = new Date().toISOString().slice(0, 10);
      const { error } = await supabase
        .from("workstream_tasks")
        .update({ deadline: todayIso, updated_at: new Date().toISOString() })
        .eq("id", taskId);

      const task = !error ? await fetchTaskById(supabase, taskId) : null;
      const title = task?.title ?? "Task";

      await tgPost("answerCallbackQuery", {
        callback_query_id: callbackQueryId,
        text: error ? "❌ Failed to update" : "✅ Scheduled for today",
      });
      await tgPost("sendMessage", {
        chat_id: chatId,
        text: error
          ? "❌ Failed to update deadline."
          : `✅ *${title}* scheduled for today.`,
        parse_mode: "Markdown",
      });
      return new Response("ok");
    }

    await tgPost("answerCallbackQuery", { callback_query_id: callbackQueryId });

    // ── LLM task confirm callbacks ────────────────────────────────────────
    if (data === "llm:yes" || data === "llm:diff" || data === "llm:dump") {
      const sessionInfo = await getSession(supabase, chatId);
      if (!sessionInfo) return new Response("ok");

      const pd = sessionInfo.session.pending_data;

      if (data === "llm:dump" || !pd) {
        // Clear LLM state and fall through to regular brain dump routing
        await updateSession(supabase, chatId, {
          pending_action: null,
          pending_data: null,
        });

        if (pd?.original_text) {
          const { data: dump, error } = await supabase
            .from("brain_dumps")
            .insert({
              content: pd.original_text,
              source: "telegram",
              status: "pending",
              maturity: "raw",
              tags: [],
            })
            .select("id")
            .single();

          if (!error && dump) {
            const sent = await tgPost("sendMessage", {
              chat_id: chatId,
              text: `💡 Got it:\n"${preview(pd.original_text)}"\n\nWhere should this go?`,
              reply_markup: routingKeyboard(),
            });
            if (sent.ok) {
              await supabase.from("brain_dumps").update({
                telegram_chat_id: chatId,
                telegram_message_id: sent.result.message_id,
              }).eq("id", dump.id);
            }
          }
        }
        return new Response("ok");
      }

      if (data === "llm:diff") {
        // Show workstream picker — pending_data stays so ws: callback can use it
        await updateSession(supabase, chatId, {
          pending_action: "llm_task_ws_pick",
        });
        await sendAllWorkstreamList(supabase, chatId, sessionInfo.userEmail);
        return new Response("ok");
      }

      if (data === "llm:yes") {
        // Resolve workstream — must be set
        const wsId = pd.workstream_id;
        if (!wsId) {
          await updateSession(supabase, chatId, {
            pending_action: "llm_task_ws_pick",
          });
          await sendAllWorkstreamList(supabase, chatId, sessionInfo.userEmail);
          return new Response("ok");
        }

        const deadline = pd.deadline_shortcut
          ? resolveDeadlineShortcut(pd.deadline_shortcut)
          : null;
        const { error } = await supabase.from("workstream_tasks").insert({
          workstream_id: wsId,
          title: pd.title,
          priority: pd.priority ?? "medium",
          status: "open",
          deadline,
          tags: [],
          comments: [],
          attachments: [],
        });

        await updateSession(supabase, chatId, {
          pending_action: null,
          pending_data: null,
        });

        if (error) {
          console.error("Failed to create LLM task:", error);
          await tgPost("sendMessage", {
            chat_id: chatId,
            text: "❌ Couldn't create that task. Try again.",
          });
        } else {
          const priorityLabel = pd.priority ? ` · ${pd.priority}` : "";
          const deadlineLabel = deadline ? ` · due ${deadline}` : "";
          await tgPost("sendMessage", {
            chat_id: chatId,
            text: `✅ Task created in *${pd.workstream_title ?? "workstream"}*:\n"${pd.title}"${priorityLabel}${deadlineLabel}`,
            parse_mode: "Markdown",
          });
        }
        return new Response("ok");
      }
    }

    if (data === "all:list") {
      const sessionInfo = await getSession(supabase, chatId);
      if (!sessionInfo) {
        return new Response("ok");
      }

      await sendAllWorkstreamList(supabase, chatId, sessionInfo.userEmail);
      return new Response("ok");
    }

    if (data.startsWith("ws:")) {
      const sessionInfo = await getSession(supabase, chatId);
      if (!sessionInfo) {
        return new Response("ok");
      }

      const workstreamId = data.slice(3);
      const workstream = await fetchWorkstreamById(supabase, workstreamId);
      if (!workstream) {
        await tgPost("sendMessage", {
          chat_id: chatId,
          text: "❌ Workstream not found.",
        });
        return new Response("ok");
      }

      // If we're in LLM task creation mode, create the task in the chosen workstream
      if (sessionInfo.session.pending_action === "llm_task_ws_pick") {
        const pd = sessionInfo.session.pending_data;
        if (pd) {
          const deadline = pd.deadline_shortcut
          ? resolveDeadlineShortcut(pd.deadline_shortcut)
          : null;
          const { error } = await supabase.from("workstream_tasks").insert({
            workstream_id: workstreamId,
            title: pd.title,
            priority: pd.priority ?? "medium",
            status: "open",
            deadline,
            tags: [],
            comments: [],
            attachments: [],
          });

          await updateSession(supabase, chatId, {
            pending_action: null,
            pending_data: null,
          });

          if (error) {
            console.error("Failed to create LLM task (ws pick):", error);
            await tgPost("sendMessage", {
              chat_id: chatId,
              text: "❌ Couldn't create that task. Try again.",
            });
          } else {
            const priorityLabel = pd.priority ? ` · ${pd.priority}` : "";
            const deadlineLabel = deadline ? ` · due ${deadline}` : "";
            await tgPost("sendMessage", {
              chat_id: chatId,
              text:
                `✅ Task created in *${workstream.title}*:\n"${pd.title}"${priorityLabel}${deadlineLabel}`,
              parse_mode: "Markdown",
            });
          }
          return new Response("ok");
        }
      }

      await updateSession(supabase, chatId, {
        active_ws_id: workstreamId,
        active_task_id: null,
        pending_action: null,
      });

      await sendTaskList(supabase, chatId, {
        ...sessionInfo.session,
        active_ws_id: workstreamId,
        active_task_id: null,
        pending_action: null,
      }, `✅ Active workstream: ${workstream.title}`);
      return new Response("ok");
    }

    if (data.startsWith("t:")) {
      const sessionInfo = await getSession(supabase, chatId);
      if (!sessionInfo) {
        return new Response("ok");
      }

      const taskId = data.slice(2);
      const task = await fetchTaskDetail(supabase, taskId);
      if (!task) {
        await tgPost("sendMessage", {
          chat_id: chatId,
          text: "❌ Task not found.",
        });
        return new Response("ok");
      }

      await updateSession(supabase, chatId, {
        active_task_id: taskId,
        pending_action: null,
      });
      await tgPost("sendMessage", {
        chat_id: chatId,
        text: formatTaskDetail(task),
        reply_markup: TASK_ACTION_KEYBOARD,
      });
      return new Response("ok");
    }

    if (data.startsWith("at:")) {
      const sessionInfo = await getSession(supabase, chatId);
      if (!sessionInfo) {
        return new Response("ok");
      }

      const workstreamId = data.slice(3);
      await updateSession(supabase, chatId, {
        active_ws_id: workstreamId,
        active_task_id: null,
        pending_action: null,
      });
      await sendAllTasksForWorkstream(supabase, chatId, workstreamId);
      return new Response("ok");
    }

    if (data.startsWith("wse:")) {
      const sessionInfo = await getSession(supabase, chatId);
      if (!sessionInfo) {
        return new Response("ok");
      }

      const [, action, workstreamId] = data.split(":");
      if (!action || !workstreamId) {
        await tgPost("sendMessage", {
          chat_id: chatId,
          text: "❌ Unknown workstream action.",
        });
        return new Response("ok");
      }

      if (action === "tasks") {
        await updateSession(supabase, chatId, {
          active_ws_id: workstreamId,
          active_task_id: null,
          pending_action: null,
        });
        await sendAllTasksForWorkstream(supabase, chatId, workstreamId);
        return new Response("ok");
      }

      if (action === "title") {
        await setPendingWorkstreamAction(
          supabase,
          chatId,
          workstreamId,
          "edit_ws_title",
          "Reply with new name:",
        );
        return new Response("ok");
      }

      if (action === "desc") {
        await setPendingWorkstreamAction(
          supabase,
          chatId,
          workstreamId,
          "edit_ws_description",
          "Reply with new description:",
        );
        return new Response("ok");
      }

      if (action === "vis") {
        const workstream = await fetchWorkstreamById(supabase, workstreamId);
        if (!workstream) {
          await tgPost("sendMessage", {
            chat_id: chatId,
            text: "❌ Workstream not found.",
          });
          return new Response("ok");
        }

        const nextVisibility = workstream.visibility === "shared"
          ? "personal"
          : "shared";
        const { error } = await supabase
          .from("workstreams")
          .update({ visibility: nextVisibility })
          .eq("id", workstreamId);

        if (error) {
          console.error("Failed to update workstream visibility:", error);
          await tgPost("sendMessage", {
            chat_id: chatId,
            text: "❌ Couldn't update visibility. Try again.",
          });
          return new Response("ok");
        }

        const taskRows = await fetchTasksForWorkstreamIds(supabase, [
          workstreamId,
        ]);
        await updateSession(supabase, chatId, {
          active_ws_id: workstreamId,
          active_task_id: null,
          pending_action: null,
        });
        await tgPost("editMessageText", {
          chat_id: chatId,
          message_id: messageId,
          text: formatWorkstreamDetail(
            {
              ...workstream,
              visibility: nextVisibility,
            },
            taskRows,
          ),
          reply_markup: workstreamDetailKeyboard(workstreamId),
        });
        await tgPost("sendMessage", {
          chat_id: chatId,
          text:
            `Visibility set to ${formatWorkstreamVisibility(nextVisibility)} ✓`,
        });
        return new Response("ok");
      }

      await tgPost("sendMessage", {
        chat_id: chatId,
        text: "❌ Unknown workstream action.",
      });
      return new Response("ok");
    }

    if (data.startsWith("ta:")) {
      const sessionInfo = await getSession(supabase, chatId);
      if (!sessionInfo) {
        return new Response("ok");
      }

      const taskId = data.slice(3);
      const task = await fetchTaskDetail(supabase, taskId);
      if (!task) {
        await tgPost("sendMessage", {
          chat_id: chatId,
          text: "❌ Task not found.",
        });
        return new Response("ok");
      }

      await updateSession(supabase, chatId, {
        active_task_id: taskId,
        pending_action: null,
      });
      await tgPost("sendMessage", {
        chat_id: chatId,
        text: formatTaskDetail(task),
        reply_markup: FULL_TASK_ACTION_KEYBOARD,
      });
      return new Response("ok");
    }

    if (data === "td:done") {
      const sessionInfo = await getSession(supabase, chatId);
      if (!sessionInfo) {
        return new Response("ok");
      }

      await markActiveTaskDone(supabase, chatId, sessionInfo.session);
      return new Response("ok");
    }

    if (data === "td:in_progress") {
      const sessionInfo = await getSession(supabase, chatId);
      if (!sessionInfo) {
        return new Response("ok");
      }

      await markActiveTaskInProgress(supabase, chatId, sessionInfo.session);
      return new Response("ok");
    }

    if (data === "td:deadline") {
      const sessionInfo = await getSession(supabase, chatId);
      if (!sessionInfo) {
        return new Response("ok");
      }

      if (!sessionInfo.session.active_task_id) {
        await tgPost("sendMessage", {
          chat_id: chatId,
          text: "No active task. Use /tasks to pick one.",
        });
        return new Response("ok");
      }

      await tgPost("sendMessage", {
        chat_id: chatId,
        text:
          "📅 Set deadline — choose a shortcut below.",
        reply_markup: DEADLINE_PICKER_KEYBOARD,
      });
      return new Response("ok");
    }

    if (data.startsWith("tas:")) {
      const sessionInfo = await getSession(supabase, chatId);
      if (!sessionInfo) {
        return new Response("ok");
      }

      if (data === "tas:done") {
        await updateActiveTaskAndReshow(
          supabase,
          chatId,
          messageId,
          sessionInfo.session,
          { status: "done" },
        );
        return new Response("ok");
      }

      if (data === "tas:in_progress") {
        await updateActiveTaskAndReshow(
          supabase,
          chatId,
          messageId,
          sessionInfo.session,
          { status: "in_progress" },
        );
        return new Response("ok");
      }

      if (data === "tas:todo") {
        await updateActiveTaskAndReshow(
          supabase,
          chatId,
          messageId,
          sessionInfo.session,
          { status: "open" },
        );
        return new Response("ok");
      }

      if (data === "tas:pri_high") {
        await updateActiveTaskAndReshow(
          supabase,
          chatId,
          messageId,
          sessionInfo.session,
          { priority: "high" },
        );
        return new Response("ok");
      }

      if (data === "tas:pri_medium") {
        await updateActiveTaskAndReshow(
          supabase,
          chatId,
          messageId,
          sessionInfo.session,
          { priority: "medium" },
        );
        return new Response("ok");
      }

      if (data === "tas:pri_low") {
        await updateActiveTaskAndReshow(
          supabase,
          chatId,
          messageId,
          sessionInfo.session,
          { priority: "low" },
        );
        return new Response("ok");
      }

      if (data === "tas:deadline") {
        if (!sessionInfo.session.active_task_id) {
          await tgPost("sendMessage", {
            chat_id: chatId,
            text: "No active task. Pick a task first.",
          });
          return new Response("ok");
        }

        await tgPost("sendMessage", {
          chat_id: chatId,
          text: "📅 Set deadline — choose a shortcut below.",
          reply_markup: DEADLINE_PICKER_KEYBOARD,
        });
        return new Response("ok");
      }

      if (data === "tas:edit_title") {
        await setPendingTaskAction(
          supabase,
          chatId,
          sessionInfo.session,
          "edit_title",
          "Reply with the new title for this task.",
        );
        return new Response("ok");
      }

      if (data === "tas:comment") {
        await setPendingTaskAction(
          supabase,
          chatId,
          sessionInfo.session,
          "add_comment",
          "Reply with the comment to add to this task.",
        );
        return new Response("ok");
      }

      if (data === "tas:edit_desc") {
        await setPendingTaskAction(
          supabase,
          chatId,
          sessionInfo.session,
          "edit_task_desc",
          "Reply with new description:",
        );
        return new Response("ok");
      }

      if (data === "tas:set_assignee") {
        await setPendingTaskAction(
          supabase,
          chatId,
          sessionInfo.session,
          "set_task_assignee",
          "Reply with assignee email:",
        );
        return new Response("ok");
      }
    }

    if (data.startsWith("dl:")) {
      const sessionInfo = await getSession(supabase, chatId);
      if (!sessionInfo) {
        return new Response("ok");
      }

      if (!sessionInfo.session.active_task_id) {
        await tgPost("sendMessage", {
          chat_id: chatId,
          text: "No active task. Use /tasks to pick one.",
        });
        return new Response("ok");
      }

      const deadline = resolveDeadlineShortcut(data.slice(3));
      if (!deadline) {
        await tgPost("sendMessage", {
          chat_id: chatId,
          text: "❌ Unknown deadline option.",
        });
        return new Response("ok");
      }

      const { error } = await supabase
        .from("workstream_tasks")
        .update({ deadline, updated_at: new Date().toISOString() })
        .eq("id", sessionInfo.session.active_task_id);

      if (error) {
        console.error("Failed to set task deadline:", error);
        await tgPost("sendMessage", {
          chat_id: chatId,
          text: "❌ Couldn't set that deadline. Try again.",
        });
        return new Response("ok");
      }

      await updateSession(supabase, chatId, { pending_action: null });
      await tgPost("sendMessage", {
        chat_id: chatId,
        text: `📅 Deadline set for ${formatDisplayDate(deadline)}.`,
      });
      return new Response("ok");
    }

    const { data: dumps } = await supabase
      .from("brain_dumps")
      .select("id, content")
      .eq("telegram_chat_id", chatId)
      .eq("telegram_message_id", messageId)
      .eq("status", "pending")
      .limit(1);

    const dump = dumps?.[0];

    if (data === "r:wst") {
      if (!dump) {
        await tgPost("editMessageText", {
          chat_id: chatId,
          message_id: messageId,
          text: "⚠️ Item already routed or not found.",
        });
        return new Response("ok");
      }

      const sessionInfo = await getSession(supabase, chatId);
      if (!sessionInfo) {
        return new Response("ok");
      }

      const workstreams = (await fetchAccessibleWorkstreams(
        supabase,
        sessionInfo.userEmail,
      )).slice(0, 10);

      if (!workstreams.length) {
        await tgPost("editMessageText", {
          chat_id: chatId,
          message_id: messageId,
          text: `No workstreams found.\n\n"${
            preview(dump.content)
          }"\n\nWhere else?`,
          reply_markup: routingKeyboard(),
        });
        return new Response("ok");
      }

      const wsButtons = workstreams.map((
        workstream: WorkstreamRow,
      ) => [{
        text: workstream.title,
        callback_data: `rw:${workstream.id}`,
      }]);
      wsButtons.push([{ text: "← Back", callback_data: "r:back" }]);

      await tgPost("editMessageText", {
        chat_id: chatId,
        message_id: messageId,
        text: `📋 Pick a workstream for:\n"${preview(dump.content)}"`,
        reply_markup: { inline_keyboard: wsButtons },
      });
      return new Response("ok");
    }

    if (data.startsWith("rw:")) {
      const workstreamId = data.slice(3);
      const sessionInfo = await getSession(supabase, chatId);
      if (!sessionInfo) {
        return new Response("ok");
      }

      if (!dump) {
        await tgPost("editMessageText", {
          chat_id: chatId,
          message_id: messageId,
          text: "⚠️ Item already routed or not found.",
        });
        return new Response("ok");
      }

      const workstream = await fetchWorkstreamById(supabase, workstreamId);
      const canAccessWorkstream = workstream &&
        (workstream.owner_email === sessionInfo.userEmail ||
          workstream.visibility === "shared");

      if (!canAccessWorkstream) {
        await tgPost("editMessageText", {
          chat_id: chatId,
          message_id: messageId,
          text: "⚠️ You can no longer access that workstream.",
        });
        return new Response("ok");
      }

      const userContext = await resolveUserContext(supabase, sessionInfo.userEmail);
      const now = new Date().toISOString();
      const { data: task } = await supabase.from("workstream_tasks").insert({
        workstream_id: workstreamId,
        title: dump.content,
        priority: "medium",
        status: "open",
        requester: userContext.name,
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

      await tgPost("editMessageText", {
        chat_id: chatId,
        message_id: messageId,
        text: `📋 Added to "${workstream?.title ?? "workstream"}":\n"${
          preview(dump.content)
        }" ✅`,
      });
      return new Response("ok");
    }

    if (data === "r:back") {
      if (!dump) {
        await tgPost("editMessageText", {
          chat_id: chatId,
          message_id: messageId,
          text: "⚠️ Item already routed or not found.",
        });
        return new Response("ok");
      }

      await tgPost("editMessageText", {
        chat_id: chatId,
        message_id: messageId,
        text: `💡 Got it:\n"${preview(dump.content)}"\n\nWhere should this go?`,
        reply_markup: routingKeyboard(),
      });
      return new Response("ok");
    }

    if (data.startsWith("r:")) {
      const destination = data.slice(2);
      const sessionInfo = await getSession(supabase, chatId);
      if (!sessionInfo) {
        return new Response("ok");
      }

      if (!dump) {
        await tgPost("editMessageText", {
          chat_id: chatId,
          message_id: messageId,
          text: "⚠️ Item already routed or not found.",
        });
        return new Response("ok");
      }

      const userContext = await resolveUserContext(supabase, sessionInfo.userEmail);
      const confirmation = await handleRoute(
        supabase,
        dump,
        destination,
        userContext,
      );

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

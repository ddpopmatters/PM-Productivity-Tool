import { getSupabase } from '../api/supabase';
import { APP_CONFIG } from '../utils/config';
import { Logger } from '../utils/logger';

const FUNCTION_NAME = 'agent-control';

function stableStringify(value) {
  if (value === null || value === undefined) return String(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    const pairs = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
    return `{${pairs.join(',')}}`;
  }
  return JSON.stringify(value);
}

function hashString(input) {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function buildAgentControlUrl(supabaseUrl = APP_CONFIG.SUPABASE_URL) {
  const base = (supabaseUrl || '').replace(/\/+$/, '');
  return `${base}/functions/v1/${FUNCTION_NAME}`;
}

export function buildRunIdempotencyKey({ requestedBy, mode, payload }) {
  const canonical = stableStringify(payload || {});
  const hash = hashString(`${requestedBy}:${mode}:${canonical}`);
  return `${mode}:${requestedBy}:${hash}`;
}

export function mapAgentRunForUi(row) {
  if (!row) return null;
  return {
    id: row.id,
    mode: row.mode,
    requestedBy: row.requested_by,
    status: row.status,
    inputPayload: row.input_payload || {},
    idempotencyKey: row.idempotency_key,
    tokenBudget: row.token_budget,
    toolCallBudget: row.tool_call_budget,
    timeoutSeconds: row.timeout_seconds,
    startedAt: row.started_at || null,
    finishedAt: row.finished_at || null,
    errorMessage: row.error_message || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getAccessToken() {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase not initialized');
  }
  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session?.access_token) {
    throw new Error('You must be logged in to use agent controls');
  }
  return data.session.access_token;
}

async function invokeAgentControl(action, payload = {}) {
  const token = await getAccessToken();
  const response = await fetch(buildAgentControlUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, ...payload }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result?.success === false) {
    const errorMessage = result?.error || `Agent control call failed (${response.status})`;
    throw new Error(errorMessage);
  }

  return result;
}

export async function listAgentProfiles() {
  try {
    const result = await invokeAgentControl('list_profiles');
    return result.profiles || [];
  } catch (error) {
    Logger.error(error, 'Failed to list agent profiles');
    return [];
  }
}

export async function listAgentContracts() {
  try {
    const result = await invokeAgentControl('list_contracts');
    return result.contracts || [];
  } catch (error) {
    Logger.error(error, 'Failed to list agent contracts');
    return [];
  }
}

export async function listAgentRuns(limit = 20) {
  try {
    const result = await invokeAgentControl('list_runs', { limit });
    return (result.runs || []).map(mapAgentRunForUi);
  } catch (error) {
    Logger.error(error, 'Failed to list agent runs');
    return [];
  }
}

export async function listAgentApprovals(status = 'pending') {
  try {
    const result = await invokeAgentControl('list_approvals', { status });
    return result.approvals || [];
  } catch (error) {
    Logger.error(error, 'Failed to list agent approvals');
    return [];
  }
}

export async function createAgentRun({ mode, inputPayload = {}, tokenBudget = 120000, toolCallBudget = 40, timeoutSeconds = 900, requestedBy }) {
  const idempotencyKey = buildRunIdempotencyKey({ requestedBy, mode, payload: inputPayload });
  const result = await invokeAgentControl('create_run', {
    mode,
    input_payload: inputPayload,
    token_budget: tokenBudget,
    tool_call_budget: toolCallBudget,
    timeout_seconds: timeoutSeconds,
    idempotency_key: idempotencyKey,
  });
  return mapAgentRunForUi(result.run);
}

export async function decideAgentApproval({ approvalId, decision, reason = '' }) {
  const result = await invokeAgentControl('decide_approval', {
    approval_id: approvalId,
    decision,
    reason,
  });
  return result.approval || null;
}

export async function appendAgentRunEvent({ runId, eventType, payload = {}, profileName = null }) {
  const result = await invokeAgentControl('append_event', {
    run_id: runId,
    event_type: eventType,
    payload,
    profile_name: profileName,
  });
  return result.event || null;
}

export async function updateAgentRunStatus({ runId, status, errorMessage = null }) {
  const result = await invokeAgentControl('update_run_status', {
    run_id: runId,
    status,
    error_message: errorMessage,
  });
  return mapAgentRunForUi(result.run);
}

export async function runAgentChatCommand(command) {
  const cleanedCommand = String(command || '').trim();
  if (!cleanedCommand) {
    throw new Error('Command is required');
  }

  const result = await invokeAgentControl('chat_command', {
    command: cleanedCommand,
  });

  return {
    message: result.message || 'Command applied.',
    mutation: result.mutation || null,
  };
}

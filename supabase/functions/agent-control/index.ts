import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const APP_URL = Deno.env.get('APP_URL') || 'https://ddpopmatters.github.io/PM-Productivity-Tool'
const ALLOWED_ORIGINS = ['https://ddpopmatters.github.io', APP_URL]

const VALID_MODES = new Set(['social', 'website', 'ai_ops'])
const BUILD_REQUIRED_MODES = new Set(['website', 'ai_ops'])
const VALID_RUN_STATUSES = new Set([
  'queued',
  'running',
  'handoff_pending',
  'awaiting_approval',
  'blocked',
  'completed',
  'failed',
  'cancelled',
])
const VALID_APPROVAL_DECISIONS = new Set(['approved', 'rejected'])
const VALID_WORKSTREAM_TASK_STATUSES = new Set(['open', 'in_progress', 'blocked', 'done'])

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0]

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-worker-token',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  }
}

function jsonResponse(body: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function normalizeLimit(value: unknown, fallback = 20, max = 100): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(Math.floor(parsed), max)
}

function getWorkerToken(req: Request, payload: Record<string, unknown>): string {
  const fromHeader = String(req.headers.get('x-worker-token') || '').trim()
  if (fromHeader) return fromHeader
  return String(payload.worker_token || '').trim()
}

function getAuthBearer(req: Request): string {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return ''
  return authHeader.replace('Bearer ', '')
}

function parseIsoDateInput(rawValue: string): string | null {
  const trimmed = rawValue.trim()
  if (!trimmed) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null
  const parsed = new Date(`${trimmed}T00:00:00.000Z`)
  if (!Number.isFinite(parsed.getTime())) return null
  return trimmed
}

async function canAccessWorkstream(
  supabaseAdmin: ReturnType<typeof createClient>,
  workstreamId: string,
  caller: any,
) {
  const { data: workstream, error } = await supabaseAdmin
    .from('workstreams')
    .select('id,owner_email,visibility')
    .eq('id', workstreamId)
    .single()

  if (error || !workstream) {
    return { ok: false, reason: 'Workstream not found' }
  }

  const callerEmail = String(caller?.email || '').toLowerCase()
  const ownerEmail = String(workstream.owner_email || '').toLowerCase()
  const isShared = workstream.visibility === 'shared'
  const isOwner = callerEmail && ownerEmail && callerEmail === ownerEmail

  if (!isShared && !isOwner) {
    return { ok: false, reason: 'Not authorized for this workstream' }
  }

  return { ok: true, workstream }
}

async function handleWorkstreamSetCommand(
  supabaseAdmin: ReturnType<typeof createClient>,
  caller: any,
  command: string,
) {
  const statusMatch = command.match(/^workstream\s+set\s+([a-f0-9-]{36})\s+status\s+([a-z_]+)$/i)
  if (statusMatch) {
    const taskId = statusMatch[1]
    const status = statusMatch[2].toLowerCase()
    if (!VALID_WORKSTREAM_TASK_STATUSES.has(status)) {
      return { success: false, error: 'Invalid status. Use open, in_progress, blocked, or done.' }
    }

    const { data: task, error: taskError } = await supabaseAdmin
      .from('workstream_tasks')
      .select('id,workstream_id,title,status')
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      return { success: false, error: 'Workstream task not found.' }
    }

    const access = await canAccessWorkstream(supabaseAdmin, task.workstream_id, caller)
    if (!access.ok) {
      return { success: false, error: access.reason }
    }

    const { data: updatedTask, error: updateError } = await supabaseAdmin
      .from('workstream_tasks')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .select('id,title,status,deadline,workstream_id,updated_at')
      .single()

    if (updateError) throw updateError

    return {
      success: true,
      message: `Updated task status to ${status}.`,
      mutation: {
        domain: 'workstream',
        operation: 'update_status',
        task: updatedTask,
      },
    }
  }

  const dueMatch = command.match(/^workstream\s+set\s+([a-f0-9-]{36})\s+due\s+(\d{4}-\d{2}-\d{2})$/i)
  if (dueMatch) {
    const taskId = dueMatch[1]
    const dueDate = parseIsoDateInput(dueMatch[2])
    if (!dueDate) {
      return { success: false, error: 'Invalid date. Use YYYY-MM-DD.' }
    }

    const { data: task, error: taskError } = await supabaseAdmin
      .from('workstream_tasks')
      .select('id,workstream_id,title,status')
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      return { success: false, error: 'Workstream task not found.' }
    }

    const access = await canAccessWorkstream(supabaseAdmin, task.workstream_id, caller)
    if (!access.ok) {
      return { success: false, error: access.reason }
    }

    const { data: updatedTask, error: updateError } = await supabaseAdmin
      .from('workstream_tasks')
      .update({ deadline: dueDate, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .select('id,title,status,deadline,workstream_id,updated_at')
      .single()

    if (updateError) throw updateError

    return {
      success: true,
      message: `Updated task deadline to ${dueDate}.`,
      mutation: {
        domain: 'workstream',
        operation: 'update_deadline',
        task: updatedTask,
      },
    }
  }

  return null
}

async function handleWorkstreamAddCommand(
  supabaseAdmin: ReturnType<typeof createClient>,
  caller: any,
  command: string,
) {
  const addMatch = command.match(/^workstream\s+add\s+([a-f0-9-]{36})\s*\|\s*([^|\n]+?)(?:\s*\|\s*(.+))?$/i)
  if (!addMatch) return null

  const workstreamId = addMatch[1]
  const title = String(addMatch[2] || '').trim()
  const description = String(addMatch[3] || '').trim()

  if (!title) {
    return { success: false, error: 'Task title is required.' }
  }

  const access = await canAccessWorkstream(supabaseAdmin, workstreamId, caller)
  if (!access.ok) {
    return { success: false, error: access.reason }
  }

  const { data: task, error } = await supabaseAdmin
    .from('workstream_tasks')
    .insert([{
      workstream_id: workstreamId,
      title,
      description,
      priority: 'medium',
      status: 'open',
      task_type: 'Issue',
      requester: caller?.email || caller?.id || 'mini-app-chat',
      tags: ['chat'],
      comments: [],
      sort_order: 0,
    }])
    .select('id,title,status,deadline,workstream_id,created_at')
    .single()

  if (error) throw error

  return {
    success: true,
    message: 'Created workstream task.',
    mutation: {
      domain: 'workstream',
      operation: 'create_task',
      task,
    },
  }
}

async function handleIntelAddCommand(
  supabaseAdmin: ReturnType<typeof createClient>,
  caller: any,
  command: string,
) {
  const intelMatch = command.match(/^intel\s+add\s+([\s\S]+)$/i)
  if (!intelMatch) return null

  const content = String(intelMatch[1] || '').trim()
  if (!content) {
    return { success: false, error: 'Intel content is required.' }
  }

  const { data: intelItem, error } = await supabaseAdmin
    .from('brain_dumps')
    .insert([{
      user_id: caller.id,
      content,
      source: 'manual',
      status: 'pending',
      maturity: 'forming',
      tags: ['intel', 'chat'],
    }])
    .select('id,content,status,tags,created_at')
    .single()

  if (error) throw error

  return {
    success: true,
    message: 'Intel item captured to inbox.',
    mutation: {
      domain: 'intel',
      operation: 'create_item',
      item: intelItem,
    },
  }
}

async function handleChatCommand(
  supabaseAdmin: ReturnType<typeof createClient>,
  caller: any,
  rawCommand: string,
) {
  const command = String(rawCommand || '').trim()
  if (!command) {
    return { success: false, error: 'command is required' }
  }

  if (command.toLowerCase() === 'help') {
    return {
      success: true,
      message: 'Supported commands: intel add <text> | workstream add <workstream_id> | <title> | <optional description> | workstream set <task_id> status <open|in_progress|blocked|done> | workstream set <task_id> due <YYYY-MM-DD>',
      mutation: null,
    }
  }

  const workstreamSetResult = await handleWorkstreamSetCommand(supabaseAdmin, caller, command)
  if (workstreamSetResult) return workstreamSetResult

  const workstreamAddResult = await handleWorkstreamAddCommand(supabaseAdmin, caller, command)
  if (workstreamAddResult) return workstreamAddResult

  const intelAddResult = await handleIntelAddCommand(supabaseAdmin, caller, command)
  if (intelAddResult) return intelAddResult

  return {
    success: false,
    error: 'Unknown command. Send "help" for supported commands.',
  }
}

async function appendRunEvent(
  supabaseAdmin: ReturnType<typeof createClient>,
  runId: string,
  eventType: string,
  payload: Record<string, unknown> = {},
  profileId: string | null = null,
) {
  const { data: lastEvent } = await supabaseAdmin
    .from('agent_run_events')
    .select('seq')
    .eq('run_id', runId)
    .order('seq', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextSeq = (lastEvent?.seq || 0) + 1

  const { data: event, error } = await supabaseAdmin
    .from('agent_run_events')
    .insert([{
      run_id: runId,
      seq: nextSeq,
      event_type: eventType,
      profile_id: profileId,
      payload,
    }])
    .select('*')
    .single()

  if (error) throw error
  return event
}

async function claimQueuedRun(supabaseAdmin: ReturnType<typeof createClient>) {
  const { data: candidate } = await supabaseAdmin
    .from('agent_runs')
    .select('*')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!candidate) return null

  const nowIso = new Date().toISOString()
  const { data: claimedRun } = await supabaseAdmin
    .from('agent_runs')
    .update({ status: 'running', started_at: nowIso })
    .eq('id', candidate.id)
    .eq('status', 'queued')
    .select('*')
    .maybeSingle()

  return claimedRun || null
}

async function claimApprovedAwaitingRun(supabaseAdmin: ReturnType<typeof createClient>) {
  const { data: awaitingRuns } = await supabaseAdmin
    .from('agent_runs')
    .select('*')
    .eq('status', 'awaiting_approval')
    .order('created_at', { ascending: true })
    .limit(25)

  for (const run of awaitingRuns || []) {
    const { data: approvals } = await supabaseAdmin
      .from('agent_approvals')
      .select('status')
      .eq('run_id', run.id)

    const statuses = new Set((approvals || []).map((a: any) => a.status))
    if (statuses.has('rejected') || statuses.has('pending') || !statuses.has('approved')) {
      continue
    }

    const { data: claimed } = await supabaseAdmin
      .from('agent_runs')
      .update({ status: 'running' })
      .eq('id', run.id)
      .eq('status', 'awaiting_approval')
      .select('*')
      .maybeSingle()

    if (claimed) return claimed
  }

  return null
}

async function getBuildApprovalProfile(supabaseAdmin: ReturnType<typeof createClient>) {
  const { data } = await supabaseAdmin
    .from('agent_profiles')
    .select('id,name,approval_required,enabled')
    .eq('name', 'build')
    .maybeSingle()
  return data || null
}

async function isBuildGateActive(supabaseAdmin: ReturnType<typeof createClient>) {
  const { data } = await supabaseAdmin
    .from('agent_runtime_config')
    .select('value')
    .eq('key', 'build_role_approval_enforced_until')
    .maybeSingle()

  const timestamp = data?.value?.timestamp
  if (!timestamp) return false
  const gateUntil = new Date(String(timestamp))
  return Number.isFinite(gateUntil.getTime()) && gateUntil.getTime() > Date.now()
}

async function ensureBuildApprovalState(
  supabaseAdmin: ReturnType<typeof createClient>,
  run: any,
  buildProfileId: string,
) {
  const { data: existing } = await supabaseAdmin
    .from('agent_approvals')
    .select('*')
    .eq('run_id', run.id)
    .eq('required_for_profile_id', buildProfileId)
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!existing) {
    const { data: created, error } = await supabaseAdmin
      .from('agent_approvals')
      .insert([{
        run_id: run.id,
        required_for_profile_id: buildProfileId,
        status: 'pending',
      }])
      .select('*')
      .single()

    if (error) throw error
    return { state: 'pending', approval: created }
  }

  if (existing.status === 'approved') return { state: 'approved', approval: existing }
  if (existing.status === 'rejected') return { state: 'rejected', approval: existing }
  return { state: 'pending', approval: existing }
}

async function processWorkerTick(
  supabaseAdmin: ReturnType<typeof createClient>,
  workerLabel: string,
) {
  let run = await claimQueuedRun(supabaseAdmin)
  if (!run) {
    run = await claimApprovedAwaitingRun(supabaseAdmin)
  }

  if (!run) {
    return { state: 'idle', run: null }
  }

  await appendRunEvent(supabaseAdmin, run.id, 'worker.claimed', { worker: workerLabel, mode: run.mode })

  const buildProfile = await getBuildApprovalProfile(supabaseAdmin)
  const buildGateActive = await isBuildGateActive(supabaseAdmin)
  const modeNeedsBuildApproval = BUILD_REQUIRED_MODES.has(run.mode)
  const enforceBuildApproval = Boolean(
    modeNeedsBuildApproval
    && buildGateActive
    && buildProfile?.enabled
    && buildProfile?.approval_required
    && buildProfile?.id,
  )

  if (enforceBuildApproval && buildProfile?.id) {
    const approvalState = await ensureBuildApprovalState(supabaseAdmin, run, buildProfile.id)

    if (approvalState.state === 'pending') {
      const { data: updatedRun, error } = await supabaseAdmin
        .from('agent_runs')
        .update({ status: 'awaiting_approval' })
        .eq('id', run.id)
        .select('*')
        .single()
      if (error) throw error

      await appendRunEvent(supabaseAdmin, run.id, 'run.awaiting_approval', {
        approval_id: approvalState.approval.id,
        reason: 'build profile gate active',
      })

      return { state: 'awaiting_approval', run: updatedRun, approval: approvalState.approval }
    }

    if (approvalState.state === 'rejected') {
      const nowIso = new Date().toISOString()
      const { data: failedRun, error } = await supabaseAdmin
        .from('agent_runs')
        .update({
          status: 'failed',
          finished_at: nowIso,
          error_message: approvalState.approval?.reason || 'Rejected during build approval gate',
        })
        .eq('id', run.id)
        .select('*')
        .single()
      if (error) throw error

      await appendRunEvent(supabaseAdmin, run.id, 'run.failed.approval_rejected', {
        approval_id: approvalState.approval.id,
      })

      return { state: 'failed', run: failedRun, approval: approvalState.approval }
    }

    await appendRunEvent(supabaseAdmin, run.id, 'run.approval_granted', {
      approval_id: approvalState.approval.id,
    })
  }

  await appendRunEvent(supabaseAdmin, run.id, 'orchestrator.started', { mode: run.mode })

  if (run.mode === 'social') {
    await appendRunEvent(supabaseAdmin, run.id, 'research.completed', { output: 'evidence brief compiled' })
    await appendRunEvent(supabaseAdmin, run.id, 'drafting.completed', { output: 'social draft packet generated' })
  } else if (run.mode === 'website') {
    await appendRunEvent(supabaseAdmin, run.id, 'research.completed', { output: 'page evidence gathered' })
    await appendRunEvent(supabaseAdmin, run.id, 'drafting.completed', { output: 'website copy draft generated' })
    await appendRunEvent(supabaseAdmin, run.id, 'build.completed', { output: 'implementation plan prepared' })
  } else {
    await appendRunEvent(supabaseAdmin, run.id, 'research.completed', { output: 'ops context collected' })
    await appendRunEvent(supabaseAdmin, run.id, 'build.completed', { output: 'automation patch prepared' })
  }

  const nowIso = new Date().toISOString()
  const { data: completedRun, error: completeError } = await supabaseAdmin
    .from('agent_runs')
    .update({
      status: 'completed',
      finished_at: nowIso,
      error_message: null,
    })
    .eq('id', run.id)
    .select('*')
    .single()

  if (completeError) throw completeError

  await appendRunEvent(supabaseAdmin, run.id, 'run.completed', {
    summary: `Run ${run.id} completed in mode ${run.mode}`,
  })

  return { state: 'completed', run: completedRun }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405, corsHeaders)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ success: false, error: 'Server configuration error' }, 500, corsHeaders)
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400, corsHeaders)
  }

  const action = String(payload.action || '')
  const isWorkerAction = action === 'claim_next_run' || action === 'worker_tick'

  const expectedWorkerToken = Deno.env.get('AGENT_WORKER_TOKEN') || ''
  const providedWorkerToken = getWorkerToken(req, payload)

  let caller: any = null

  if (isWorkerAction) {
    if (!expectedWorkerToken || providedWorkerToken !== expectedWorkerToken) {
      return jsonResponse({ success: false, error: 'Unauthorized worker' }, 401, corsHeaders)
    }
  } else {
    const bearerToken = getAuthBearer(req)
    if (!bearerToken) {
      return jsonResponse({ success: false, error: 'Missing authorization header' }, 401, corsHeaders)
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(bearerToken)
    if (authError || !authData?.user) {
      return jsonResponse({ success: false, error: 'Invalid or expired token' }, 401, corsHeaders)
    }

    caller = authData.user
  }

  try {
    switch (action) {
      case 'list_profiles': {
        const { data, error } = await supabaseAdmin
          .from('agent_profiles')
          .select('*')
          .order('name')

        if (error) throw error
        return jsonResponse({ success: true, profiles: data || [] }, 200, corsHeaders)
      }

      case 'list_contracts': {
        const { data, error } = await supabaseAdmin
          .from('agent_handoff_contracts')
          .select(`
            *,
            from_profile:from_profile_id(name, role),
            to_profile:to_profile_id(name, role)
          `)
          .order('created_at', { ascending: true })

        if (error) throw error
        return jsonResponse({ success: true, contracts: data || [] }, 200, corsHeaders)
      }

      case 'list_runs': {
        const limit = normalizeLimit(payload.limit)
        const { data, error } = await supabaseAdmin
          .from('agent_runs')
          .select('*')
          .eq('requested_by', caller.id)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (error) throw error
        return jsonResponse({ success: true, runs: data || [] }, 200, corsHeaders)
      }

      case 'claim_next_run': {
        const claimedRun = await claimQueuedRun(supabaseAdmin)
        return jsonResponse({ success: true, run: claimedRun }, 200, corsHeaders)
      }

      case 'worker_tick': {
        const workerLabel = String(payload.worker_label || 'agent-worker')
        const result = await processWorkerTick(supabaseAdmin, workerLabel)
        return jsonResponse({ success: true, ...result }, 200, corsHeaders)
      }

      case 'create_run': {
        const mode = String(payload.mode || '')
        if (!VALID_MODES.has(mode)) {
          return jsonResponse({ success: false, error: 'Invalid mode' }, 400, corsHeaders)
        }

        const idempotencyKey = String(payload.idempotency_key || '').trim()
        if (!idempotencyKey) {
          return jsonResponse({ success: false, error: 'idempotency_key is required' }, 400, corsHeaders)
        }

        const { data: orchestratorProfile, error: profileError } = await supabaseAdmin
          .from('agent_profiles')
          .select('id')
          .eq('name', 'orchestrator')
          .eq('enabled', true)
          .single()

        if (profileError || !orchestratorProfile) {
          return jsonResponse({ success: false, error: 'Orchestrator profile unavailable' }, 409, corsHeaders)
        }

        const tokenBudget = normalizeLimit(payload.token_budget, 120000, 500000)
        const toolCallBudget = normalizeLimit(payload.tool_call_budget, 40, 200)
        const timeoutSeconds = normalizeLimit(payload.timeout_seconds, 900, 7200)

        const { data: run, error: runError } = await supabaseAdmin
          .from('agent_runs')
          .insert([{
            mode,
            requested_by: caller.id,
            status: 'queued',
            orchestrator_profile_id: orchestratorProfile.id,
            input_payload: payload.input_payload || {},
            idempotency_key: idempotencyKey,
            token_budget: tokenBudget,
            tool_call_budget: toolCallBudget,
            timeout_seconds: timeoutSeconds,
          }])
          .select('*')
          .single()

        if (runError) {
          if (runError.code === '23505') {
            const { data: existingRun } = await supabaseAdmin
              .from('agent_runs')
              .select('*')
              .eq('idempotency_key', idempotencyKey)
              .eq('requested_by', caller.id)
              .single()
            return jsonResponse({ success: true, run: existingRun, deduplicated: true }, 200, corsHeaders)
          }
          throw runError
        }

        return jsonResponse({ success: true, run }, 200, corsHeaders)
      }

      case 'append_event': {
        const runId = String(payload.run_id || '')
        const eventType = String(payload.event_type || '').trim()
        if (!runId || !eventType) {
          return jsonResponse({ success: false, error: 'run_id and event_type are required' }, 400, corsHeaders)
        }

        const { data: run, error: runError } = await supabaseAdmin
          .from('agent_runs')
          .select('id')
          .eq('id', runId)
          .eq('requested_by', caller.id)
          .single()

        if (runError || !run) {
          return jsonResponse({ success: false, error: 'Run not found' }, 404, corsHeaders)
        }

        let profileId: string | null = null
        const profileName = String(payload.profile_name || '').trim()
        if (profileName) {
          const { data: profile } = await supabaseAdmin
            .from('agent_profiles')
            .select('id')
            .eq('name', profileName)
            .single()
          profileId = profile?.id ?? null
        }

        const event = await appendRunEvent(
          supabaseAdmin,
          runId,
          eventType,
          (payload.payload as Record<string, unknown>) || {},
          profileId,
        )

        return jsonResponse({ success: true, event }, 200, corsHeaders)
      }

      case 'update_run_status': {
        const runId = String(payload.run_id || '')
        const status = String(payload.status || '')

        if (!runId || !VALID_RUN_STATUSES.has(status)) {
          return jsonResponse({ success: false, error: 'Invalid run_id or status' }, 400, corsHeaders)
        }

        const { data: currentRun, error: currentRunError } = await supabaseAdmin
          .from('agent_runs')
          .select('*')
          .eq('id', runId)
          .eq('requested_by', caller.id)
          .single()

        if (currentRunError || !currentRun) {
          return jsonResponse({ success: false, error: 'Run not found' }, 404, corsHeaders)
        }

        const updatePayload: Record<string, unknown> = {
          status,
          error_message: payload.error_message || null,
        }

        if (!currentRun.started_at && status === 'running') {
          updatePayload.started_at = new Date().toISOString()
        }

        if (['completed', 'failed', 'cancelled', 'blocked'].includes(status)) {
          updatePayload.finished_at = new Date().toISOString()
        }

        const { data: updatedRun, error: updateError } = await supabaseAdmin
          .from('agent_runs')
          .update(updatePayload)
          .eq('id', runId)
          .select('*')
          .single()

        if (updateError) throw updateError

        return jsonResponse({ success: true, run: updatedRun }, 200, corsHeaders)
      }

      case 'list_approvals': {
        const status = String(payload.status || 'pending')
        const query = supabaseAdmin
          .from('agent_approvals')
          .select(`
            *,
            run:run_id(id, mode, status, requested_by, created_at),
            profile:required_for_profile_id(id, name, role)
          `)
          .order('requested_at', { ascending: false })

        if (status && status !== 'all') {
          query.eq('status', status)
        }

        const { data, error } = await query

        if (error) throw error

        const approvals = (data || []).filter((approval: any) => approval?.run?.requested_by === caller.id)
        return jsonResponse({ success: true, approvals }, 200, corsHeaders)
      }

      case 'decide_approval': {
        const approvalId = String(payload.approval_id || '')
        const decision = String(payload.decision || '')
        const reason = String(payload.reason || '')

        if (!approvalId || !VALID_APPROVAL_DECISIONS.has(decision)) {
          return jsonResponse({ success: false, error: 'Invalid approval_id or decision' }, 400, corsHeaders)
        }

        const { data: approval, error: approvalError } = await supabaseAdmin
          .from('agent_approvals')
          .select('*, run:run_id(id, requested_by)')
          .eq('id', approvalId)
          .single()

        if (approvalError || !approval || approval.run?.requested_by !== caller.id) {
          return jsonResponse({ success: false, error: 'Approval not found' }, 404, corsHeaders)
        }

        const { data: updatedApproval, error: updateError } = await supabaseAdmin
          .from('agent_approvals')
          .update({
            status: decision,
            decided_at: new Date().toISOString(),
            decided_by: caller.email || caller.id,
            reason,
          })
          .eq('id', approvalId)
          .select('*')
          .single()

        if (updateError) throw updateError

        return jsonResponse({ success: true, approval: updatedApproval }, 200, corsHeaders)
      }

      case 'chat_command': {
        const command = String(payload.command || '')
        const result = await handleChatCommand(supabaseAdmin, caller, command)
        const statusCode = result.success ? 200 : 400
        return jsonResponse(result, statusCode, corsHeaders)
      }

      default:
        return jsonResponse({ success: false, error: 'Unknown action' }, 400, corsHeaders)
    }
  } catch (error) {
    console.error('agent-control error:', error)
    return jsonResponse({ success: false, error: 'Internal server error' }, 500, corsHeaders)
  }
})

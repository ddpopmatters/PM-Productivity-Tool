import { describe, expect, it } from 'vitest';
import {
  buildAgentControlUrl,
  buildRunIdempotencyKey,
  mapAgentRunForUi,
  runAgentChatCommand,
} from './agentControl';

describe('buildAgentControlUrl', () => {
  it('builds canonical edge function endpoint without double slashes', () => {
    expect(buildAgentControlUrl('https://abc.supabase.co/')).toBe(
      'https://abc.supabase.co/functions/v1/agent-control'
    );
  });
});

describe('buildRunIdempotencyKey', () => {
  it('returns deterministic key for same user/mode/payload tuple', () => {
    const payload = { objective: 'Draft PM weekly summary', channels: ['x', 'linkedin'] };
    const a = buildRunIdempotencyKey({
      requestedBy: '123',
      mode: 'social',
      payload,
    });
    const b = buildRunIdempotencyKey({
      requestedBy: '123',
      mode: 'social',
      payload,
    });

    expect(a).toBe(b);
    expect(a.startsWith('social:123:')).toBe(true);
  });

  it('changes when payload changes', () => {
    const a = buildRunIdempotencyKey({
      requestedBy: '123',
      mode: 'social',
      payload: { objective: 'A' },
    });
    const b = buildRunIdempotencyKey({
      requestedBy: '123',
      mode: 'social',
      payload: { objective: 'B' },
    });

    expect(a).not.toBe(b);
  });
});

describe('mapAgentRunForUi', () => {
  it('maps snake_case database fields to camelCase ui fields', () => {
    const row = {
      id: 'run-1',
      mode: 'social',
      requested_by: 'auth-1',
      status: 'queued',
      input_payload: { objective: 'Test' },
      idempotency_key: 'abc',
      token_budget: 120000,
      tool_call_budget: 40,
      timeout_seconds: 900,
      started_at: null,
      finished_at: null,
      error_message: null,
      created_at: '2026-04-20T12:00:00Z',
      updated_at: '2026-04-20T12:00:00Z',
    };

    expect(mapAgentRunForUi(row)).toEqual({
      id: 'run-1',
      mode: 'social',
      requestedBy: 'auth-1',
      status: 'queued',
      inputPayload: { objective: 'Test' },
      idempotencyKey: 'abc',
      tokenBudget: 120000,
      toolCallBudget: 40,
      timeoutSeconds: 900,
      startedAt: null,
      finishedAt: null,
      errorMessage: null,
      createdAt: '2026-04-20T12:00:00Z',
      updatedAt: '2026-04-20T12:00:00Z',
    });
  });
});

describe('runAgentChatCommand', () => {
  it('rejects empty command before network call', async () => {
    await expect(runAgentChatCommand('   ')).rejects.toThrow('Command is required');
  });
});

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  buildStartOfDayAgentObjective,
  createStartOfDayAgentRun,
  openStartOfDayLocalFile,
} from './startOfDay';
import { createAgentRun } from './agentControl';

vi.mock('./agentControl', () => ({
  createAgentRun: vi.fn(),
}));

afterEach(() => vi.clearAllMocks());

const item = {
  id: 'item-1',
  packetId: 'packet-1',
  itemType: 'forgotten_work',
  title: 'Finish appeal follow-up',
  summary: 'Dan started the appeal follow-up yesterday and no final note was sent.',
  evidence: 'Mentioned in Hermes log and created draft file.',
  nextAction: 'Review the draft, finish the note, and send Dan the result.',
  confidence: 'high',
  localPath: '/Users/dan/dev/population_matters/content/appeals/follow-up.md',
  sourceUrl: 'https://www.populationmatters.org/workstream-tool',
};

describe('Start of Day item actions', () => {
  it('builds a concise Hermes objective with all available item context', () => {
    const objective = buildStartOfDayAgentObjective(item);

    expect(objective).toContain('Continue this Start of Day task for Dan.');
    expect(objective).toContain('Finish appeal follow-up');
    expect(objective).toContain('Dan started the appeal follow-up yesterday');
    expect(objective).toContain('Mentioned in Hermes log');
    expect(objective).toContain('Review the draft');
    expect(objective).toContain('/Users/dan/dev/population_matters/content/appeals/follow-up.md');
    expect(objective).toContain('https://www.populationmatters.org/workstream-tool');
  });

  it('creates an ai_ops Hermes run from a Start of Day item', async () => {
    createAgentRun.mockResolvedValue({ id: 'run-1', status: 'queued' });

    await expect(createStartOfDayAgentRun({
      item,
      userId: 'auth-user-1',
    })).resolves.toEqual({ id: 'run-1', status: 'queued' });

    expect(createAgentRun).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'ai_ops',
      requestedBy: 'auth-user-1',
      inputPayload: expect.objectContaining({
        source: 'start_of_day',
        startOfDayItemId: 'item-1',
        startOfDayPacketId: 'packet-1',
        startOfDayItemType: 'forgotten_work',
        title: 'Finish appeal follow-up',
        localPath: '/Users/dan/dev/population_matters/content/appeals/follow-up.md',
      }),
    }));
  });

  it('asks the local cockpit bridge to open a file path', async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      json: async () => ({ opened: true, path: item.localPath }),
    }));

    const result = await openStartOfDayLocalFile({ item, fetcher });

    expect(result).toEqual({ opened: true, path: item.localPath });
    expect(fetcher).toHaveBeenCalledWith('http://127.0.0.1:5177/api/open-file', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
        'X-PM-Cockpit-Action': 'open-file',
      }),
      body: JSON.stringify({
        path: item.localPath,
        source: 'start_of_day',
        itemId: item.id,
      }),
    }));
  });
});

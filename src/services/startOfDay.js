import { getSupabase } from '../api/supabase';
import { Logger } from '../utils/logger';
import { createAgentRun } from './agentControl';

const ACK_STATUSES = new Set(['unseen', 'seen', 'started', 'snoozed', 'done']);
const OPEN_FILE_URL = 'http://127.0.0.1:5177/api/open-file';

const ITEM_TYPES = [
  'forgotten_work',
  'created_file',
  'agent_can_do',
  'waiting_on_user',
  'already_started',
];

function sortItems(items) {
  return [...items].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
  });
}

export function normalizeStartOfDayItem(row) {
  if (!row) return null;

  return {
    id: row.id,
    packetId: row.packet_id || row.packetId,
    itemType: row.item_type || row.itemType || 'forgotten_work',
    title: row.title || '',
    summary: row.summary || '',
    evidence: row.evidence || '',
    confidence: row.confidence || '',
    nextAction: row.next_action || row.nextAction || '',
    status: row.status || 'open',
    sourceUrl: row.source_url || row.sourceUrl || '',
    localPath: row.local_path || row.localPath || '',
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0),
    createdAt: row.created_at || row.createdAt || '',
    updatedAt: row.updated_at || row.updatedAt || '',
  };
}

export function normalizeStartOfDayPacket(row) {
  if (!row) return null;

  const items = (row.start_of_day_items || row.items || [])
    .map(normalizeStartOfDayItem)
    .filter(Boolean);

  return {
    id: row.id,
    userEmail: row.user_email || row.userEmail || '',
    packetDate: row.packet_date || row.packetDate || '',
    primaryTask: row.primary_task || row.primaryTask || '',
    ifYouFinishEarly: row.if_you_finish_early || row.ifYouFinishEarly || '',
    reEntryPrompt: row.re_entry_prompt || row.reEntryPrompt || '',
    ackStatus: row.ack_status || row.ackStatus || 'unseen',
    source: row.source || 'hermes',
    generatedAt: row.generated_at || row.generatedAt || '',
    previousPacketAt: row.previous_packet_at || row.previousPacketAt || '',
    createdAt: row.created_at || row.createdAt || '',
    updatedAt: row.updated_at || row.updatedAt || '',
    items: sortItems(items),
  };
}

export function groupStartOfDayItems(items = []) {
  const groups = Object.fromEntries(ITEM_TYPES.map((type) => [type, []]));

  for (const item of items) {
    const type = ITEM_TYPES.includes(item.itemType) ? item.itemType : 'forgotten_work';
    groups[type].push(item);
  }

  return groups;
}

export function buildStartOfDayAgentObjective(item) {
  if (!item) return 'Continue this Start of Day task for Dan.';

  return [
    'Continue this Start of Day task for Dan.',
    `Task: ${item.title || 'Untitled task'}`,
    item.summary && `Context: ${item.summary}`,
    item.evidence && `Evidence: ${item.evidence}`,
    item.nextAction && `Next action: ${item.nextAction}`,
    item.confidence && `Confidence: ${item.confidence}`,
    item.localPath && `Local file: ${item.localPath}`,
    item.sourceUrl && `Source: ${item.sourceUrl}`,
    'Work autonomously where safe. Return the result, files changed or created, and any decisions Dan must make.',
  ].filter(Boolean).join('\n');
}

export async function createStartOfDayAgentRun({ item, userId }) {
  if (!item?.id) throw new Error('Start of Day item is required');
  if (!userId) throw new Error('Signed-in user id is required');

  return createAgentRun({
    mode: 'ai_ops',
    requestedBy: userId,
    tokenBudget: 120000,
    toolCallBudget: 60,
    timeoutSeconds: 1800,
    inputPayload: {
      objective: buildStartOfDayAgentObjective(item),
      source: 'start_of_day',
      startOfDayItemId: item.id,
      startOfDayPacketId: item.packetId || '',
      startOfDayItemType: item.itemType || '',
      title: item.title || '',
      summary: item.summary || '',
      evidence: item.evidence || '',
      nextAction: item.nextAction || '',
      confidence: item.confidence || '',
      localPath: item.localPath || '',
      sourceUrl: item.sourceUrl || '',
    },
  });
}

export async function openStartOfDayLocalFile({ item, fetcher = fetch }) {
  if (!item?.localPath) throw new Error('No local file path is available for this item');

  const response = await fetcher(OPEN_FILE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-PM-Cockpit-Action': 'open-file',
    },
    body: JSON.stringify({
      path: item.localPath,
      source: 'start_of_day',
      itemId: item.id,
    }),
  });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.error || `Could not open file (${response.status})`);
  }

  return body;
}

export async function fetchLatestStartOfDayPacket(email) {
  const supabase = getSupabase();
  if (!supabase || !email) return null;

  const { data, error } = await supabase
    .from('start_of_day_packets')
    .select('*, start_of_day_items(*)')
    .eq('user_email', email)
    .order('packet_date', { ascending: false })
    .limit(1);

  if (error) {
    Logger.error(error, 'Fetch start of day packet error');
    return null;
  }

  return normalizeStartOfDayPacket(data?.[0]);
}

export async function updateStartOfDayPacketStatus(packetId, ackStatus) {
  const supabase = getSupabase();
  if (!supabase || !packetId || !ACK_STATUSES.has(ackStatus)) return null;

  const { data, error } = await supabase
    .from('start_of_day_packets')
    .update({
      ack_status: ackStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', packetId)
    .select('*, start_of_day_items(*)')
    .single();

  if (error) {
    Logger.error(error, 'Update start of day packet status error');
    return null;
  }

  return normalizeStartOfDayPacket(data);
}

import { getSupabase } from '../api/supabase';
import { Logger } from '../utils/logger';

const ACK_STATUSES = new Set(['unseen', 'seen', 'started', 'snoozed', 'done']);

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


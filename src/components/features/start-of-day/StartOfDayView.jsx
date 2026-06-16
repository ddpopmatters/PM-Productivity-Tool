import React, { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Button, Icon, LoadingSpinner } from '../../ui';
import {
  createStartOfDayAgentRun,
  fetchLatestStartOfDayPacket,
  groupStartOfDayItems,
  openStartOfDayLocalFile,
  updateStartOfDayPacketStatus,
} from '../../../services/startOfDay';
import {
  configureTelegramMiniApp,
  isTelegramMiniApp,
} from '../../../utils/telegramMiniApp';

const SECTION_CONFIG = [
  {
    key: 'forgotten_work',
    title: 'Started And Forgotten',
    icon: 'history',
    empty: 'No started-and-forgotten work in this packet.',
  },
  {
    key: 'created_file',
    title: 'Files Created Since Last Packet',
    icon: 'file-text',
    empty: 'No new agent-created files were attached.',
  },
  {
    key: 'agent_can_do',
    title: 'Hermes Can Do Without You',
    icon: 'bot',
    empty: 'No high-confidence autonomous work is listed.',
  },
  {
    key: 'waiting_on_user',
    title: 'Waiting On You',
    icon: 'hand',
    empty: 'No decisions or approvals are waiting.',
  },
  {
    key: 'already_started',
    title: 'Already In Motion',
    icon: 'activity',
    empty: 'No running jobs are listed.',
  },
];

const STATUS_COPY = {
  unseen: 'Unseen',
  seen: 'Seen',
  started: 'Started',
  snoozed: 'Snoozed',
  done: 'Done',
};

const ASSIGNABLE_ITEM_TYPES = new Set(['forgotten_work', 'already_started']);

function formatDate(value) {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusBadge({ status }) {
  return (
    <span className={clsx(
      'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
      status === 'done' && 'bg-emerald-100 text-emerald-800',
      status === 'started' && 'bg-ocean-100 text-ocean-800',
      status === 'snoozed' && 'bg-amber-100 text-amber-800',
      !['done', 'started', 'snoozed'].includes(status) && 'bg-graystone-100 text-graystone-700'
    )}>
      {STATUS_COPY[status] || status}
    </span>
  );
}

function FocusBlock({ label, value, icon, strong = false }) {
  return (
    <section className="min-w-0 rounded-xl border border-ocean-100 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-graystone-500">
        <Icon name={icon} className="h-4 w-4 text-ocean-600" />
        <span>{label}</span>
      </div>
      <p className={clsx(
        'leading-snug text-ocean-950',
        strong ? 'text-xl font-semibold' : 'text-sm font-medium'
      )}>
        {value || 'Hermes has not supplied this yet.'}
      </p>
    </section>
  );
}

function isBridgeUnavailable(error) {
  const message = error instanceof Error ? error.message : String(error || '');
  return error instanceof TypeError
    || message.includes('Failed to fetch')
    || message.includes('NetworkError')
    || message.includes('Load failed');
}

async function copyTextToClipboard(text) {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return false;

  await navigator.clipboard.writeText(text);
  return true;
}

function ActionMessage({ message }) {
  if (!message) return null;

  return (
    <div className={clsx(
      'rounded-xl border px-4 py-3 text-sm font-medium',
      message.type === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-800',
      message.type === 'warning' && 'border-amber-200 bg-amber-50 text-amber-800',
      message.type === 'error' && 'border-rose-200 bg-rose-50 text-rose-800'
    )}>
      {message.text}
    </div>
  );
}

function ItemRow({ item, onAssignHermes, onOpenFile, activeAction }) {
  const canAssignHermes = ASSIGNABLE_ITEM_TYPES.has(item.itemType);
  const canOpenFile = item.itemType === 'created_file' && Boolean(item.localPath);

  return (
    <li className="border-t border-graystone-100 first:border-t-0">
      <div className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_minmax(180px,240px)]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 text-sm font-semibold text-ocean-950">{item.title}</h3>
            {item.confidence && (
              <span className="rounded-full bg-aqua-50 px-2 py-0.5 text-[11px] font-medium text-ocean-800">
                {item.confidence}
              </span>
            )}
          </div>
          {item.summary && <p className="mt-1 text-sm text-graystone-700">{item.summary}</p>}
          {item.evidence && <p className="mt-1 text-xs text-graystone-500">{item.evidence}</p>}
          {item.localPath && (
            <p className="mt-2 break-all rounded-lg bg-graystone-50 px-2 py-1 font-mono text-[11px] text-graystone-700">
              {item.localPath}
            </p>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-2 lg:items-end">
          {item.nextAction && (
            <p className="text-sm font-medium text-ocean-900 lg:text-right">{item.nextAction}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <StatusBadge status={item.status} />
            {canAssignHermes && (
              <Button
                size="sm"
                variant="outline"
                className="px-3 py-1 text-xs"
                disabled={Boolean(activeAction)}
                onClick={() => onAssignHermes(item)}
              >
                <Icon name={activeAction === 'assign' ? 'loader-circle' : 'bot'} className="h-3 w-3" />
                {activeAction === 'assign' ? 'Assigning...' : 'Assign Hermes'}
              </Button>
            )}
            {canOpenFile && (
              <Button
                size="sm"
                variant="outline"
                className="px-3 py-1 text-xs"
                disabled={Boolean(activeAction)}
                onClick={() => onOpenFile(item)}
              >
                <Icon name={activeAction === 'open' ? 'loader-circle' : 'folder-open'} className="h-3 w-3" />
                {activeAction === 'open' ? 'Opening...' : 'Open File'}
              </Button>
            )}
            {item.sourceUrl && (
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-graystone-200 px-2 py-1 text-xs font-medium text-ocean-700 hover:bg-ocean-50"
              >
                <Icon name="external-link" className="h-3 w-3" />
                Open
              </a>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

function PacketSection({ config, items, onAssignHermes, onOpenFile, itemActions }) {
  return (
    <section className="rounded-xl border border-graystone-200 bg-white shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b border-graystone-100 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon name={config.icon} className="h-4 w-4 flex-shrink-0 text-ocean-600" />
          <h2 className="truncate text-sm font-semibold text-ocean-950">{config.title}</h2>
        </div>
        <span className="rounded-full bg-graystone-100 px-2 py-0.5 text-xs font-medium text-graystone-700">
          {items.length}
        </span>
      </header>
      {items.length > 0 ? (
        <ul>
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onAssignHermes={onAssignHermes}
              onOpenFile={onOpenFile}
              activeAction={itemActions[item.id] || ''}
            />
          ))}
        </ul>
      ) : (
        <p className="px-4 py-5 text-sm text-graystone-500">{config.empty}</p>
      )}
    </section>
  );
}

export default function StartOfDayView({ userEmail, authUserId }) {
  const [packet, setPacket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState('');
  const [isTelegram, setIsTelegram] = useState(false);
  const [itemActions, setItemActions] = useState({});
  const [actionMessage, setActionMessage] = useState(null);

  const loadPacket = useCallback(async () => {
    setLoading(true);
    const latest = await fetchLatestStartOfDayPacket(userEmail);
    setPacket(latest);
    setLoading(false);
  }, [userEmail]);

  useEffect(() => {
    configureTelegramMiniApp();
    setIsTelegram(isTelegramMiniApp());
  }, []);

  useEffect(() => {
    loadPacket();
  }, [loadPacket]);

  const groupedItems = useMemo(
    () => groupStartOfDayItems(packet?.items || []),
    [packet]
  );

  const updateStatus = async (status) => {
    if (!packet?.id) return;
    setSavingStatus(status);
    const updated = await updateStartOfDayPacketStatus(packet.id, status);
    if (updated) setPacket(updated);
    setSavingStatus('');
  };

  const setItemAction = (itemId, action) => {
    setItemActions((previous) => {
      const next = { ...previous };
      if (action) next[itemId] = action;
      else delete next[itemId];
      return next;
    });
  };

  const assignHermes = async (item) => {
    if (!authUserId) {
      setActionMessage({
        type: 'error',
        text: 'Sign in again before assigning Hermes from this packet.',
      });
      return;
    }

    setItemAction(item.id, 'assign');
    setActionMessage(null);
    try {
      const run = await createStartOfDayAgentRun({ item, userId: authUserId });
      setActionMessage({
        type: 'success',
        text: `Hermes run ${run?.id || 'queued'} has been assigned to "${item.title}".`,
      });
    } catch (error) {
      setActionMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Hermes could not be assigned to this task.',
      });
    } finally {
      setItemAction(item.id, '');
    }
  };

  const openFile = async (item) => {
    setItemAction(item.id, 'open');
    setActionMessage(null);
    try {
      await openStartOfDayLocalFile({ item });
      setActionMessage({
        type: 'success',
        text: `Opened "${item.title}" on the Mac.`,
      });
    } catch (error) {
      if (isBridgeUnavailable(error)) {
        try {
          const copied = await copyTextToClipboard(item.localPath);
          setActionMessage({
            type: 'warning',
            text: copied
              ? 'The local Mac bridge is not running, so the file path was copied instead.'
              : 'The local Mac bridge is not running. Start PM Hermes Cockpit to open files directly.',
          });
        } catch {
          setActionMessage({
            type: 'warning',
            text: 'The local Mac bridge is not running. Start PM Hermes Cockpit to open files directly.',
          });
        }
      } else {
        setActionMessage({
          type: 'error',
          text: error instanceof Error ? error.message : 'This file could not be opened.',
        });
      }
    } finally {
      setItemAction(item.id, '');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-sm text-graystone-600">Loading your start of day packet...</p>
        </div>
      </div>
    );
  }

  if (!packet) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-dashed border-graystone-300 bg-white p-8 text-center">
        <Icon name="sunrise" className="mx-auto h-10 w-10 text-ocean-500" />
        <h1 className="mt-4 text-2xl font-semibold text-ocean-950">Start Of Day</h1>
        <p className="mt-2 text-sm text-graystone-600">
          Momentum Hub is ready for Hermes' morning packet, but no packet has been created for this user yet.
        </p>
        <div className="mt-6">
          <Button variant="outline" onClick={loadPacket}>
            <Icon name="refresh-cw" className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" aria-busy={Boolean(savingStatus)}>
      <header className="rounded-2xl bg-ocean-800 p-5 text-white shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Icon name="sunrise" className="h-5 w-5 text-aqua-200" />
              <p className="text-sm font-medium text-ocean-100">{formatDate(packet.packetDate)}</p>
              <StatusBadge status={packet.ackStatus} />
              {isTelegram && (
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white">
                  Telegram Mini App
                </span>
              )}
            </div>
            <h1 className="mt-3 text-3xl font-semibold">Start Of Day</h1>
            <p className="mt-2 max-w-3xl text-sm text-ocean-100">
              Generated by Hermes{packet.generatedAt ? ` at ${formatTime(packet.generatedAt)}` : ''}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="bg-white text-ocean-900 hover:bg-ocean-50"
              disabled={Boolean(savingStatus)}
              onClick={() => updateStatus('started')}
            >
              <Icon name="play" className="h-4 w-4" />
              Start
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-white/30 bg-white/10 text-white hover:bg-white/20"
              disabled={Boolean(savingStatus)}
              onClick={() => updateStatus('snoozed')}
            >
              <Icon name="clock" className="h-4 w-4" />
              Snooze
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-white/30 bg-white/10 text-white hover:bg-white/20"
              disabled={Boolean(savingStatus)}
              onClick={() => updateStatus('done')}
            >
              <Icon name="check-circle-2" className="h-4 w-4" />
              Done
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-white/30 bg-white/10 text-white hover:bg-white/20"
              disabled={Boolean(savingStatus)}
              onClick={loadPacket}
            >
              <Icon name="refresh-cw" className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(220px,1fr)_minmax(220px,1fr)]">
        <FocusBlock label="Now" value={packet.primaryTask} icon="target" strong />
        <FocusBlock label="If You Finish Early" value={packet.ifYouFinishEarly} icon="arrow-right-circle" />
        <FocusBlock label="Re-entry Prompt" value={packet.reEntryPrompt} icon="repeat-2" />
      </div>

      <ActionMessage message={actionMessage} />

      <div className="grid gap-4 xl:grid-cols-2">
        {SECTION_CONFIG.map((config) => (
          <PacketSection
            key={config.key}
            config={config}
            items={groupedItems[config.key] || []}
            onAssignHermes={assignHermes}
            onOpenFile={openFile}
            itemActions={itemActions}
          />
        ))}
      </div>
    </div>
  );
}

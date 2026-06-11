import { useEffect, useRef } from 'react';
import { applyCockpitProductivityActions } from '../services/cockpitActions';
import { syncCockpitSnapshot } from '../services/cockpitSync';
import { Logger } from '../utils/logger';
import { APP_CONFIG } from '../utils/config';

const SNAPSHOT_DEBOUNCE_MS = 900;
const ACTION_POLL_INTERVAL_MS = 4000;

/**
 * Bridges the signed-in app to the local PM Hermes Cockpit:
 * publishes debounced state snapshots and polls for pending
 * productivity actions, applying them via the provided mutators.
 */
export function useCockpitSync({
  authChecked,
  isAuthenticated,
  userEmail,
  currentUser,
  items,
  ws,
  todosHook,
  ev,
}) {
  const actionPollActive = useRef(false);

  const bridgeReady =
    authChecked &&
    (!APP_CONFIG.AUTH_ENABLED || isAuthenticated) &&
    Boolean(userEmail) &&
    !items.loading;

  useEffect(() => {
    if (!bridgeReady) return;

    const timer = window.setTimeout(() => {
      syncCockpitSnapshot({
        entries: items.entries,
        workstreams: ws.workstreams,
        workstreamTasks: ws.workstreamTasks,
        todos: todosHook.todos,
        events: ev.events,
        userEmail,
      }).then((result) => {
        if (result.ok || result.skipped) return;
        Logger.debug('PM Hermes Cockpit sync unavailable');
      });
    }, SNAPSHOT_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [
    bridgeReady,
    userEmail,
    items.entries,
    ws.workstreams,
    ws.workstreamTasks,
    todosHook.todos,
    ev.events,
  ]);

  useEffect(() => {
    if (!bridgeReady) return;

    let cancelled = false;

    const pollCockpitActions = async () => {
      if (actionPollActive.current || cancelled) return;
      actionPollActive.current = true;
      try {
        await applyCockpitProductivityActions({
          addItem: items.addItem,
          createWorkstreamTask: ws.createWorkstreamTask,
          addTodo: todosHook.addTodo,
          updateEntry: items.updateEntry,
          updateWorkstreamTask: ws.updateWorkstreamTask,
          updateTodo: todosHook.updateTodo,
          currentUser,
          userEmail,
        });
      } catch {
        Logger.debug('PM Hermes Cockpit action sync unavailable');
      } finally {
        actionPollActive.current = false;
      }
    };

    pollCockpitActions();
    const timer = window.setInterval(pollCockpitActions, ACTION_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [
    bridgeReady,
    userEmail,
    items.addItem,
    items.updateEntry,
    ws.createWorkstreamTask,
    ws.updateWorkstreamTask,
    todosHook.addTodo,
    todosHook.updateTodo,
    currentUser,
  ]);
}

import React, { useEffect, useState } from 'react';
import { getSupabase } from '../../../api/supabase';
import { saveItem } from '../../../services/workflowItems';
import { createWhiteboard } from '../../../services/whiteboards';
import { savePersonalTodo } from '../../../services/todos';
import { createWorkstream, createWorkstreamTask } from '../../../services/workstreams';
import Icon from '../../ui/Icon';

const SOURCES = { telegram: 'Telegram', telegram_photo: 'Photo', manual: 'Manual' };

const DESTINATIONS = [
  { id: 'project',        label: 'Project',        icon: 'folder',         color: 'ocean' },
  { id: 'task',           label: 'Task',            icon: 'clipboard-list', color: 'ocean' },
  { id: 'workstream',     label: 'Workstream',      icon: 'layers',         color: 'ocean' },
  { id: 'workstream_task',label: 'WS Task',         icon: 'check-square',   color: 'ocean' },
  { id: 'todo',           label: 'Todo',            icon: 'calendar',       color: 'ocean' },
  { id: 'whiteboard',     label: 'Whiteboard',      icon: 'presentation',   color: 'ocean' },
  { id: 'parking_lot',    label: 'Park',            icon: 'archive',        color: 'gray' },
  { id: 'archive',        label: 'Archive',         icon: 'trash-2',        color: 'gray' },
];

export default function BrainDumpInbox({ workstreams = [], currentUser = '', userEmail = '' }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState(null); // item currently being actioned
  const [step, setStep] = useState(null); // null | 'pick-type' | 'pick-workstream'
  const [routing, setRouting] = useState(new Set());
  const [error, setError] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('brain_dumps')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(50);
    setItems(data || []);
    setLoading(false);
  }

  function openPicker(item) {
    setActiveItem(item);
    setStep('pick-type');
    setError(null);
  }

  function closePicker() {
    setActiveItem(null);
    setStep(null);
    setError(null);
  }

  async function handleDestination(destination) {
    if (destination === 'workstream_task') {
      setStep('pick-workstream');
      return;
    }
    await route(activeItem, destination, null);
  }

  async function handleWorkstreamPick(workstreamId) {
    await route(activeItem, 'workstream_task', workstreamId);
  }

  async function route(item, destination, workstreamId) {
    setRouting(prev => new Set(prev).add(item.id));
    closePicker();
    setError(null);

    let routedToId = null;

    try {
      if (destination === 'project') {
        const created = await saveItem(
          { title: item.content, itemType: 'project', owner: [currentUser], ownerEmail: [userEmail], tags: item.tags || [] },
          userEmail
        );
        routedToId = created?.id || null;

      } else if (destination === 'task') {
        const created = await saveItem(
          { title: item.content, itemType: 'job', owner: [currentUser], ownerEmail: [userEmail], tags: item.tags || [] },
          userEmail
        );
        routedToId = created?.id || null;

      } else if (destination === 'workstream') {
        const created = await createWorkstream(
          { title: item.content, description: '', owner: currentUser, visibility: 'shared', color: 'ocean' },
          userEmail
        );
        routedToId = created?.id || null;

      } else if (destination === 'workstream_task' && workstreamId) {
        const created = await createWorkstreamTask({
          workstreamId,
          title: item.content,
          priority: 'medium',
          tags: item.tags || [],
        });
        routedToId = created?.id || null;

      } else if (destination === 'todo') {
        await savePersonalTodo(
          { text: item.content, completed: false, date: new Date().toISOString().slice(0, 10) },
          userEmail
        );

      } else if (destination === 'whiteboard') {
        const created = await createWhiteboard({
          title: item.content,
          owner_email: userEmail,
          owner_name: currentUser,
        });
        routedToId = created?.id || null;
      }

      const supabase = getSupabase();
      await supabase
        .from('brain_dumps')
        .update({
          status: destination === 'archive' ? 'archived' : 'routed',
          routed_to_type: destination,
          routed_to_id: routedToId,
          routed_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      setItems(prev => prev.filter(i => i.id !== item.id));

    } catch (err) {
      console.error('BrainDumpInbox route error:', err);
      setError(`Couldn't route item: ${err.message || 'unknown error'}`);
    }

    setRouting(prev => { const s = new Set(prev); s.delete(item.id); return s; });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ocean-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ocean-900">Brain Dump Inbox</h1>
          <p className="text-sm text-graystone-600 mt-0.5">Ideas captured via Telegram, ready to route</p>
        </div>
        {items.length > 0 && (
          <span className="bg-ocean-100 text-ocean-700 text-sm font-medium px-3 py-1 rounded-full">
            {items.length} pending
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-16 bg-graystone-50 rounded-xl border border-graystone-200">
          <Icon name="inbox" className="w-12 h-12 text-graystone-300 mx-auto mb-3" />
          <p className="text-ocean-900 font-medium">Inbox clear</p>
          <p className="text-sm text-graystone-600 mt-1">New ideas will appear here when you message the bot</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const isRouting = routing.has(item.id);
            const isActive = activeItem?.id === item.id;
            const sourceLabel = SOURCES[item.source] || item.source;
            const age = formatAge(item.created_at);

            return (
              <li key={item.id} className="bg-white rounded-xl border border-graystone-200 shadow-sm p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-graystone-800 leading-relaxed">{item.content}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-xs text-graystone-500 bg-graystone-100 px-2 py-0.5 rounded-full">
                        {sourceLabel}
                      </span>
                      <span className="text-xs text-graystone-400">{age}</span>
                      {item.tags?.length > 0 && item.tags.map(tag => (
                        <span key={tag} className="text-xs bg-ocean-50 text-ocean-600 px-2 py-0.5 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {isActive && step === 'pick-type' && (
                  <div className="border-t border-graystone-100 pt-3">
                    <p className="text-xs font-medium text-graystone-600 mb-2">Route to:</p>
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {DESTINATIONS.map(dest => (
                        <button
                          key={dest.id}
                          onClick={() => handleDestination(dest.id)}
                          className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                            dest.color === 'gray'
                              ? 'bg-graystone-100 text-graystone-600 hover:bg-graystone-200'
                              : 'bg-ocean-50 text-ocean-700 hover:bg-ocean-100'
                          }`}
                        >
                          <Icon name={dest.icon} className="w-4 h-4" />
                          {dest.label}
                        </button>
                      ))}
                    </div>
                    <button
                      className="text-xs text-graystone-400 hover:text-graystone-600"
                      onClick={closePicker}
                    >
                      cancel
                    </button>
                  </div>
                )}

                {isActive && step === 'pick-workstream' && (
                  <div className="border-t border-graystone-100 pt-3">
                    <p className="text-xs font-medium text-graystone-600 mb-2">Pick workstream:</p>
                    {workstreams.length === 0 ? (
                      <p className="text-sm text-graystone-500">No workstreams yet</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {workstreams.map(ws => (
                          <button
                            key={ws.id}
                            className="text-sm bg-ocean-500 hover:bg-ocean-600 text-white px-3 py-1.5 rounded-lg transition-colors"
                            onClick={() => handleWorkstreamPick(ws.id)}
                          >
                            {ws.title}
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      className="text-xs text-graystone-400 hover:text-graystone-600"
                      onClick={() => setStep('pick-type')}
                    >
                      ← back
                    </button>
                  </div>
                )}

                {!isActive && (
                  <div className="flex items-center gap-2 border-t border-graystone-100 pt-3">
                    <button
                      disabled={isRouting}
                      className="text-sm bg-ocean-500 hover:bg-ocean-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors"
                      onClick={() => openPicker(item)}
                    >
                      {isRouting ? '…' : 'Route →'}
                    </button>
                    <button
                      disabled={isRouting}
                      className="text-sm border border-graystone-300 hover:bg-graystone-50 disabled:opacity-50 text-graystone-700 px-3 py-1.5 rounded-lg transition-colors"
                      onClick={() => route(item, 'parking_lot', null)}
                    >
                      park
                    </button>
                    <button
                      disabled={isRouting}
                      className="text-sm text-graystone-400 hover:text-graystone-600 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
                      onClick={() => route(item, 'archive', null)}
                    >
                      archive
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function formatAge(isoString) {
  const ms = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

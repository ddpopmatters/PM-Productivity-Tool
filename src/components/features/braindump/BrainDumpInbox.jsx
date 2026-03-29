import React, { useEffect, useState } from 'react';
import { getSupabase } from '../../../api/supabase';
import Icon from '../../ui/Icon';

const SOURCES = { telegram: 'Telegram', telegram_photo: 'Photo', manual: 'Manual' };

export default function BrainDumpInbox({ workstreams = [], onCreateWorkstreamTask, onOpenWorkstream }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pickerIndex, setPickerIndex] = useState(null);
  const [routing, setRouting] = useState(new Set());

  useEffect(() => {
    load();
  }, []);

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

  async function route(item, destination, workstreamId) {
    const supabase = getSupabase();
    setRouting(prev => new Set(prev).add(item.id));
    setPickerIndex(null);

    let routedToId = null;

    if (destination === 'workstream_task' && workstreamId) {
      const { data: task } = await supabase
        .from('workstream_tasks')
        .insert({
          workstream_id: workstreamId,
          title: item.content,
          priority: 'medium',
          status: 'open',
          tags: item.tags || [],
        })
        .select('id')
        .single();
      if (task) routedToId = task.id;
    }

    await supabase
      .from('brain_dumps')
      .update({
        status: 'routed',
        routed_to_type: destination,
        routed_to_id: routedToId,
        routed_at: new Date().toISOString(),
      })
      .eq('id', item.id);

    setItems(prev => prev.filter(i => i.id !== item.id));
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

      {items.length === 0 ? (
        <div className="text-center py-16 bg-graystone-50 rounded-xl border border-graystone-200">
          <Icon name="inbox" className="w-12 h-12 text-graystone-300 mx-auto mb-3" />
          <p className="text-ocean-900 font-medium">Inbox clear</p>
          <p className="text-sm text-graystone-600 mt-1">New ideas will appear here when you message the bot</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item, i) => {
            const isRouting = routing.has(item.id);
            const showPicker = pickerIndex === i;
            const sourceLabel = SOURCES[item.source] || item.source;
            const age = formatAge(item.created_at);

            return (
              <li key={item.id} className="bg-white rounded-xl border border-graystone-200 shadow-sm p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-graystone-800 leading-relaxed">{item.content}</p>
                    <div className="flex items-center gap-2 mt-1.5">
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

                {showPicker ? (
                  <div className="border-t border-graystone-100 pt-3">
                    <p className="text-xs font-medium text-graystone-600 mb-2">Route to workstream:</p>
                    {workstreams.length === 0 ? (
                      <p className="text-sm text-graystone-500">No workstreams yet</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {workstreams.map(ws => (
                          <button
                            key={ws.id}
                            className="text-sm bg-ocean-500 hover:bg-ocean-600 text-white px-3 py-1.5 rounded-lg transition-colors"
                            onClick={() => route(item, 'workstream_task', ws.id)}
                          >
                            {ws.title}
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      className="text-xs text-graystone-500 hover:text-graystone-700"
                      onClick={() => setPickerIndex(null)}
                    >
                      cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 border-t border-graystone-100 pt-3">
                    <button
                      disabled={isRouting}
                      className="text-sm bg-ocean-500 hover:bg-ocean-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors"
                      onClick={() => setPickerIndex(i)}
                    >
                      {isRouting ? '…' : '→ task'}
                    </button>
                    <button
                      disabled={isRouting}
                      className="text-sm border border-graystone-300 hover:bg-graystone-50 disabled:opacity-50 text-graystone-700 px-3 py-1.5 rounded-lg transition-colors"
                      onClick={() => route(item, 'parking_lot')}
                    >
                      park
                    </button>
                    <button
                      disabled={isRouting}
                      className="text-sm text-graystone-400 hover:text-graystone-600 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
                      onClick={() => route(item, 'archive')}
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

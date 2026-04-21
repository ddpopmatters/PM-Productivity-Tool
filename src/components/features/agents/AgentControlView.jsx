import React, { useEffect, useMemo, useState } from 'react';
import {
  createAgentRun,
  decideAgentApproval,
  listAgentApprovals,
  listAgentContracts,
  listAgentProfiles,
  listAgentRuns,
  runAgentChatCommand,
} from '../../../services/agentControl';

const MODE_OPTIONS = [
  { value: 'social', label: 'Social' },
  { value: 'website', label: 'Website' },
  { value: 'ai_ops', label: 'AI Ops' },
];

export default function AgentControlView({ authUserId }) {
  const [profiles, setProfiles] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [runs, setRuns] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [newRun, setNewRun] = useState({ mode: 'social', objective: '' });
  const [chatCommand, setChatCommand] = useState('');
  const [chatSubmitting, setChatSubmitting] = useState(false);
  const [chatResult, setChatResult] = useState(null);

  async function loadAll() {
    setLoading(true);
    const [profilesData, contractsData, runsData, approvalsData] = await Promise.all([
      listAgentProfiles(),
      listAgentContracts(),
      listAgentRuns(20),
      listAgentApprovals('pending'),
    ]);
    setProfiles(profilesData);
    setContracts(contractsData);
    setRuns(runsData);
    setApprovals(approvalsData);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();

    const timer = window.setInterval(() => {
      loadAll();
    }, 15000);

    return () => window.clearInterval(timer);
  }, []);

  const activeProfiles = useMemo(() => profiles.filter((p) => p.enabled), [profiles]);

  async function handleCreateRun(event) {
    event.preventDefault();
    if (!newRun.objective.trim()) {
      setMessage({ type: 'error', text: 'Objective is required.' });
      return;
    }

    if (!authUserId) {
      setMessage({ type: 'error', text: 'Missing auth user context.' });
      return;
    }

    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      await createAgentRun({
        mode: newRun.mode,
        requestedBy: authUserId,
        inputPayload: {
          objective: newRun.objective.trim(),
          source: 'mini_app',
        },
      });

      setNewRun((prev) => ({ ...prev, objective: '' }));
      setMessage({ type: 'success', text: 'Run queued.' });
      await loadAll();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to queue run.' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApproval(approvalId, decision) {
    setMessage({ type: '', text: '' });
    try {
      await decideAgentApproval({ approvalId, decision });
      setMessage({ type: 'success', text: `Approval ${decision}.` });
      await loadAll();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update approval.' });
    }
  }

  async function handleChatCommandSubmit(event) {
    event.preventDefault();
    const command = chatCommand.trim();
    if (!command) {
      setChatResult({ type: 'error', text: 'Command is required.', mutation: null });
      return;
    }

    setChatSubmitting(true);
    setChatResult(null);

    try {
      const result = await runAgentChatCommand(command);
      setChatResult({
        type: 'success',
        text: result.message || 'Command applied.',
        mutation: result.mutation || null,
      });
      setChatCommand('');
      await loadAll();
    } catch (error) {
      setChatResult({
        type: 'error',
        text: error.message || 'Failed to apply command.',
        mutation: null,
      });
    } finally {
      setChatSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading text-ocean-900">Agent Control</h1>
          <p className="text-sm text-graystone-600">Run Console, Profiles, Contracts, and Approvals.</p>
        </div>
        <button
          type="button"
          onClick={loadAll}
          className="rounded-lg border border-graystone-300 px-3 py-2 text-sm hover:bg-graystone-50"
        >
          Refresh
        </button>
      </div>

      {message.text && (
        <div className={`rounded-lg px-4 py-3 text-sm ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {message.text}
        </div>
      )}

      <section className="rounded-xl border border-graystone-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold text-ocean-900">Queue Run</h2>
        <form className="space-y-3" onSubmit={handleCreateRun}>
          <div>
            <label className="mb-1 block text-sm text-graystone-700">Mode</label>
            <select
              className="w-full rounded-lg border border-graystone-300 px-3 py-2 text-sm"
              value={newRun.mode}
              onChange={(e) => setNewRun((prev) => ({ ...prev, mode: e.target.value }))}
            >
              {MODE_OPTIONS.map((mode) => (
                <option key={mode.value} value={mode.value}>{mode.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-graystone-700">Objective</label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-graystone-300 px-3 py-2 text-sm"
              value={newRun.objective}
              onChange={(e) => setNewRun((prev) => ({ ...prev, objective: e.target.value }))}
              placeholder="What should this run produce?"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-ocean-700 px-4 py-2 text-sm font-medium text-white hover:bg-ocean-600 disabled:opacity-60"
          >
            {submitting ? 'Queueing…' : 'Queue run'}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-graystone-200 bg-white p-4">
        <h2 className="mb-2 text-lg font-semibold text-ocean-900">Command Chat (Intel + Workstreams)</h2>
        <p className="mb-3 text-sm text-graystone-600">
          Use chat commands to update live PM data.
        </p>
        <form className="space-y-3" onSubmit={handleChatCommandSubmit}>
          <textarea
            rows={3}
            className="w-full rounded-lg border border-graystone-300 px-3 py-2 text-sm"
            placeholder={'Try: intel add New IPPF report on rights backlash in East Africa\nOr: workstream set <task_id> status in_progress'}
            value={chatCommand}
            onChange={(e) => setChatCommand(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={chatSubmitting}
              className="rounded-lg bg-ocean-700 px-4 py-2 text-sm font-medium text-white hover:bg-ocean-600 disabled:opacity-60"
            >
              {chatSubmitting ? 'Applying…' : 'Apply command'}
            </button>
            <button
              type="button"
              onClick={() => setChatCommand('help')}
              className="rounded-lg border border-graystone-300 px-3 py-2 text-sm text-graystone-700 hover:bg-graystone-50"
            >
              Insert help
            </button>
          </div>
        </form>

        <div className="mt-3 rounded-lg bg-graystone-50 p-3 text-xs text-graystone-700">
          <div className="font-medium text-graystone-800">Supported</div>
          <div>intel add &lt;text&gt;</div>
          <div>workstream add &lt;workstream_id&gt; | &lt;title&gt; | &lt;optional description&gt;</div>
          <div>workstream set &lt;task_id&gt; status &lt;open|in_progress|blocked|done&gt;</div>
          <div>workstream set &lt;task_id&gt; due &lt;YYYY-MM-DD&gt;</div>
        </div>

        {chatResult?.text && (
          <div className={`mt-3 rounded-lg px-4 py-3 text-sm ${chatResult.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
            <div>{chatResult.text}</div>
            {chatResult.mutation && (
              <pre className="mt-2 overflow-auto whitespace-pre-wrap rounded bg-white/70 p-2 text-xs text-graystone-800">
                {JSON.stringify(chatResult.mutation, null, 2)}
              </pre>
            )}
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-graystone-200 bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold text-ocean-900">Profiles</h2>
          {loading ? <p className="text-sm text-graystone-500">Loading…</p> : (
            <ul className="space-y-2 text-sm">
              {activeProfiles.map((profile) => (
                <li key={profile.id} className="rounded-lg border border-graystone-100 px-3 py-2">
                  <div className="font-medium text-ocean-900">{profile.name}</div>
                  <div className="text-graystone-600">{profile.role} · {profile.policy_level}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-graystone-200 bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold text-ocean-900">Approvals</h2>
          {loading ? <p className="text-sm text-graystone-500">Loading…</p> : approvals.length === 0 ? (
            <p className="text-sm text-graystone-500">No pending approvals.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {approvals.map((approval) => (
                <li key={approval.id} className="rounded-lg border border-graystone-100 px-3 py-2">
                  <div className="font-medium text-ocean-900">Run {approval.run?.mode || 'unknown'}</div>
                  <div className="text-graystone-600">Profile: {approval.profile?.name || 'build'}</div>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleApproval(approval.id, 'approved')}
                      className="rounded-md bg-green-600 px-2 py-1 text-xs text-white"
                    >Approve</button>
                    <button
                      type="button"
                      onClick={() => handleApproval(approval.id, 'rejected')}
                      className="rounded-md bg-red-600 px-2 py-1 text-xs text-white"
                    >Reject</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-graystone-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold text-ocean-900">Recent Runs</h2>
        {loading ? <p className="text-sm text-graystone-500">Loading…</p> : runs.length === 0 ? (
          <p className="text-sm text-graystone-500">No runs yet.</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-graystone-200 text-xs uppercase tracking-wide text-graystone-500">
                <tr>
                  <th className="py-2 pr-3">Mode</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Created</th>
                  <th className="py-2 pr-3">Objective</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="border-b border-graystone-100">
                    <td className="py-2 pr-3 text-ocean-900">{run.mode}</td>
                    <td className="py-2 pr-3">{run.status}</td>
                    <td className="py-2 pr-3 text-graystone-600">{new Date(run.createdAt).toLocaleString()}</td>
                    <td className="py-2 pr-3 text-graystone-700">{run.inputPayload?.objective || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-graystone-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold text-ocean-900">Contracts</h2>
        {loading ? <p className="text-sm text-graystone-500">Loading…</p> : (
          <ul className="space-y-2 text-sm">
            {contracts.map((contract) => (
              <li key={contract.id} className="rounded-lg border border-graystone-100 px-3 py-2">
                <span className="font-medium text-ocean-900">{contract.from_profile?.name}</span>
                <span className="text-graystone-500"> → </span>
                <span className="font-medium text-ocean-900">{contract.to_profile?.name}</span>
                <span className="ml-2 text-graystone-600">({contract.failure_action})</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

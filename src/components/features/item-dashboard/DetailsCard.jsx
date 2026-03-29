import { useState } from 'react';
import clsx from 'clsx';
import { Icon } from '../../ui';
import { SEED_USERS, TEAMS, PHASES, getPhaseFromDate } from '../../../utils/config';

export default function DetailsCard({ entry, canEdit, onUpdateEntry, USERS }) {
  const [editingDetails, setEditingDetails] = useState(false);
  const [editOwners, setEditOwners] = useState(entry?.owner || []);
  const [editCollaborators, setEditCollaborators] = useState(entry?.collaborators || []);
  const [editTimeline, setEditTimeline] = useState(entry?.date || entry?.timelineValue || '');
  const [editPhase, setEditPhase] = useState(entry?.phase || '');
  const [editTeam, setEditTeam] = useState(entry?.team || '');
  const [collaboratorSearch, setCollaboratorSearch] = useState('');
  const [ownerSearch, setOwnerSearch] = useState('');

  const startEditingDetails = () => {
    setEditOwners(entry?.owner || []);
    setEditCollaborators(entry?.collaborators || []);
    setEditTimeline(entry?.date || entry?.timelineValue || '');
    setEditPhase(entry?.phase || '');
    setEditTeam(entry?.team || '');
    setEditingDetails(true);
  };

  const saveDetails = () => {
    if (onUpdateEntry) {
      const isFullDate = editTimeline && /^\d{4}-\d{2}-\d{2}$/.test(editTimeline);
      const computedPhase = editPhase || getPhaseFromDate(editTimeline) || null;
      const updates = {
        owner: editOwners,
        collaborators: editCollaborators,
        team: editTeam,
        date: isFullDate ? editTimeline : null,
        timelineValue: editTimeline || null,
        phase: computedPhase,
      };
      const ownerEmails = editOwners.map((name) => {
        const seedUser = SEED_USERS.find((u) => u.name === name);
        return seedUser?.email || '';
      }).filter(Boolean);
      updates.ownerEmail = ownerEmails;
      onUpdateEntry(entry.id, updates);
    }
    setEditingDetails(false);
  };

  const cancelEditingDetails = () => {
    setEditingDetails(false);
    setCollaboratorSearch('');
    setOwnerSearch('');
  };

  const removeOwnerImmediate = (name) => {
    if (!entry?.owner || entry.owner.length <= 1) return;
    const newOwners = entry.owner.filter((o) => o !== name);
    const newEmails = newOwners.map((n) => {
      const seedUser = SEED_USERS.find((u) => u.name === n);
      return seedUser?.email || '';
    }).filter(Boolean);
    if (onUpdateEntry) onUpdateEntry(entry.id, { owner: newOwners, ownerEmail: newEmails });
  };

  const addOwner = (name) => {
    if (name && !editOwners.includes(name)) setEditOwners([...editOwners, name]);
    setOwnerSearch('');
  };

  const removeOwner = (name) => {
    if (editOwners.length <= 1) return;
    setEditOwners(editOwners.filter((o) => o !== name));
  };

  const addCollaborator = (name) => {
    if (name && !editCollaborators.includes(name) && !editOwners.includes(name)) {
      setEditCollaborators([...editCollaborators, name]);
    }
    setCollaboratorSearch('');
  };

  const removeCollaborator = (name) => {
    setEditCollaborators(editCollaborators.filter((c) => c !== name));
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-graystone-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-ocean-900">Details</h3>
        {canEdit && !editingDetails && (
          <button
            onClick={startEditingDetails}
            className="p-1.5 rounded-lg hover:bg-ocean-50 transition-colors"
            title="Edit details"
          >
            <Icon name="pencil" className="w-4 h-4 text-ocean-600" />
          </button>
        )}
      </div>

      {/* Team */}
      <div>
        <div className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1">Team</div>
        {editingDetails ? (
          <select
            value={editTeam}
            onChange={(e) => setEditTeam(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-ocean-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
          >
            <option value="">No team</option>
            {TEAMS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-ocean-500" />
            <span className="text-sm font-medium text-graystone-900">{entry.team || 'No team'}</span>
          </div>
        )}
      </div>

      {/* Owners */}
      <div>
        <div className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1">Owners</div>
        {editingDetails ? (
          <div className="space-y-2">
            {editOwners.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {editOwners.map((ownerName) => (
                  <div key={ownerName} className="flex items-center gap-1 px-2 py-1 bg-ocean-100 text-ocean-800 rounded-full text-xs">
                    <span>{ownerName}</span>
                    {editOwners.length > 1 && (
                      <button onClick={() => removeOwner(ownerName)} className="w-4 h-4 flex items-center justify-center hover:bg-ocean-200 rounded-full">
                        <Icon name="x" className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="relative">
              <input
                type="text"
                value={ownerSearch}
                onChange={(e) => setOwnerSearch(e.target.value)}
                placeholder="Add owner..."
                className="w-full px-3 py-2 text-sm border border-ocean-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
              />
              {ownerSearch && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-ocean-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {USERS.filter((u) => u.toLowerCase().includes(ownerSearch.toLowerCase()) && !editOwners.includes(u))
                    .slice(0, 5)
                    .map((user) => (
                      <button key={user} onClick={() => addOwner(user)} className="w-full px-3 py-2 text-left text-sm hover:bg-ocean-50 transition">
                        {user}
                      </button>
                    ))}
                  {USERS.filter((u) => u.toLowerCase().includes(ownerSearch.toLowerCase()) && !editOwners.includes(u)).length === 0 && (
                    <div className="px-3 py-2 text-sm text-graystone-400">No matches</div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : entry.owner && entry.owner.length > 0 ? (
          <div className="flex flex-col gap-2">
            {entry.owner.map((ownerName) => (
              <div key={ownerName} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-graystone-200 flex items-center justify-center text-xs font-bold text-graystone-600">
                  {ownerName.charAt(0)}
                </div>
                <span className="text-sm font-medium text-graystone-900">{ownerName}</span>
                {entry.owner.length > 1 && (
                  <button
                    onClick={() => removeOwnerImmediate(ownerName)}
                    className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-graystone-200 transition-colors"
                    title={`Remove ${ownerName} as owner`}
                  >
                    <Icon name="x" className="w-3 h-3 text-graystone-400" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <span className="text-sm text-graystone-400">None</span>
        )}
      </div>

      {/* Collaborators */}
      <div>
        <div className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1">Collaborators</div>
        {editingDetails ? (
          <div className="space-y-2">
            {editCollaborators.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {editCollaborators.map((collab) => (
                  <div key={collab} className="flex items-center gap-1 px-2 py-1 bg-ocean-100 text-ocean-800 rounded-full text-xs">
                    <span>{collab}</span>
                    <button onClick={() => removeCollaborator(collab)} className="w-4 h-4 flex items-center justify-center hover:bg-ocean-200 rounded-full">
                      <Icon name="x" className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="relative">
              <input
                type="text"
                value={collaboratorSearch}
                onChange={(e) => setCollaboratorSearch(e.target.value)}
                placeholder="Add collaborator..."
                className="w-full px-3 py-2 text-sm border border-ocean-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
              />
              {collaboratorSearch && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-ocean-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {USERS.filter(
                    (u) => u.toLowerCase().includes(collaboratorSearch.toLowerCase()) && !editCollaborators.includes(u) && !editOwners.includes(u)
                  )
                    .slice(0, 5)
                    .map((user) => (
                      <button key={user} onClick={() => addCollaborator(user)} className="w-full px-3 py-2 text-left text-sm hover:bg-ocean-50 transition">
                        {user}
                      </button>
                    ))}
                  {USERS.filter(
                    (u) => u.toLowerCase().includes(collaboratorSearch.toLowerCase()) && !editCollaborators.includes(u) && !editOwners.includes(u)
                  ).length === 0 && (
                    <div className="px-3 py-2 text-sm text-graystone-400">No matches</div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : entry.collaborators && entry.collaborators.length > 0 ? (
          <div className="flex flex-col gap-2">
            {entry.collaborators.map((collab) => (
              <div key={collab} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-ocean-100 flex items-center justify-center text-xs font-bold text-ocean-600 border border-ocean-200">
                  {collab.charAt(0)}
                </div>
                <span className="text-sm font-medium text-graystone-900">{collab}</span>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-sm text-graystone-400">None</span>
        )}
      </div>

      {/* Timeline */}
      <div>
        <div className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1">Timeline</div>
        {editingDetails ? (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={editTimeline}
              onChange={(e) => setEditTimeline(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-ocean-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
            />
            {editTimeline && (
              <button onClick={() => setEditTimeline('')} className="p-2 text-graystone-400 hover:text-graystone-600" title="Clear date">
                <Icon name="x" className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Icon name="calendar-clock" className="w-4 h-4 text-ocean-500" />
            <span className="text-sm font-medium text-graystone-900">
              {entry.timelineType === 'date'
                ? new Date(entry.timelineValue).toLocaleDateString()
                : entry.timelineValue || 'No date'}
            </span>
          </div>
        )}
      </div>

      {/* Phase */}
      <div>
        <div className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1">Phase</div>
        {editingDetails ? (
          <div className="space-y-1.5">
            {PHASES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setEditPhase(editPhase === p.value ? '' : p.value)}
                className={clsx(
                  'w-full px-3 py-2 rounded-lg border text-left transition-all text-sm',
                  editPhase === p.value
                    ? 'bg-ocean-50 border-ocean-400 ring-1 ring-ocean-200 font-medium text-ocean-900'
                    : 'border-graystone-200 text-graystone-600 hover:border-ocean-300'
                )}
              >
                <span className="font-medium">{p.label}</span>
                <span className="text-xs text-graystone-400 ml-2">{p.description}</span>
              </button>
            ))}
            {editPhase && (
              <button onClick={() => setEditPhase('')} className="text-xs text-ocean-600 hover:text-ocean-800 underline">
                Clear (auto-detect from deadline)
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Icon name="layers" className="w-4 h-4 text-ocean-500" />
            <span className="text-sm font-medium text-graystone-900">
              {entry.phase || getPhaseFromDate(entry.date || entry.timelineValue) || 'No phase'}
            </span>
            {!entry.phase && getPhaseFromDate(entry.date || entry.timelineValue) && (
              <span className="text-xs text-graystone-400">(auto)</span>
            )}
          </div>
        )}
      </div>

      {/* Save/Cancel */}
      {editingDetails && (
        <div className="flex gap-2 pt-2 border-t border-graystone-200">
          <button
            onClick={saveDetails}
            className="flex-1 px-3 py-2 bg-ocean-500 hover:bg-ocean-600 text-white text-sm font-medium rounded-lg transition"
          >
            Save
          </button>
          <button
            onClick={cancelEditingDetails}
            className="flex-1 px-3 py-2 bg-graystone-100 hover:bg-graystone-200 text-graystone-700 text-sm font-medium rounded-lg transition"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

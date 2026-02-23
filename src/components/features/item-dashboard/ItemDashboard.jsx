import React, { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { Icon, Badge } from '../../ui';
import SubtaskDetailModal from './SubtaskDetailModal';
import DescriptionModal from './DescriptionModal';
import DocumentsModal from './DocumentsModal';
import DependenciesModal from './DependenciesModal';
import CustomFieldsModal from './CustomFieldsModal';
import ItemHeader from './ItemHeader';
import SharePointLinks from './SharePointLinks';
import CommentsSection from './CommentsSection';
import HandoffNotesSection from './HandoffNotesSection';
import DetailsCard from './DetailsCard';
import DependenciesCard from './DependenciesCard';
import TagsCard from './TagsCard';
import CustomFieldsCard from './CustomFieldsCard';
import AttachmentsCard from './AttachmentsCard';
import AnalyticsCard from './AnalyticsCard';

export default function ItemDashboard({
  entry,
  onBack,
  onToggleSubtask,
  onDeleteSubtask,
  onEditSubtask,
  onUpdateEntry,
  openSubtaskModal,
  currentUser,
  userEmail,
  allEntries = [],
  onNavigateToWhiteboard,
  onConvert,
  USERS,
  KANBAN_STATUSES,
  userProfilesCache,
  sendNotificationEmail,
  SUPABASE_API,
  Logger,
  canEditItem,
  WhiteboardPreviewCard,
  WHITEBOARD_API,
}) {
  const getCaption = () => (entry && typeof entry.caption === 'string' ? entry.caption : '');
  const getDocuments = () => (entry && Array.isArray(entry.documents) ? entry.documents : []);

  const canEdit = canEditItem(entry, userEmail, currentUser);

  // Modal visibility state
  const [descriptionModalOpen, setDescriptionModalOpen] = useState(false);
  const [documentsModalOpen, setDocumentsModalOpen] = useState(false);
  const [dependenciesModalOpen, setDependenciesModalOpen] = useState(false);
  const [customFieldsModalOpen, setCustomFieldsModalOpen] = useState(false);

  // Description editing state
  const [descriptionDraft, setDescriptionDraft] = useState(getCaption());
  const [descMentionQuery, setDescMentionQuery] = useState('');
  const [descMentionOptions, setDescMentionOptions] = useState([]);

  // Documents editing state
  const [documentsDraft, setDocumentsDraft] = useState(getDocuments());
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocUrl, setNewDocUrl] = useState('');
  const [newDocNotes, setNewDocNotes] = useState('');
  const [showAddLinkForm, setShowAddLinkForm] = useState(false);
  const fileInputRef = useRef(null);

  // Dependencies state
  const [dependencySearch, setDependencySearch] = useState('');

  // Custom fields state
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');

  // Subtask detail state
  const [activeSubtask, setActiveSubtask] = useState(null);
  const [editingSubtask, setEditingSubtask] = useState(false);
  const [editSubtaskTitle, setEditSubtaskTitle] = useState('');
  const [editSubtaskDeadline, setEditSubtaskDeadline] = useState('');
  const [editSubtaskOwner, setEditSubtaskOwner] = useState('');
  const [editSubtaskContext, setEditSubtaskContext] = useState('');

  useEffect(() => {
    setDescriptionDraft(getCaption());
    setDocumentsDraft(getDocuments());
    setDescMentionQuery('');
    setDescMentionOptions([]);
  }, [entry]);

  useEffect(() => {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }, [descriptionModalOpen, documentsModalOpen]);

  if (!entry) return null;

  // Description @Mentions
  const updateDescMentionOptions = (value) => {
    const match = value.match(/@([a-z0-9\s]*)$/i);
    if (match) {
      const query = match[1].trim().toLowerCase();
      setDescMentionQuery(query);
      const pool = Array.from(
        new Set([...(entry.collaborators || []), ...(entry.owner || []), ...USERS])
      ).filter(Boolean);
      setDescMentionOptions(pool.filter((name) => name.toLowerCase().includes(query)).slice(0, 6));
    } else {
      setDescMentionQuery('');
      setDescMentionOptions([]);
    }
  };

  const handleDescriptionChange = (e) => {
    setDescriptionDraft(e.target.value);
    updateDescMentionOptions(e.target.value);
  };

  const handleDescMentionPick = (name) => {
    setDescriptionDraft((prev) => prev.replace(/@([a-z0-9\s]*)$/i, `@${name} `));
    setDescMentionQuery('');
    setDescMentionOptions([]);
  };

  const handleDescriptionSave = () => {
    if (onUpdateEntry) {
      onUpdateEntry(entry.id, { caption: descriptionDraft });
    }
    const mentionMatches = descriptionDraft.match(/@([A-Za-z\s]+?)(?=\s|$|@)/g);
    if (mentionMatches) {
      mentionMatches.map((m) => m.slice(1).trim()).forEach((name) => {
        const profile = userProfilesCache.find((p) => p.name.toLowerCase() === name.toLowerCase());
        if (profile?.email) {
          sendNotificationEmail(profile.email, profile.name, 'mention', entry.title, entry.id, {
            comment: descriptionDraft.substring(0, 200),
          });
        }
      });
    }
    setDescMentionQuery('');
    setDescMentionOptions([]);
    setDescriptionModalOpen(false);
  };

  // Document helpers
  const getDocTitle = (doc) => (typeof doc === 'string' ? doc : doc.title || doc.url || 'Untitled');
  const getDocUrl = (doc) => {
    if (typeof doc === 'string') return doc.startsWith('http://') || doc.startsWith('https://') ? doc : null;
    return doc.url || null;
  };
  const getDocNotes = (doc) => (typeof doc === 'string' ? null : doc.notes || null);

  const resetDocForm = () => { setNewDocTitle(''); setNewDocUrl(''); setNewDocNotes(''); setShowAddLinkForm(false); };

  const handleDocumentsSave = () => {
    if (onUpdateEntry) {
      const cleaned = documentsDraft.filter((doc) => {
        if (typeof doc === 'string') return doc.trim();
        return doc && (doc.title?.trim() || doc.url?.trim());
      });
      onUpdateEntry(entry.id, { documents: cleaned });
    }
    resetDocForm();
    setDocumentsModalOpen(false);
  };

  const addDocumentDraft = () => {
    const title = newDocTitle.trim();
    const url = newDocUrl.trim();
    const notes = newDocNotes.trim();
    if (!title && !url) return;
    setDocumentsDraft((prev) => [...prev, { id: `doc${Date.now()}`, title: title || 'Untitled Link', url, notes }]);
    resetDocForm();
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setDocumentsDraft((prev) => [...prev, ...files.map((file) => file.name)]);
    event.target.value = '';
  };

  const removeDocumentDraft = (index) => {
    setDocumentsDraft((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOpenSubtaskModal = () => {
    if (openSubtaskModal) openSubtaskModal(entry.id);
  };

  return (
    <>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <ItemHeader
          entry={entry}
          canEdit={canEdit}
          onBack={onBack}
          onUpdateEntry={onUpdateEntry}
          onConvert={onConvert}
          KANBAN_STATUSES={KANBAN_STATUSES}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white rounded-3xl p-6 border border-ocean-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-ocean-900">Description</h3>
                {canEdit ? (
                  <button
                    onClick={() => { setDescriptionDraft(getCaption()); setDescriptionModalOpen(true); }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-ocean-50 transition-colors"
                  >
                    <Icon name="edit" className="w-5 h-5 text-ocean-600" />
                  </button>
                ) : (
                  <span className="text-xs text-graystone-400 flex items-center gap-1">
                    <Icon name="eye" className="w-3 h-3" /> View only
                  </span>
                )}
              </div>
              <p className="text-graystone-700 leading-relaxed">
                {entry.caption || 'No description provided.'}
              </p>
            </div>

            <SharePointLinks
              entry={entry}
              canEdit={canEdit}
              onOpenModal={() => { setDocumentsDraft(getDocuments()); resetDocForm(); setDocumentsModalOpen(true); }}
              getDocTitle={getDocTitle}
              getDocUrl={getDocUrl}
              getDocNotes={getDocNotes}
            />

            {/* Subtasks */}
            <div className="bg-white rounded-3xl p-6 border border-ocean-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-ocean-900">Subtasks</h3>
                  {entry.subtasks && entry.subtasks.length > 0 && (
                    <Badge variant="secondary">
                      {entry.subtasks.filter((st) => st.completed).length}/{entry.subtasks.length}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleOpenSubtaskModal}
                    disabled={!openSubtaskModal}
                    className={clsx(
                      'w-8 h-8 flex items-center justify-center rounded-lg transition-colors',
                      openSubtaskModal ? 'hover:bg-ocean-50' : 'cursor-not-allowed opacity-50'
                    )}
                    title="Add subtask"
                  >
                    <Icon name="plus" className="w-5 h-5 text-ocean-600" />
                  </button>
                  <button
                    onClick={() => { if (entry.subtasks?.length) setActiveSubtask(entry.subtasks[0]); }}
                    disabled={!entry.subtasks?.length}
                    className={clsx(
                      'w-8 h-8 flex items-center justify-center rounded-lg transition-colors',
                      entry.subtasks?.length ? 'hover:bg-ocean-50' : 'cursor-not-allowed opacity-50'
                    )}
                    title="View subtask details"
                  >
                    <Icon name="info" className="w-5 h-5 text-ocean-600" />
                  </button>
                </div>
              </div>
              {entry.subtasks && entry.subtasks.length > 0 ? (
                <div className="space-y-2">
                  {entry.subtasks.map((subtask) => {
                    const viewer = currentUser || 'Guest';
                    const canToggle = subtask.assignedTo === viewer;
                    return (
                      <div
                        key={subtask.id}
                        className={clsx(
                          'flex items-center gap-3 p-3 rounded-xl border transition-all',
                          subtask.completed ? 'bg-graystone-50 border-graystone-200' : 'bg-white border-ocean-200 hover:border-ocean-300'
                        )}
                        onClick={() => setActiveSubtask(subtask)}
                      >
                        <input
                          type="checkbox"
                          checked={subtask.completed}
                          disabled={!canToggle}
                          onChange={() => canToggle && onToggleSubtask(entry.id, subtask.id)}
                          className={clsx(
                            'w-5 h-5 rounded border-2 transition-all',
                            canToggle ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
                            subtask.completed ? 'bg-ocean-600 border-ocean-600' : 'border-graystone-300 hover:border-ocean-400'
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <div className={clsx('text-sm font-medium', subtask.completed ? 'line-through text-graystone-500' : 'text-graystone-900')}>
                            {subtask.title}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full bg-ocean-100 flex items-center justify-center text-xs font-bold text-ocean-600 border border-ocean-200"
                            title={subtask.assignedTo || 'Unassigned'}
                          >
                            {(subtask.assignedTo || '?').charAt(0)}
                          </div>
                          <span className="text-xs text-graystone-500">
                            {(subtask.assignedTo || 'Unassigned').split(' ')[0]}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setActiveSubtask(subtask); }}
                            className="p-1 rounded-full hover:bg-ocean-50 transition-colors"
                            title="Open subtask"
                          >
                            <Icon name="external-link" className="w-4 h-4 text-ocean-700" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-graystone-500 bg-graystone-50 rounded-xl border border-dashed border-graystone-200">
                  <div className="flex justify-center mb-2 opacity-50">
                    <Icon name="list-checks" className="w-8 h-8" />
                  </div>
                  <p className="text-sm mb-3">No subtasks yet</p>
                  {canEdit && (
                    <button
                      onClick={() => openSubtaskModal(entry.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ocean-500 text-white text-sm font-medium rounded-lg hover:bg-ocean-600 transition-colors"
                    >
                      <Icon name="plus" className="w-4 h-4" />
                      Add Subtask
                    </button>
                  )}
                </div>
              )}
            </div>

            <CommentsSection
              entry={entry}
              currentUser={currentUser}
              USERS={USERS}
              onUpdateEntry={onUpdateEntry}
              userProfilesCache={userProfilesCache}
              sendNotificationEmail={sendNotificationEmail}
            />

            {/* Whiteboard */}
            {entry.itemType !== 'job' && WhiteboardPreviewCard && (
              <div className="bg-white rounded-3xl p-6 border border-ocean-100 shadow-sm">
                <h3 className="text-lg font-bold text-ocean-900 mb-4 flex items-center gap-2">
                  <Icon name="layout" className="w-5 h-5 text-ocean-500" />
                  Whiteboard
                </h3>
                <WhiteboardPreviewCard
                  workflowItemId={entry.id}
                  itemTitle={entry.title}
                  userEmail={userEmail}
                  currentUser={currentUser}
                  onNavigate={onNavigateToWhiteboard}
                  WHITEBOARD_API={WHITEBOARD_API}
                />
              </div>
            )}

            <HandoffNotesSection
              entry={entry}
              canEdit={canEdit}
              currentUser={currentUser}
              USERS={USERS}
              onUpdateEntry={onUpdateEntry}
              userProfilesCache={userProfilesCache}
              sendNotificationEmail={sendNotificationEmail}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <DetailsCard entry={entry} canEdit={canEdit} onUpdateEntry={onUpdateEntry} USERS={USERS} />
            <DependenciesCard
              entry={entry}
              allEntries={allEntries}
              canEdit={canEdit}
              onUpdateEntry={onUpdateEntry}
              onOpenModal={() => setDependenciesModalOpen(true)}
            />
            <TagsCard entry={entry} />
            <CustomFieldsCard
              entry={entry}
              canEdit={canEdit}
              onUpdateEntry={onUpdateEntry}
              onOpenModal={() => setCustomFieldsModalOpen(true)}
            />
            <AttachmentsCard
              entry={entry}
              canEdit={canEdit}
              onUpdateEntry={onUpdateEntry}
              SUPABASE_API={SUPABASE_API}
              Logger={Logger}
            />

            {/* Custom Tags */}
            {entry.tags && entry.tags.length > 0 && (
              <div className="bg-white rounded-3xl p-6 border border-ocean-100 shadow-sm">
                <h3 className="text-lg font-bold text-ocean-900 mb-3">Custom Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {entry.tags.map((tag, i) => (
                    <span key={i} className="px-2 py-1 rounded-md bg-yellow-50 text-yellow-700 text-xs font-medium border border-yellow-100">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <AnalyticsCard analytics={entry.analytics} />
          </div>
        </div>
      </div>

      {/* Subtask Detail Modal */}
      {activeSubtask && (
        <SubtaskDetailModal
          activeSubtask={activeSubtask}
          editingSubtask={editingSubtask}
          editSubtaskTitle={editSubtaskTitle}
          editSubtaskDeadline={editSubtaskDeadline}
          editSubtaskOwner={editSubtaskOwner}
          editSubtaskContext={editSubtaskContext}
          onSetEditSubtaskTitle={setEditSubtaskTitle}
          onSetEditSubtaskDeadline={setEditSubtaskDeadline}
          onSetEditSubtaskOwner={setEditSubtaskOwner}
          onSetEditSubtaskContext={setEditSubtaskContext}
          onClose={() => { setActiveSubtask(null); setEditingSubtask(false); }}
          onStartEditing={() => {
            setEditSubtaskTitle(activeSubtask.title);
            setEditSubtaskDeadline(activeSubtask.deadline || '');
            setEditSubtaskOwner(activeSubtask.assignedTo || '');
            setEditSubtaskContext(activeSubtask.context || '');
            setEditingSubtask(true);
          }}
          onCancelEditing={() => setEditingSubtask(false)}
          onSaveEdit={() => {
            onEditSubtask(entry.id, activeSubtask.id, {
              title: editSubtaskTitle,
              assignedTo: editSubtaskOwner,
              deadline: editSubtaskDeadline,
              context: editSubtaskContext,
            });
            setActiveSubtask({
              ...activeSubtask,
              title: editSubtaskTitle,
              assignedTo: editSubtaskOwner,
              deadline: editSubtaskDeadline,
              context: editSubtaskContext,
            });
            setEditingSubtask(false);
          }}
          onDelete={() => {
            if (confirm('Are you sure you want to delete this subtask?')) {
              onDeleteSubtask(entry.id, activeSubtask.id);
              setActiveSubtask(null);
            }
          }}
          canEdit={canEdit}
          USERS={USERS}
        />
      )}

      {/* Description Modal */}
      {descriptionModalOpen && (
        <DescriptionModal
          descriptionDraft={descriptionDraft}
          descMentionOptions={descMentionOptions}
          onDescriptionChange={handleDescriptionChange}
          onDescMentionPick={handleDescMentionPick}
          onSave={handleDescriptionSave}
          onClose={() => { setDescriptionDraft(getCaption()); setDescriptionModalOpen(false); }}
        />
      )}

      {/* Documents Modal */}
      {documentsModalOpen && (
        <DocumentsModal
          documentsDraft={documentsDraft}
          showAddLinkForm={showAddLinkForm}
          newDocTitle={newDocTitle}
          newDocUrl={newDocUrl}
          newDocNotes={newDocNotes}
          onSetNewDocTitle={setNewDocTitle}
          onSetNewDocUrl={setNewDocUrl}
          onSetNewDocNotes={setNewDocNotes}
          onShowAddLinkForm={() => setShowAddLinkForm(true)}
          onResetDocForm={resetDocForm}
          onAddDocumentDraft={addDocumentDraft}
          onRemoveDocumentDraft={removeDocumentDraft}
          getDocTitle={getDocTitle}
          getDocUrl={getDocUrl}
          getDocNotes={getDocNotes}
          onSave={handleDocumentsSave}
          onClose={() => { setDocumentsDraft(getDocuments()); resetDocForm(); setDocumentsModalOpen(false); }}
        />
      )}

      {/* Dependencies Modal */}
      {dependenciesModalOpen && (
        <DependenciesModal
          entry={entry}
          allEntries={allEntries}
          dependencySearch={dependencySearch}
          onSetDependencySearch={setDependencySearch}
          onAddDependency={(itemId) => {
            const newDeps = [...(entry.dependencies || []), itemId];
            onUpdateEntry(entry.id, { dependencies: newDeps });
          }}
          onClose={() => { setDependenciesModalOpen(false); setDependencySearch(''); }}
        />
      )}

      {/* Custom Fields Modal */}
      {customFieldsModalOpen && (
        <CustomFieldsModal
          newFieldName={newFieldName}
          newFieldValue={newFieldValue}
          newFieldType={newFieldType}
          onSetNewFieldName={setNewFieldName}
          onSetNewFieldValue={setNewFieldValue}
          onSetNewFieldType={setNewFieldType}
          onAdd={() => {
            if (newFieldName.trim() && newFieldValue.trim()) {
              const newField = { name: newFieldName.trim(), value: newFieldValue.trim(), type: newFieldType };
              const existingFields = entry.customFields || [];
              onUpdateEntry(entry.id, { customFields: [...existingFields, newField] });
              setCustomFieldsModalOpen(false);
              setNewFieldName('');
              setNewFieldValue('');
              setNewFieldType('text');
            }
          }}
          onClose={() => { setCustomFieldsModalOpen(false); setNewFieldName(''); setNewFieldValue(''); setNewFieldType('text'); }}
        />
      )}
    </>
  );
}

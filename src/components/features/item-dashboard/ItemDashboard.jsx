import React, { useState, useEffect, useRef } from 'react';
import { Icon, Button, Badge, LoadingSpinner } from '../../ui';
import { validateFilesForUpload, getAllowedExtensions } from '../../../utils/security';

// Local className joining utility
const cx = (...classes) => classes.filter(Boolean).join(' ');

/**
 * ItemDashboard - Detailed view of a single entry/item
 *
 * Props:
 * - entry: The entry object to display
 * - onBack: Function to go back to previous view
 * - onToggleSubtask: Function to toggle subtask completion
 * - onDeleteSubtask: Function to delete a subtask
 * - onEditSubtask: Function to edit a subtask
 * - onUpdateEntry: Function to update the entry
 * - openSubtaskModal: Function to open subtask creation modal
 * - currentUser: Current username
 * - userEmail: Current user's email
 * - allEntries: Array of all entries (for dependencies)
 * - onNavigateToWhiteboard: Function to navigate to whiteboard view
 * - USERS: Array of all users
 * - KANBAN_STATUSES: Array of workflow statuses
 * - userProfilesCache: Cached user profiles for email lookups
 * - sendNotificationEmail: Function to send notification emails
 * - SUPABASE_API: Supabase API object for file operations
 * - Logger: Logger instance
 * - canEditItem: Function to check if user can edit item
 * - WhiteboardPreviewCard: Component for whiteboard preview
 * - WHITEBOARD_API: Whiteboard API object
 */
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

  // Check if current user can edit this item
  const canEdit = canEditItem(entry, userEmail, currentUser);

  const [descriptionModalOpen, setDescriptionModalOpen] = useState(false);
  const [documentsModalOpen, setDocumentsModalOpen] = useState(false);
  const [dependenciesModalOpen, setDependenciesModalOpen] = useState(false);
  const [customFieldsModalOpen, setCustomFieldsModalOpen] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState(getCaption());
  const [documentsDraft, setDocumentsDraft] = useState(getDocuments());
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocUrl, setNewDocUrl] = useState('');
  const [newDocNotes, setNewDocNotes] = useState('');
  const [showAddLinkForm, setShowAddLinkForm] = useState(false);
  const [dependencySearch, setDependencySearch] = useState('');
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef(null);
  const attachmentInputRef = useRef(null);
  const [activeSubtask, setActiveSubtask] = useState(null);
  const [editingSubtask, setEditingSubtask] = useState(false);
  const [editSubtaskTitle, setEditSubtaskTitle] = useState('');
  const [editSubtaskDeadline, setEditSubtaskDeadline] = useState('');
  const [editSubtaskOwner, setEditSubtaskOwner] = useState('');
  const [editSubtaskContext, setEditSubtaskContext] = useState('');
  const [commentText, setCommentText] = useState('');
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionOptions, setMentionOptions] = useState([]);
  // Description @Mentions state
  const [descMentionQuery, setDescMentionQuery] = useState('');
  const [descMentionOptions, setDescMentionOptions] = useState([]);
  // Handoff Notes state
  const [showHandoffForm, setShowHandoffForm] = useState(false);
  const [handoffContent, setHandoffContent] = useState('');
  const [handoffRecipient, setHandoffRecipient] = useState('');

  // Details editing state
  const [editingDetails, setEditingDetails] = useState(false);
  const [editOwner, setEditOwner] = useState(entry?.owner || '');
  const [editCollaborators, setEditCollaborators] = useState(entry?.collaborators || []);
  const [editTimeline, setEditTimeline] = useState(entry?.date || entry?.timelineValue || '');
  const [collaboratorSearch, setCollaboratorSearch] = useState('');

  const startEditingDetails = () => {
    setEditOwner(entry?.owner || '');
    setEditCollaborators(entry?.collaborators || []);
    setEditTimeline(entry?.date || entry?.timelineValue || '');
    setEditingDetails(true);
  };

  const saveDetails = () => {
    if (onUpdateEntry) {
      onUpdateEntry(entry.id, {
        owner: editOwner,
        collaborators: editCollaborators,
        date: editTimeline || null,
        timelineValue: editTimeline || null,
        timelineType: editTimeline ? 'date' : null,
      });
    }
    setEditingDetails(false);
  };

  const cancelEditingDetails = () => {
    setEditingDetails(false);
    setCollaboratorSearch('');
  };

  const addCollaborator = (name) => {
    if (name && !editCollaborators.includes(name) && name !== editOwner) {
      setEditCollaborators([...editCollaborators, name]);
    }
    setCollaboratorSearch('');
  };

  const removeCollaborator = (name) => {
    setEditCollaborators(editCollaborators.filter((c) => c !== name));
  };

  useEffect(() => {
    setDescriptionDraft(getCaption());
    setDocumentsDraft(getDocuments());
    setCommentText('');
    setMentionQuery('');
    setMentionOptions([]);
    setDescMentionQuery('');
    setDescMentionOptions([]);
    setShowHandoffForm(false);
    setHandoffContent('');
    setHandoffRecipient('');
  }, [entry]);

  useEffect(() => {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }, [descriptionModalOpen, documentsModalOpen]);

  if (!entry) return null;

  // Description @Mentions functions
  const updateDescMentionOptions = (value) => {
    const match = value.match(/@([a-z0-9\s]*)$/i);
    if (match) {
      const query = match[1].trim().toLowerCase();
      setDescMentionQuery(query);
      const pool = Array.from(
        new Set([...(entry.collaborators || []), entry.owner, ...USERS])
      ).filter(Boolean);
      const options = pool.filter((name) => name.toLowerCase().includes(query));
      setDescMentionOptions(options.slice(0, 6));
    } else {
      setDescMentionQuery('');
      setDescMentionOptions([]);
    }
  };

  const handleDescriptionChange = (e) => {
    const value = e.target.value;
    setDescriptionDraft(value);
    updateDescMentionOptions(value);
  };

  const handleDescMentionPick = (name) => {
    setDescriptionDraft((prev) => {
      const replacement = `@${name}`;
      return prev.replace(/@([a-z0-9\s]*)$/i, `${replacement} `);
    });
    setDescMentionQuery('');
    setDescMentionOptions([]);
  };

  const handleDescriptionSave = () => {
    if (onUpdateEntry) {
      onUpdateEntry(entry.id, { caption: descriptionDraft });
    }

    // Extract mentioned users and send them notifications
    const mentionMatches = descriptionDraft.match(/@([A-Za-z\s]+?)(?=\s|$|@)/g);
    if (mentionMatches) {
      const mentionedNames = mentionMatches.map((m) => m.slice(1).trim());
      mentionedNames.forEach((name) => {
        const profile = userProfilesCache.find(
          (p) => p.name.toLowerCase() === name.toLowerCase()
        );
        if (profile && profile.email) {
          sendNotificationEmail(
            profile.email,
            profile.name,
            'mention',
            entry.title,
            entry.id,
            { comment: descriptionDraft.substring(0, 200) }
          );
        }
      });
    }

    setDescMentionQuery('');
    setDescMentionOptions([]);
    setDescriptionModalOpen(false);
  };

  // Handoff Notes functions
  const addHandoffNote = () => {
    if (!handoffContent.trim() || !handoffRecipient.trim()) return;

    const newNote = {
      id: `hn${Date.now()}`,
      author: currentUser,
      forWhom: handoffRecipient,
      content: handoffContent.trim(),
      timestamp: new Date().toISOString(),
      acknowledged: false,
    };

    const existingNotes = entry.handoff_notes || [];
    onUpdateEntry(entry.id, { handoff_notes: [...existingNotes, newNote] });

    // Send notification to the recipient
    const profile = userProfilesCache.find(
      (p) => p.name.toLowerCase() === handoffRecipient.toLowerCase()
    );
    if (profile && profile.email) {
      sendNotificationEmail(
        profile.email,
        profile.name,
        'comment',
        entry.title,
        entry.id,
        { comment: `Handoff note from ${currentUser}: ${handoffContent.substring(0, 150)}...` }
      );
    }

    setHandoffContent('');
    setHandoffRecipient('');
    setShowHandoffForm(false);
  };

  const acknowledgeHandoffNote = (noteId) => {
    const existingNotes = entry.handoff_notes || [];
    const updatedNotes = existingNotes.map((note) =>
      note.id === noteId
        ? {
            ...note,
            acknowledged: true,
            acknowledgedBy: currentUser,
            acknowledgedAt: new Date().toISOString(),
          }
        : note
    );
    onUpdateEntry(entry.id, { handoff_notes: updatedNotes });
  };

  const deleteHandoffNote = (noteId) => {
    if (!confirm('Delete this handoff note?')) return;
    const existingNotes = entry.handoff_notes || [];
    const updatedNotes = existingNotes.filter((note) => note.id !== noteId);
    onUpdateEntry(entry.id, { handoff_notes: updatedNotes });
  };

  const handleDocumentsSave = () => {
    if (onUpdateEntry) {
      // Filter out empty entries
      const cleaned = documentsDraft.filter((doc) => {
        if (typeof doc === 'string') return doc.trim();
        return doc && (doc.title?.trim() || doc.url?.trim());
      });
      onUpdateEntry(entry.id, { documents: cleaned });
    }
    resetDocForm();
    setDocumentsModalOpen(false);
  };

  const resetDocForm = () => {
    setNewDocTitle('');
    setNewDocUrl('');
    setNewDocNotes('');
    setShowAddLinkForm(false);
  };

  const addDocumentDraft = () => {
    const title = newDocTitle.trim();
    const url = newDocUrl.trim();
    const notes = newDocNotes.trim();
    if (!title && !url) return;

    const newDoc = {
      id: `doc${Date.now()}`,
      title: title || 'Untitled Link',
      url: url,
      notes: notes,
    };
    setDocumentsDraft((prev) => [...prev, newDoc]);
    resetDocForm();
  };

  // Helper to get display title for a document (handles both old string format and new object format)
  const getDocTitle = (doc) => {
    if (typeof doc === 'string') return doc;
    return doc.title || doc.url || 'Untitled';
  };

  const getDocUrl = (doc) => {
    if (typeof doc === 'string') {
      // Check if old format is a URL
      if (doc.startsWith('http://') || doc.startsWith('https://')) return doc;
      return null;
    }
    return doc.url || null;
  };

  const getDocNotes = (doc) => {
    if (typeof doc === 'string') return null;
    return doc.notes || null;
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setDocumentsDraft((prev) => [...prev, ...files.map((file) => file.name)]);
    event.target.value = '';
  };

  const triggerUpload = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const removeDocumentDraft = (index) => {
    setDocumentsDraft((prev) => prev.filter((_, i) => i !== index));
  };

  const updateMentionOptions = (value) => {
    const match = value.match(/@([a-z0-9\s]*)$/i);
    if (match) {
      const query = match[1].trim().toLowerCase();
      setMentionQuery(query);
      const pool = Array.from(
        new Set([...(entry.collaborators || []), entry.owner, ...USERS])
      ).filter(Boolean);
      const options = pool.filter((name) => name.toLowerCase().includes(query));
      setMentionOptions(options.slice(0, 6));
    } else {
      setMentionQuery('');
      setMentionOptions([]);
    }
  };

  const handleCommentChange = (e) => {
    const value = e.target.value;
    setCommentText(value);
    updateMentionOptions(value);
  };

  const handleMentionPick = (name) => {
    setCommentText((prev) => {
      const replacement = `@${name}`;
      return prev.replace(/@([a-z0-9\s]*)$/i, `${replacement} `);
    });
    setMentionQuery('');
    setMentionOptions([]);
  };

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const newComment = {
      id: `c${Date.now()}`,
      text: commentText.trim(),
      author: currentUser,
      timestamp: new Date().toISOString(),
    };

    const existingComments = entry.comments || [];
    onUpdateEntry(entry.id, { comments: [...existingComments, newComment] });

    // Extract mentioned users and send them notifications
    const mentionMatches = commentText.match(/@([A-Za-z\s]+?)(?=\s|$|@)/g);
    if (mentionMatches) {
      const mentionedNames = mentionMatches.map((m) => m.slice(1).trim());
      mentionedNames.forEach((name) => {
        const profile = userProfilesCache.find(
          (p) => p.name.toLowerCase() === name.toLowerCase()
        );
        if (profile && profile.email) {
          sendNotificationEmail(
            profile.email,
            profile.name,
            'mention',
            entry.title,
            entry.id,
            { comment: commentText.substring(0, 200) }
          );
        }
      });
    }

    setCommentText('');
    setMentionQuery('');
    setMentionOptions([]);
  };

  const handleOpenSubtaskModal = () => {
    if (openSubtaskModal) {
      openSubtaskModal(entry.id);
    }
  };

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Step 1: Validate file types (security check)
    const { validFiles: typeValidFiles, invalidFiles: typeInvalidFiles } = validateFilesForUpload(files);

    if (typeInvalidFiles.length > 0) {
      alert(
        `${typeInvalidFiles.length} file(s) have invalid types and will be skipped:\n${typeInvalidFiles.map((f) => `${f.file.name}: ${f.error}`).join('\n')}`
      );
    }

    // Step 2: Validate file sizes
    const oversizedFiles = typeValidFiles.filter((f) => f.size > MAX_FILE_SIZE);
    const validFiles = typeValidFiles.filter((f) => f.size <= MAX_FILE_SIZE);

    if (oversizedFiles.length > 0) {
      alert(
        `${oversizedFiles.length} file(s) exceed the 10MB limit and will be skipped:\n${oversizedFiles.map((f) => f.name).join('\n')}`
      );
    }

    if (!validFiles.length) {
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = '';
      }
      return;
    }

    setUploadingFile(true);
    const uploadedFiles = [];
    const failedFiles = [];

    try {
      for (const file of validFiles) {
        try {
          const result = await SUPABASE_API.uploadFile(file, entry.id);
          if (result) {
            uploadedFiles.push(result);
          } else {
            failedFiles.push(file.name);
          }
        } catch (fileErr) {
          Logger.error(fileErr, `Failed to upload ${file.name}`);
          failedFiles.push(file.name);
        }
      }

      if (uploadedFiles.length > 0) {
        const existingAttachments = entry.attachments || [];
        onUpdateEntry(entry.id, { attachments: [...existingAttachments, ...uploadedFiles] });
      }

      // Notify user of any failures
      if (failedFiles.length > 0) {
        alert(`Failed to upload ${failedFiles.length} file(s):\n${failedFiles.join('\n')}`);
      }
    } catch (err) {
      Logger.error(err, 'Upload error');
      alert('An error occurred while uploading files. Please try again.');
    } finally {
      setUploadingFile(false);
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = '';
      }
    }
  };

  const handleDeleteAttachment = async (attachment) => {
    if (attachment.path) {
      await SUPABASE_API.deleteFile(attachment.path);
    }
    const newAttachments = (entry.attachments || []).filter((a) => a.id !== attachment.id);
    onUpdateEntry(entry.id, { attachments: newAttachments });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return 'image';
    if (type?.startsWith('video/')) return 'video';
    if (type?.includes('pdf')) return 'file-text';
    if (type?.includes('spreadsheet') || type?.includes('excel')) return 'table';
    if (type?.includes('document') || type?.includes('word')) return 'file-text';
    return 'file';
  };

  return (
    <>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onBack} className="rounded-full p-2 hover:bg-ocean-50">
              <Icon name="arrow-left" className="w-6 h-6 text-ocean-600" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-ocean-900">{entry.title}</h1>
                {entry.archived && (
                  <span className="px-3 py-1 bg-amber-100 text-amber-800 text-sm font-medium rounded-full flex items-center gap-1.5">
                    <Icon name="archive" className="w-4 h-4" />
                    Archived
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{entry.workflowStatus}</Badge>
                <span className="text-sm text-graystone-500">
                  Created on {new Date(entry.date).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Convert Button */}
            {canEdit && onConvert && (
              <button
                onClick={() => onConvert(entry, 'project')}
                className="px-4 py-3 rounded-xl border-2 bg-ocean-50 border-ocean-200 text-ocean-700 hover:bg-ocean-100 hover:border-ocean-300 font-medium transition-all flex items-center gap-2"
              >
                <Icon name="refresh-cw" className="w-5 h-5" />
                Convert
              </button>
            )}
            {/* Archive/Restore Button */}
            {canEdit && (
              <button
                onClick={() => onUpdateEntry(entry.id, { archived: !entry.archived })}
                className={cx(
                  'px-4 py-3 rounded-xl border-2 font-medium transition-all flex items-center gap-2',
                  entry.archived
                    ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:border-green-300'
                    : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-300'
                )}
              >
                <Icon name={entry.archived ? 'archive-restore' : 'archive'} className="w-5 h-5" />
                {entry.archived ? 'Restore' : 'Archive'}
              </button>
            )}
            <select
              className="px-4 py-3 rounded-xl bg-white border-2 border-ocean-200 text-ocean-900 font-medium hover:border-ocean-400 focus:border-ocean-500 focus:outline-none transition-all cursor-pointer shadow-sm"
              value={entry.workflowStatus}
              onChange={(e) => onUpdateEntry(entry.id, { workflowStatus: e.target.value })}
            >
              {KANBAN_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white rounded-3xl p-6 border border-ocean-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-ocean-900">Description</h3>
                {canEdit ? (
                  <button
                    onClick={() => {
                      setDescriptionDraft(getCaption());
                      setDescriptionModalOpen(true);
                    }}
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

            {/* SharePoint Links */}
            <div className="bg-white rounded-3xl p-6 border border-ocean-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-ocean-900">SharePoint Links</h3>
                {canEdit && (
                  <button
                    onClick={() => {
                      setDocumentsDraft(getDocuments());
                      resetDocForm();
                      setDocumentsModalOpen(true);
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-ocean-50 transition-colors"
                  >
                    <Icon name="plus" className="w-5 h-5 text-ocean-600" />
                  </button>
                )}
              </div>
              {entry.documents && entry.documents.length > 0 ? (
                <div className="space-y-3">
                  {entry.documents.map((doc, i) => {
                    const title = getDocTitle(doc);
                    const url = getDocUrl(doc);
                    const notes = getDocNotes(doc);
                    return (
                      <div
                        key={i}
                        className="p-4 rounded-xl border border-graystone-200 hover:border-ocean-300 hover:bg-ocean-50/50 transition-all group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="bg-ocean-100 p-2 rounded-lg text-ocean-600 group-hover:bg-white group-hover:text-ocean-700 transition-colors shrink-0">
                            <Icon name="link" className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-ocean-900">{title}</div>
                            {url && (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-ocean-600 hover:text-ocean-700 hover:underline truncate block mt-0.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {url}
                              </a>
                            )}
                            {notes && (
                              <div className="text-xs text-graystone-600 mt-2 bg-graystone-50 rounded-lg px-2 py-1.5">
                                {notes}
                              </div>
                            )}
                          </div>
                          {url && (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg hover:bg-ocean-100 transition-colors shrink-0"
                              title="Open link"
                            >
                              <Icon name="external-link" className="w-4 h-4 text-ocean-600" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-graystone-500 bg-graystone-50 rounded-xl border border-dashed border-graystone-200">
                  <div className="flex justify-center mb-2">
                    <Icon name="link" className="w-6 h-6 text-graystone-300" />
                  </div>
                  No SharePoint links added yet
                </div>
              )}
            </div>

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
                    className={cx(
                      'w-8 h-8 flex items-center justify-center rounded-lg transition-colors',
                      openSubtaskModal ? 'hover:bg-ocean-50' : 'cursor-not-allowed opacity-50'
                    )}
                    title="Add subtask"
                  >
                    <Icon name="plus" className="w-5 h-5 text-ocean-600" />
                  </button>
                  <button
                    onClick={() => {
                      if (entry.subtasks && entry.subtasks.length) {
                        setActiveSubtask(entry.subtasks[0]);
                      }
                    }}
                    disabled={!entry.subtasks || !entry.subtasks.length}
                    className={cx(
                      'w-8 h-8 flex items-center justify-center rounded-lg transition-colors',
                      entry.subtasks && entry.subtasks.length
                        ? 'hover:bg-ocean-50'
                        : 'cursor-not-allowed opacity-50'
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
                        className={cx(
                          'flex items-center gap-3 p-3 rounded-xl border transition-all',
                          subtask.completed
                            ? 'bg-graystone-50 border-graystone-200'
                            : 'bg-white border-ocean-200 hover:border-ocean-300'
                        )}
                        onClick={() => setActiveSubtask(subtask)}
                      >
                        <input
                          type="checkbox"
                          checked={subtask.completed}
                          disabled={!canToggle}
                          onChange={() => canToggle && onToggleSubtask(entry.id, subtask.id)}
                          className={cx(
                            'w-5 h-5 rounded border-2 transition-all',
                            canToggle ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
                            subtask.completed
                              ? 'bg-ocean-600 border-ocean-600'
                              : 'border-graystone-300 hover:border-ocean-400'
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <div
                            className={cx(
                              'text-sm font-medium',
                              subtask.completed
                                ? 'line-through text-graystone-500'
                                : 'text-graystone-900'
                            )}
                          >
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
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveSubtask(subtask);
                            }}
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

            {/* Comments / Activity */}
            <div className="bg-white rounded-3xl p-6 border border-ocean-100 shadow-sm">
              <h3 className="text-lg font-bold text-ocean-900 mb-4">Activity & Comments</h3>

              {/* Existing Comments */}
              {entry.comments && entry.comments.length > 0 ? (
                <div className="space-y-4 mb-4 max-h-[400px] overflow-y-auto">
                  {entry.comments.map((comment) => (
                    <div key={comment.id} className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-aqua-100 flex items-center justify-center text-ocean-700 font-bold text-sm shrink-0">
                        {comment.author ? comment.author.charAt(0) : 'U'}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-graystone-900">
                            {comment.author || 'User'}
                          </span>
                          <span className="text-xs text-graystone-500">
                            {comment.timestamp
                              ? new Date(comment.timestamp).toLocaleString()
                              : 'Recently'}
                          </span>
                        </div>
                        <div className="text-sm text-graystone-700 bg-graystone-50 p-3 rounded-tr-xl rounded-br-xl rounded-bl-xl">
                          {comment.text}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-graystone-500 mb-4">
                  No comments yet. Be the first to comment!
                </div>
              )}

              {/* Add Comment Textbox */}
              <div className="flex gap-3 pt-4 border-t border-graystone-100">
                <div className="w-10 h-10 rounded-full bg-ocean-500 flex items-center justify-center text-white font-bold text-sm">
                  {currentUser ? currentUser.charAt(0) : 'U'}
                </div>
                <form className="flex-1" onSubmit={handleCommentSubmit}>
                  <div className="relative">
                    <textarea
                      placeholder="Add a comment... use @ to mention"
                      value={commentText}
                      onChange={handleCommentChange}
                      className="w-full px-4 py-3 border-2 border-graystone-200 rounded-xl focus:border-ocean-500 focus:outline-none resize-none transition-colors"
                      rows="3"
                    ></textarea>
                    {mentionOptions.length > 0 && (
                      <div className="absolute left-0 right-0 mt-1 rounded-xl border border-ocean-200 bg-white shadow-xl z-10 overflow-hidden">
                        <div className="px-3 py-2 bg-ocean-50 border-b border-ocean-100">
                          <span className="text-xs font-medium text-ocean-700">
                            Mention someone
                          </span>
                        </div>
                        {mentionOptions.map((name, idx) => (
                          <button
                            type="button"
                            key={name}
                            onClick={() => handleMentionPick(name)}
                            className={cx(
                              'w-full text-left px-3 py-2.5 text-sm text-graystone-800 hover:bg-ocean-50 flex items-center gap-3 transition-colors',
                              idx === 0 && 'bg-ocean-50/50'
                            )}
                          >
                            <span className="w-8 h-8 rounded-full bg-ocean-100 text-ocean-700 flex items-center justify-center text-sm font-bold">
                              {name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .substring(0, 2)}
                            </span>
                            <span className="font-medium">{name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end mt-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-ocean-500 text-white rounded-lg hover:bg-ocean-600 transition-colors font-medium text-sm"
                    >
                      Post Comment
                    </button>
                  </div>
                </form>
              </div>
            </div>

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

            {/* Handoff Notes */}
            <div className="bg-white rounded-3xl p-6 border border-ocean-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-ocean-900 flex items-center gap-2">
                  <Icon name="repeat" className="w-5 h-5 text-purple-500" />
                  Handoff Notes
                </h3>
                {canEdit && !showHandoffForm && (
                  <button
                    onClick={() => setShowHandoffForm(true)}
                    className="px-3 py-1.5 text-sm font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Icon name="plus" className="w-4 h-4" />
                    Add Note
                  </button>
                )}
              </div>

              {/* Add Handoff Form */}
              {showHandoffForm && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1 block">
                        Handing off to *
                      </label>
                      <select
                        value={handoffRecipient}
                        onChange={(e) => setHandoffRecipient(e.target.value)}
                        className="w-full px-3 py-2 border border-graystone-200 rounded-lg text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100 bg-white"
                      >
                        <option value="">Select recipient...</option>
                        {Array.from(
                          new Set([...(entry.collaborators || []), entry.owner, ...USERS])
                        )
                          .filter(Boolean)
                          .map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1 block">
                        Note *
                      </label>
                      <textarea
                        value={handoffContent}
                        onChange={(e) => setHandoffContent(e.target.value)}
                        placeholder="What should they know? Include context, next steps, blockers..."
                        className="w-full px-3 py-2 border border-graystone-200 rounded-lg text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-100 bg-white min-h-[100px]"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => {
                          setShowHandoffForm(false);
                          setHandoffContent('');
                          setHandoffRecipient('');
                        }}
                        className="px-3 py-1.5 text-sm font-medium text-graystone-600 hover:text-graystone-800 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={addHandoffNote}
                        disabled={!handoffContent.trim() || !handoffRecipient.trim()}
                        className="px-4 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Add Handoff Note
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Existing Handoff Notes */}
              {entry.handoff_notes && entry.handoff_notes.length > 0 ? (
                <div className="space-y-3">
                  {entry.handoff_notes
                    .slice()
                    .reverse()
                    .map((note) => (
                      <div
                        key={note.id}
                        className={cx(
                          'p-4 rounded-xl border',
                          note.acknowledged
                            ? 'bg-graystone-50 border-graystone-200'
                            : 'bg-purple-50 border-purple-200'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-bold">
                              {note.author ? note.author.charAt(0) : 'U'}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-graystone-900">
                                {note.author}
                              </div>
                              <div className="text-xs text-graystone-500">
                                <Icon name="arrow-right" className="w-3 h-3 inline mr-1" />
                                {note.forWhom}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-graystone-500">
                              {note.timestamp ? new Date(note.timestamp).toLocaleDateString() : ''}
                            </span>
                            {note.acknowledged && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                                <Icon name="check" className="w-3 h-3" />
                                Acknowledged
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-graystone-700 whitespace-pre-wrap mb-3">
                          {note.content}
                        </p>
                        <div className="flex items-center justify-between">
                          {!note.acknowledged &&
                            note.forWhom?.toLowerCase() === currentUser?.toLowerCase() && (
                              <button
                                onClick={() => acknowledgeHandoffNote(note.id)}
                                className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1.5"
                              >
                                <Icon name="check" className="w-3 h-3" />
                                Acknowledge
                              </button>
                            )}
                          {note.acknowledged && note.acknowledgedBy && (
                            <span className="text-xs text-graystone-500">
                              Acknowledged by {note.acknowledgedBy} on{' '}
                              {new Date(note.acknowledgedAt).toLocaleDateString()}
                            </span>
                          )}
                          {!note.acknowledged &&
                            note.forWhom?.toLowerCase() !== currentUser?.toLowerCase() && (
                              <span className="text-xs text-purple-600 font-medium">
                                Awaiting acknowledgement
                              </span>
                            )}
                          {note.author?.toLowerCase() === currentUser?.toLowerCase() && (
                            <button
                              onClick={() => deleteHandoffNote(note.id)}
                              className="text-xs text-graystone-400 hover:text-red-500 transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-sm text-graystone-500 text-center py-6">
                  <Icon name="repeat" className="w-8 h-8 mx-auto mb-2 text-graystone-300" />
                  <p>No handoff notes yet.</p>
                  <p className="text-xs mt-1">Add notes to share context when handing over work.</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Metadata Card */}
            <div className="bg-white rounded-3xl p-6 border border-ocean-100 shadow-sm space-y-4">
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

              <div>
                <div className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1">
                  Team
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-ocean-500"></div>
                  <span className="text-sm font-medium text-graystone-900">{entry.team}</span>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1">
                  Owner
                </div>
                {editingDetails ? (
                  <select
                    value={editOwner}
                    onChange={(e) => setEditOwner(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-ocean-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                  >
                    <option value="">Select owner...</option>
                    {USERS.map((user) => (
                      <option key={user} value={user}>
                        {user}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-graystone-200 flex items-center justify-center text-xs font-bold text-graystone-600">
                      {entry.owner ? entry.owner.charAt(0) : '?'}
                    </div>
                    <span className="text-sm font-medium text-graystone-900">{entry.owner}</span>
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1">
                  Collaborators
                </div>
                {editingDetails ? (
                  <div className="space-y-2">
                    {/* Current collaborators */}
                    {editCollaborators.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {editCollaborators.map((collab) => (
                          <div
                            key={collab}
                            className="flex items-center gap-1 px-2 py-1 bg-ocean-100 text-ocean-800 rounded-full text-xs"
                          >
                            <span>{collab}</span>
                            <button
                              onClick={() => removeCollaborator(collab)}
                              className="w-4 h-4 flex items-center justify-center hover:bg-ocean-200 rounded-full"
                            >
                              <Icon name="x" className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Add collaborator dropdown */}
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
                            (u) =>
                              u.toLowerCase().includes(collaboratorSearch.toLowerCase()) &&
                              !editCollaborators.includes(u) &&
                              u !== editOwner
                          )
                            .slice(0, 5)
                            .map((user) => (
                              <button
                                key={user}
                                onClick={() => addCollaborator(user)}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-ocean-50 transition"
                              >
                                {user}
                              </button>
                            ))}
                          {USERS.filter(
                            (u) =>
                              u.toLowerCase().includes(collaboratorSearch.toLowerCase()) &&
                              !editCollaborators.includes(u) &&
                              u !== editOwner
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

              <div>
                <div className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1">
                  Timeline
                </div>
                {editingDetails ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={editTimeline}
                      onChange={(e) => setEditTimeline(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-ocean-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500"
                    />
                    {editTimeline && (
                      <button
                        onClick={() => setEditTimeline('')}
                        className="p-2 text-graystone-400 hover:text-graystone-600"
                        title="Clear date"
                      >
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
                        : entry.timelineType === 'quarter'
                          ? entry.timelineValue
                          : entry.timelineType === 'month'
                            ? entry.timelineValue
                            : entry.timelineType === 'year'
                              ? entry.timelineValue
                              : entry.timelineValue || 'No date'}
                    </span>
                  </div>
                )}
              </div>

              {/* Save/Cancel buttons when editing */}
              {editingDetails && (
                <div className="flex gap-2 pt-2 border-t border-ocean-100">
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

            {/* Dependencies */}
            <div className="bg-white rounded-3xl p-6 border border-ocean-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-ocean-900">Dependencies</h3>
                {canEdit && (
                  <button
                    onClick={() => setDependenciesModalOpen(true)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-ocean-50 transition-colors"
                  >
                    <Icon name="plus" className="w-5 h-5 text-ocean-600" />
                  </button>
                )}
              </div>
              {entry.dependencies && entry.dependencies.length > 0 ? (
                <div className="space-y-2">
                  {entry.dependencies.map((depId) => {
                    const depEntry = allEntries.find((e) => e.id === depId);
                    if (!depEntry) return null;
                    const isBlocked = depEntry.workflowStatus !== 'Done';
                    return (
                      <div
                        key={depId}
                        className={cx(
                          'flex items-center justify-between p-3 rounded-xl border transition-colors',
                          isBlocked
                            ? 'bg-red-50 border-red-200'
                            : 'bg-green-50 border-green-200'
                        )}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Icon
                            name={isBlocked ? 'circle-alert' : 'circle-check'}
                            className={cx(
                              'w-4 h-4 shrink-0',
                              isBlocked ? 'text-red-500' : 'text-green-500'
                            )}
                          />
                          <span className="text-sm font-medium text-graystone-900 truncate">
                            {depEntry.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span
                            className={cx(
                              'text-[10px] px-2 py-0.5 rounded-full font-medium',
                              isBlocked
                                ? 'bg-red-100 text-red-700'
                                : 'bg-green-100 text-green-700'
                            )}
                          >
                            {depEntry.workflowStatus}
                          </span>
                          {canEdit && (
                            <button
                              onClick={() => {
                                const newDeps = (entry.dependencies || []).filter(
                                  (d) => d !== depId
                                );
                                onUpdateEntry(entry.id, { dependencies: newDeps });
                              }}
                              className="p-1 hover:bg-red-100 rounded transition-colors"
                            >
                              <Icon name="x" className="w-3 h-3 text-graystone-500" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-graystone-500 text-center py-4 bg-graystone-50 rounded-xl border border-dashed border-graystone-200">
                  No dependencies
                </div>
              )}
              {entry.dependencies && entry.dependencies.length > 0 && (
                <div
                  className={cx(
                    'mt-3 text-xs font-medium px-3 py-2 rounded-lg text-center',
                    entry.dependencies.some((depId) => {
                      const dep = allEntries.find((e) => e.id === depId);
                      return dep && dep.workflowStatus !== 'Done';
                    })
                      ? 'bg-red-100 text-red-700'
                      : 'bg-green-100 text-green-700'
                  )}
                >
                  {entry.dependencies.some((depId) => {
                    const dep = allEntries.find((e) => e.id === depId);
                    return dep && dep.workflowStatus !== 'Done';
                  })
                    ? 'Blocked by incomplete dependencies'
                    : 'All dependencies complete'}
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="bg-white rounded-3xl p-6 border border-ocean-100 shadow-sm">
              <h3 className="text-lg font-bold text-ocean-900 mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {entry.campaign && (
                  <span className="px-2 py-1 rounded-md bg-purple-50 text-purple-700 text-xs font-medium border border-purple-100">
                    {entry.campaign}
                  </span>
                )}
                {entry.contentPillar && (
                  <span className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                    {entry.contentPillar}
                  </span>
                )}
                {entry.platforms &&
                  entry.platforms.map((p) => (
                    <span
                      key={p}
                      className="px-2 py-1 rounded-md bg-graystone-100 text-graystone-700 text-xs font-medium"
                    >
                      {p}
                    </span>
                  ))}
              </div>
            </div>

            {/* Custom Fields */}
            <div className="bg-white rounded-3xl p-6 border border-ocean-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-ocean-900">Custom Fields</h3>
                {canEdit && (
                  <button
                    onClick={() => setCustomFieldsModalOpen(true)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-ocean-50 transition-colors"
                  >
                    <Icon name="plus" className="w-5 h-5 text-ocean-600" />
                  </button>
                )}
              </div>
              {entry.customFields && entry.customFields.length > 0 ? (
                <div className="space-y-3">
                  {entry.customFields.map((field, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-2 p-3 bg-graystone-50 rounded-xl"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-0.5">
                          {field.name}
                        </div>
                        <div className="text-sm text-graystone-900">
                          {field.type === 'url' ? (
                            <a
                              href={field.value}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-ocean-600 hover:underline flex items-center gap-1"
                            >
                              <span className="truncate">{field.value}</span>
                              <Icon name="external-link" className="w-3 h-3 shrink-0" />
                            </a>
                          ) : field.type === 'date' ? (
                            new Date(field.value).toLocaleDateString()
                          ) : field.type === 'number' ? (
                            Number(field.value).toLocaleString()
                          ) : (
                            field.value
                          )}
                        </div>
                      </div>
                      {canEdit && (
                        <button
                          onClick={() => {
                            const newFields = entry.customFields.filter((_, i) => i !== idx);
                            onUpdateEntry(entry.id, { customFields: newFields });
                          }}
                          className="p-1 hover:bg-red-100 rounded transition-colors shrink-0"
                        >
                          <Icon name="x" className="w-3 h-3 text-graystone-500" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-graystone-500 text-center py-4 bg-graystone-50 rounded-xl border border-dashed border-graystone-200">
                  No custom fields
                </div>
              )}
            </div>

            {/* File Attachments */}
            <div className="bg-white rounded-3xl p-6 border border-ocean-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-ocean-900">Attachments</h3>
                {canEdit && (
                  <button
                    onClick={() => attachmentInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-ocean-50 transition-colors disabled:opacity-50"
                    aria-label={uploadingFile ? 'Uploading file' : 'Attach file'}
                  >
                    {uploadingFile ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Icon name="paperclip" className="w-5 h-5 text-ocean-600" />
                    )}
                  </button>
                )}
                <input
                  ref={attachmentInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  accept={getAllowedExtensions()}
                />
              </div>
              {entry.attachments && entry.attachments.length > 0 ? (
                <div className="space-y-2">
                  {entry.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-3 bg-graystone-50 rounded-xl group"
                    >
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 flex-1 min-w-0 hover:text-ocean-600 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg bg-ocean-100 flex items-center justify-center shrink-0">
                          <Icon
                            name={getFileIcon(attachment.type)}
                            className="w-5 h-5 text-ocean-600"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-graystone-900 truncate">
                            {attachment.name}
                          </div>
                          <div className="text-xs text-graystone-500">
                            {formatFileSize(attachment.size)}
                          </div>
                        </div>
                      </a>
                      {canEdit && (
                        <button
                          onClick={() => handleDeleteAttachment(attachment)}
                          className="p-2 hover:bg-red-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Icon name="trash-2" className="w-4 h-4 text-red-500" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className={cx(
                    'text-sm text-graystone-500 text-center py-6 bg-graystone-50 rounded-xl border-2 border-dashed border-graystone-200 transition-colors',
                    canEdit && 'cursor-pointer hover:border-ocean-300 hover:bg-ocean-50/30'
                  )}
                  onClick={() => canEdit && attachmentInputRef.current?.click()}
                >
                  <div className="flex justify-center mb-2">
                    <Icon name="upload-cloud" className="w-8 h-8 text-graystone-300" />
                  </div>
                  <div>No attachments</div>
                  {canEdit && <div className="text-xs text-ocean-500 mt-1">Click to upload</div>}
                </div>
              )}
            </div>

            {/* Custom Tags */}
            {entry.tags && entry.tags.length > 0 && (
              <div className="bg-white rounded-3xl p-6 border border-ocean-100 shadow-sm">
                <h3 className="text-lg font-bold text-ocean-900 mb-3">Custom Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {entry.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 rounded-md bg-yellow-50 text-yellow-700 text-xs font-medium border border-yellow-100"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Analytics (if available) */}
            {entry.analytics && (
              <div className="bg-gradient-to-br from-ocean-900 to-ocean-800 rounded-3xl p-6 text-white shadow-lg">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Icon name="bar-chart-2" className="w-5 h-5" />
                  Analytics
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                    <div className="text-xs text-ocean-200 mb-1">Views</div>
                    <div className="text-xl font-bold">{entry.analytics.views || 0}</div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                    <div className="text-xs text-ocean-200 mb-1">Clicks</div>
                    <div className="text-xl font-bold">{entry.analytics.clicks || 0}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Subtask Detail Modal */}
      {activeSubtask && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="subtask-detail-title"
        >
          <div
            className="fixed inset-0"
            onClick={() => {
              setActiveSubtask(null);
              setEditingSubtask(false);
            }}
            aria-hidden="true"
          />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 id="subtask-detail-title" className="text-lg font-bold text-ocean-900">
                {editingSubtask ? 'Edit Subtask' : 'Subtask Details'}
              </h3>
              <button
                onClick={() => {
                  setActiveSubtask(null);
                  setEditingSubtask(false);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-ocean-500 hover:bg-ocean-600 transition-colors"
                aria-label="Close subtask details"
              >
                <Icon name="x" className="w-5 h-5 text-white" />
              </button>
            </div>

            {editingSubtask ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1 block">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editSubtaskTitle}
                    onChange={(e) => setEditSubtaskTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-graystone-200 rounded-lg text-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1 block">
                      Assignee
                    </label>
                    <select
                      value={editSubtaskOwner}
                      onChange={(e) => setEditSubtaskOwner(e.target.value)}
                      className="w-full px-3 py-2 border border-graystone-200 rounded-lg text-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-100"
                    >
                      <option value="">Unassigned</option>
                      {USERS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1 block">
                      Deadline
                    </label>
                    <input
                      type="date"
                      value={editSubtaskDeadline}
                      onChange={(e) => setEditSubtaskDeadline(e.target.value)}
                      className="w-full px-3 py-2 border border-graystone-200 rounded-lg text-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1 block">
                    Context / Notes
                  </label>
                  <textarea
                    value={editSubtaskContext}
                    onChange={(e) => setEditSubtaskContext(e.target.value)}
                    className="w-full px-3 py-2 border border-graystone-200 rounded-lg text-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-100 min-h-[80px]"
                    placeholder="Add any extra details..."
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setEditingSubtask(false)}
                    className="px-4 py-2 text-sm font-medium text-graystone-600 hover:text-graystone-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
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
                    disabled={!editSubtaskTitle.trim()}
                    className="px-4 py-2 bg-ocean-600 text-white text-sm font-medium rounded-lg hover:bg-ocean-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1">
                    Title
                  </div>
                  <div className="text-sm font-medium text-ocean-900">{activeSubtask.title}</div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1">
                      Assignee
                    </div>
                    <div className="text-graystone-800">
                      {activeSubtask.assignedTo || 'Unassigned'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1">
                      Deadline
                    </div>
                    <div className="text-graystone-800">{activeSubtask.deadline || 'None'}</div>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1">
                    Context
                  </div>
                  <div className="text-sm text-graystone-700 whitespace-pre-line bg-graystone-50 border border-graystone-200 rounded-xl px-3 py-2">
                    {activeSubtask.context || 'No additional context provided.'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!activeSubtask.completed}
                    readOnly
                    className="w-4 h-4 rounded border-graystone-300"
                  />
                  <span className="text-sm text-graystone-700">
                    {activeSubtask.completed ? 'Completed' : 'Open'}
                  </span>
                </div>

                {canEdit && (
                  <div className="flex justify-between items-center pt-4 border-t border-graystone-200 mt-4">
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this subtask?')) {
                          onDeleteSubtask(entry.id, activeSubtask.id);
                          setActiveSubtask(null);
                        }
                      }}
                      className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Icon name="trash-2" className="w-4 h-4" />
                      Delete
                    </button>
                    <button
                      onClick={() => {
                        setEditSubtaskTitle(activeSubtask.title);
                        setEditSubtaskDeadline(activeSubtask.deadline || '');
                        setEditSubtaskOwner(activeSubtask.assignedTo || '');
                        setEditSubtaskContext(activeSubtask.context || '');
                        setEditingSubtask(true);
                      }}
                      className="px-4 py-2 bg-ocean-600 text-white text-sm font-medium rounded-lg hover:bg-ocean-700 transition-colors shadow-sm flex items-center gap-1.5"
                    >
                      <Icon name="edit" className="w-4 h-4" />
                      Edit Subtask
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Description Modal */}
      {descriptionModalOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="description-modal-title"
        >
          <div
            className="fixed inset-0"
            onClick={() => {
              setDescriptionDraft(getCaption());
              setDescriptionModalOpen(false);
            }}
            aria-hidden="true"
          />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-xl shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 id="description-modal-title" className="text-lg font-bold text-ocean-900">
                Edit description
              </h3>
              <button
                onClick={() => {
                  setDescriptionDraft(getCaption());
                  setDescriptionModalOpen(false);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-ocean-500 hover:bg-ocean-600 transition-colors"
                aria-label="Close description editor"
              >
                <Icon name="x" className="w-5 h-5 text-white" />
              </button>
            </div>
            <p className="text-sm text-graystone-600 mb-3">
              Keep this concise—the first few lines appear in the task preview. Use @name to
              mention someone.
            </p>
            <div className="relative">
              <textarea
                value={descriptionDraft}
                onChange={handleDescriptionChange}
                className="w-full rounded-xl border border-graystone-200 px-3 py-2 text-sm shadow-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-aqua-200"
                rows="5"
                placeholder="Add a short description... Use @ to mention someone"
              />
              {descMentionOptions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 rounded-xl border border-ocean-200 bg-white shadow-xl z-10 overflow-hidden">
                  <div className="px-3 py-2 bg-ocean-50 border-b border-ocean-100">
                    <span className="text-xs font-medium text-ocean-700">Mention someone</span>
                  </div>
                  {descMentionOptions.map((name, idx) => (
                    <button
                      type="button"
                      key={name}
                      onClick={() => handleDescMentionPick(name)}
                      className={cx(
                        'w-full text-left px-3 py-2.5 text-sm text-graystone-800 hover:bg-ocean-50 flex items-center gap-3 transition-colors',
                        idx === 0 && 'bg-ocean-50/50'
                      )}
                    >
                      <span className="w-8 h-8 rounded-full bg-ocean-100 text-ocean-700 flex items-center justify-center text-sm font-bold">
                        {name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .substring(0, 2)}
                      </span>
                      <span className="font-medium">{name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setDescriptionDraft(getCaption());
                  setDescriptionModalOpen(false);
                }}
                className="px-4 py-2 text-sm font-medium text-graystone-600 hover:text-graystone-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDescriptionSave}
                className="px-4 py-2 bg-ocean-600 text-white text-sm font-medium rounded-lg hover:bg-ocean-700 transition-colors shadow-sm"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Documents Modal */}
      {documentsModalOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="documents-modal-title"
        >
          <div
            className="fixed inset-0"
            onClick={() => {
              setDocumentsDraft(getDocuments());
              resetDocForm();
              setDocumentsModalOpen(false);
            }}
            aria-hidden="true"
          />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-xl shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 id="documents-modal-title" className="text-lg font-bold text-ocean-900">
                SharePoint Links
              </h3>
              <button
                onClick={() => {
                  setDocumentsDraft(getDocuments());
                  resetDocForm();
                  setDocumentsModalOpen(false);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-ocean-500 hover:bg-ocean-600 transition-colors"
                aria-label="Close documents manager"
              >
                <Icon name="x" className="w-5 h-5 text-white" />
              </button>
            </div>
            <p className="text-sm text-graystone-600 mb-4">
              Add links to SharePoint files so the team can find assets fast.
            </p>

            {/* Add Link Form */}
            {showAddLinkForm ? (
              <div className="bg-ocean-50 border border-ocean-200 rounded-xl p-4 mb-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1 block">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                      placeholder="e.g., Campaign Brief Q1"
                      className="w-full px-3 py-2 border border-graystone-200 rounded-lg text-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-100 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1 block">
                      SharePoint URL
                    </label>
                    <input
                      type="url"
                      value={newDocUrl}
                      onChange={(e) => setNewDocUrl(e.target.value)}
                      placeholder="https://sharepoint.com/..."
                      className="w-full px-3 py-2 border border-graystone-200 rounded-lg text-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-100 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1 block">
                      Notes
                    </label>
                    <textarea
                      value={newDocNotes}
                      onChange={(e) => setNewDocNotes(e.target.value)}
                      placeholder="Add any helpful context about this file..."
                      className="w-full px-3 py-2 border border-graystone-200 rounded-lg text-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-100 bg-white min-h-[60px]"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={resetDocForm}
                      className="px-3 py-1.5 text-sm font-medium text-graystone-600 hover:text-graystone-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={addDocumentDraft}
                      disabled={!newDocTitle.trim() && !newDocUrl.trim()}
                      className="px-4 py-1.5 bg-ocean-600 text-white text-sm font-medium rounded-lg hover:bg-ocean-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Add Link
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddLinkForm(true)}
                className="w-full px-4 py-3 mb-4 bg-ocean-50 text-ocean-700 text-sm font-medium rounded-xl hover:bg-ocean-100 transition-colors border border-ocean-200 border-dashed flex items-center justify-center gap-2"
              >
                <Icon name="plus" className="w-4 h-4" />
                Add SharePoint Link
              </button>
            )}

            {/* Links List */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {documentsDraft.length > 0 ? (
                documentsDraft.map((doc, index) => {
                  const title = getDocTitle(doc);
                  const url = getDocUrl(doc);
                  const notes = getDocNotes(doc);
                  return (
                    <div
                      key={`${typeof doc === 'string' ? doc : doc.id}-${index}`}
                      className="rounded-xl border border-graystone-200 p-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          <Icon name="link" className="w-4 h-4 text-ocean-600 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-graystone-800">{title}</div>
                            {url && (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-ocean-600 hover:underline truncate block"
                              >
                                {url}
                              </a>
                            )}
                            {notes && (
                              <div className="text-xs text-graystone-500 mt-1">{notes}</div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => removeDocumentDraft(index)}
                          className="p-1 rounded-full hover:bg-graystone-100 transition-colors shrink-0"
                        >
                          <Icon name="trash-2" className="w-4 h-4 text-rose-500" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-graystone-500 bg-graystone-50 border border-dashed border-graystone-200 rounded-xl px-3 py-6 text-center">
                  <div className="flex justify-center mb-2">
                    <Icon name="link" className="w-6 h-6 text-graystone-300" />
                  </div>
                  No links added yet
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-graystone-200">
              <button
                onClick={() => {
                  setDocumentsDraft(getDocuments());
                  resetDocForm();
                  setDocumentsModalOpen(false);
                }}
                className="px-4 py-2 text-sm font-medium text-graystone-600 hover:text-graystone-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDocumentsSave}
                className="px-4 py-2 bg-ocean-600 text-white text-sm font-medium rounded-lg hover:bg-ocean-700 transition-colors shadow-sm"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dependencies Modal */}
      {dependenciesModalOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dependencies-modal-title"
        >
          <div
            className="fixed inset-0"
            onClick={() => {
              setDependenciesModalOpen(false);
              setDependencySearch('');
            }}
            aria-hidden="true"
          />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 id="dependencies-modal-title" className="text-lg font-bold text-ocean-900">
                Add Dependencies
              </h3>
              <button
                onClick={() => {
                  setDependenciesModalOpen(false);
                  setDependencySearch('');
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-ocean-500 hover:bg-ocean-600 transition-colors"
                aria-label="Close dependencies dialog"
              >
                <Icon name="x" className="w-5 h-5 text-white" />
              </button>
            </div>
            <p className="text-sm text-graystone-600 mb-4">
              Select items that must be completed before this item can progress.
            </p>

            {/* Search */}
            <div className="relative mb-4">
              <span className="absolute left-3 top-1/2 -translate-y-1/2">
                <Icon name="search" className="w-4 h-4 text-graystone-400" />
              </span>
              <input
                type="text"
                placeholder="Search items..."
                value={dependencySearch}
                onChange={(e) => setDependencySearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-graystone-200 rounded-lg text-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-100"
              />
            </div>

            {/* Available Items */}
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {allEntries
                .filter(
                  (e) =>
                    e.id !== entry.id &&
                    !(entry.dependencies || []).includes(e.id) &&
                    (dependencySearch === '' ||
                      e.title.toLowerCase().includes(dependencySearch.toLowerCase()) ||
                      e.owner?.toLowerCase().includes(dependencySearch.toLowerCase()))
                )
                .slice(0, 20)
                .map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      const newDeps = [...(entry.dependencies || []), item.id];
                      onUpdateEntry(entry.id, { dependencies: newDeps });
                    }}
                    className="w-full text-left p-3 rounded-xl border border-graystone-200 hover:border-ocean-300 hover:bg-ocean-50 transition-all flex items-center justify-between group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-graystone-900 truncate">
                        {item.title}
                      </div>
                      <div className="text-xs text-graystone-500 flex items-center gap-2 mt-0.5">
                        <span>{item.owner}</span>
                        <span>•</span>
                        <span
                          className={cx(
                            'px-1.5 py-0.5 rounded text-[10px] font-medium',
                            item.workflowStatus === 'Done'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          )}
                        >
                          {item.workflowStatus}
                        </span>
                      </div>
                    </div>
                    <Icon
                      name="plus"
                      className="w-4 h-4 text-ocean-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </button>
                ))}
              {allEntries.filter(
                (e) =>
                  e.id !== entry.id &&
                  !(entry.dependencies || []).includes(e.id) &&
                  (dependencySearch === '' ||
                    e.title.toLowerCase().includes(dependencySearch.toLowerCase()) ||
                    e.owner?.toLowerCase().includes(dependencySearch.toLowerCase()))
              ).length === 0 && (
                <div className="text-sm text-graystone-500 text-center py-6 bg-graystone-50 rounded-xl">
                  No matching items found
                </div>
              )}
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setDependenciesModalOpen(false);
                  setDependencySearch('');
                }}
                className="px-4 py-2 bg-ocean-600 text-white text-sm font-medium rounded-lg hover:bg-ocean-700 transition-colors shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Fields Modal */}
      {customFieldsModalOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="custom-fields-modal-title"
        >
          <div
            className="fixed inset-0"
            onClick={() => {
              setCustomFieldsModalOpen(false);
              setNewFieldName('');
              setNewFieldValue('');
              setNewFieldType('text');
            }}
            aria-hidden="true"
          />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 id="custom-fields-modal-title" className="text-lg font-bold text-ocean-900">
                Add Custom Field
              </h3>
              <button
                onClick={() => {
                  setCustomFieldsModalOpen(false);
                  setNewFieldName('');
                  setNewFieldValue('');
                  setNewFieldType('text');
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-ocean-500 hover:bg-ocean-600 transition-colors"
                aria-label="Close custom fields dialog"
              >
                <Icon name="x" className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1 block">
                  Field Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Budget, Priority, External Link"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  className="w-full px-3 py-2 border border-graystone-200 rounded-lg text-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1 block">
                  Field Type
                </label>
                <select
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value)}
                  className="w-full px-3 py-2 border border-graystone-200 rounded-lg text-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-100"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="url">URL</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-graystone-500 uppercase tracking-wider mb-1 block">
                  Value
                </label>
                {newFieldType === 'date' ? (
                  <input
                    type="date"
                    value={newFieldValue}
                    onChange={(e) => setNewFieldValue(e.target.value)}
                    className="w-full px-3 py-2 border border-graystone-200 rounded-lg text-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-100"
                  />
                ) : newFieldType === 'number' ? (
                  <input
                    type="number"
                    placeholder="Enter a number"
                    value={newFieldValue}
                    onChange={(e) => setNewFieldValue(e.target.value)}
                    className="w-full px-3 py-2 border border-graystone-200 rounded-lg text-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-100"
                  />
                ) : newFieldType === 'url' ? (
                  <input
                    type="url"
                    placeholder="https://..."
                    value={newFieldValue}
                    onChange={(e) => setNewFieldValue(e.target.value)}
                    className="w-full px-3 py-2 border border-graystone-200 rounded-lg text-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-100"
                  />
                ) : (
                  <input
                    type="text"
                    placeholder="Enter value"
                    value={newFieldValue}
                    onChange={(e) => setNewFieldValue(e.target.value)}
                    className="w-full px-3 py-2 border border-graystone-200 rounded-lg text-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-100"
                  />
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setCustomFieldsModalOpen(false);
                  setNewFieldName('');
                  setNewFieldValue('');
                  setNewFieldType('text');
                }}
                className="px-4 py-2 text-sm font-medium text-graystone-600 hover:text-graystone-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newFieldName.trim() && newFieldValue.trim()) {
                    const newField = {
                      name: newFieldName.trim(),
                      value: newFieldValue.trim(),
                      type: newFieldType,
                    };
                    const existingFields = entry.customFields || [];
                    onUpdateEntry(entry.id, { customFields: [...existingFields, newField] });
                    setCustomFieldsModalOpen(false);
                    setNewFieldName('');
                    setNewFieldValue('');
                    setNewFieldType('text');
                  }
                }}
                disabled={!newFieldName.trim() || !newFieldValue.trim()}
                className="px-4 py-2 bg-ocean-600 text-white text-sm font-medium rounded-lg hover:bg-ocean-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Field
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

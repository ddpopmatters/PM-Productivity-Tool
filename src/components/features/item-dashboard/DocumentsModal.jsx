import React from 'react';
import { Icon } from '../../ui';

/**
 * DocumentsModal - SharePoint Links editor modal with add-link form and link list
 *
 * Props:
 * - documentsDraft: Array of document draft objects
 * - showAddLinkForm: Boolean whether the add-link form is visible
 * - newDocTitle: Current new doc title value
 * - newDocUrl: Current new doc URL value
 * - newDocNotes: Current new doc notes value
 * - onSetNewDocTitle: Setter for new doc title
 * - onSetNewDocUrl: Setter for new doc URL
 * - onSetNewDocNotes: Setter for new doc notes
 * - onShowAddLinkForm: Show the add-link form
 * - onResetDocForm: Reset the add-link form fields
 * - onAddDocumentDraft: Add the current draft document to the list
 * - onRemoveDocumentDraft: Remove a document by index
 * - getDocTitle: Helper to get display title for a document
 * - getDocUrl: Helper to get URL from a document
 * - getDocNotes: Helper to get notes from a document
 * - onSave: Save documents
 * - onClose: Close/cancel the modal
 */
export default function DocumentsModal({
  documentsDraft,
  showAddLinkForm,
  newDocTitle,
  newDocUrl,
  newDocNotes,
  onSetNewDocTitle,
  onSetNewDocUrl,
  onSetNewDocNotes,
  onShowAddLinkForm,
  onResetDocForm,
  onAddDocumentDraft,
  onRemoveDocumentDraft,
  getDocTitle,
  getDocUrl,
  getDocNotes,
  onSave,
  onClose,
}) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="documents-modal-title"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-xl shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-3">
          <h3 id="documents-modal-title" className="text-lg font-bold text-ocean-900">
            SharePoint Links
          </h3>
          <button
            onClick={onClose}
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
                  onChange={(e) => onSetNewDocTitle(e.target.value)}
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
                  onChange={(e) => onSetNewDocUrl(e.target.value)}
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
                  onChange={(e) => onSetNewDocNotes(e.target.value)}
                  placeholder="Add any helpful context about this file..."
                  className="w-full px-3 py-2 border border-graystone-200 rounded-lg text-sm focus:border-ocean-500 focus:outline-none focus:ring-2 focus:ring-ocean-100 bg-white min-h-[60px]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={onResetDocForm}
                  className="px-3 py-1.5 text-sm font-medium text-graystone-600 hover:text-graystone-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onAddDocumentDraft}
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
            onClick={onShowAddLinkForm}
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
                      onClick={() => onRemoveDocumentDraft(index)}
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
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-graystone-600 hover:text-graystone-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 bg-ocean-600 text-white text-sm font-medium rounded-lg hover:bg-ocean-700 transition-colors shadow-sm"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

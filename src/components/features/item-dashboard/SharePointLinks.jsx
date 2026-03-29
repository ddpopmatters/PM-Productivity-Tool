import { Icon } from '../../ui';

export default function SharePointLinks({ entry, canEdit, onOpenModal, getDocTitle, getDocUrl, getDocNotes }) {
  return (
    <div className="bg-white rounded-3xl p-6 border border-graystone-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-ocean-900">SharePoint Links</h3>
        {canEdit && (
          <button
            onClick={onOpenModal}
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
  );
}

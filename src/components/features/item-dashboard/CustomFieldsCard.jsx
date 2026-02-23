import { Icon } from '../../ui';

export default function CustomFieldsCard({ entry, canEdit, onUpdateEntry, onOpenModal }) {
  return (
    <div className="bg-white rounded-3xl p-6 border border-ocean-100 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-ocean-900">Custom Fields</h3>
        {canEdit && (
          <button
            onClick={onOpenModal}
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
  );
}

import React from 'react';
import clsx from 'clsx';
import { Badge } from '../../ui';

/**
 * ListView - Simple list view for entries
 *
 * @param {Array} entries - Array of entry objects to display
 * @param {function} onOpen - Called with entry.id when an entry is clicked
 */
function ListView({ entries, onOpen }) {
  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-graystone-200 shadow-sm p-12 text-center">
        <i data-lucide="list" className="w-12 h-12 text-graystone-300 mx-auto mb-3" aria-hidden="true"></i>
        <div className="text-sm text-graystone-500 mb-3">No items to display</div>
        <p className="text-xs text-graystone-400">Try adjusting your filters or create a new item</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map(entry => (
        <div
          key={entry.id}
          onClick={() => onOpen(entry.id)}
          className="bg-white p-4 rounded-xl border border-graystone-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className={clsx(
              "w-2 h-12 rounded-full",
              entry.workflowStatus === 'Done' ? "bg-green-500" : "bg-ocean-500"
            )}></div>
            <div>
              <h4 className="font-bold text-ocean-900 group-hover:text-ocean-700 heading-font">{entry.title}</h4>
              <div className="flex items-center gap-2 text-xs text-graystone-500 mt-1">
                <span>{entry.owner}</span>
                <span>•</span>
                <span>{entry.team}</span>
                <span>•</span>
                <span>{entry.timelineValue}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {entry.collaborators && entry.collaborators.map((collab, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-ocean-100 border-2 border-white flex items-center justify-center text-xs font-bold text-ocean-700"
                  title={collab}
                >
                  {collab.charAt(0)}
                </div>
              ))}
            </div>
            <Badge variant="neutral">{entry.workflowStatus}</Badge>
            <i data-lucide="external-link" className="w-5 h-5 text-graystone-300 group-hover:text-ocean-500"></i>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ListView;

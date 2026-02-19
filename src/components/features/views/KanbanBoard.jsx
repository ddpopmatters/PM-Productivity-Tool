import React, { useState, useRef } from 'react';
import clsx from 'clsx';
import { Badge } from '../../ui';

/**
 * KanbanBoard - Drag-and-drop kanban board for workflow management
 *
 * @param {Array} statuses - Array of status strings for columns
 * @param {Array} entries - Array of entry objects to display
 * @param {function} onOpen - Called with entry.id when entry is clicked
 * @param {function} onUpdateStatus - Called with (entryId, newStatus) on drop
 * @param {function} openSubtaskModal - Called to open subtask modal
 * @param {string} currentUser - Current user name
 */
function KanbanBoard({ statuses, entries, onOpen, onUpdateStatus, openSubtaskModal, currentUser }) {
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const scrollContainerRef = useRef(null);
  const scrollIntervalRef = useRef(null);

  const handleDragStart = (e, entry) => {
    setDraggedItem(entry);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverColumn(null);
    // Clear auto-scroll
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  const handleDrag = (e) => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const rect = container.getBoundingClientRect();
    const scrollThreshold = 100;
    const scrollSpeed = 10;

    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }

    if (e.clientX === 0 && e.clientY === 0) return;

    if (e.clientX > rect.right - scrollThreshold && e.clientX < window.innerWidth) {
      scrollIntervalRef.current = setInterval(() => {
        container.scrollLeft += scrollSpeed;
      }, 16);
    } else if (e.clientX < rect.left + scrollThreshold && container.scrollLeft > 0) {
      scrollIntervalRef.current = setInterval(() => {
        container.scrollLeft -= scrollSpeed;
      }, 16);
    }
  };

  const handleDragOver = (e, status) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    if (draggedItem && draggedItem.workflowStatus !== newStatus) {
      onUpdateStatus(draggedItem.id, newStatus);
    }
    setDraggedItem(null);
    setDragOverColumn(null);
  };

  const getDueDateStatus = (entry) => {
    const dateStr = entry.date || entry.timelineValue;
    if (!dateStr) return null;
    if (entry.workflowStatus === 'Done') return null;

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let targetDate = null;

    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      targetDate = new Date(dateStr);
    } else if (dateStr.match(/^\d{4}-\d{2}$/)) {
      const [year, month] = dateStr.split('-');
      targetDate = new Date(parseInt(year), parseInt(month), 0);
    } else if (dateStr.match(/^\d{4}-Q[1-4]$/)) {
      const [year, q] = dateStr.split('-Q');
      const quarterEndMonth = parseInt(q) * 3;
      targetDate = new Date(parseInt(year), quarterEndMonth, 0);
    }

    if (!targetDate || isNaN(targetDate)) return null;

    const diffDays = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'overdue';
    if (diffDays <= 7) return 'due-soon';
    if (diffDays <= 14) return 'upcoming';
    return null;
  };

  return (
    <div ref={scrollContainerRef} className="flex gap-6 overflow-x-auto pb-6 max-w-full">
      {statuses.map((status) => {
        const cards = entries.filter(
          (entry) => (entry.workflowStatus || statuses[0]) === status
        );
        const isDropZone = dragOverColumn === status;

        return (
          <div
            key={status}
            className="w-72 shrink-0"
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-ocean-700">{status}</div>
              <Badge variant="secondary">{cards.length}</Badge>
            </div>
            <div className={clsx(
              "space-y-3 min-h-[200px] rounded-xl p-2 transition-all",
              isDropZone && draggedItem ? "bg-ocean-50 border-2 border-dashed border-ocean-400" : "border-2 border-transparent"
            )}>
              {cards.length === 0 ? (
                <div className="rounded-xl border border-dashed border-graystone-300 bg-graystone-50 px-3 py-6 text-center">
                  <i data-lucide="inbox" className="w-6 h-6 text-graystone-400 mx-auto mb-1" aria-hidden="true"></i>
                  <p className="text-xs text-graystone-500">Drag items here</p>
                </div>
              ) : (
                cards.map((entry) => {
                  const isBeingDragged = draggedItem?.id === entry.id;
                  const dueDateStatus = getDueDateStatus(entry);

                  const cardBorderClass = dueDateStatus === 'overdue'
                    ? 'border-red-300 bg-red-50/50'
                    : dueDateStatus === 'due-soon'
                    ? 'border-amber-300 bg-amber-50/30'
                    : dueDateStatus === 'upcoming'
                    ? 'border-blue-200 bg-blue-50/20'
                    : 'border-graystone-200 bg-white';

                  return (
                    <div
                      key={entry.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, entry)}
                      onDrag={handleDrag}
                      onDragEnd={handleDragEnd}
                      onClick={() => onOpen && onOpen(entry.id)}
                      className={clsx(
                        "rounded-2xl border p-4 shadow-sm transition-all cursor-pointer hover:shadow-md",
                        cardBorderClass,
                        isBeingDragged ? "opacity-50 scale-95" : "opacity-100"
                      )}
                    >
                      {dueDateStatus && (
                        <div className={clsx(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mb-2",
                          dueDateStatus === 'overdue' ? "bg-red-100 text-red-700" :
                          dueDateStatus === 'due-soon' ? "bg-amber-100 text-amber-700" :
                          "bg-blue-100 text-blue-700"
                        )}>
                          <i data-lucide={dueDateStatus === 'overdue' ? 'alert-circle' : 'clock'} className="w-3 h-3"></i>
                          {dueDateStatus === 'overdue' ? 'Overdue' : dueDateStatus === 'due-soon' ? 'Due Soon' : 'Upcoming'}
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="text-sm font-semibold text-graystone-800 line-clamp-2 heading-font">
                          {entry.title || "Untitled"}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpen(entry.id);
                          }}
                          className="p-1.5 rounded-full hover:bg-ocean-50 transition-colors"
                          title="Open"
                        >
                          <i data-lucide="external-link" className="w-4 h-4 text-ocean-700"></i>
                        </button>
                      </div>

                      {entry.phase && (
                        <div className="mb-1.5">
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-ocean-100 text-ocean-700">{entry.phase}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs text-graystone-600">
                        <div className="flex items-center gap-1">
                          <i data-lucide="user" className="w-3 h-3"></i>
                          <span>{Array.isArray(entry.owner) ? entry.owner.join(', ') : entry.owner}</span>
                        </div>
                        {(entry.date || entry.timelineValue) && (
                          <div className={clsx(
                            "flex items-center gap-1",
                            dueDateStatus === 'overdue' ? "text-red-600 font-medium" :
                            dueDateStatus === 'due-soon' ? "text-amber-600 font-medium" :
                            ""
                          )}>
                            <i data-lucide="calendar" className="w-3 h-3"></i>
                            <span>{entry.date || entry.timelineValue}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default KanbanBoard;

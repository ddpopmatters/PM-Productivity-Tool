import React, { useState, useRef, useCallback } from 'react';
import clsx from 'clsx';
import Icon from '../../ui/Icon';

const QuickNotes = ({ onBack }) => {
  const [notes, setNotes] = useState('');
  const [activeTab, setActiveTab] = useState('notes');
  const [checklistItems, setChecklistItems] = useState([]);
  const itemRefs = useRef({});

  const checkedCount = checklistItems.filter((i) => i.checked).length;

  const addItem = useCallback((afterIndex) => {
    const id = Date.now();
    setChecklistItems((prev) => {
      const idx = afterIndex !== undefined ? afterIndex + 1 : prev.length;
      const next = [...prev];
      next.splice(idx, 0, { id, text: '', checked: false });
      return next;
    });
    setTimeout(() => itemRefs.current[id]?.focus(), 0);
  }, []);

  const updateItem = useCallback((id, updates) => {
    setChecklistItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }, []);

  const removeItem = useCallback((id) => {
    setChecklistItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleKeyDown = useCallback(
    (e, index) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addItem(index);
      }
    },
    [addItem]
  );

  const handleClear = () => {
    const msg =
      activeTab === 'notes' ? 'Clear all notes?' : 'Clear all checklist items?';
    const hasContent =
      activeTab === 'notes' ? notes.trim() : checklistItems.length > 0;
    if (hasContent && confirm(msg)) {
      if (activeTab === 'notes') setNotes('');
      else setChecklistItems([]);
    }
  };

  const clearDisabled =
    activeTab === 'notes' ? !notes.trim() : checklistItems.length === 0;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-ocean-600 hover:text-ocean-700">
          <Icon name="arrow-left" className="w-5 h-5" />
          Back
        </button>
        <button
          onClick={handleClear}
          disabled={clearDisabled}
          className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 disabled:hover:bg-transparent"
        >
          Clear
        </button>
      </div>

      <h1 className="text-2xl font-bold text-ocean-900 mb-4">Quick Notes</h1>

      <div className="flex gap-1 mb-4">
        {['notes', 'checklist'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              activeTab === tab
                ? 'bg-ocean-600 text-white'
                : 'border border-graystone-300 text-graystone-600 hover:bg-graystone-50'
            )}
          >
            {tab === 'notes' ? 'Notes' : 'Checklist'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-lg p-4">
        {activeTab === 'notes' ? (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Start typing your notes here...&#10;&#10;Tips:&#10;• Use this for quick thoughts and scratch work&#10;• Notes are session-only (not saved)&#10;• Great for temporary calculations or drafts"
            className="w-full h-96 resize-none outline-none text-graystone-800 placeholder:text-graystone-400"
          />
        ) : (
          <div className="min-h-[24rem] flex flex-col">
            {checklistItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-graystone-400">
                <Icon name="list-checks" className="w-10 h-10 mb-2" />
                <p className="text-sm">No items yet</p>
              </div>
            ) : (
              <ul className="space-y-1 mb-3">
                {checklistItems.map((item, index) => (
                  <li key={item.id} className="flex items-center gap-2 group">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) =>
                        updateItem(item.id, { checked: e.target.checked })
                      }
                      className="rounded border-graystone-300 text-ocean-600 focus:ring-ocean-500"
                    />
                    <input
                      ref={(el) => (itemRefs.current[item.id] = el)}
                      type="text"
                      value={item.text}
                      onChange={(e) =>
                        updateItem(item.id, { text: e.target.value })
                      }
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      placeholder="New item..."
                      className={clsx(
                        'flex-1 outline-none text-sm py-1 bg-transparent',
                        item.checked
                          ? 'line-through text-graystone-400'
                          : 'text-graystone-800'
                      )}
                    />
                    <button
                      onClick={() => removeItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-graystone-400 hover:text-red-500 transition-opacity"
                    >
                      <Icon name="x" className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              onClick={() => addItem()}
              className="flex items-center gap-1.5 text-sm text-ocean-600 hover:text-ocean-700 mt-auto pt-2"
            >
              <Icon name="plus" className="w-4 h-4" />
              Add item
            </button>
          </div>
        )}

        <div className="flex justify-between items-center pt-3 border-t border-graystone-100">
          <span className="text-sm text-graystone-500">
            {activeTab === 'notes'
              ? `${notes.length} characters`
              : `${checkedCount}/${checklistItems.length} complete`}
          </span>
          <span className="text-xs text-graystone-400">
            Session only - not saved
          </span>
        </div>
      </div>
    </div>
  );
};

export default QuickNotes;

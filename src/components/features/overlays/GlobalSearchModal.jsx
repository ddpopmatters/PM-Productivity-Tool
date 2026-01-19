import React, { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';

/**
 * GlobalSearchModal - Global search modal with keyboard navigation
 *
 * @param {boolean} show - Whether the modal is visible
 * @param {function} onClose - Called when the modal should close
 * @param {Array} entries - Array of workflow entries to search
 * @param {Array} whiteboards - Array of whiteboards to search
 * @param {function} onSelectItem - Called with item when a workflow item is selected
 * @param {function} onSelectWhiteboard - Called with whiteboard when a whiteboard is selected
 */
function GlobalSearchModal({ show, onClose, entries, whiteboards, onSelectItem, onSelectWhiteboard }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ items: [], whiteboards: [] });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (show && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 50);
    }
    if (!show) {
      setQuery('');
      setResults({ items: [], whiteboards: [] });
      setSelectedIndex(0);
    }
  }, [show]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ items: [], whiteboards: [] });
      setSelectedIndex(0);
      return;
    }

    const searchTerm = query.toLowerCase().trim();

    const matchedItems = entries.filter(item => {
      const titleMatch = item.title?.toLowerCase().includes(searchTerm);
      const captionMatch = item.caption?.toLowerCase().includes(searchTerm);
      const ownerMatch = item.owner?.toLowerCase().includes(searchTerm);
      const tagsMatch = item.tags?.some(tag => tag.toLowerCase().includes(searchTerm));
      const teamMatch = item.team?.toLowerCase().includes(searchTerm);
      return titleMatch || captionMatch || ownerMatch || tagsMatch || teamMatch;
    }).slice(0, 5);

    const matchedWhiteboards = whiteboards.filter(wb => {
      const titleMatch = wb.title?.toLowerCase().includes(searchTerm);
      const descMatch = wb.description?.toLowerCase().includes(searchTerm);
      return titleMatch || descMatch;
    }).slice(0, 3);

    setResults({ items: matchedItems, whiteboards: matchedWhiteboards });
    setSelectedIndex(0);
  }, [query, entries, whiteboards]);

  const totalResults = results.items.length + results.whiteboards.length;

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, totalResults - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && totalResults > 0) {
      e.preventDefault();
      if (selectedIndex < results.items.length) {
        onSelectItem(results.items[selectedIndex]);
      } else {
        const wbIndex = selectedIndex - results.items.length;
        onSelectWhiteboard(results.whiteboards[wbIndex]);
      }
      onClose();
    }
  };

  if (!show) return null;

  const getStatusColor = (status) => {
    const colors = {
      'Done': 'bg-green-100 text-green-700',
      'In Progress': 'bg-blue-100 text-blue-700',
      'Ready for Review': 'bg-purple-100 text-purple-700',
      'Draft': 'bg-yellow-100 text-yellow-700',
      'Idea': 'bg-graystone-100 text-graystone-600'
    };
    return colors[status] || 'bg-graystone-100 text-graystone-600';
  };

  return (
    <div className="fixed inset-0 flex items-start justify-center pt-[10vh] bg-black/40 z-50">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative bg-white dark:bg-graystone-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-graystone-100 dark:border-graystone-700 bg-graystone-50 dark:bg-graystone-900">
          <i data-lucide="search" className="w-5 h-5 text-graystone-400"></i>
          <div className="flex items-center gap-1 px-2 py-1 bg-graystone-200 dark:bg-graystone-700 rounded text-xs text-graystone-600 dark:text-graystone-300">
            <span className="font-mono">{navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}</span>
            <span>+</span>
            <span className="font-mono">⇧</span>
            <span>+</span>
            <span className="font-mono">F</span>
          </div>
          <span className="text-sm text-graystone-600 dark:text-graystone-300">Global Search</span>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-graystone-100 dark:border-graystone-700">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search projects, whiteboards, people..."
            className="w-full text-lg px-0 py-2 border-0 outline-none placeholder:text-graystone-400 bg-transparent dark:text-white"
            autoComplete="off"
          />
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto">
          {query.trim() && totalResults === 0 && (
            <div className="p-8 text-center text-graystone-500">
              <i data-lucide="search-x" className="w-12 h-12 mx-auto mb-3 opacity-50"></i>
              <p>No results found for "{query}"</p>
            </div>
          )}

          {results.items.length > 0 && (
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-medium text-graystone-500 uppercase">Projects & Jobs</div>
              {results.items.map((item, index) => {
                const isJob = item.itemType === 'job';
                return (
                  <button
                    key={item.id}
                    onClick={() => { onSelectItem(item); onClose(); }}
                    className={clsx(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors",
                      selectedIndex === index
                        ? "bg-ocean-50 dark:bg-ocean-900/30"
                        : "hover:bg-graystone-50 dark:hover:bg-graystone-700"
                    )}
                  >
                    <div className={clsx(
                      "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                      isJob ? "bg-amber-100 dark:bg-amber-900" : "bg-ocean-100 dark:bg-ocean-900"
                    )}>
                      <i data-lucide={isJob ? "clipboard-list" : "folder"} className={clsx("w-5 h-5", isJob ? "text-amber-600" : "text-ocean-600")}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-ocean-900 dark:text-white truncate">{item.title}</span>
                        <span className={clsx(
                          "text-xs px-1.5 py-0.5 rounded",
                          isJob ? "bg-amber-100 text-amber-700" : "bg-ocean-100 text-ocean-700"
                        )}>
                          {isJob ? 'Job' : 'Project'}
                        </span>
                      </div>
                      <div className="text-sm text-graystone-500 truncate">
                        {item.owner} {item.team && `• ${item.team}`}
                      </div>
                    </div>
                    <span className={clsx("px-2 py-1 text-xs rounded-full flex-shrink-0", getStatusColor(item.workflowStatus))}>
                      {item.workflowStatus}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {results.whiteboards.length > 0 && (
            <div className="p-2 border-t border-graystone-100 dark:border-graystone-700">
              <div className="px-3 py-2 text-xs font-medium text-graystone-500 uppercase">Whiteboards</div>
              {results.whiteboards.map((wb, index) => {
                const resultIndex = results.items.length + index;
                return (
                  <button
                    key={wb.id}
                    onClick={() => { onSelectWhiteboard(wb); onClose(); }}
                    className={clsx(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors",
                      selectedIndex === resultIndex
                        ? "bg-ocean-50 dark:bg-ocean-900/30"
                        : "hover:bg-graystone-50 dark:hover:bg-graystone-700"
                    )}
                  >
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center flex-shrink-0">
                      <i data-lucide="presentation" className="w-5 h-5 text-purple-600"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-ocean-900 dark:text-white truncate">{wb.title}</div>
                      <div className="text-sm text-graystone-500 truncate">
                        {wb.description || 'Whiteboard'}
                      </div>
                    </div>
                    <i data-lucide="arrow-right" className="w-4 h-4 text-graystone-400 flex-shrink-0"></i>
                  </button>
                );
              })}
            </div>
          )}

          {!query.trim() && (
            <div className="p-6">
              <div className="text-sm text-graystone-500 mb-4">Quick Tips</div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-graystone-600 dark:text-graystone-300">
                  <i data-lucide="folder" className="w-4 h-4 text-ocean-500"></i>
                  <span>Search by project name, description, or owner</span>
                </div>
                <div className="flex items-center gap-3 text-graystone-600 dark:text-graystone-300">
                  <i data-lucide="presentation" className="w-4 h-4 text-purple-500"></i>
                  <span>Find whiteboards by title</span>
                </div>
                <div className="flex items-center gap-3 text-graystone-600 dark:text-graystone-300">
                  <i data-lucide="tag" className="w-4 h-4 text-green-500"></i>
                  <span>Search by tags like "Priority" or "Report"</span>
                </div>
                <div className="flex items-center gap-3 text-graystone-600 dark:text-graystone-300">
                  <i data-lucide="users" className="w-4 h-4 text-amber-500"></i>
                  <span>Search by team name</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-graystone-100 dark:border-graystone-700 bg-graystone-50 dark:bg-graystone-900 text-xs text-graystone-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-graystone-200 dark:bg-graystone-700 rounded">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-graystone-200 dark:bg-graystone-700 rounded">Enter</kbd> Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-graystone-200 dark:bg-graystone-700 rounded">Esc</kbd> Close
            </span>
          </div>
          {totalResults > 0 && (
            <span>{totalResults} result{totalResults !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default GlobalSearchModal;

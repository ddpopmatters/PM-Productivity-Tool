import React, { useEffect } from 'react';

/**
 * KeyboardShortcutsHelp - Modal showing available keyboard shortcuts
 *
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {function} onClose - Called when the modal should close
 * @param {Array} shortcuts - Optional custom shortcuts array (defaults to standard shortcuts)
 */
function KeyboardShortcutsHelp({ isOpen, onClose, shortcuts: customShortcuts }) {
  useEffect(() => {
    if (isOpen && typeof lucide !== 'undefined') {
      setTimeout(() => lucide.createIcons(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const defaultShortcuts = [
    { category: 'Navigation', items: [
      { key: 'D', description: 'Go to Dashboard' },
      { key: 'P', description: 'Go to Your Projects' },
      { key: 'T', description: 'Go to To-Do List' },
      { key: 'W', description: 'Go to Whiteboards' },
    ]},
    { category: 'Actions', items: [
      { key: '⌘/Ctrl + K', description: 'Quick Add (from anywhere)' },
      { key: '⌘/Ctrl + ⇧ + F', description: 'Global Search' },
      { key: 'N', description: 'Create new item' },
      { key: '/', description: 'Focus search in current view' },
      { key: 'B', description: 'Toggle notifications' },
    ]},
    { category: 'General', items: [
      { key: '?', description: 'Show this help' },
      { key: 'Esc', description: 'Close modals / Clear focus' },
    ]},
  ];

  const shortcuts = customShortcuts || defaultShortcuts;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboard-shortcuts-title"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-ocean-500 to-ocean-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <i data-lucide="keyboard" className="w-6 h-6" aria-hidden="true"></i>
            <h2 id="keyboard-shortcuts-title" className="text-xl font-bold">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition text-white"
            aria-label="Close keyboard shortcuts"
          >
            <i data-lucide="x" className="w-5 h-5" aria-hidden="true"></i>
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {shortcuts.map(category => (
            <div key={category.category}>
              <h3 className="text-sm font-bold text-ocean-600 uppercase tracking-wider mb-3">
                {category.category}
              </h3>
              <div className="space-y-2">
                {category.items.map(shortcut => (
                  <div key={shortcut.key} className="flex items-center justify-between py-2 px-3 bg-graystone-50 rounded-lg">
                    <span className="text-graystone-700">{shortcut.description}</span>
                    <kbd className="px-3 py-1 bg-white border border-graystone-300 rounded-md text-sm font-mono text-ocean-700 shadow-sm">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 bg-graystone-50 border-t border-graystone-200">
          <p className="text-xs text-graystone-500 text-center">
            Press <kbd className="px-1.5 py-0.5 bg-white border border-graystone-300 rounded text-xs font-mono">?</kbd> anytime to show this help
          </p>
        </div>
      </div>
    </div>
  );
}

export default KeyboardShortcutsHelp;

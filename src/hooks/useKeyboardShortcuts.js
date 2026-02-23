import { useEffect } from 'react';

export function useKeyboardShortcuts({ navigate, setShowQuickAdd, setShowGlobalSearch, setShowKeyboardHelp, closeAllOverlays }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowQuickAdd(true);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'f') {
        e.preventDefault();
        setShowGlobalSearch(true);
        return;
      }

      const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
      if (isTyping) {
        if (e.key === 'Escape') document.activeElement.blur();
        return;
      }

      switch (e.key) {
        case '?':
          e.preventDefault();
          setShowKeyboardHelp(true);
          break;
        case 'Escape':
          closeAllOverlays();
          break;
        case 'd':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            navigate('dashboard');
          }
          break;
        case 'p':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            navigate('personal');
          }
          break;
        case 't':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            navigate('todo');
          }
          break;
        case 'n':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            navigate('add-item');
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate, setShowQuickAdd, setShowGlobalSearch, setShowKeyboardHelp, closeAllOverlays]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('[data-dropdown]')) {
        // Dispatch custom event for dropdown close
        document.dispatchEvent(new CustomEvent('close-dropdowns'));
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);
}

import React, { useState } from 'react';
import Icon from '../../ui/Icon';

const QuickNotes = ({ onBack }) => {
  const [notes, setNotes] = useState('');

  const handleClear = () => {
    if (notes.trim() && confirm('Clear all notes?')) {
      setNotes('');
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-ocean-600 hover:text-ocean-700">
          <Icon name="arrow-left" className="w-5 h-5" />
          Back
        </button>
        <button
          onClick={handleClear}
          disabled={!notes.trim()}
          className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 disabled:hover:bg-transparent"
        >
          Clear
        </button>
      </div>

      <h1 className="text-2xl font-bold text-ocean-900 mb-6">Quick Notes</h1>

      <div className="bg-white rounded-xl shadow-lg p-4">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Start typing your notes here...&#10;&#10;Tips:&#10;• Use this for quick thoughts and scratch work&#10;• Notes are session-only (not saved)&#10;• Great for temporary calculations or drafts"
          className="w-full h-96 resize-none outline-none text-graystone-800 placeholder:text-graystone-400"
        />
        <div className="flex justify-between items-center pt-3 border-t border-graystone-100">
          <span className="text-sm text-graystone-500">
            {notes.length} characters
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

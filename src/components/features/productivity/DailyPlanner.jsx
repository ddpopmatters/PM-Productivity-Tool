import React, { useState } from 'react';
import Icon from '../../ui/Icon';

const DailyPlanner = ({ onBack }) => {
  const [tasks, setTasks] = useState({});
  const [editingSlot, setEditingSlot] = useState(null);
  const [editText, setEditText] = useState('');

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Generate time slots from 6am to 9pm
  const timeSlots = [];
  for (let hour = 6; hour <= 21; hour++) {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour;
    timeSlots.push({
      key: hour,
      label: `${displayHour}:00 ${ampm}`
    });
  }

  const handleSlotClick = (slotKey) => {
    setEditingSlot(slotKey);
    setEditText(tasks[slotKey] || '');
  };

  const handleSave = () => {
    if (editingSlot !== null) {
      setTasks(prev => ({
        ...prev,
        [editingSlot]: editText.trim()
      }));
      setEditingSlot(null);
      setEditText('');
    }
  };

  const handleClear = (slotKey, e) => {
    e.stopPropagation();
    setTasks(prev => {
      const newTasks = { ...prev };
      delete newTasks[slotKey];
      return newTasks;
    });
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-ocean-600 hover:text-ocean-700">
          <Icon name="arrow-left" className="w-5 h-5" />
          Back
        </button>
      </div>

      <h1 className="text-2xl font-bold text-ocean-900 mb-2">Daily Planner</h1>
      <p className="text-graystone-600 mb-6">{today}</p>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {timeSlots.map(slot => (
          <div
            key={slot.key}
            onClick={() => handleSlotClick(slot.key)}
            className={`flex items-center border-b border-graystone-100 last:border-0 cursor-pointer hover:bg-graystone-50 transition-colors ${
              tasks[slot.key] ? 'bg-ocean-50' : ''
            }`}
          >
            <div className="w-24 p-4 text-sm font-medium text-graystone-500 border-r border-graystone-100">
              {slot.label}
            </div>
            <div className="flex-1 p-4 min-h-[56px] flex items-center">
              {editingSlot === slot.key ? (
                <div className="flex-1 flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    placeholder="What's planned?"
                    className="flex-1 px-3 py-1 border rounded-lg text-sm"
                    autoFocus
                  />
                  <button
                    onClick={handleSave}
                    className="px-3 py-1 bg-ocean-600 text-white text-sm rounded-lg hover:bg-ocean-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingSlot(null)}
                    className="px-3 py-1 text-graystone-500 text-sm hover:bg-graystone-100 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              ) : tasks[slot.key] ? (
                <div className="flex-1 flex items-center justify-between group">
                  <span className="text-graystone-800">{tasks[slot.key]}</span>
                  <button
                    onClick={(e) => handleClear(slot.key, e)}
                    className="opacity-0 group-hover:opacity-100 text-graystone-400 hover:text-red-500 p-1"
                  >
                    <Icon name="x" className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <span className="text-graystone-400 text-sm">Click to add task</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-graystone-400 mt-4">
        Session only - your daily plan resets when you refresh
      </p>
    </div>
  );
};

export default DailyPlanner;

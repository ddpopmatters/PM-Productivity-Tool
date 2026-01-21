import React, { useState, useEffect } from 'react';
import Icon from '../../ui/Icon';

const HabitTracker = ({ onBack, userEmail, habits, setHabits, PRODUCTIVITY_API }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitColor, setNewHabitColor] = useState('#22c55e');
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('weekly'); // 'weekly' or 'monthly'
  const [selectedHabitForMonth, setSelectedHabitForMonth] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const habitColors = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];

  // Get last 7 days
  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toISOString().split('T')[0]);
    }
    return days;
  };

  // Get all days in the current month
  const getMonthDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    // Get the day of week the month starts on (0 = Sunday)
    const startDayOfWeek = firstDay.getDay();

    // Add empty slots for days before the first of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      days.push(date.toISOString().split('T')[0]);
    }

    return days;
  };

  // Get date range for current view
  const getDateRange = () => {
    if (viewMode === 'weekly') {
      const weekDays = getLast7Days();
      return { start: weekDays[0], end: weekDays[weekDays.length - 1] };
    } else {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
      const lastDay = new Date(year, month + 1, 0).toISOString().split('T')[0];
      return { start: firstDay, end: lastDay };
    }
  };

  const days = getLast7Days();
  const dayLabels = days.map(d => {
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  });

  const monthDays = getMonthDays();

  // Load habits and completions
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const habitData = await PRODUCTIVITY_API.fetchHabits(userEmail);
      setHabits(habitData);

      if (habitData.length > 0) {
        const habitIds = habitData.map(h => h.id);
        const range = getDateRange();
        const completionData = await PRODUCTIVITY_API.fetchCompletions(
          habitIds,
          range.start,
          range.end
        );
        setCompletions(completionData);
      }
      setLoading(false);
    };
    loadData();
  }, [userEmail, viewMode, currentMonth]);

  const handleAddHabit = async () => {
    if (!newHabitName.trim()) return;
    const habit = await PRODUCTIVITY_API.createHabit({
      user_email: userEmail,
      name: newHabitName.trim(),
      color: newHabitColor
    });
    if (habit) {
      setHabits(prev => [...prev, habit]);
      setShowAddModal(false);
      setNewHabitName('');
    }
  };

  const handleDeleteHabit = async (habitId) => {
    if (!confirm('Delete this habit?')) return;
    const success = await PRODUCTIVITY_API.deleteHabit(habitId);
    if (success) {
      setHabits(prev => prev.filter(h => h.id !== habitId));
      setCompletions(prev => prev.filter(c => c.habit_id !== habitId));
    }
  };

  const handleToggleCompletion = async (habitId, date) => {
    const result = await PRODUCTIVITY_API.toggleCompletion(habitId, date);
    if (result) {
      if (result.action === 'added') {
        setCompletions(prev => [...prev, result.data]);
      } else {
        setCompletions(prev => prev.filter(c =>
          !(c.habit_id === habitId && c.completed_date === date)
        ));
      }
    }
  };

  const isCompleted = (habitId, date) => {
    return completions.some(c => c.habit_id === habitId && c.completed_date === date);
  };

  const getStreak = (habitId) => {
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    let checkDate = today;

    while (true) {
      if (completions.some(c => c.habit_id === habitId && c.completed_date === checkDate)) {
        streak++;
        const date = new Date(checkDate);
        date.setDate(date.getDate() - 1);
        checkDate = date.toISOString().split('T')[0];
      } else {
        break;
      }
    }
    return streak;
  };

  // Get monthly completion rate for a habit
  const getMonthlyCompletionRate = (habitId) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const lastDay = isCurrentMonth ? today.getDate() : new Date(year, month + 1, 0).getDate();

    let completed = 0;
    for (let d = 1; d <= lastDay; d++) {
      const dateStr = new Date(year, month, d).toISOString().split('T')[0];
      if (completions.some(c => c.habit_id === habitId && c.completed_date === dateStr)) {
        completed++;
      }
    }
    return Math.round((completed / lastDay) * 100);
  };

  // Navigate months
  const prevMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const nextMonth = () => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  // Format month for display
  const formatMonth = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-ocean-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-ocean-600 hover:text-ocean-700">
          <Icon name="arrow-left" className="w-5 h-5" />
          Back
        </button>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-graystone-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'weekly'
                  ? 'bg-white text-ocean-600 shadow-sm'
                  : 'text-graystone-600 hover:text-graystone-800'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'monthly'
                  ? 'bg-white text-ocean-600 shadow-sm'
                  : 'text-graystone-600 hover:text-graystone-800'
              }`}
            >
              Monthly
            </button>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700"
          >
            <Icon name="plus" className="w-4 h-4" />
            Add Habit
          </button>
        </div>
      </div>

      <h1 className="text-2xl font-bold text-ocean-900 mb-6">Habit Tracker</h1>

      {/* Month Navigation (only show in monthly view) */}
      {viewMode === 'monthly' && (
        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-graystone-100 rounded-lg"
          >
            <Icon name="chevron-left" className="w-5 h-5 text-graystone-600" />
          </button>
          <span className="text-lg font-semibold text-graystone-800 min-w-[180px] text-center">
            {formatMonth(currentMonth)}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-graystone-100 rounded-lg"
          >
            <Icon name="chevron-right" className="w-5 h-5 text-graystone-600" />
          </button>
        </div>
      )}

      {habits.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <Icon name="check-circle" className="w-16 h-16 text-graystone-300 mx-auto mb-4" />
          <p className="text-graystone-600 mb-4">No habits yet. Start building better habits!</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700"
          >
            Add Your First Habit
          </button>
        </div>
      ) : viewMode === 'weekly' ? (
        /* Weekly View - Table */
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-graystone-200">
                  <th className="text-left p-4 font-medium text-graystone-600">Habit</th>
                  {dayLabels.map((day, i) => (
                    <th key={i} className="p-4 font-medium text-graystone-600 text-center w-14">
                      {day}
                    </th>
                  ))}
                  <th className="p-4 font-medium text-graystone-600 text-center w-16">Streak</th>
                  <th className="p-4 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {habits.map(habit => (
                  <tr key={habit.id} className="border-b border-graystone-100 last:border-0">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: habit.color }}
                        />
                        <span className="font-medium text-graystone-800">{habit.name}</span>
                      </div>
                    </td>
                    {days.map((day, i) => (
                      <td key={i} className="p-4 text-center">
                        <button
                          onClick={() => handleToggleCompletion(habit.id, day)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                            isCompleted(habit.id, day)
                              ? 'text-white'
                              : 'bg-graystone-100 hover:bg-graystone-200 text-graystone-400'
                          }`}
                          style={isCompleted(habit.id, day) ? { backgroundColor: habit.color } : {}}
                        >
                          {isCompleted(habit.id, day) && (
                            <Icon name="check" className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    ))}
                    <td className="p-4 text-center">
                      {getStreak(habit.id) > 0 && (
                        <span className="inline-flex items-center gap-1 text-orange-500 font-medium">
                          <span>{'\u{1F525}'}</span>
                          {getStreak(habit.id)}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleDeleteHabit(habit.id)}
                        className="text-graystone-400 hover:text-red-500"
                      >
                        <Icon name="trash-2" className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Monthly View - Calendar Grid per Habit */
        <div className="space-y-6">
          {habits.map(habit => (
            <div key={habit.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
              {/* Habit Header */}
              <div className="flex items-center justify-between p-4 border-b border-graystone-200">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: habit.color }}
                  />
                  <span className="font-semibold text-graystone-800">{habit.name}</span>
                  {getStreak(habit.id) > 0 && (
                    <span className="inline-flex items-center gap-1 text-orange-500 text-sm font-medium">
                      {'\u{1F525}'} {getStreak(habit.id)} day streak
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm text-graystone-600">
                    <span className="font-semibold" style={{ color: habit.color }}>
                      {getMonthlyCompletionRate(habit.id)}%
                    </span>
                    {' '}completion rate
                  </div>
                  <button
                    onClick={() => handleDeleteHabit(habit.id)}
                    className="text-graystone-400 hover:text-red-500"
                  >
                    <Icon name="trash-2" className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="p-4">
                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-xs font-medium text-graystone-500 py-1">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-1">
                  {monthDays.map((day, index) => {
                    if (day === null) {
                      return <div key={`empty-${index}`} className="aspect-square" />;
                    }

                    const dayNum = new Date(day).getDate();
                    const isToday = day === new Date().toISOString().split('T')[0];
                    const completed = isCompleted(habit.id, day);
                    const isFuture = new Date(day) > new Date();

                    return (
                      <button
                        key={day}
                        onClick={() => !isFuture && handleToggleCompletion(habit.id, day)}
                        disabled={isFuture}
                        className={`aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all ${
                          isFuture
                            ? 'text-graystone-300 cursor-not-allowed'
                            : completed
                              ? 'text-white'
                              : 'text-graystone-600 hover:bg-graystone-100'
                        } ${isToday ? 'ring-2 ring-ocean-400 ring-offset-1' : ''}`}
                        style={completed && !isFuture ? { backgroundColor: habit.color } : {}}
                      >
                        {dayNum}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Habit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-ocean-900 mb-4">Add New Habit</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-graystone-700 mb-1">
                  Habit Name
                </label>
                <input
                  type="text"
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  placeholder="e.g., Exercise, Read, Meditate"
                  className="w-full px-3 py-2 border rounded-lg"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-graystone-700 mb-2">
                  Color
                </label>
                <div className="flex gap-2">
                  {habitColors.map(color => (
                    <button
                      key={color}
                      onClick={() => setNewHabitColor(color)}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        newHabitColor === color ? 'ring-2 ring-offset-2 ring-ocean-500 scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewHabitName('');
                }}
                className="px-4 py-2 text-graystone-600 hover:bg-graystone-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAddHabit}
                disabled={!newHabitName.trim()}
                className="px-4 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 disabled:opacity-50"
              >
                Add Habit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HabitTracker;

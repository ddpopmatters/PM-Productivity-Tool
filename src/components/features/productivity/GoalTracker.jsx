import React, { useState, useEffect } from 'react';
import Icon from '../../ui/Icon';

const GoalTracker = ({ onBack }) => {
  const [goals, setGoals] = useState(() => {
    try {
      const saved = localStorage.getItem('goalTrackerGoals');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    targetDate: '',
    category: 'personal',
    milestones: []
  });
  const [newMilestone, setNewMilestone] = useState('');

  // Save goals to localStorage
  useEffect(() => {
    localStorage.setItem('goalTrackerGoals', JSON.stringify(goals));
  }, [goals]);

  const categories = [
    { id: 'personal', label: 'Personal', color: '#3b82f6' },
    { id: 'career', label: 'Career', color: '#8b5cf6' },
    { id: 'health', label: 'Health', color: '#22c55e' },
    { id: 'finance', label: 'Finance', color: '#f59e0b' },
    { id: 'learning', label: 'Learning', color: '#ec4899' }
  ];

  const getCategoryColor = (categoryId) => {
    return categories.find(c => c.id === categoryId)?.color || '#6b7280';
  };

  const getCategoryLabel = (categoryId) => {
    return categories.find(c => c.id === categoryId)?.label || 'Other';
  };

  const handleAddGoal = () => {
    if (!newGoal.title.trim()) return;

    const goal = {
      id: Date.now().toString(),
      ...newGoal,
      createdAt: new Date().toISOString(),
      completed: false
    };

    setGoals(prev => [goal, ...prev]);
    setShowAddModal(false);
    setNewGoal({
      title: '',
      description: '',
      targetDate: '',
      category: 'personal',
      milestones: []
    });
  };

  const handleAddMilestone = () => {
    if (!newMilestone.trim()) return;
    setNewGoal(prev => ({
      ...prev,
      milestones: [...prev.milestones, { id: Date.now().toString(), title: newMilestone.trim(), completed: false }]
    }));
    setNewMilestone('');
  };

  const handleRemoveMilestone = (milestoneId) => {
    setNewGoal(prev => ({
      ...prev,
      milestones: prev.milestones.filter(m => m.id !== milestoneId)
    }));
  };

  const handleToggleMilestone = (goalId, milestoneId) => {
    setGoals(prev => prev.map(goal => {
      if (goal.id === goalId) {
        return {
          ...goal,
          milestones: goal.milestones.map(m =>
            m.id === milestoneId ? { ...m, completed: !m.completed } : m
          )
        };
      }
      return goal;
    }));
  };

  const handleToggleGoalComplete = (goalId) => {
    setGoals(prev => prev.map(goal =>
      goal.id === goalId ? { ...goal, completed: !goal.completed } : goal
    ));
  };

  const handleDeleteGoal = (goalId) => {
    if (!confirm('Delete this goal?')) return;
    setGoals(prev => prev.filter(g => g.id !== goalId));
  };

  const getProgress = (goal) => {
    if (goal.milestones.length === 0) return goal.completed ? 100 : 0;
    const completed = goal.milestones.filter(m => m.completed).length;
    return Math.round((completed / goal.milestones.length) * 100);
  };

  const getDaysRemaining = (targetDate) => {
    if (!targetDate) return null;
    const target = new Date(targetDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const activeGoals = goals.filter(g => !g.completed);
  const completedGoals = goals.filter(g => g.completed);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-ocean-600 hover:text-ocean-700">
          <Icon name="arrow-left" className="w-5 h-5" />
          Back
        </button>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700"
        >
          <Icon name="plus" className="w-4 h-4" />
          Add Goal
        </button>
      </div>

      <h1 className="text-2xl font-bold text-ocean-900 mb-6">Goal Tracker</h1>

      {goals.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <Icon name="target" className="w-16 h-16 text-graystone-300 mx-auto mb-4" />
          <p className="text-graystone-600 mb-4">No goals yet. Start setting goals to achieve!</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700"
          >
            Create Your First Goal
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Goals */}
          {activeGoals.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-graystone-700 mb-3">Active Goals ({activeGoals.length})</h2>
              <div className="space-y-4">
                {activeGoals.map(goal => {
                  const progress = getProgress(goal);
                  const daysRemaining = getDaysRemaining(goal.targetDate);

                  return (
                    <div key={goal.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3">
                            <button
                              onClick={() => handleToggleGoalComplete(goal.id)}
                              className="mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center hover:bg-graystone-100"
                              style={{ borderColor: getCategoryColor(goal.category) }}
                            >
                              {goal.completed && (
                                <Icon name="check" className="w-3 h-3" style={{ color: getCategoryColor(goal.category) }} />
                              )}
                            </button>
                            <div>
                              <h3 className="font-semibold text-graystone-800">{goal.title}</h3>
                              {goal.description && (
                                <p className="text-sm text-graystone-600 mt-1">{goal.description}</p>
                              )}
                              <div className="flex items-center gap-3 mt-2">
                                <span
                                  className="text-xs px-2 py-0.5 rounded-full text-white"
                                  style={{ backgroundColor: getCategoryColor(goal.category) }}
                                >
                                  {getCategoryLabel(goal.category)}
                                </span>
                                {daysRemaining !== null && (
                                  <span className={`text-xs ${daysRemaining < 0 ? 'text-red-500' : daysRemaining <= 7 ? 'text-amber-500' : 'text-graystone-500'}`}>
                                    {daysRemaining < 0
                                      ? `${Math.abs(daysRemaining)} days overdue`
                                      : daysRemaining === 0
                                        ? 'Due today'
                                        : `${daysRemaining} days left`
                                    }
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="text-graystone-400 hover:text-red-500"
                          >
                            <Icon name="trash-2" className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-graystone-600">Progress</span>
                            <span className="font-medium" style={{ color: getCategoryColor(goal.category) }}>{progress}%</span>
                          </div>
                          <div className="h-2 bg-graystone-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${progress}%`, backgroundColor: getCategoryColor(goal.category) }}
                            />
                          </div>
                        </div>

                        {/* Milestones */}
                        {goal.milestones.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-graystone-500 uppercase">Milestones</p>
                            {goal.milestones.map(milestone => (
                              <div
                                key={milestone.id}
                                className="flex items-center gap-2 pl-2"
                              >
                                <button
                                  onClick={() => handleToggleMilestone(goal.id, milestone.id)}
                                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                    milestone.completed
                                      ? 'bg-green-500 border-green-500 text-white'
                                      : 'border-graystone-300 hover:border-graystone-400'
                                  }`}
                                >
                                  {milestone.completed && (
                                    <Icon name="check" className="w-3 h-3" />
                                  )}
                                </button>
                                <span className={`text-sm ${milestone.completed ? 'line-through text-graystone-400' : 'text-graystone-700'}`}>
                                  {milestone.title}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-graystone-700 mb-3">Completed ({completedGoals.length})</h2>
              <div className="space-y-3">
                {completedGoals.map(goal => (
                  <div key={goal.id} className="bg-white rounded-lg border border-graystone-200 p-4 opacity-75">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleGoalComplete(goal.id)}
                          className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center"
                        >
                          <Icon name="check" className="w-3 h-3 text-white" />
                        </button>
                        <span className="line-through text-graystone-500">{goal.title}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="text-graystone-400 hover:text-red-500"
                      >
                        <Icon name="trash-2" className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Goal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-ocean-900 mb-4">Create New Goal</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-graystone-700 mb-1">Goal Title</label>
                <input
                  type="text"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="What do you want to achieve?"
                  className="w-full px-3 py-2 border rounded-lg"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-graystone-700 mb-1">Description (optional)</label>
                <textarea
                  value={newGoal.description}
                  onChange={(e) => setNewGoal(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Add more details about your goal..."
                  className="w-full px-3 py-2 border rounded-lg resize-none"
                  rows="2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-graystone-700 mb-1">Category</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setNewGoal(prev => ({ ...prev, category: cat.id }))}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        newGoal.category === cat.id
                          ? 'text-white ring-2 ring-offset-2'
                          : 'bg-graystone-100 text-graystone-600 hover:bg-graystone-200'
                      }`}
                      style={newGoal.category === cat.id ? { backgroundColor: cat.color, ringColor: cat.color } : {}}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-graystone-700 mb-1">Target Date (optional)</label>
                <input
                  type="date"
                  value={newGoal.targetDate}
                  onChange={(e) => setNewGoal(prev => ({ ...prev, targetDate: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-graystone-700 mb-2">Milestones (optional)</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newMilestone}
                    onChange={(e) => setNewMilestone(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddMilestone())}
                    placeholder="Add a milestone..."
                    className="flex-1 px-3 py-2 border rounded-lg text-sm"
                  />
                  <button
                    onClick={handleAddMilestone}
                    className="px-3 py-2 bg-graystone-100 rounded-lg hover:bg-graystone-200"
                  >
                    <Icon name="plus" className="w-4 h-4 text-graystone-600" />
                  </button>
                </div>
                {newGoal.milestones.length > 0 && (
                  <div className="space-y-2 bg-graystone-50 rounded-lg p-2">
                    {newGoal.milestones.map((milestone, index) => (
                      <div key={milestone.id} className="flex items-center justify-between bg-white rounded px-3 py-2">
                        <span className="text-sm text-graystone-700">{index + 1}. {milestone.title}</span>
                        <button
                          onClick={() => handleRemoveMilestone(milestone.id)}
                          className="text-graystone-400 hover:text-red-500"
                        >
                          <Icon name="x" className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewGoal({ title: '', description: '', targetDate: '', category: 'personal', milestones: [] });
                  setNewMilestone('');
                }}
                className="px-4 py-2 text-graystone-600 hover:bg-graystone-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAddGoal}
                disabled={!newGoal.title.trim()}
                className="px-4 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 disabled:opacity-50"
              >
                Create Goal
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-graystone-400 mt-6">
        Goals are saved in your browser's local storage
      </p>
    </div>
  );
};

export default GoalTracker;

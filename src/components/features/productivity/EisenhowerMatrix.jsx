import React, { useState, useEffect } from 'react';
import Icon from '../../ui/Icon';

const EisenhowerMatrix = ({ onBack, userEmail, matrixTasks, setMatrixTasks, PRODUCTIVITY_API }) => {
  const [newTask, setNewTask] = useState({ do: '', schedule: '', delegate: '', eliminate: '' });
  const [loading, setLoading] = useState(true);
  const [draggedTask, setDraggedTask] = useState(null);
  const [showExample, setShowExample] = useState(false);

  const exampleTasks = [
    { id: 'ex1', title: 'Client presentation due tomorrow', quadrant: 'do', completed: false },
    { id: 'ex2', title: 'Fix critical bug in production', quadrant: 'do', completed: false },
    { id: 'ex3', title: 'Respond to urgent email from manager', quadrant: 'do', completed: true },
    { id: 'ex4', title: 'Plan Q2 strategy', quadrant: 'schedule', completed: false },
    { id: 'ex5', title: 'Learn new framework', quadrant: 'schedule', completed: false },
    { id: 'ex6', title: 'Write documentation', quadrant: 'schedule', completed: false },
    { id: 'ex7', title: 'Schedule team meetings', quadrant: 'delegate', completed: false },
    { id: 'ex8', title: 'Data entry tasks', quadrant: 'delegate', completed: false },
    { id: 'ex9', title: 'Organize shared drive', quadrant: 'delegate', completed: true },
    { id: 'ex10', title: 'Attend optional webinar', quadrant: 'eliminate', completed: false },
    { id: 'ex11', title: 'Check social media', quadrant: 'eliminate', completed: false },
    { id: 'ex12', title: 'Reorganize desk again', quadrant: 'eliminate', completed: false },
  ];

  const quadrants = [
    { id: 'do', title: 'Do First', subtitle: 'Urgent & Important', color: 'red', icon: 'alert-circle' },
    { id: 'schedule', title: 'Schedule', subtitle: 'Not Urgent & Important', color: 'amber', icon: 'calendar' },
    { id: 'delegate', title: 'Delegate', subtitle: 'Urgent & Not Important', color: 'blue', icon: 'users' },
    { id: 'eliminate', title: 'Eliminate', subtitle: 'Not Urgent & Not Important', color: 'graystone', icon: 'trash-2' }
  ];

  // Load tasks
  useEffect(() => {
    const loadTasks = async () => {
      setLoading(true);
      const tasks = await PRODUCTIVITY_API.fetchMatrixTasks(userEmail);
      setMatrixTasks(tasks);
      setLoading(false);
    };
    loadTasks();
  }, [userEmail, PRODUCTIVITY_API, setMatrixTasks]);

  const handleAddTask = async (quadrant) => {
    const title = newTask[quadrant];
    if (!title.trim()) return;

    const task = await PRODUCTIVITY_API.createMatrixTask({
      user_email: userEmail,
      title: title.trim(),
      quadrant
    });

    if (task) {
      setMatrixTasks(prev => [...prev, task]);
      setNewTask(prev => ({ ...prev, [quadrant]: '' }));
    }
  };

  const handleToggleComplete = async (task) => {
    const updated = await PRODUCTIVITY_API.updateMatrixTask(task.id, {
      completed: !task.completed
    });
    if (updated) {
      setMatrixTasks(prev => prev.map(t => t.id === task.id ? updated : t));
    }
  };

  const handleDeleteTask = async (taskId) => {
    const success = await PRODUCTIVITY_API.deleteMatrixTask(taskId);
    if (success) {
      setMatrixTasks(prev => prev.filter(t => t.id !== taskId));
    }
  };

  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, quadrant) => {
    e.preventDefault();
    if (draggedTask && draggedTask.quadrant !== quadrant) {
      const updated = await PRODUCTIVITY_API.updateMatrixTask(draggedTask.id, {
        quadrant
      });
      if (updated) {
        setMatrixTasks(prev => prev.map(t => t.id === draggedTask.id ? updated : t));
      }
    }
    setDraggedTask(null);
  };

  const clearCompleted = async () => {
    const completedTasks = matrixTasks.filter(t => t.completed);
    for (const task of completedTasks) {
      await PRODUCTIVITY_API.deleteMatrixTask(task.id);
    }
    setMatrixTasks(prev => prev.filter(t => !t.completed));
  };

  const getQuadrantColor = (quadrant, type) => {
    const colors = {
      do: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', header: 'bg-red-100' },
      schedule: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', header: 'bg-amber-100' },
      delegate: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', header: 'bg-blue-100' },
      eliminate: { bg: 'bg-graystone-50', border: 'border-graystone-200', text: 'text-graystone-600', header: 'bg-graystone-100' }
    };
    return colors[quadrant][type];
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-ocean-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const completedCount = matrixTasks.filter(t => t.completed).length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-ocean-600 hover:text-ocean-700">
          <Icon name="arrow-left" className="w-5 h-5" />
          Back
        </button>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowExample(!showExample)}
            className={`text-sm ${showExample ? 'text-ocean-600 font-medium' : 'text-ocean-500 hover:text-ocean-600'}`}
          >
            {showExample ? 'Hide Example' : 'Show Example'}
          </button>
          {!showExample && completedCount > 0 && (
            <button
              onClick={clearCompleted}
              className="text-sm text-graystone-500 hover:text-red-500"
            >
              Clear {completedCount} completed
            </button>
          )}
        </div>
      </div>

      <h1 className="text-2xl font-bold text-ocean-900 mb-2">Eisenhower Matrix</h1>
      <p className="text-graystone-600 mb-4">Prioritize tasks by urgency and importance</p>

      {showExample && (
        <div className="mb-4 p-3 bg-ocean-50 border border-ocean-200 rounded-lg text-sm text-ocean-700">
          <strong>Example:</strong> This shows how tasks can be organized. Your actual tasks will appear when you dismiss this example.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quadrants.map(q => {
          const tasks = showExample
            ? exampleTasks.filter(t => t.quadrant === q.id)
            : matrixTasks.filter(t => t.quadrant === q.id);
          return (
            <div
              key={q.id}
              className={`rounded-xl border-2 ${getQuadrantColor(q.id, 'border')} ${getQuadrantColor(q.id, 'bg')} overflow-hidden`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, q.id)}
            >
              <div className={`p-3 ${getQuadrantColor(q.id, 'header')}`}>
                <div className="flex items-center gap-2">
                  <Icon name={q.icon} className={`w-5 h-5 ${getQuadrantColor(q.id, 'text')}`} />
                  <div>
                    <h3 className={`font-bold ${getQuadrantColor(q.id, 'text')}`}>{q.title}</h3>
                    <p className="text-xs text-graystone-500">{q.subtitle}</p>
                  </div>
                </div>
              </div>

              <div className="p-3 min-h-[150px]">
                <div className="space-y-2 mb-3">
                  {tasks.map(task => (
                    <div
                      key={task.id}
                      draggable={!showExample}
                      onDragStart={(e) => !showExample && handleDragStart(e, task)}
                      className={`flex items-center gap-2 p-2 bg-white rounded-lg shadow-sm ${showExample ? 'cursor-default' : 'cursor-move'} group ${
                        task.completed ? 'opacity-60' : ''
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          task.completed
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-graystone-300'
                        } ${!showExample ? 'cursor-pointer hover:border-green-500' : ''}`}
                        onClick={() => !showExample && handleToggleComplete(task)}
                      >
                        {task.completed && <Icon name="check" className="w-3 h-3" />}
                      </div>
                      <span className={`flex-1 text-sm ${task.completed ? 'line-through text-graystone-400' : 'text-graystone-700'}`}>
                        {task.title}
                      </span>
                      {!showExample && (
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="opacity-0 group-hover:opacity-100 text-graystone-400 hover:text-red-500"
                        >
                          <Icon name="x" className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {!showExample && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTask[q.id]}
                      onChange={(e) => setNewTask(prev => ({ ...prev, [q.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTask(q.id)}
                      placeholder="Add task..."
                      className="flex-1 px-3 py-2 text-sm border border-graystone-200 rounded-lg bg-white"
                    />
                    <button
                      onClick={() => handleAddTask(q.id)}
                      disabled={!newTask[q.id].trim()}
                      className="px-3 py-2 bg-white border border-graystone-200 rounded-lg hover:bg-graystone-50 disabled:opacity-50"
                    >
                      <Icon name="plus" className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EisenhowerMatrix;

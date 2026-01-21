import React, { useState, useEffect } from 'react';
import Icon from '../../ui/Icon';

const PomodoroTimer = ({ onBack, Logger = console, playBeep = () => {} }) => {
  const [settings, setSettings] = useState({ work: 25, break: 5, longBreak: 15 });
  const [mode, setMode] = useState('work'); // 'work', 'break', 'longBreak'
  const [timeLeft, setTimeLeft] = useState(settings.work * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);

  // Stats persisted to localStorage
  const [stats, setStats] = useState(() => {
    try {
      const saved = localStorage.getItem('pomodoroStats');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Check if last session was today for streak
        const today = new Date().toDateString();
        const lastDate = parsed.lastSessionDate;
        if (lastDate) {
          const lastDateObj = new Date(lastDate);
          const daysDiff = Math.floor((new Date(today) - lastDateObj) / (1000 * 60 * 60 * 24));
          if (daysDiff > 1) {
            // Streak broken - reset it
            return { ...parsed, currentStreak: 0 };
          }
        }
        return parsed;
      }
    } catch (e) {
      Logger.error(e, 'Error loading pomodoro stats');
    }
    return {
      totalSessions: 0,
      totalFocusMinutes: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastSessionDate: null,
      todaySessions: 0,
      todayDate: new Date().toDateString()
    };
  });

  // Save stats to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('pomodoroStats', JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    let interval = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(t => t - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      playBeep();
      setIsRunning(false);

      if (mode === 'work') {
        const newSessions = sessionsCompleted + 1;
        setSessionsCompleted(newSessions);

        // Update stats
        setStats(prev => {
          const today = new Date().toDateString();
          const isNewDay = prev.todayDate !== today;
          const todaySessions = isNewDay ? 1 : prev.todaySessions + 1;

          // Calculate streak
          let newStreak = prev.currentStreak;
          if (isNewDay) {
            const lastDate = prev.lastSessionDate ? new Date(prev.lastSessionDate) : null;
            const todayDate = new Date(today);
            if (lastDate) {
              const daysDiff = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
              newStreak = daysDiff <= 1 ? prev.currentStreak + 1 : 1;
            } else {
              newStreak = 1;
            }
          } else if (prev.todaySessions === 0) {
            // First session of the day
            const lastDate = prev.lastSessionDate ? new Date(prev.lastSessionDate) : null;
            const todayDate = new Date(today);
            if (lastDate) {
              const daysDiff = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
              newStreak = daysDiff <= 1 ? prev.currentStreak + 1 : 1;
            } else {
              newStreak = 1;
            }
          }

          return {
            totalSessions: prev.totalSessions + 1,
            totalFocusMinutes: prev.totalFocusMinutes + settings.work,
            currentStreak: newStreak,
            longestStreak: Math.max(prev.longestStreak, newStreak),
            lastSessionDate: today,
            todaySessions: todaySessions,
            todayDate: today
          };
        });

        if (newSessions % 4 === 0) {
          setMode('longBreak');
          setTimeLeft(settings.longBreak * 60);
        } else {
          setMode('break');
          setTimeLeft(settings.break * 60);
        }
      } else {
        setMode('work');
        setTimeLeft(settings.work * 60);
      }
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, mode, sessionsCompleted, settings, playBeep]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const reset = () => {
    setIsRunning(false);
    setMode('work');
    setTimeLeft(settings.work * 60);
  };

  const getModeColor = () => {
    switch (mode) {
      case 'work': return 'text-red-600';
      case 'break': return 'text-green-600';
      case 'longBreak': return 'text-blue-600';
      default: return 'text-graystone-600';
    }
  };

  const getModeLabel = () => {
    switch (mode) {
      case 'work': return 'Work Time';
      case 'break': return 'Short Break';
      case 'longBreak': return 'Long Break';
      default: return '';
    }
  };

  // Format minutes to hours and minutes display
  const formatFocusTime = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-ocean-600 hover:text-ocean-700">
          <Icon name="arrow-left" className="w-5 h-5" />
          Back
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowStats(true)} className="p-2 hover:bg-graystone-100 rounded-lg" title="View Stats">
            <Icon name="bar-chart-2" className="w-5 h-5 text-graystone-600" />
          </button>
          <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-graystone-100 rounded-lg" title="Settings">
            <Icon name="settings" className="w-5 h-5 text-graystone-600" />
          </button>
        </div>
      </div>

      <div className="text-center">
        <h1 className="text-2xl font-bold text-ocean-900 mb-8">Pomodoro Timer</h1>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className={`text-7xl font-mono font-bold mb-4 ${getModeColor()}`}>
            {formatTime(timeLeft)}
          </div>
          <div className={`text-lg font-medium ${getModeColor()}`}>
            {getModeLabel()}
          </div>
        </div>

        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`px-8 py-3 rounded-lg font-medium text-white transition-colors ${
              isRunning ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {isRunning ? 'Pause' : 'Start'}
          </button>
          <button
            onClick={reset}
            className="px-8 py-3 rounded-lg font-medium bg-graystone-200 hover:bg-graystone-300 transition-colors"
          >
            Reset
          </button>
        </div>

        <div className="flex justify-center items-center gap-2">
          <span className="text-graystone-600">Sessions:</span>
          <div className="flex gap-1">
            {[...Array(4)].map((_, i) => (
              <span key={i} className="text-2xl">
                {i < (sessionsCompleted % 4) || (sessionsCompleted > 0 && sessionsCompleted % 4 === 0 && i < 4) ? '\u{1F345}' : '\u26AA'}
              </span>
            ))}
          </div>
          <span className="text-graystone-500 ml-2">({sessionsCompleted} total)</span>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-ocean-900 mb-4">Timer Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-graystone-700 mb-1">
                  Work Duration (minutes)
                </label>
                <input
                  type="number"
                  value={settings.work}
                  onChange={(e) => setSettings(s => ({ ...s, work: parseInt(e.target.value) || 25 }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  min="1"
                  max="60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-graystone-700 mb-1">
                  Short Break (minutes)
                </label>
                <input
                  type="number"
                  value={settings.break}
                  onChange={(e) => setSettings(s => ({ ...s, break: parseInt(e.target.value) || 5 }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  min="1"
                  max="30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-graystone-700 mb-1">
                  Long Break (minutes)
                </label>
                <input
                  type="number"
                  value={settings.longBreak}
                  onChange={(e) => setSettings(s => ({ ...s, longBreak: parseInt(e.target.value) || 15 }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  min="1"
                  max="60"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-graystone-600 hover:bg-graystone-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  reset();
                  setShowSettings(false);
                }}
                className="px-4 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700"
              >
                Apply & Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {showStats && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-ocean-900">Your Focus Stats</h3>
              <button onClick={() => setShowStats(false)} className="p-1 hover:bg-graystone-100 rounded">
                <Icon name="x" className="w-5 h-5 text-graystone-600" />
              </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-red-50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-red-600">{stats.totalSessions}</div>
                <div className="text-sm text-red-700">Total Sessions</div>
              </div>
              <div className="bg-ocean-50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-ocean-600">{formatFocusTime(stats.totalFocusMinutes)}</div>
                <div className="text-sm text-ocean-700">Focus Time</div>
              </div>
              <div className="bg-amber-50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-amber-600">{stats.currentStreak}</div>
                <div className="text-sm text-amber-700">Day Streak</div>
              </div>
              <div className="bg-purple-50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-purple-600">{stats.longestStreak}</div>
                <div className="text-sm text-purple-700">Best Streak</div>
              </div>
            </div>

            {/* Today's Progress */}
            <div className="bg-green-50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-green-700 font-medium">Today's Sessions</div>
                  <div className="text-2xl font-bold text-green-600">{stats.todaySessions}</div>
                </div>
                <div className="flex gap-1">
                  {[...Array(Math.min(stats.todaySessions, 8))].map((_, i) => (
                    <span key={i} className="text-xl">{'\u{1F345}'}</span>
                  ))}
                  {stats.todaySessions > 8 && (
                    <span className="text-green-600 text-sm font-medium">+{stats.todaySessions - 8}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Reset Stats */}
            <div className="flex justify-between items-center pt-4 border-t">
              <button
                onClick={() => {
                  if (confirm('Reset all stats? This cannot be undone.')) {
                    setStats({
                      totalSessions: 0,
                      totalFocusMinutes: 0,
                      currentStreak: 0,
                      longestStreak: 0,
                      lastSessionDate: null,
                      todaySessions: 0,
                      todayDate: new Date().toDateString()
                    });
                  }
                }}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Reset Stats
              </button>
              <button
                onClick={() => setShowStats(false)}
                className="px-4 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PomodoroTimer;

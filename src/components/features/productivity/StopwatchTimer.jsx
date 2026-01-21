import React, { useState, useEffect } from 'react';
import Icon from '../../ui/Icon';

const StopwatchTimer = ({ onBack, playBeep = () => {} }) => {
  const [mode, setMode] = useState('stopwatch'); // 'stopwatch' or 'timer'

  // Stopwatch state
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [laps, setLaps] = useState([]);

  // Timer state
  const [timerInput, setTimerInput] = useState({ minutes: 5, seconds: 0 });
  const [timerTime, setTimerTime] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  // Stopwatch effect
  useEffect(() => {
    let interval = null;
    if (stopwatchRunning) {
      interval = setInterval(() => {
        setStopwatchTime(t => t + 10);
      }, 10);
    }
    return () => clearInterval(interval);
  }, [stopwatchRunning]);

  // Timer effect
  useEffect(() => {
    let interval = null;
    if (timerRunning && timerTime > 0) {
      interval = setInterval(() => {
        setTimerTime(t => t - 1000);
      }, 1000);
    } else if (timerTime === 0 && timerRunning) {
      playBeep();
      setTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timerTime, playBeep]);

  const formatStopwatch = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  };

  const formatTimer = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const addLap = () => {
    setLaps(prev => [stopwatchTime, ...prev]);
  };

  const resetStopwatch = () => {
    setStopwatchRunning(false);
    setStopwatchTime(0);
    setLaps([]);
  };

  const startTimer = () => {
    const totalMs = (timerInput.minutes * 60 + timerInput.seconds) * 1000;
    if (totalMs > 0) {
      setTimerTime(totalMs);
      setTimerRunning(true);
    }
  };

  const resetTimer = () => {
    setTimerRunning(false);
    setTimerTime(0);
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="flex items-center mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-ocean-600 hover:text-ocean-700">
          <Icon name="arrow-left" className="w-5 h-5" />
          Back
        </button>
      </div>

      <h1 className="text-2xl font-bold text-ocean-900 mb-6 text-center">Stopwatch & Timer</h1>

      {/* Tab Toggle */}
      <div className="flex bg-graystone-100 rounded-lg p-1 mb-6">
        <button
          onClick={() => setMode('stopwatch')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            mode === 'stopwatch' ? 'bg-white shadow text-ocean-600' : 'text-graystone-600'
          }`}
        >
          Stopwatch
        </button>
        <button
          onClick={() => setMode('timer')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            mode === 'timer' ? 'bg-white shadow text-ocean-600' : 'text-graystone-600'
          }`}
        >
          Timer
        </button>
      </div>

      {mode === 'stopwatch' ? (
        <div className="text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
            <div className="text-5xl font-mono font-bold text-ocean-900">
              {formatStopwatch(stopwatchTime)}
            </div>
          </div>

          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={() => setStopwatchRunning(!stopwatchRunning)}
              className={`px-6 py-3 rounded-lg font-medium text-white transition-colors ${
                stopwatchRunning ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-500 hover:bg-green-600'
              }`}
            >
              {stopwatchRunning ? 'Stop' : 'Start'}
            </button>
            <button
              onClick={addLap}
              disabled={!stopwatchRunning}
              className="px-6 py-3 rounded-lg font-medium bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 transition-colors"
            >
              Lap
            </button>
            <button
              onClick={resetStopwatch}
              className="px-6 py-3 rounded-lg font-medium bg-graystone-200 hover:bg-graystone-300 transition-colors"
            >
              Reset
            </button>
          </div>

          {laps.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4 max-h-48 overflow-y-auto">
              <h3 className="text-sm font-medium text-graystone-600 mb-2">Laps</h3>
              {laps.map((lap, index) => (
                <div key={index} className="flex justify-between py-1 border-b border-graystone-100 last:border-0">
                  <span className="text-graystone-500">Lap {laps.length - index}</span>
                  <span className="font-mono">{formatStopwatch(lap)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center">
          {!timerRunning && timerTime === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
              <div className="flex justify-center items-center gap-2">
                <input
                  type="number"
                  value={timerInput.minutes}
                  onChange={(e) => setTimerInput(t => ({ ...t, minutes: parseInt(e.target.value) || 0 }))}
                  className="w-20 text-4xl font-mono text-center border-b-2 border-ocean-300 focus:border-ocean-500 outline-none"
                  min="0"
                  max="99"
                />
                <span className="text-4xl font-mono">:</span>
                <input
                  type="number"
                  value={timerInput.seconds}
                  onChange={(e) => setTimerInput(t => ({ ...t, seconds: Math.min(59, parseInt(e.target.value) || 0) }))}
                  className="w-20 text-4xl font-mono text-center border-b-2 border-ocean-300 focus:border-ocean-500 outline-none"
                  min="0"
                  max="59"
                />
              </div>
              <p className="text-graystone-500 mt-2">minutes : seconds</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
              <div className={`text-6xl font-mono font-bold ${timerTime <= 10000 ? 'text-red-600' : 'text-ocean-900'}`}>
                {formatTimer(timerTime)}
              </div>
            </div>
          )}

          <div className="flex justify-center gap-4">
            {!timerRunning && timerTime === 0 ? (
              <button
                onClick={startTimer}
                className="px-8 py-3 rounded-lg font-medium bg-green-500 hover:bg-green-600 text-white transition-colors"
              >
                Start
              </button>
            ) : (
              <>
                <button
                  onClick={() => setTimerRunning(!timerRunning)}
                  className={`px-6 py-3 rounded-lg font-medium text-white transition-colors ${
                    timerRunning ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  {timerRunning ? 'Pause' : 'Resume'}
                </button>
                <button
                  onClick={resetTimer}
                  className="px-6 py-3 rounded-lg font-medium bg-graystone-200 hover:bg-graystone-300 transition-colors"
                >
                  Reset
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StopwatchTimer;

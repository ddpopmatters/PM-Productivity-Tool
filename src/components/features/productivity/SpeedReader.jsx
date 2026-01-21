import React, { useState, useEffect } from 'react';
import Icon from '../../ui/Icon';

const SpeedReader = ({ onBack }) => {
  const [text, setText] = useState('');
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [wpm, setWpm] = useState(300);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('speedReaderHistory');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const wpmOptions = [100, 200, 300, 400, 500, 600, 800, 1000];

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('speedReaderHistory', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    // Parse text into words when text changes
    const parsed = text.trim().split(/\s+/).filter(w => w.length > 0);
    setWords(parsed);
    setCurrentIndex(0);
    setIsPlaying(false);
  }, [text]);

  useEffect(() => {
    let interval = null;
    if (isPlaying && currentIndex < words.length) {
      const delay = 60000 / wpm;
      interval = setInterval(() => {
        setCurrentIndex(i => {
          if (i >= words.length - 1) {
            setIsPlaying(false);
            return i;
          }
          return i + 1;
        });
      }, delay);
    }
    return () => clearInterval(interval);
  }, [isPlaying, wpm, words.length, currentIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (words.length > 0) setIsPlaying(p => !p);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        const currentWpmIndex = wpmOptions.indexOf(wpm);
        if (currentWpmIndex > 0) setWpm(wpmOptions[currentWpmIndex - 1]);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        const currentWpmIndex = wpmOptions.indexOf(wpm);
        if (currentWpmIndex < wpmOptions.length - 1) setWpm(wpmOptions[currentWpmIndex + 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [wpm, words.length]);

  // Get focal point index (ORP at ~35% of word length)
  const getFocalIndex = (word) => Math.floor(word.length * 0.35);

  const renderWord = (word) => {
    if (!word) return null;
    const focalIndex = getFocalIndex(word);
    const before = word.slice(0, focalIndex);
    const focal = word[focalIndex];
    const after = word.slice(focalIndex + 1);

    return (
      <span className="text-5xl font-mono tracking-wide">
        <span className="text-graystone-800">{before}</span>
        <span className="text-red-600 font-bold">{focal}</span>
        <span className="text-graystone-800">{after}</span>
      </span>
    );
  };

  const reset = () => {
    setCurrentIndex(0);
    setIsPlaying(false);
  };

  const stepBack = () => {
    setCurrentIndex(i => Math.max(0, i - 1));
  };

  const stepForward = () => {
    setCurrentIndex(i => Math.min(words.length - 1, i + 1));
  };

  // History management functions
  const saveToHistory = () => {
    if (!text.trim() || words.length < 10) return;

    const preview = text.substring(0, 100).replace(/\s+/g, ' ').trim();
    const title = preview.length < text.length ? `${preview}...` : preview;

    const entry = {
      id: `sr${Date.now()}`,
      text: text,
      title: title,
      wordCount: words.length,
      lastPosition: currentIndex,
      progress: Math.round(((currentIndex + 1) / words.length) * 100),
      wpm: wpm,
      savedAt: new Date().toISOString()
    };

    // Update existing or add new
    setHistory(prev => {
      const existingIndex = prev.findIndex(h => h.text === text);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...entry, id: prev[existingIndex].id };
        return updated;
      }
      return [entry, ...prev].slice(0, 10); // Keep last 10
    });
  };

  const loadFromHistory = (entry) => {
    setText(entry.text);
    setWpm(entry.wpm || 300);
    setShowHistory(false);
    // Position will be set after text effect processes
    setTimeout(() => {
      setCurrentIndex(entry.lastPosition || 0);
    }, 100);
  };

  const deleteFromHistory = (id) => {
    setHistory(prev => prev.filter(h => h.id !== id));
  };

  const clearHistory = () => {
    if (confirm('Clear all reading history?')) {
      setHistory([]);
    }
  };

  // Auto-save progress when pausing or completing
  useEffect(() => {
    if (!isPlaying && text.trim() && words.length >= 10 && currentIndex > 0) {
      saveToHistory();
    }
  }, [isPlaying]);

  const progress = words.length > 0 ? ((currentIndex + 1) / words.length) * 100 : 0;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-ocean-600 hover:text-ocean-700">
          <Icon name="arrow-left" className="w-5 h-5" />
          Back
        </button>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            showHistory ? 'bg-pink-100 text-pink-700' : 'text-graystone-600 hover:bg-graystone-100'
          }`}
        >
          <Icon name="history" className="w-4 h-4" />
          History ({history.length})
        </button>
      </div>

      <h1 className="text-2xl font-bold text-ocean-900 mb-6">Speed Reader</h1>

      {/* History Panel */}
      {showHistory && (
        <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-pink-900">Reading History</h3>
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-xs text-pink-600 hover:text-pink-700"
              >
                Clear All
              </button>
            )}
          </div>
          {history.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {history.map(entry => (
                <div
                  key={entry.id}
                  className="bg-white rounded-lg p-3 border border-pink-100 hover:border-pink-300 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-graystone-800 truncate">{entry.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-graystone-500">
                        <span>{entry.wordCount} words</span>
                        <span>{entry.progress}% read</span>
                        <span>{entry.wpm} wpm</span>
                      </div>
                      <div className="w-full h-1 bg-graystone-200 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-pink-400" style={{ width: `${entry.progress}%` }}></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => loadFromHistory(entry)}
                        className="px-2 py-1 text-xs bg-pink-600 text-white rounded hover:bg-pink-700 transition-colors"
                      >
                        {entry.progress < 100 ? 'Resume' : 'Re-read'}
                      </button>
                      <button
                        onClick={() => deleteFromHistory(entry.id)}
                        className="p-1 text-graystone-400 hover:text-red-500 transition-colors"
                      >
                        <Icon name="x" className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-pink-600 text-center py-4">No reading history yet. Start reading to save progress!</p>
          )}
        </div>
      )}

      {/* Word Display */}
      <div className="bg-graystone-900 rounded-xl p-8 mb-6 min-h-[160px] flex flex-col items-center justify-center">
        {words.length > 0 ? (
          <>
            <div className="relative">
              {/* Focal point indicator line */}
              <div className="absolute left-1/2 -top-2 w-0.5 h-2 bg-red-500/50"></div>
              {renderWord(words[currentIndex])}
              <div className="absolute left-1/2 -bottom-2 w-0.5 h-2 bg-red-500/50"></div>
            </div>
            <div className="mt-4 text-graystone-400 text-sm">
              {wpm} wpm
            </div>
          </>
        ) : (
          <span className="text-graystone-500 text-xl">Paste text below to begin</span>
        )}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-3 mb-6">
        <button
          onClick={stepBack}
          disabled={words.length === 0 || currentIndex === 0}
          className="p-3 bg-graystone-200 hover:bg-graystone-300 rounded-lg disabled:opacity-50 transition-colors"
        >
          <Icon name="skip-back" className="w-5 h-5" />
        </button>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          disabled={words.length === 0}
          className={`px-8 py-3 rounded-lg font-medium text-white transition-colors ${
            isPlaying ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-500 hover:bg-green-600'
          } disabled:opacity-50`}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          onClick={stepForward}
          disabled={words.length === 0 || currentIndex >= words.length - 1}
          className="p-3 bg-graystone-200 hover:bg-graystone-300 rounded-lg disabled:opacity-50 transition-colors"
        >
          <Icon name="skip-forward" className="w-5 h-5" />
        </button>
        <button
          onClick={reset}
          disabled={words.length === 0}
          className="p-3 bg-graystone-200 hover:bg-graystone-300 rounded-lg disabled:opacity-50 transition-colors"
        >
          <Icon name="rotate-ccw" className="w-5 h-5" />
        </button>
      </div>

      {/* Speed Selection */}
      <div className="mb-6">
        <div className="text-sm text-graystone-600 mb-2 text-center">Speed (WPM)</div>
        <div className="flex flex-wrap justify-center gap-2">
          {wpmOptions.map(speed => (
            <button
              key={speed}
              onClick={() => setWpm(speed)}
              className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-colors ${
                wpm === speed
                  ? 'bg-ocean-600 text-white'
                  : 'bg-graystone-100 hover:bg-graystone-200 text-graystone-700'
              }`}
            >
              {speed}
            </button>
          ))}
        </div>
      </div>

      {/* Progress */}
      {words.length > 0 && (
        <div className="mb-6">
          <div className="flex justify-between text-sm text-graystone-600 mb-1">
            <span>Word {currentIndex + 1} of {words.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-graystone-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-ocean-500 transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Text Input */}
      <div className="bg-white rounded-xl shadow-lg p-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste or type your text here..."
          className="w-full h-32 resize-none outline-none text-graystone-800 placeholder:text-graystone-400"
        />
        <div className="flex justify-between items-center pt-3 border-t border-graystone-100 text-xs text-graystone-500">
          <span>Space = Play/Pause, Arrow keys = Speed</span>
          <span>{words.length} words</span>
        </div>
      </div>
    </div>
  );
};

export default SpeedReader;

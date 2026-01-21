import React, { useState } from 'react';
import Icon from '../../ui/Icon';

const DecisionMatrix = ({ onBack }) => {
  const [decisionTitle, setDecisionTitle] = useState('');
  const [criteria, setCriteria] = useState([
    { id: '1', name: 'Cost', weight: 3 },
    { id: '2', name: 'Quality', weight: 4 },
    { id: '3', name: 'Time', weight: 2 }
  ]);
  const [options, setOptions] = useState([
    { id: '1', name: 'Option A' },
    { id: '2', name: 'Option B' }
  ]);
  const [scores, setScores] = useState({}); // { optionId_criteriaId: score }
  const [newCriteria, setNewCriteria] = useState('');
  const [newOption, setNewOption] = useState('');

  const handleAddCriteria = () => {
    if (!newCriteria.trim()) return;
    setCriteria(prev => [...prev, {
      id: Date.now().toString(),
      name: newCriteria.trim(),
      weight: 3
    }]);
    setNewCriteria('');
  };

  const handleAddOption = () => {
    if (!newOption.trim()) return;
    setOptions(prev => [...prev, {
      id: Date.now().toString(),
      name: newOption.trim()
    }]);
    setNewOption('');
  };

  const handleDeleteCriteria = (id) => {
    setCriteria(prev => prev.filter(c => c.id !== id));
    // Clean up scores
    setScores(prev => {
      const newScores = { ...prev };
      Object.keys(newScores).forEach(key => {
        if (key.includes(`_${id}`)) delete newScores[key];
      });
      return newScores;
    });
  };

  const handleDeleteOption = (id) => {
    setOptions(prev => prev.filter(o => o.id !== id));
    // Clean up scores
    setScores(prev => {
      const newScores = { ...prev };
      Object.keys(newScores).forEach(key => {
        if (key.startsWith(`${id}_`)) delete newScores[key];
      });
      return newScores;
    });
  };

  const handleWeightChange = (criteriaId, weight) => {
    setCriteria(prev => prev.map(c =>
      c.id === criteriaId ? { ...c, weight: parseInt(weight) || 1 } : c
    ));
  };

  const handleScoreChange = (optionId, criteriaId, score) => {
    const key = `${optionId}_${criteriaId}`;
    setScores(prev => ({ ...prev, [key]: parseInt(score) || 0 }));
  };

  const getScore = (optionId, criteriaId) => {
    return scores[`${optionId}_${criteriaId}`] || 0;
  };

  const calculateTotalScore = (optionId) => {
    let total = 0;
    let maxPossible = 0;
    criteria.forEach(c => {
      const score = getScore(optionId, c.id);
      total += score * c.weight;
      maxPossible += 5 * c.weight; // Max score is 5
    });
    return { total, maxPossible, percentage: maxPossible > 0 ? Math.round((total / maxPossible) * 100) : 0 };
  };

  const getWinner = () => {
    if (options.length < 2) return null;
    let best = null;
    let bestScore = -1;
    options.forEach(opt => {
      const { total } = calculateTotalScore(opt.id);
      if (total > bestScore) {
        bestScore = total;
        best = opt;
      }
    });
    return best;
  };

  const winner = getWinner();
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);

  const handleReset = () => {
    if (!confirm('Reset all data? This cannot be undone.')) return;
    setDecisionTitle('');
    setCriteria([
      { id: '1', name: 'Cost', weight: 3 },
      { id: '2', name: 'Quality', weight: 4 },
      { id: '3', name: 'Time', weight: 2 }
    ]);
    setOptions([
      { id: '1', name: 'Option A' },
      { id: '2', name: 'Option B' }
    ]);
    setScores({});
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-ocean-600 hover:text-ocean-700">
          <Icon name="arrow-left" className="w-5 h-5" />
          Back
        </button>
        <button
          onClick={handleReset}
          className="text-sm text-graystone-500 hover:text-red-500"
        >
          Reset
        </button>
      </div>

      <h1 className="text-2xl font-bold text-ocean-900 mb-2">Decision Matrix</h1>
      <p className="text-graystone-600 mb-6">Compare options by scoring them against weighted criteria (1-5 scale)</p>

      {/* Decision Title */}
      <div className="mb-6">
        <input
          type="text"
          value={decisionTitle}
          onChange={(e) => setDecisionTitle(e.target.value)}
          placeholder="What decision are you making? (e.g., 'Which laptop to buy')"
          className="w-full px-4 py-3 border-2 border-graystone-200 rounded-xl text-lg focus:border-teal-500 focus:outline-none"
        />
      </div>

      {/* Add Criteria & Options */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-lg p-4">
          <h3 className="font-semibold text-graystone-700 mb-3">Criteria ({criteria.length})</h3>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newCriteria}
              onChange={(e) => setNewCriteria(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCriteria()}
              placeholder="Add criteria..."
              className="flex-1 px-3 py-2 border rounded-lg text-sm"
            />
            <button
              onClick={handleAddCriteria}
              className="px-3 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600"
            >
              <Icon name="plus" className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {criteria.map(c => (
              <div key={c.id} className="flex items-center gap-2 bg-graystone-50 rounded-lg p-2">
                <span className="flex-1 text-sm text-graystone-700">{c.name}</span>
                <select
                  value={c.weight}
                  onChange={(e) => handleWeightChange(c.id, e.target.value)}
                  className="w-16 px-2 py-1 border rounded text-sm"
                  title="Weight"
                >
                  {[1, 2, 3, 4, 5].map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleDeleteCriteria(c.id)}
                  className="text-graystone-400 hover:text-red-500"
                >
                  <Icon name="x" className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-graystone-500 mt-2">Total weight: {totalWeight}</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4">
          <h3 className="font-semibold text-graystone-700 mb-3">Options ({options.length})</h3>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
              placeholder="Add option..."
              className="flex-1 px-3 py-2 border rounded-lg text-sm"
            />
            <button
              onClick={handleAddOption}
              className="px-3 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600"
            >
              <Icon name="plus" className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {options.map(o => (
              <div key={o.id} className="flex items-center gap-2 bg-graystone-50 rounded-lg p-2">
                <span className="flex-1 text-sm text-graystone-700">{o.name}</span>
                <button
                  onClick={() => handleDeleteOption(o.id)}
                  className="text-graystone-400 hover:text-red-500"
                >
                  <Icon name="x" className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Matrix Table */}
      {criteria.length > 0 && options.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-graystone-50 border-b border-graystone-200">
                  <th className="text-left p-4 font-semibold text-graystone-700">Criteria</th>
                  <th className="p-4 font-semibold text-graystone-700 text-center w-20">Weight</th>
                  {options.map(opt => (
                    <th key={opt.id} className="p-4 font-semibold text-graystone-700 text-center min-w-[120px]">
                      {opt.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {criteria.map(crit => (
                  <tr key={crit.id} className="border-b border-graystone-100">
                    <td className="p-4 text-graystone-700">{crit.name}</td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 text-teal-700 font-semibold text-sm">
                        {crit.weight}
                      </span>
                    </td>
                    {options.map(opt => (
                      <td key={opt.id} className="p-4 text-center">
                        <div className="flex justify-center gap-1">
                          {[1, 2, 3, 4, 5].map(score => (
                            <button
                              key={score}
                              onClick={() => handleScoreChange(opt.id, crit.id, score)}
                              className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                                getScore(opt.id, crit.id) === score
                                  ? 'bg-teal-500 text-white'
                                  : getScore(opt.id, crit.id) >= score
                                    ? 'bg-teal-100 text-teal-700'
                                    : 'bg-graystone-100 text-graystone-400 hover:bg-graystone-200'
                              }`}
                            >
                              {score}
                            </button>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-graystone-50 border-t-2 border-graystone-200">
                  <td className="p-4 font-semibold text-graystone-700">Weighted Score</td>
                  <td className="p-4"></td>
                  {options.map(opt => {
                    const { total, percentage } = calculateTotalScore(opt.id);
                    const isWinner = winner && winner.id === opt.id && options.length > 1;
                    return (
                      <td key={opt.id} className="p-4 text-center">
                        <div className={`inline-flex flex-col items-center px-4 py-2 rounded-lg ${
                          isWinner ? 'bg-green-100' : 'bg-graystone-100'
                        }`}>
                          <span className={`text-2xl font-bold ${isWinner ? 'text-green-600' : 'text-graystone-700'}`}>
                            {total}
                          </span>
                          <span className={`text-xs ${isWinner ? 'text-green-500' : 'text-graystone-500'}`}>
                            {percentage}%
                          </span>
                          {isWinner && (
                            <span className="text-xs text-green-600 font-semibold mt-1">BEST</span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Winner Banner */}
      {winner && options.length > 1 && (
        <div className="bg-gradient-to-r from-green-500 to-teal-500 rounded-xl p-6 text-white text-center mb-6">
          <p className="text-sm opacity-90 mb-1">Based on your criteria, the best choice is:</p>
          <h2 className="text-3xl font-bold">{winner.name}</h2>
          <p className="text-sm opacity-90 mt-2">
            Score: {calculateTotalScore(winner.id).total} ({calculateTotalScore(winner.id).percentage}%)
          </p>
        </div>
      )}

      <p className="text-center text-xs text-graystone-400">
        Session only - your decision matrix resets when you refresh
      </p>
    </div>
  );
};

export default DecisionMatrix;

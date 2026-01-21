import React, { useState } from 'react';
import Icon from '../../ui/Icon';
import PomodoroTimer from './PomodoroTimer';
import StopwatchTimer from './StopwatchTimer';
import QuickNotes from './QuickNotes';
import SpeedReader from './SpeedReader';
import BookmarkManager from './BookmarkManager';
import GoalTracker from './GoalTracker';
import DecisionMatrix from './DecisionMatrix';
import MindMapTool from './MindMapTool';
import HabitTracker from './HabitTracker';
import EisenhowerMatrix from './EisenhowerMatrix';
import DailyPlanner from './DailyPlanner';

const ProductivityToolsView = ({
  userEmail,
  habits,
  setHabits,
  matrixTasks,
  setMatrixTasks,
  Logger,
  playBeep,
  PRODUCTIVITY_API
}) => {
  const [activeTool, setActiveTool] = useState(null);
  const [infoModal, setInfoModal] = useState(null);

  const tools = [
    {
      id: 'pomodoro',
      name: 'Pomodoro Timer',
      description: 'Focus with 25/5 work-break cycles',
      icon: 'timer',
      problem: 'Struggling to maintain focus for long periods, feeling mentally drained by mid-afternoon, or constantly getting distracted during deep work.',
      howToUse: 'Start a 25-minute focus session, then take a 5-minute break. After 4 sessions, take a longer 15-minute break. Customize durations in settings.',
      benefit: 'Based on the Pomodoro Technique, this method prevents burnout and maintains high focus by working in short, intense bursts with regular recovery periods.'
    },
    {
      id: 'stopwatch',
      name: 'Stopwatch & Timer',
      description: 'Track time or set countdowns',
      icon: 'clock',
      problem: 'Underestimating how long tasks take, losing track of time during meetings, or needing a simple countdown for timeboxed activities.',
      howToUse: 'Use Stopwatch mode to track elapsed time with lap recording. Use Timer mode to set a countdown for meetings, breaks, or deadlines.',
      benefit: 'Simple time awareness improves estimation skills and helps you understand how long tasks actually take versus how long you think they take.'
    },
    {
      id: 'notes',
      name: 'Quick Notes',
      description: 'Temporary scratchpad for ideas',
      icon: 'sticky-note',
      problem: 'Losing fleeting thoughts before you can act on them, cluttering permanent notes with temporary information, or needing a quick place to paste and process text.',
      howToUse: 'Jot down quick thoughts, meeting notes, or temporary information. Content clears on refresh - perfect for disposable notes you don\'t need to save.',
      benefit: 'Captures fleeting thoughts without cluttering your permanent notes. Reduces cognitive load by getting ideas out of your head immediately.'
    },
    {
      id: 'speedreader',
      name: 'Speed Reader',
      description: 'RSVP reading at up to 1000 WPM',
      icon: 'book-open',
      problem: 'Too much to read and not enough time, struggling to get through long documents, reports, or articles that pile up in your reading list.',
      howToUse: 'Paste any text and press Play. Words appear one at a time with the focal point highlighted. Adjust speed from 100-1000 WPM. Use Space to pause.',
      benefit: 'RSVP (Rapid Serial Visual Presentation) eliminates eye movement, allowing you to read 2-3x faster. Great for quickly reviewing documents or articles.'
    },
    {
      id: 'bookmarks',
      name: 'Bookmark Manager',
      description: 'Save and organize useful links',
      icon: 'bookmark',
      problem: 'Work links getting lost in personal browser bookmarks, struggling to find that useful resource you saved weeks ago, or needing quick access to frequently used tools.',
      howToUse: 'Add links with titles and optional tags. Organize into categories. Click to open, search to find. Your bookmarks persist locally in your browser.',
      benefit: 'Keep work-related links separate from browser bookmarks. Quickly access frequently used resources without digging through browser menus.'
    },
    {
      id: 'goals',
      name: 'Goal Tracker',
      description: 'Set goals with milestones & deadlines',
      icon: 'target',
      problem: 'Big goals feeling overwhelming and vague, losing motivation on long-term objectives, or not knowing if you\'re on track until it\'s too late.',
      howToUse: 'Create goals with target dates and break them into milestones. Track progress as you complete each milestone. Organize by category (Personal, Career, Health, etc.).',
      benefit: 'Breaking big goals into milestones makes them achievable. Visual progress tracking provides motivation and helps identify when goals are at risk.'
    },
    {
      id: 'decision',
      name: 'Decision Matrix',
      description: 'Compare options with weighted criteria',
      icon: 'scale',
      problem: 'Analysis paralysis when facing complex decisions, letting emotions override logic, or struggling to compare options with different strengths and weaknesses.',
      howToUse: 'Add criteria that matter (cost, quality, time, etc.) and assign importance weights (1-5). Add your options and score each against the criteria. The matrix calculates the best choice.',
      benefit: 'Removes emotional bias from decisions by quantifying tradeoffs. Particularly useful for complex choices with multiple factors to consider.'
    },
    {
      id: 'mindmap',
      name: 'Mind Map',
      description: 'Brainstorm and organize ideas visually',
      icon: 'brain',
      problem: 'Ideas feeling scattered and disconnected, struggling to see the big picture, or needing to brainstorm but linear notes aren\'t capturing the relationships.',
      howToUse: 'Start with a central idea, then add connected nodes for related concepts. Drag nodes to arrange them. Double-click to edit. Use colors to categorize branches.',
      benefit: 'Visual thinking mirrors how your brain naturally connects ideas. Mind maps help you see relationships, generate new ideas, and remember information better.'
    },
    {
      id: 'habits',
      name: 'Habit Tracker',
      description: 'Build streaks with daily habits',
      icon: 'check-circle',
      problem: 'Wanting to build good habits but struggling with consistency, forgetting to do daily practices, or lacking visibility into your actual follow-through.',
      howToUse: 'Add habits you want to build. Check them off daily. View your week or month at a glance. Watch your streak grow - don\'t break the chain!',
      benefit: 'The "don\'t break the chain" method leverages loss aversion psychology. Visible streaks create powerful motivation to maintain consistency.'
    },
    {
      id: 'matrix',
      name: 'Eisenhower Matrix',
      description: 'Prioritize by urgency & importance',
      icon: 'grid-3x3',
      problem: 'Spending all day on urgent tasks but never making progress on important ones, feeling busy but not productive, or struggling to say no to low-value requests.',
      howToUse: 'Sort tasks into four quadrants: Do First (urgent + important), Schedule (important, not urgent), Delegate (urgent, not important), Eliminate (neither). Drag tasks between quadrants as priorities shift.',
      benefit: 'Used by President Eisenhower, this matrix prevents you from confusing urgency with importance. Focus on what matters, not just what\'s loud.'
    },
    {
      id: 'planner',
      name: 'Daily Planner',
      description: 'Time-block your day',
      icon: 'calendar-days',
      problem: 'Days slipping away without accomplishing what you intended, reactive work crowding out planned priorities, or constantly wondering what to work on next.',
      howToUse: 'Click any time slot from 6am-9pm to add a task. Plan your day by assigning specific times to specific activities. Review and adjust as needed.',
      benefit: 'Time-blocking forces intentionality about how you spend your day. It reduces decision fatigue and protects time for important work.'
    }
  ];

  const handleBack = () => setActiveTool(null);

  // Render active tool
  if (activeTool) {
    switch (activeTool) {
      case 'pomodoro':
        return <PomodoroTimer onBack={handleBack} Logger={Logger} playBeep={playBeep} />;
      case 'stopwatch':
        return <StopwatchTimer onBack={handleBack} playBeep={playBeep} />;
      case 'notes':
        return <QuickNotes onBack={handleBack} />;
      case 'speedreader':
        return <SpeedReader onBack={handleBack} />;
      case 'bookmarks':
        return <BookmarkManager onBack={handleBack} />;
      case 'goals':
        return <GoalTracker onBack={handleBack} />;
      case 'decision':
        return <DecisionMatrix onBack={handleBack} />;
      case 'mindmap':
        return <MindMapTool onBack={handleBack} />;
      case 'habits':
        return <HabitTracker onBack={handleBack} userEmail={userEmail} habits={habits} setHabits={setHabits} PRODUCTIVITY_API={PRODUCTIVITY_API} />;
      case 'matrix':
        return <EisenhowerMatrix onBack={handleBack} userEmail={userEmail} matrixTasks={matrixTasks} setMatrixTasks={setMatrixTasks} PRODUCTIVITY_API={PRODUCTIVITY_API} />;
      case 'planner':
        return <DailyPlanner onBack={handleBack} />;
      default:
        return null;
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header Card */}
      <div className="bg-gradient-to-r from-ocean-500 to-ocean-600 rounded-2xl p-6 text-white shadow-xl">
        <h1 className="text-2xl font-bold mb-1">Productivity Tools</h1>
        <p className="text-ocean-100 text-sm">Choose a tool to boost your productivity. Click the info icon to learn more.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map(tool => (
          <div
            key={tool.id}
            className="rounded-xl border border-ocean-200 bg-ocean-50 overflow-hidden transition-all hover:shadow-lg hover:border-ocean-300"
          >
            <button
              onClick={() => setActiveTool(tool.id)}
              className="w-full p-5 text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-ocean-500 shadow-sm flex-shrink-0">
                  <Icon name={tool.icon} className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-ocean-900 group-hover:text-ocean-700 transition-colors">
                    {tool.name}
                  </h3>
                  <p className="text-sm text-graystone-600 mt-1">{tool.description}</p>
                </div>
              </div>
            </button>

            {/* Info button */}
            <div className="px-5 pb-3 flex justify-end">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setInfoModal(tool);
                }}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-colors text-ocean-600 hover:text-ocean-700 hover:bg-white/50"
              >
                <Icon name="info" className="w-3.5 h-3.5" />
                More info
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Info Modal */}
      {infoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-graystone-200">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-ocean-500">
                  <Icon name={infoModal.icon} className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-ocean-900">{infoModal.name}</h3>
              </div>
              <button
                onClick={() => setInfoModal(null)}
                className="p-2 hover:bg-graystone-100 rounded-lg transition"
              >
                <Icon name="x" className="w-5 h-5 text-graystone-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-ocean-800 mb-2">
                  <Icon name="alert-circle" className="w-4 h-4" />
                  Problem It Solves
                </div>
                <p className="text-graystone-600 leading-relaxed">{infoModal.problem}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-ocean-800 mb-2">
                  <Icon name="play-circle" className="w-4 h-4" />
                  How to Use
                </div>
                <p className="text-graystone-600 leading-relaxed">{infoModal.howToUse}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-ocean-800 mb-2">
                  <Icon name="sparkles" className="w-4 h-4" />
                  Why It Works
                </div>
                <p className="text-graystone-600 leading-relaxed">{infoModal.benefit}</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2 p-6 border-t border-graystone-200">
              <button
                onClick={() => setInfoModal(null)}
                className="px-4 py-2 text-graystone-600 hover:bg-graystone-100 rounded-lg transition"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setActiveTool(infoModal.id);
                  setInfoModal(null);
                }}
                className="px-4 py-2 bg-ocean-500 text-white rounded-lg hover:bg-ocean-600 transition"
              >
                Open Tool
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductivityToolsView;

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
  const [expandedInfo, setExpandedInfo] = useState(null);

  const tools = [
    {
      id: 'pomodoro',
      name: 'Pomodoro Timer',
      description: 'Focus with 25/5 work-break cycles',
      icon: 'timer',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-500',
      borderColor: 'border-red-200',
      problem: 'Struggling to maintain focus for long periods, feeling mentally drained by mid-afternoon, or constantly getting distracted during deep work.',
      howToUse: 'Start a 25-minute focus session, then take a 5-minute break. After 4 sessions, take a longer 15-minute break. Customize durations in settings.',
      benefit: 'Based on the Pomodoro Technique, this method prevents burnout and maintains high focus by working in short, intense bursts with regular recovery periods.'
    },
    {
      id: 'stopwatch',
      name: 'Stopwatch & Timer',
      description: 'Track time or set countdowns',
      icon: 'clock',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-500',
      borderColor: 'border-blue-200',
      problem: 'Underestimating how long tasks take, losing track of time during meetings, or needing a simple countdown for timeboxed activities.',
      howToUse: 'Use Stopwatch mode to track elapsed time with lap recording. Use Timer mode to set a countdown for meetings, breaks, or deadlines.',
      benefit: 'Simple time awareness improves estimation skills and helps you understand how long tasks actually take versus how long you think they take.'
    },
    {
      id: 'notes',
      name: 'Quick Notes',
      description: 'Temporary scratchpad for ideas',
      icon: 'sticky-note',
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-500',
      borderColor: 'border-amber-200',
      problem: 'Losing fleeting thoughts before you can act on them, cluttering permanent notes with temporary information, or needing a quick place to paste and process text.',
      howToUse: 'Jot down quick thoughts, meeting notes, or temporary information. Content clears on refresh - perfect for disposable notes you don\'t need to save.',
      benefit: 'Captures fleeting thoughts without cluttering your permanent notes. Reduces cognitive load by getting ideas out of your head immediately.'
    },
    {
      id: 'speedreader',
      name: 'Speed Reader',
      description: 'RSVP reading at up to 1000 WPM',
      icon: 'book-open',
      bgColor: 'bg-pink-50',
      iconColor: 'text-pink-500',
      borderColor: 'border-pink-200',
      problem: 'Too much to read and not enough time, struggling to get through long documents, reports, or articles that pile up in your reading list.',
      howToUse: 'Paste any text and press Play. Words appear one at a time with the focal point highlighted. Adjust speed from 100-1000 WPM. Use Space to pause.',
      benefit: 'RSVP (Rapid Serial Visual Presentation) eliminates eye movement, allowing you to read 2-3x faster. Great for quickly reviewing documents or articles.'
    },
    {
      id: 'bookmarks',
      name: 'Bookmark Manager',
      description: 'Save and organize useful links',
      icon: 'bookmark',
      bgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-500',
      borderColor: 'border-indigo-200',
      problem: 'Work links getting lost in personal browser bookmarks, struggling to find that useful resource you saved weeks ago, or needing quick access to frequently used tools.',
      howToUse: 'Add links with titles and optional tags. Organize into categories. Click to open, search to find. Your bookmarks persist locally in your browser.',
      benefit: 'Keep work-related links separate from browser bookmarks. Quickly access frequently used resources without digging through browser menus.'
    },
    {
      id: 'goals',
      name: 'Goal Tracker',
      description: 'Set goals with milestones & deadlines',
      icon: 'target',
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-500',
      borderColor: 'border-emerald-200',
      problem: 'Big goals feeling overwhelming and vague, losing motivation on long-term objectives, or not knowing if you\'re on track until it\'s too late.',
      howToUse: 'Create goals with target dates and break them into milestones. Track progress as you complete each milestone. Organize by category (Personal, Career, Health, etc.).',
      benefit: 'Breaking big goals into milestones makes them achievable. Visual progress tracking provides motivation and helps identify when goals are at risk.'
    },
    {
      id: 'decision',
      name: 'Decision Matrix',
      description: 'Compare options with weighted criteria',
      icon: 'scale',
      bgColor: 'bg-teal-50',
      iconColor: 'text-teal-500',
      borderColor: 'border-teal-200',
      problem: 'Analysis paralysis when facing complex decisions, letting emotions override logic, or struggling to compare options with different strengths and weaknesses.',
      howToUse: 'Add criteria that matter (cost, quality, time, etc.) and assign importance weights (1-5). Add your options and score each against the criteria. The matrix calculates the best choice.',
      benefit: 'Removes emotional bias from decisions by quantifying tradeoffs. Particularly useful for complex choices with multiple factors to consider.'
    },
    {
      id: 'mindmap',
      name: 'Mind Map',
      description: 'Brainstorm and organize ideas visually',
      icon: 'brain',
      bgColor: 'bg-violet-50',
      iconColor: 'text-violet-500',
      borderColor: 'border-violet-200',
      problem: 'Ideas feeling scattered and disconnected, struggling to see the big picture, or needing to brainstorm but linear notes aren\'t capturing the relationships.',
      howToUse: 'Start with a central idea, then add connected nodes for related concepts. Drag nodes to arrange them. Double-click to edit. Use colors to categorize branches.',
      benefit: 'Visual thinking mirrors how your brain naturally connects ideas. Mind maps help you see relationships, generate new ideas, and remember information better.'
    },
    {
      id: 'habits',
      name: 'Habit Tracker',
      description: 'Build streaks with daily habits',
      icon: 'check-circle',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-500',
      borderColor: 'border-green-200',
      problem: 'Wanting to build good habits but struggling with consistency, forgetting to do daily practices, or lacking visibility into your actual follow-through.',
      howToUse: 'Add habits you want to build. Check them off daily. View your week or month at a glance. Watch your streak grow - don\'t break the chain!',
      benefit: 'The "don\'t break the chain" method leverages loss aversion psychology. Visible streaks create powerful motivation to maintain consistency.'
    },
    {
      id: 'matrix',
      name: 'Eisenhower Matrix',
      description: 'Prioritize by urgency & importance',
      icon: 'grid-3x3',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-500',
      borderColor: 'border-purple-200',
      problem: 'Spending all day on urgent tasks but never making progress on important ones, feeling busy but not productive, or struggling to say no to low-value requests.',
      howToUse: 'Sort tasks into four quadrants: Do First (urgent + important), Schedule (important, not urgent), Delegate (urgent, not important), Eliminate (neither). Drag tasks between quadrants as priorities shift.',
      benefit: 'Used by President Eisenhower, this matrix prevents you from confusing urgency with importance. Focus on what matters, not just what\'s loud.'
    },
    {
      id: 'planner',
      name: 'Daily Planner',
      description: 'Time-block your day',
      icon: 'calendar-days',
      bgColor: 'bg-ocean-50',
      iconColor: 'text-ocean-500',
      borderColor: 'border-ocean-200',
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
    <div className="p-6">
      <h1 className="text-2xl font-bold text-ocean-900 mb-2">Productivity Tools</h1>
      <p className="text-graystone-600 mb-6">Choose a tool to boost your productivity. Click the info icon to learn more about each tool.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map(tool => (
          <div
            key={tool.id}
            className={`rounded-xl border-2 ${tool.bgColor} ${tool.borderColor} overflow-hidden transition-all hover:shadow-lg`}
          >
            <button
              onClick={() => setActiveTool(tool.id)}
              className="w-full p-5 text-left group"
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl bg-white shadow-sm ${tool.iconColor} flex-shrink-0`}>
                  <Icon name={tool.icon} className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-graystone-800 group-hover:text-ocean-700 transition-colors">
                    {tool.name}
                  </h3>
                  <p className="text-sm text-graystone-600 mt-1">{tool.description}</p>
                </div>
              </div>
            </button>

            {/* Info toggle button */}
            <div className="px-5 pb-3 flex justify-end">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedInfo(expandedInfo === tool.id ? null : tool.id);
                }}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-colors ${
                  expandedInfo === tool.id
                    ? 'bg-white text-graystone-700 shadow-sm'
                    : 'text-graystone-500 hover:text-graystone-700 hover:bg-white/50'
                }`}
              >
                <Icon name={expandedInfo === tool.id ? 'chevron-up' : 'info'} className="w-3.5 h-3.5" />
                {expandedInfo === tool.id ? 'Less info' : 'How to use'}
              </button>
            </div>

            {/* Expanded info section */}
            {expandedInfo === tool.id && (
              <div className="px-5 pb-5 space-y-3 border-t border-white/50 pt-4 animate-in slide-in-from-top-2 duration-200">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-graystone-700 mb-1.5">
                    <Icon name="alert-circle" className="w-3.5 h-3.5" />
                    Problem It Solves
                  </div>
                  <p className="text-sm text-graystone-600 leading-relaxed">{tool.problem}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-graystone-700 mb-1.5">
                    <Icon name="play-circle" className="w-3.5 h-3.5" />
                    How to Use
                  </div>
                  <p className="text-sm text-graystone-600 leading-relaxed">{tool.howToUse}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-graystone-700 mb-1.5">
                    <Icon name="sparkles" className="w-3.5 h-3.5" />
                    Why It Works
                  </div>
                  <p className="text-sm text-graystone-600 leading-relaxed">{tool.benefit}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductivityToolsView;

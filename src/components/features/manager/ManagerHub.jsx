import React, { useState, useEffect, useMemo } from 'react';
import Icon from '../../ui/Icon';

// Local utilities
const cx = (...xs) => xs.filter(Boolean).join(" ");

const selectBaseClasses =
  "dropdown-font rounded-full border border-black bg-white px-4 py-2 text-sm font-normal text-black shadow-[0_0_20px_rgba(15,157,222,0.2)] transition hover:bg-black hover:text-white focus:border-black focus:outline-none focus:ring-4 focus:ring-[#0F9DDE]/40 focus:ring-offset-2 focus:ring-offset-[#CFEBF8] disabled:cursor-not-allowed disabled:opacity-60";

const ManagerHub = ({
  managers = [],
  teams = [],
  entries = [],
  currentUser,
  userEmail,
  openStatsModal,
  onOpen,
  onUpdateStatus,
  openSubtaskModal,
  onOpenPdfExport,
  onExportStatusReport,
  managerHubTab,
  setManagerHubTab,
  reportPeriodType,
  setReportPeriodType,
  reportStartDate,
  setReportStartDate,
  reportEndDate,
  setReportEndDate,
  reportSections,
  setReportSections,
  projectsDisplayMode,
  setProjectsDisplayMode,
  reportNarratives,
  setReportNarratives,
  workstreams = [],
  onNavigateToWorkstream,
  // Dependencies passed as props
  TEAMS,
  isAdmin,
  Badge,
  APP_CONFIG,
}) => {
  const normalizedTeams = useMemo(() => teams.length ? teams : TEAMS, [teams, TEAMS]);

  const myManagerRecord = useMemo(() =>
    managers.find(m => m.email?.toLowerCase() === userEmail?.toLowerCase()),
    [managers, userEmail]
  );
  const isAdminUser = useMemo(() => isAdmin(userEmail), [userEmail, isAdmin]);

  const availableManagers = useMemo(() =>
    myManagerRecord ? [myManagerRecord] : [],
    [myManagerRecord]
  );

  const [selectedManager, setSelectedManager] = useState(myManagerRecord || null);
  const [selectedReport, setSelectedReport] = useState("all");
  const [selectedMembers, setSelectedMembers] = useState(myManagerRecord?.reports || []);
  const [includeCollaborations, setIncludeCollaborations] = useState(false);
  const [managerViewMode, setManagerViewMode] = useState('kanban');

  useEffect(() => {
    if (myManagerRecord && (!selectedManager || selectedManager.email !== myManagerRecord.email)) {
      setSelectedManager(myManagerRecord);
      setSelectedMembers(myManagerRecord.reports || []);
    }
  }, [myManagerRecord?.email]);

  const [timelineFilter, setTimelineFilter] = useState('quarter');
  const [groupBy, setGroupBy] = useState('member');
  const [memberFilter, setMemberFilter] = useState('all');
  const [expandedProjectSubtasks, setExpandedProjectSubtasks] = useState({});
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const getCurrentPeriod = (type) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    if (type === 'month') return `${year}-${String(month + 1).padStart(2, '0')}`;
    if (type === 'quarter') return `${year}-Q${Math.floor(month / 3) + 1}`;
    if (type === 'year') return String(year);
    return '';
  };

  const [timelineValue, setTimelineValue] = useState(() => getCurrentPeriod('quarter'));

  const getTimelineOptions = (type) => {
    const currentYear = new Date().getFullYear();
    if (type === 'month') {
      const months = [];
      for (let y = currentYear - 1; y <= currentYear + 1; y++) {
        for (let m = 1; m <= 12; m++) {
          const val = `${y}-${String(m).padStart(2, '0')}`;
          const label = new Date(y, m - 1).toLocaleString('default', { month: 'short', year: 'numeric' });
          months.push({ value: val, label });
        }
      }
      return months;
    }
    if (type === 'quarter') {
      const quarters = [];
      for (let y = currentYear - 1; y <= currentYear + 1; y++) {
        for (let q = 1; q <= 4; q++) {
          quarters.push({ value: `${y}-Q${q}`, label: `Q${q} ${y}` });
        }
      }
      return quarters;
    }
    if (type === 'year') {
      return [currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map(y => ({
        value: String(y), label: String(y)
      }));
    }
    return [];
  };

  const filterByTimeline = (items, type, value) => {
    if (!value) return items;
    return items.filter(entry => {
      const tv = entry.timelineValue || '';
      const d = entry.date || '';
      if (type === 'year') return tv.startsWith(value) || d.startsWith(value);
      if (type === 'quarter') {
        const [yearStr, qStr] = value.split('-Q');
        const quarterNum = parseInt(qStr);
        const startMonth = (quarterNum - 1) * 3;
        const endMonth = startMonth + 2;
        if (tv.startsWith(`${yearStr}-Q${quarterNum}`)) return true;
        if (d) {
          const [y, m] = d.split('-').map(Number);
          if (y === parseInt(yearStr) && m >= startMonth + 1 && m <= endMonth + 1) return true;
        }
        return false;
      }
      if (type === 'month') return tv === value || d.startsWith(value);
      return true;
    });
  };

  const handleManagerChange = (email) => {
    const mgr = availableManagers.find(m => m.email === email);
    setSelectedManager(mgr || null);
    setSelectedMembers(mgr?.reports || []);
    setSelectedReport("all");
  };

  const handleReportChange = (report) => {
    setSelectedReport(report);
    if (selectedManager) {
      setSelectedMembers(report === "all" ? selectedManager.reports : [report]);
    }
  };

  const getTeamEntries = (manager) => {
    if (!manager || !manager.reports) return [];
    const reportEmails = manager.reports.map(r => r.toLowerCase());
    const memberItems = entries.filter(e =>
      e.owner && reportEmails.includes(e.owner.toLowerCase()) && e.itemType !== 'job'
    );
    if (includeCollaborations) {
      const collabItems = entries.filter(e =>
        e.collaborators?.some(c => reportEmails.includes(c.toLowerCase())) &&
        !memberItems.includes(e) && e.itemType !== 'job'
      );
      return [...memberItems, ...collabItems];
    }
    return memberItems;
  };

  const computeBottleneck = (items) => {
    const counts = {};
    items.forEach(i => {
      const st = i.workflowStatus || "Unknown";
      counts[st] = (counts[st] || 0) + 1;
    });
    let maxSt = "";
    let maxC = 0;
    Object.entries(counts).forEach(([st, c]) => {
      if (c > maxC) { maxC = c; maxSt = st; }
    });
    return { status: maxSt, count: maxC };
  };

  const computeImminent = (items) => {
    const now = new Date();
    const fourteenDays = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    return items.filter(i => {
      if (!i.date) return false;
      const d = new Date(i.date);
      return d >= now && d <= fourteenDays;
    });
  };

  const computeOverdue = (items) => {
    const now = new Date();
    return items.filter(i => {
      if (!i.date) return false;
      const d = new Date(i.date);
      return d < now && (i.workflowStatus || "").toLowerCase() !== "done";
    });
  };

  const managerName = selectedManager?.name || currentUser || "Manager";

  if (!myManagerRecord && !isAdminUser) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
        <div className="bg-gradient-to-r from-ocean-500 to-ocean-600 rounded-2xl p-6 text-white shadow-xl">
          <h2 className="text-2xl font-bold heading-font">{currentUser}'s Manager Hub</h2>
          <p className="text-ocean-100 text-sm">Manage your team's workloads and track progress.</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <Icon name="alert-circle" className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-amber-800 mb-2">Manager Record Not Found</h3>
          <p className="text-amber-700 text-sm mb-4">
            Your email ({userEmail}) doesn't match any manager record in the system.
            Please contact an administrator to set up your manager profile with reports.
          </p>
          <p className="text-xs text-amber-600">
            Expected email format: firstname.lastname@{APP_CONFIG?.ORG_DOMAIN || 'example.com'}
          </p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'layout-list' },
    { id: 'yearly', label: 'Yearly Overview', icon: 'calendar-range' },
    { id: 'reports', label: 'Reports', icon: 'file-text' }
  ];

  const items = selectedManager ? getTeamEntries(selectedManager) : [];
  const bottleneck = computeBottleneck(items);
  const imminent = computeImminent(items);
  const overdue = computeOverdue(items);
  const inProgress = items.filter((i) => (i.workflowStatus || "").toLowerCase() !== "done");
  const bottleneckItems = items.filter((i) => (i.workflowStatus || "Unknown") === bottleneck.status);

  const openModal = (title, data) => {
    if (openStatsModal) openStatsModal(title, data);
  };

  const getYearlyData = () => {
    const allItems = selectedManager ? getTeamEntries(selectedManager) : [];
    const yearItems = allItems.filter(item => {
      const tv = item.timelineValue || '';
      const d = item.date || '';
      return tv.startsWith(String(selectedYear)) || d.startsWith(String(selectedYear));
    });

    const quarters = [1, 2, 3, 4].map(q => {
      const qItems = yearItems.filter(item => {
        const tv = item.timelineValue || '';
        if (tv.includes(`Q${q}`)) return true;
        const d = item.date || '';
        if (d) {
          const month = parseInt(d.split('-')[1]);
          const qStart = (q - 1) * 3 + 1;
          const qEnd = q * 3;
          return month >= qStart && month <= qEnd;
        }
        return false;
      });
      return {
        quarter: q,
        label: `Q${q}`,
        items: qItems,
        completed: qItems.filter(i => (i.workflowStatus || '').toLowerCase() === 'done').length,
        total: qItems.length
      };
    });
    return quarters;
  };

  const yearlyData = getYearlyData();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6" id="manager-hub-export-content">
      <div className="bg-gradient-to-r from-ocean-500 to-ocean-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold heading-font">{managerName}'s Manager Hub</h2>
            <p className="text-ocean-100 text-sm">See team workloads, bottlenecks, and near-term risk.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-ocean-100">Team</div>
              <div className="text-lg font-semibold">{selectedManager?.team || teams[0] || "Team"}</div>
            </div>
            <button
              onClick={() => onOpenPdfExport && onOpenPdfExport('manager-hub')}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition text-sm font-medium border border-white/20"
            >
              <Icon name="download" className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-graystone-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setManagerHubTab && setManagerHubTab(tab.id)}
            className={cx(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium transition border-b-2 -mb-px",
              (managerHubTab || 'overview') === tab.id
                ? "text-ocean-700 border-ocean-500"
                : "text-graystone-500 border-transparent hover:text-graystone-700 hover:border-graystone-300"
            )}
          >
            <Icon name={tab.icon} className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {(managerHubTab || 'overview') === 'overview' && selectedManager && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            <button type="button" onClick={() => openModal(`Items: ${selectedManager.name}`, items)}
              className="bg-white rounded-xl border border-ocean-100 shadow-sm p-5 text-left transition hover:shadow-md hover:-translate-y-0.5 group">
              <div className="text-xs font-semibold text-graystone-600 uppercase mb-1">Team items</div>
              <div className="text-3xl font-bold text-ocean-900">{items.length}</div>
            </button>
            <button type="button" onClick={() => openModal("In progress", inProgress)}
              className="bg-white rounded-xl border border-ocean-100 shadow-sm p-5 text-left transition hover:shadow-md hover:-translate-y-0.5 group">
              <div className="text-xs font-semibold text-graystone-600 uppercase mb-1">In progress</div>
              <div className="text-3xl font-bold text-ocean-900">{inProgress.length}</div>
            </button>
            <button type="button" onClick={() => openModal(`Bottleneck: ${bottleneck.status}`, bottleneckItems)}
              className="bg-white rounded-xl border border-ocean-100 shadow-sm p-5 text-left transition hover:shadow-md hover:-translate-y-0.5 group">
              <div className="text-xs font-semibold text-graystone-600 uppercase mb-1">Top bottleneck</div>
              <div className="text-3xl font-bold text-ocean-900">{bottleneck.count}</div>
            </button>
            <button type="button" onClick={() => openModal("Imminent (14 days)", imminent)}
              className="bg-white rounded-xl border border-ocean-100 shadow-sm p-5 text-left transition hover:shadow-md hover:-translate-y-0.5 group">
              <div className="text-xs font-semibold text-graystone-600 uppercase mb-1">Imminent</div>
              <div className="text-3xl font-bold text-ocean-900">{imminent.length}</div>
            </button>
            <button type="button" onClick={() => openModal("Overdue", overdue)}
              className="bg-white rounded-xl border border-ocean-100 shadow-sm p-5 text-left transition hover:shadow-md hover:-translate-y-0.5 group">
              <div className="text-xs font-semibold text-graystone-600 uppercase mb-1">Overdue</div>
              <div className="text-3xl font-bold text-red-600">{overdue.length}</div>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-ocean-100 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-ocean-900 mb-4 flex items-center gap-2">
              <Icon name="users" className="w-5 h-5" />
              Team Members
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(selectedManager?.reports || []).map(email => {
                const memberItems = items.filter(i => i.owner?.toLowerCase() === email.toLowerCase());
                const memberOverdue = memberItems.filter(i => {
                  if (!i.date) return false;
                  return new Date(i.date) < new Date() && (i.workflowStatus || '').toLowerCase() !== 'done';
                });
                return (
                  <div key={email} className="p-4 bg-graystone-50 rounded-lg border border-graystone-200">
                    <div className="font-medium text-ocean-900">{email.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase())}</div>
                    <div className="text-xs text-graystone-500 mb-2">{email}</div>
                    <div className="flex gap-4 text-sm">
                      <span className="text-ocean-600">{memberItems.length} items</span>
                      {memberOverdue.length > 0 && (
                        <span className="text-red-600">{memberOverdue.length} overdue</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {(managerHubTab || 'overview') === 'yearly' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-ocean-900">Yearly Overview</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedYear(y => y - 1)} className="p-2 hover:bg-graystone-100 rounded-lg">
                <Icon name="chevron-left" className="w-4 h-4" />
              </button>
              <span className="font-semibold text-ocean-900 min-w-[60px] text-center">{selectedYear}</span>
              <button onClick={() => setSelectedYear(y => y + 1)} className="p-2 hover:bg-graystone-100 rounded-lg">
                <Icon name="chevron-right" className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {yearlyData.map(q => (
              <div key={q.quarter} className="bg-white rounded-xl border border-ocean-100 shadow-sm p-5">
                <div className="text-lg font-semibold text-ocean-900 mb-2">{q.label} {selectedYear}</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-graystone-600">Total Items</span>
                    <span className="font-medium">{q.total}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-graystone-600">Completed</span>
                    <span className="font-medium text-green-600">{q.completed}</span>
                  </div>
                  <div className="w-full bg-graystone-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-ocean-500 h-2 rounded-full transition-all"
                      style={{ width: `${q.total > 0 ? (q.completed / q.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(managerHubTab || 'overview') === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-ocean-100 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-ocean-900 mb-4 flex items-center gap-2">
              <Icon name="file-text" className="w-5 h-5" />
              Generate Reports
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-graystone-700 mb-1">Period Type</label>
                <select
                  value={reportPeriodType || 'quarter'}
                  onChange={(e) => setReportPeriodType && setReportPeriodType(e.target.value)}
                  className={cx(selectBaseClasses, "w-full")}
                >
                  <option value="month">Monthly</option>
                  <option value="quarter">Quarterly</option>
                  <option value="year">Yearly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-graystone-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={reportStartDate || ''}
                  onChange={(e) => setReportStartDate && setReportStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-graystone-300 rounded-lg focus:ring-2 focus:ring-ocean-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-graystone-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={reportEndDate || ''}
                  onChange={(e) => setReportEndDate && setReportEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-graystone-300 rounded-lg focus:ring-2 focus:ring-ocean-500"
                />
              </div>
            </div>
            <button
              onClick={() => onExportStatusReport && onExportStatusReport()}
              className="flex items-center gap-2 px-6 py-3 bg-ocean-500 text-white rounded-lg hover:bg-ocean-600 transition font-medium"
            >
              <Icon name="download" className="w-4 h-4" />
              Export Status Report
            </button>
          </div>

          {workstreams.length > 0 && (
            <div className="bg-white rounded-xl border border-ocean-100 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-ocean-900 mb-4 flex items-center gap-2">
                <Icon name="folder-kanban" className="w-5 h-5" />
                Workstreams
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workstreams.map(ws => (
                  <button
                    key={ws.id}
                    onClick={() => onNavigateToWorkstream && onNavigateToWorkstream(ws.id)}
                    className="p-4 bg-graystone-50 rounded-lg border border-graystone-200 text-left hover:border-ocean-300 hover:bg-ocean-50 transition"
                  >
                    <div className="font-medium text-ocean-900">{ws.title}</div>
                    <div className="text-sm text-graystone-500 mt-1">{ws.tasks?.length || 0} tasks</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!selectedManager && (
        <div className="bg-graystone-50 rounded-xl p-8 text-center">
          <Icon name="inbox" className="w-12 h-12 text-graystone-300 mx-auto mb-3" />
          <p className="text-graystone-500">Select a manager to view their hub</p>
        </div>
      )}
    </div>
  );
};

export default ManagerHub;

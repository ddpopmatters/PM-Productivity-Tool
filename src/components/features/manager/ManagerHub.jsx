import React, { useState, useEffect, useMemo } from 'react';
import clsx from 'clsx';
import Icon from '../../ui/Icon';
import ReportExportModal from './ReportExportModal';
import ManagerTimeline from './ManagerTimeline';

const selectBaseClasses =
  "dropdown-font rounded-full border border-black bg-white px-4 py-2 text-sm font-normal text-black shadow-[0_0_20px_rgba(15,157,222,0.2)] transition hover:bg-black hover:text-white focus:border-black focus:outline-none focus:ring-4 focus:ring-[#0F9DDE]/40 focus:ring-offset-2 focus:ring-offset-[#CFEBF8] disabled:cursor-not-allowed disabled:opacity-60";

// ── Member Projects Table (matches TableView appearance) ─────

const MemberProjectsTable = ({
  items, previewMembers, previewTimeFilter, setPreviewTimeFilter,
  previewSelectedMonth, setPreviewSelectedMonth, previewSelectedYear,
  setPreviewSelectedYear, setPreviewMembers, filterItemsByTime, onOpen,
}) => {
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const filteredItems = useMemo(() => {
    return filterItemsByTime(
      items.filter(item =>
        previewMembers.some(email =>
          item.owner?.some(o => o.toLowerCase() === email.toLowerCase())
        )
      )
    );
  }, [items, previewMembers, filterItemsByTime]);

  const sortedItems = useMemo(() => {
    if (!sortField) return filteredItems;
    const sorted = [...filteredItems].sort((a, b) => {
      if (sortField === 'title') {
        const aVal = (a.title || '').toLowerCase();
        const bVal = (b.title || '').toLowerCase();
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      }
      if (sortField === 'deadline') {
        const aVal = a.date || a.timelineValue || '';
        const bVal = b.date || b.timelineValue || '';
        if (!aVal && !bVal) return 0;
        if (!aVal) return 1;
        if (!bVal) return -1;
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      }
      return 0;
    });
    return sortDir === 'desc' ? sorted.reverse() : sorted;
  }, [filteredItems, sortField, sortDir]);

  const SortIcon = ({ field }) => {
    if (sortField === field) {
      return <Icon name={sortDir === 'asc' ? 'chevron-up' : 'chevron-down'} className="w-3 h-3" />;
    }
    return <Icon name="chevrons-up-down" className="w-3 h-3 text-graystone-400" />;
  };

  return (
    <div className="bg-white rounded-xl border border-graystone-200 shadow-sm overflow-hidden print:border-0 print:shadow-none">
      {/* Header with filters */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-graystone-200 print:hidden">
        <h3 className="text-lg font-semibold text-ocean-900 flex items-center gap-2">
          <Icon name="folder" className="w-5 h-5" />
          Projects from Selected Members
          <span className="text-sm font-normal text-graystone-500">({filteredItems.length})</span>
        </h3>
        <div className="flex items-center gap-3">
          <select
            value={previewTimeFilter}
            onChange={(e) => setPreviewTimeFilter(e.target.value)}
            className="text-sm border border-graystone-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ocean-500"
          >
            <option value="all">All time</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
            <option value="select-month">Select month</option>
            <option value="select-year">Select year</option>
          </select>
          {previewTimeFilter === 'select-month' && (
            <input
              type="month"
              value={previewSelectedMonth}
              onChange={(e) => setPreviewSelectedMonth(e.target.value)}
              className="text-sm border border-graystone-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ocean-500"
            />
          )}
          {previewTimeFilter === 'select-year' && (
            <select
              value={previewSelectedYear}
              onChange={(e) => setPreviewSelectedYear(parseInt(e.target.value))}
              className="text-sm border border-graystone-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ocean-500"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => setPreviewMembers([])}
            className="text-sm text-graystone-500 hover:text-ocean-600 transition"
          >
            Clear selection
          </button>
        </div>
      </div>

      {sortedItems.length === 0 ? (
        <div className="text-center py-12">
          <Icon name="table" className="w-12 h-12 text-graystone-300 mx-auto mb-3" />
          <div className="text-sm text-graystone-500 mb-1">No projects found</div>
          <p className="text-xs text-graystone-400">
            {previewTimeFilter !== 'all' ? 'Try adjusting your time filter' : 'Selected members have no projects'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead className="bg-graystone-50 border-b border-graystone-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-ocean-900 uppercase tracking-wider">
                  <button onClick={() => handleSort('title')} className="flex items-center gap-1 hover:text-ocean-600 transition">
                    Title
                    <SortIcon field="title" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-ocean-900 uppercase tracking-wider">Owner</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-ocean-900 uppercase tracking-wider">
                  <button onClick={() => handleSort('deadline')} className="flex items-center gap-1 hover:text-ocean-600 transition">
                    Deadline
                    <SortIcon field="deadline" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-graystone-100">
              {sortedItems.map(entry => (
                <tr
                  key={entry.id}
                  onClick={() => onOpen && onOpen(entry.id)}
                  className="hover:bg-ocean-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-start gap-2">
                      <div className="font-medium text-ocean-900 heading-font">{entry.title}</div>
                      <Icon name="external-link" className="w-4 h-4 text-graystone-300 shrink-0" />
                    </div>
                    {entry.caption && (
                      <div className="text-xs text-graystone-500 truncate max-w-[200px]">{entry.caption}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-graystone-700">
                    {Array.isArray(entry.owner) ? entry.owner.join(', ') : entry.owner}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-graystone-700">
                    {entry.timelineValue}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Manager Hub ──────────────────────────────────────────────

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
    isAdminUser ? managers : (myManagerRecord ? [myManagerRecord] : []),
    [isAdminUser, managers, myManagerRecord]
  );

  const defaultManager = myManagerRecord || (isAdminUser ? managers[0] : null);
  const [selectedManager, setSelectedManager] = useState(defaultManager || null);
  const [selectedReport, setSelectedReport] = useState("all");
  const [selectedMembers, setSelectedMembers] = useState(defaultManager?.reports || []);
  const [includeCollaborations, setIncludeCollaborations] = useState(false);
  const [managerViewMode, setManagerViewMode] = useState('kanban');

  useEffect(() => {
    if (myManagerRecord && (!selectedManager || selectedManager.email !== myManagerRecord.email)) {
      setSelectedManager(myManagerRecord);
      setSelectedMembers(myManagerRecord.reports || []);
    } else if (!myManagerRecord && isAdminUser && managers.length > 0 && !selectedManager) {
      setSelectedManager(managers[0]);
      setSelectedMembers(managers[0].reports || []);
    }
  }, [myManagerRecord?.email, isAdminUser, managers.length]);

  const [timelineFilter, setTimelineFilter] = useState('quarter');
  const [groupBy, setGroupBy] = useState('member');
  const [memberFilter, setMemberFilter] = useState('all');
  const [expandedProjectSubtasks, setExpandedProjectSubtasks] = useState({});
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [previewMembers, setPreviewMembers] = useState([]);
  const [previewTimeFilter, setPreviewTimeFilter] = useState('all');
  const [previewSelectedMonth, setPreviewSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [previewSelectedYear, setPreviewSelectedYear] = useState(new Date().getFullYear());
  const [showExportModal, setShowExportModal] = useState(false);

  const togglePreviewMember = (email) => {
    setPreviewMembers(prev =>
      prev.includes(email)
        ? prev.filter(e => e !== email)
        : [...prev, email]
    );
  };

  const filterItemsByTime = (itemsList) => {
    if (previewTimeFilter === 'all') return itemsList;

    const now = new Date();

    return itemsList.filter(item => {
      const itemDate = item.date || item.timelineValue;
      if (!itemDate) return previewTimeFilter === 'all';

      const date = new Date(itemDate);

      if (previewTimeFilter === 'week') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay() + 1);
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        return date >= startOfWeek && date <= endOfWeek;
      }

      if (previewTimeFilter === 'month') {
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }

      if (previewTimeFilter === 'select-month') {
        const [year, month] = previewSelectedMonth.split('-');
        return date.getFullYear() === parseInt(year) && date.getMonth() === parseInt(month) - 1;
      }

      if (previewTimeFilter === 'select-year') {
        return date.getFullYear() === previewSelectedYear;
      }

      return true;
    });
  };

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
    // Filter out archived and completed items
    const isActiveItem = (e) => !e.archived && e.workflowStatus !== 'Complete' && e.workflowStatus !== 'done';
    const memberItems = entries.filter(e =>
      e.owner?.some(o => reportEmails.includes(o.toLowerCase())) && e.itemType !== 'job' && isActiveItem(e)
    );
    if (includeCollaborations) {
      const collabItems = entries.filter(e =>
        e.collaborators?.some(c => reportEmails.includes(c.toLowerCase())) &&
        !memberItems.includes(e) && e.itemType !== 'job' && isActiveItem(e)
      );
      return [...memberItems, ...collabItems];
    }
    return memberItems;
  };

  const managerName = selectedManager?.name || currentUser || "Manager";

  if (!myManagerRecord && !isAdminUser) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
        <div className="bg-ocean-800 rounded-2xl p-6 text-white shadow-xl">
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
    { id: 'timeline', label: 'Timeline', icon: 'git-branch' },
    { id: 'yearly', label: 'Yearly Overview', icon: 'calendar-range' }
  ];

  const items = selectedManager ? getTeamEntries(selectedManager) : [];
  const now = new Date();
  const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const dueThisMonth = items.filter(item => {
    const itemDate = item.date || item.timelineValue;
    if (!itemDate) return false;
    return itemDate.startsWith(thisMonthStr) && (item.workflowStatus || '').toLowerCase() !== 'done';
  });

  const openModal = (title, data) => {
    if (openStatsModal) openStatsModal(title, data);
  };

  // Generate timeframe label for print header
  const getPrintTimeframe = () => {
    if ((managerHubTab || 'overview') === 'yearly') {
      return `${selectedYear} - ${timelineFilter === 'week' ? 'Weekly' : timelineFilter === 'month' ? 'Monthly' : 'Quarterly'} View`;
    }
    if (previewTimeFilter === 'all') return 'All Time';
    if (previewTimeFilter === 'week') return 'This Week';
    if (previewTimeFilter === 'month') return 'This Month';
    if (previewTimeFilter === 'select-month') {
      const [year, month] = previewSelectedMonth.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleString('default', { month: 'long', year: 'numeric' });
    }
    if (previewTimeFilter === 'select-year') return String(previewSelectedYear);
    return '';
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6" id="manager-hub-export-content">
      {/* Print-only header */}
      <div className="hidden print:block print:mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Project Report</h1>
        <p className="text-lg text-gray-600 mt-1">{getPrintTimeframe()}</p>
        <p className="text-sm text-gray-500 mt-1">{selectedManager?.team || teams[0] || "Team"} Team</p>
        <hr className="mt-4 border-gray-300" />
      </div>

      <div className="bg-ocean-800 rounded-2xl p-6 text-white shadow-xl print:hidden">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold heading-font">{managerName}'s Manager Hub</h2>
            <p className="text-ocean-100 text-sm">See team workloads, bottlenecks, and near-term risk.</p>
          </div>
          <div className="flex items-center gap-4">
            {isAdminUser && availableManagers.length > 1 && (
              <select
                value={selectedManager?.email || ''}
                onChange={(e) => handleManagerChange(e.target.value)}
                className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-sm transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                {availableManagers.map(m => (
                  <option key={m.email} value={m.email} className="text-ocean-900">
                    {m.name}
                  </option>
                ))}
              </select>
            )}
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-ocean-100">Team</div>
              <div className="text-lg font-semibold">{selectedManager?.team || teams[0] || "Team"}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-graystone-200 print:hidden">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setManagerHubTab && setManagerHubTab(tab.id)}
            className={clsx(
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
          {/* Stat cards - hidden in print */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:hidden">
            <button type="button" onClick={() => openModal(`Items: ${selectedManager.name}`, items)}
              className="bg-white rounded-xl border border-graystone-200 shadow-sm p-5 text-left transition hover:shadow-md hover:-translate-y-0.5 group">
              <div className="text-xs font-semibold text-graystone-600 uppercase mb-1">Team items</div>
              <div className="text-3xl font-bold text-ocean-900">{items.length}</div>
            </button>
            <button type="button" onClick={() => openModal("Due This Month", dueThisMonth)}
              className="bg-white rounded-xl border border-graystone-200 shadow-sm p-5 text-left transition hover:shadow-md hover:-translate-y-0.5 group">
              <div className="text-xs font-semibold text-graystone-600 uppercase mb-1">Due This Month</div>
              <div className="text-3xl font-bold text-ocean-900">{dueThisMonth.length}</div>
            </button>
          </div>

          {/* Team Members Selection - hidden in print */}
          <div className="bg-white rounded-xl border border-graystone-200 shadow-sm p-6 print:hidden">
            <h3 className="text-lg font-semibold text-ocean-900 mb-4 flex items-center gap-2">
              <Icon name="users" className="w-5 h-5" />
              Team Members
              {previewMembers.length > 0 && (
                <span className="text-sm font-normal text-graystone-500">
                  ({previewMembers.length} selected)
                </span>
              )}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(selectedManager?.reports || []).map(email => {
                const emailLower = email.toLowerCase();
                const ownedItems = items.filter(i => i.owner?.some(o => o.toLowerCase() === emailLower));
                const collabItems = items.filter(i =>
                  i.collaborators?.some(c => c.toLowerCase() === emailLower) &&
                  !i.owner?.some(o => o.toLowerCase() === emailLower)
                );
                const isSelected = previewMembers.includes(email);
                return (
                  <div
                    key={email}
                    onClick={() => togglePreviewMember(email)}
                    className={clsx(
                      "p-4 rounded-lg border cursor-pointer transition-all",
                      isSelected
                        ? "bg-ocean-50 border-ocean-500 ring-2 ring-ocean-200"
                        : "bg-graystone-50 border-graystone-200 hover:border-ocean-300 hover:bg-ocean-50/50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-ocean-900">{email.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase())}</div>
                      {isSelected && <Icon name="check" className="w-5 h-5 text-ocean-600" />}
                    </div>
                    <div className="text-xs text-graystone-500 mb-2">{email}</div>
                    <div className="flex gap-4 text-sm">
                      <span className="text-ocean-600">{ownedItems.length} owned</span>
                      <span className="text-graystone-500">{collabItems.length} collab</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Print-only: Simple list of included team members */}
          {previewMembers.length > 0 && (
            <div className="hidden print:block mb-4">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Team members included: </span>
                {previewMembers.map(email => email.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase())).join(', ')}
              </p>
            </div>
          )}

          {/* Export Report */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-ocean-500 text-white rounded-lg hover:bg-ocean-600 transition text-sm font-medium"
            >
              <Icon name="file-text" className="w-4 h-4" />
              Export Report
            </button>
          </div>

          {/* Selected Members Preview - Table matching TableView */}
          {previewMembers.length > 0 && (
            <MemberProjectsTable
              items={items}
              previewMembers={previewMembers}
              previewTimeFilter={previewTimeFilter}
              setPreviewTimeFilter={setPreviewTimeFilter}
              previewSelectedMonth={previewSelectedMonth}
              setPreviewSelectedMonth={setPreviewSelectedMonth}
              previewSelectedYear={previewSelectedYear}
              setPreviewSelectedYear={setPreviewSelectedYear}
              setPreviewMembers={setPreviewMembers}
              filterItemsByTime={filterItemsByTime}
              onOpen={onOpen}
            />
          )}
        </div>
      )}

      {(managerHubTab || 'overview') === 'timeline' && selectedManager && (
        <ManagerTimeline
          items={items}
          selectedManager={selectedManager}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          onOpen={onOpen}
          Badge={Badge}
        />
      )}

      {(managerHubTab || 'overview') === 'yearly' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h3 className="text-lg font-semibold text-ocean-900">Yearly Overview</h3>
            <div className="flex items-center gap-4">
              <select
                value={timelineFilter}
                onChange={(e) => setTimelineFilter(e.target.value)}
                className="text-sm border border-graystone-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ocean-500"
              >
                <option value="week">By Week</option>
                <option value="month">By Month</option>
                <option value="quarter">By Quarter</option>
              </select>
              <div className="flex items-center gap-2">
                <button onClick={() => setSelectedYear(y => y - 1)} className="p-2 hover:bg-graystone-100 rounded-lg">
                  <Icon name="chevron-left" className="w-4 h-4" />
                </button>
                <span className="font-semibold text-ocean-900 min-w-[60px] text-center">{selectedYear}</span>
                <button onClick={() => setSelectedYear(y => y + 1)} className="p-2 hover:bg-graystone-100 rounded-lg">
                  <Icon name="chevron-right" className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-ocean-500 text-white rounded-lg hover:bg-ocean-600 transition text-sm font-medium"
              >
                <Icon name="file-text" className="w-4 h-4" />
                Export Report
              </button>
            </div>
          </div>

          {(() => {
            const yearItems = items.filter(item => {
              const itemDate = item.date || item.timelineValue;
              if (!itemDate) return false;
              return itemDate.startsWith(String(selectedYear));
            });

            // Generate periods based on selected view
            const getPeriods = () => {
              if (timelineFilter === 'quarter') {
                return [1, 2, 3, 4].map(q => ({
                  key: `Q${q}`,
                  label: `Q${q}`,
                  filter: (item) => {
                    const itemDate = item.date || item.timelineValue;
                    if (!itemDate) return false;
                    if (itemDate.includes(`Q${q}`)) return true;
                    const month = parseInt(itemDate.split('-')[1]);
                    const qStart = (q - 1) * 3 + 1;
                    const qEnd = q * 3;
                    return month >= qStart && month <= qEnd;
                  }
                }));
              }
              if (timelineFilter === 'month') {
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                return months.map((m, i) => ({
                  key: m,
                  label: m,
                  filter: (item) => {
                    const itemDate = item.date || item.timelineValue;
                    if (!itemDate) return false;
                    const month = parseInt(itemDate.split('-')[1]);
                    return month === i + 1;
                  }
                }));
              }
              // Week view - show weeks with at least one item
              const weeks = [];
              for (let w = 1; w <= 52; w++) {
                const startDate = new Date(selectedYear, 0, 1 + (w - 1) * 7);
                const endDate = new Date(selectedYear, 0, 1 + w * 7 - 1);
                weeks.push({
                  key: `W${w}`,
                  label: `W${w}`,
                  sublabel: `${startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
                  filter: (item) => {
                    const itemDate = item.date || item.timelineValue;
                    if (!itemDate) return false;
                    const d = new Date(itemDate);
                    return d >= startDate && d <= endDate;
                  }
                });
              }
              return weeks;
            };

            const periods = getPeriods();
            const periodData = periods.map(p => ({
              ...p,
              count: yearItems.filter(p.filter).length,
              items: yearItems.filter(p.filter)
            })).filter(p => timelineFilter !== 'week' || p.count > 0);

            const maxCount = Math.max(...periodData.map(p => p.count), 1);

            return (
              <div className="space-y-6">
                {/* Period breakdown */}
                <div className="bg-white rounded-xl border border-graystone-200 shadow-sm p-6">
                  <h4 className="font-semibold text-ocean-900 mb-4 flex items-center gap-2">
                    <Icon name="bar-chart-2" className="w-5 h-5" />
                    {timelineFilter === 'week' ? 'Busy Weeks' : timelineFilter === 'month' ? 'Monthly Breakdown' : 'Quarterly Breakdown'}
                    <span className="text-sm font-normal text-graystone-500">({yearItems.length} total projects)</span>
                  </h4>
                  <div className={clsx(
                    "grid gap-2",
                    timelineFilter === 'quarter' ? "grid-cols-4" : timelineFilter === 'month' ? "grid-cols-6 md:grid-cols-12" : "grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-13"
                  )}>
                    {periodData.map(p => (
                      <div
                        key={p.key}
                        className="relative group"
                        title={`${p.label}: ${p.count} project${p.count !== 1 ? 's' : ''}`}
                      >
                        <div className="text-center">
                          <div className="text-xs font-medium text-graystone-600 mb-1">{p.label}</div>
                          <div
                            className={clsx(
                              "mx-auto rounded-lg transition-all",
                              p.count === 0 ? "bg-graystone-100" : p.count >= maxCount * 0.75 ? "bg-red-400" : p.count >= maxCount * 0.5 ? "bg-amber-400" : "bg-ocean-400"
                            )}
                            style={{
                              height: `${Math.max(20, (p.count / maxCount) * 60)}px`,
                              width: '100%'
                            }}
                          />
                          <div className="text-sm font-bold text-ocean-900 mt-1">{p.count}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {timelineFilter === 'week' && periodData.length === 0 && (
                    <div className="text-center py-8 text-graystone-500">No projects scheduled for {selectedYear}</div>
                  )}
                </div>

                {/* Team Members breakdown */}
                <div className="bg-white rounded-xl border border-graystone-200 shadow-sm p-6">
                  <h4 className="font-semibold text-ocean-900 mb-4 flex items-center gap-2">
                    <Icon name="users" className="w-5 h-5" />
                    Team Members
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(selectedManager?.reports || []).map(email => {
                      const memberYearItems = yearItems.filter(i => i.owner?.some(o => o.toLowerCase() === email.toLowerCase()));
                      return (
                        <div key={email} className="flex items-center justify-between p-3 bg-graystone-50 rounded-lg border border-graystone-200">
                          <div>
                            <div className="font-medium text-ocean-900">
                              {email.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                            </div>
                            <div className="text-xs text-graystone-500">{email}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-ocean-900">{memberYearItems.length}</div>
                            <div className="text-xs text-graystone-500">projects</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {!selectedManager && (
        <div className="bg-graystone-50 rounded-xl p-8 text-center">
          <Icon name="inbox" className="w-12 h-12 text-graystone-300 mx-auto mb-3" />
          <p className="text-graystone-500">Select a manager to view their hub</p>
        </div>
      )}

      <ReportExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        selectedManager={selectedManager}
        items={items}
        selectedYear={selectedYear}
        APP_CONFIG={APP_CONFIG}
      />
    </div>
  );
};

export default ManagerHub;

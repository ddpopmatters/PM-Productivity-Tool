import React, { useState, useMemo } from 'react';
import Icon from '../../ui/Icon';

const cx = (...xs) => xs.filter(Boolean).join(" ");

const OVERVIEW_SECTIONS = [
  { id: 'summaryStats', label: 'Summary Statistics', description: 'Total items, due this month' },
  { id: 'teamMembers', label: 'Team Member Summary', description: 'Each member with project count' },
  { id: 'projectsByMember', label: 'Projects by Member', description: 'Detailed project list grouped by team member' },
];

const YEARLY_SECTIONS = [
  { id: 'periodBreakdown', label: 'Period Breakdown', description: 'Project counts by quarter/month' },
  { id: 'yearlyTeamSummary', label: 'Team Member Summary', description: 'Yearly project counts per member' },
  { id: 'projectsByPeriod', label: 'Projects by Period', description: 'Detailed project list grouped by time period' },
];

const NARRATIVE_SECTIONS = [
  { id: 'executiveSummary', label: 'Executive Summary', placeholder: 'Brief overview of team progress, priorities, and outlook...' },
  { id: 'keyHighlights', label: 'Key Highlights', placeholder: 'Notable achievements, milestones reached, successful deliveries...' },
  { id: 'blockersRisks', label: 'Blockers & Risks', placeholder: 'Current blockers, upcoming risks, resource constraints...' },
];

const ReportExportModal = ({
  isOpen,
  onClose,
  selectedManager,
  items,
  selectedYear,
  APP_CONFIG,
}) => {
  const [enabledSections, setEnabledSections] = useState({
    summaryStats: true,
    teamMembers: true,
    projectsByMember: true,
    periodBreakdown: false,
    yearlyTeamSummary: false,
    projectsByPeriod: false,
    executiveSummary: false,
    keyHighlights: false,
    blockersRisks: false,
  });

  const [narratives, setNarratives] = useState({
    executiveSummary: '',
    keyHighlights: '',
    blockersRisks: '',
  });

  const [reportTitle, setReportTitle] = useState('Project Report');
  const [yearForReport, setYearForReport] = useState(selectedYear || new Date().getFullYear());
  const [periodType, setPeriodType] = useState('quarter');

  const toggleSection = (id) => {
    setEnabledSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAllInGroup = (sectionGroup, value) => {
    const updates = {};
    sectionGroup.forEach(s => { updates[s.id] = value; });
    setEnabledSections(prev => ({ ...prev, ...updates }));
  };

  const anyOverview = OVERVIEW_SECTIONS.some(s => enabledSections[s.id]);
  const anyYearly = YEARLY_SECTIONS.some(s => enabledSections[s.id]);
  const anyNarrative = NARRATIVE_SECTIONS.some(s => enabledSections[s.id]);
  const anySelected = anyOverview || anyYearly || anyNarrative;

  // Compute data for the report
  const reportData = useMemo(() => {
    if (!selectedManager || !items) return null;

    const reports = selectedManager.reports || [];
    const now = new Date();
    const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Items due this month
    const dueThisMonth = items.filter(item => {
      const itemDate = item.date || item.timelineValue;
      if (!itemDate) return false;
      return itemDate.startsWith(thisMonthStr) && (item.workflowStatus || '').toLowerCase() !== 'done';
    });

    // Items per member
    const memberData = reports.map(memberName => {
      const memberItems = items.filter(i =>
        i.owner?.some(o => o.toLowerCase() === memberName.toLowerCase())
      );
      return { name: memberName, items: memberItems };
    });

    // Year items
    const yearItems = items.filter(item => {
      const itemDate = item.date || item.timelineValue;
      if (!itemDate) return false;
      return itemDate.startsWith(String(yearForReport));
    });

    // Period data
    const getPeriods = () => {
      if (periodType === 'quarter') {
        return [1, 2, 3, 4].map(q => ({
          key: `Q${q} ${yearForReport}`,
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
      const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
      return months.map((m, i) => ({
        key: m,
        filter: (item) => {
          const itemDate = item.date || item.timelineValue;
          if (!itemDate) return false;
          const month = parseInt(itemDate.split('-')[1]);
          return month === i + 1;
        }
      }));
    };

    const periods = getPeriods();
    const periodData = periods.map(p => ({
      ...p,
      items: yearItems.filter(p.filter)
    })).filter(p => p.items.length > 0);

    // Year member data
    const yearMemberData = reports.map(memberName => {
      const memberYearItems = yearItems.filter(i =>
        i.owner?.some(o => o.toLowerCase() === memberName.toLowerCase())
      );
      return { name: memberName, items: memberYearItems };
    });

    return {
      totalItems: items.length,
      dueThisMonth: dueThisMonth.length,
      memberData,
      yearItems,
      periodData,
      yearMemberData,
    };
  }, [selectedManager, items, yearForReport, periodType]);

  const formatOwner = (owner) => {
    if (Array.isArray(owner)) return owner.join(', ');
    return owner || '';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const generateReport = () => {
    if (!reportData) return;

    const now = new Date();
    const generatedDate = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const teamName = selectedManager?.team || 'Team';
    const managerName = selectedManager?.name || 'Manager';

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${reportTitle} - ${teamName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a2332; line-height: 1.5; padding: 40px; max-width: 900px; margin: 0 auto; }
  h1 { font-size: 28px; font-weight: 700; color: #0c4a6e; margin-bottom: 4px; }
  h2 { font-size: 20px; font-weight: 600; color: #0c4a6e; margin: 32px 0 16px; padding-bottom: 8px; border-bottom: 2px solid #e0f2fe; }
  h3 { font-size: 16px; font-weight: 600; color: #1a2332; margin: 20px 0 10px; }
  .header { margin-bottom: 32px; padding-bottom: 20px; border-bottom: 3px solid #0c4a6e; }
  .header .subtitle { color: #64748b; font-size: 14px; }
  .header .meta { color: #94a3b8; font-size: 12px; margin-top: 4px; }
  .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin: 16px 0; }
  .stat-card { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; text-align: center; }
  .stat-card .value { font-size: 32px; font-weight: 700; color: #0c4a6e; }
  .stat-card .label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
  th { background: #f0f9ff; color: #0c4a6e; font-weight: 600; text-align: left; padding: 10px 12px; border-bottom: 2px solid #bae6fd; }
  td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
  tr:last-child td { border-bottom: none; }
  .status-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 500; }
  .status-done { background: #dcfce7; color: #166534; }
  .status-progress { background: #dbeafe; color: #1e40af; }
  .status-blocked { background: #fee2e2; color: #991b1b; }
  .status-default { background: #f1f5f9; color: #475569; }
  .narrative { background: #fefce8; border-left: 4px solid #eab308; padding: 16px; margin: 12px 0; border-radius: 0 8px 8px 0; white-space: pre-wrap; }
  .member-group { margin: 16px 0; }
  .member-name { font-weight: 600; color: #0c4a6e; font-size: 15px; padding: 8px 0 4px; }
  .period-group { margin: 20px 0; }
  .period-label { font-weight: 600; color: #0c4a6e; font-size: 15px; padding: 8px 0 4px; border-bottom: 1px solid #e0f2fe; margin-bottom: 8px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 11px; text-align: center; }
  @media print {
    body { padding: 20px; }
    h2 { break-after: avoid; }
    table { break-inside: avoid; }
    .member-group { break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="header">
  <h1>${reportTitle}</h1>
  <div class="subtitle">${teamName} &mdash; ${managerName}</div>
  <div class="meta">Generated ${generatedDate}</div>
</div>`;

    // Executive Summary narrative
    if (enabledSections.executiveSummary && narratives.executiveSummary.trim()) {
      html += `<h2>Executive Summary</h2>
<div class="narrative">${escapeHtml(narratives.executiveSummary)}</div>`;
    }

    // Summary Stats
    if (enabledSections.summaryStats) {
      html += `<h2>Summary</h2>
<div class="stat-grid">
  <div class="stat-card"><div class="value">${reportData.totalItems}</div><div class="label">Active Projects</div></div>
  <div class="stat-card"><div class="value">${reportData.dueThisMonth}</div><div class="label">Due This Month</div></div>
  <div class="stat-card"><div class="value">${reportData.memberData.length}</div><div class="label">Team Members</div></div>
</div>`;
    }

    // Team Members Summary
    if (enabledSections.teamMembers) {
      html += `<h2>Team Members</h2>
<table>
<tr><th>Name</th><th>Active Projects</th></tr>`;
      reportData.memberData.forEach(m => {
        html += `<tr><td>${escapeHtml(m.name)}</td><td>${m.items.length}</td></tr>`;
      });
      html += `</table>`;
    }

    // Projects by Member
    if (enabledSections.projectsByMember) {
      html += `<h2>Projects by Team Member</h2>`;
      reportData.memberData.forEach(m => {
        if (m.items.length === 0) return;
        html += `<div class="member-group">
<div class="member-name">${escapeHtml(m.name)} (${m.items.length})</div>
<table>
<tr><th>Project</th><th>Status</th><th>Deadline</th></tr>`;
        m.items.forEach(item => {
          const statusClass = getStatusClass(item.workflowStatus);
          html += `<tr>
<td>${escapeHtml(item.title || '')}</td>
<td><span class="status-badge ${statusClass}">${escapeHtml(item.workflowStatus || 'No status')}</span></td>
<td>${formatDate(item.date || item.timelineValue)}</td>
</tr>`;
        });
        html += `</table></div>`;
      });
    }

    // Key Highlights narrative
    if (enabledSections.keyHighlights && narratives.keyHighlights.trim()) {
      html += `<h2>Key Highlights</h2>
<div class="narrative">${escapeHtml(narratives.keyHighlights)}</div>`;
    }

    // Period Breakdown
    if (enabledSections.periodBreakdown) {
      html += `<h2>${yearForReport} &mdash; ${periodType === 'quarter' ? 'Quarterly' : 'Monthly'} Breakdown</h2>
<table>
<tr><th>Period</th><th>Projects</th></tr>`;
      reportData.periodData.forEach(p => {
        html += `<tr><td>${escapeHtml(p.key)}</td><td>${p.items.length}</td></tr>`;
      });
      if (reportData.periodData.length === 0) {
        html += `<tr><td colspan="2" style="text-align:center;color:#94a3b8;">No projects scheduled for ${yearForReport}</td></tr>`;
      }
      html += `</table>`;
    }

    // Yearly Team Summary
    if (enabledSections.yearlyTeamSummary) {
      html += `<h2>${yearForReport} &mdash; Team Member Summary</h2>
<table>
<tr><th>Name</th><th>Projects in ${yearForReport}</th></tr>`;
      reportData.yearMemberData.forEach(m => {
        html += `<tr><td>${escapeHtml(m.name)}</td><td>${m.items.length}</td></tr>`;
      });
      html += `</table>`;
    }

    // Projects by Period
    if (enabledSections.projectsByPeriod) {
      html += `<h2>${yearForReport} &mdash; Projects by ${periodType === 'quarter' ? 'Quarter' : 'Month'}</h2>`;
      reportData.periodData.forEach(p => {
        html += `<div class="period-group">
<div class="period-label">${escapeHtml(p.key)} (${p.items.length})</div>
<table>
<tr><th>Project</th><th>Owner</th><th>Status</th><th>Date</th></tr>`;
        p.items.forEach(item => {
          const statusClass = getStatusClass(item.workflowStatus);
          html += `<tr>
<td>${escapeHtml(item.title || '')}</td>
<td>${escapeHtml(formatOwner(item.owner))}</td>
<td><span class="status-badge ${statusClass}">${escapeHtml(item.workflowStatus || 'No status')}</span></td>
<td>${formatDate(item.date || item.timelineValue)}</td>
</tr>`;
        });
        html += `</table></div>`;
      });
    }

    // Blockers & Risks narrative
    if (enabledSections.blockersRisks && narratives.blockersRisks.trim()) {
      html += `<h2>Blockers &amp; Risks</h2>
<div class="narrative">${escapeHtml(narratives.blockersRisks)}</div>`;
    }

    html += `
<div class="footer">
  ${escapeHtml(APP_CONFIG?.ORG_NAME || 'Organisation')} &mdash; ${reportTitle} &mdash; Generated ${generatedDate}
</div>
</body>
</html>`;

    // Open in new window
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-graystone-200">
          <div>
            <h2 className="text-xl font-bold text-ocean-900 flex items-center gap-2">
              <Icon name="file-text" className="w-5 h-5" />
              Export Report
            </h2>
            <p className="text-sm text-graystone-500 mt-1">Select sections to include in your report</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-graystone-100 rounded-lg transition">
            <Icon name="x" className="w-5 h-5 text-graystone-500" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Report Title */}
          <div>
            <label className="block text-sm font-medium text-ocean-900 mb-1">Report Title</label>
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              className="w-full rounded-lg border border-graystone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
            />
          </div>

          {/* Overview Sections */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-ocean-900 uppercase tracking-wider">Overview Sections</h3>
              <div className="flex gap-2">
                <button onClick={() => toggleAllInGroup(OVERVIEW_SECTIONS, true)} className="text-xs text-ocean-600 hover:text-ocean-800">All</button>
                <span className="text-graystone-300">|</span>
                <button onClick={() => toggleAllInGroup(OVERVIEW_SECTIONS, false)} className="text-xs text-ocean-600 hover:text-ocean-800">None</button>
              </div>
            </div>
            <div className="space-y-2">
              {OVERVIEW_SECTIONS.map(section => (
                <label
                  key={section.id}
                  className={cx(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition",
                    enabledSections[section.id] ? "bg-ocean-50 border-ocean-300" : "bg-white border-graystone-200 hover:border-graystone-300"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={enabledSections[section.id]}
                    onChange={() => toggleSection(section.id)}
                    className="w-4 h-4 rounded border-graystone-300 text-ocean-600 focus:ring-ocean-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-ocean-900">{section.label}</div>
                    <div className="text-xs text-graystone-500">{section.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Yearly Sections */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-ocean-900 uppercase tracking-wider">Yearly Overview Sections</h3>
              <div className="flex gap-2">
                <button onClick={() => toggleAllInGroup(YEARLY_SECTIONS, true)} className="text-xs text-ocean-600 hover:text-ocean-800">All</button>
                <span className="text-graystone-300">|</span>
                <button onClick={() => toggleAllInGroup(YEARLY_SECTIONS, false)} className="text-xs text-ocean-600 hover:text-ocean-800">None</button>
              </div>
            </div>
            {(enabledSections.periodBreakdown || enabledSections.yearlyTeamSummary || enabledSections.projectsByPeriod) && (
              <div className="flex items-center gap-3 mb-3 p-3 bg-graystone-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-graystone-600">Year:</label>
                  <select
                    value={yearForReport}
                    onChange={(e) => setYearForReport(parseInt(e.target.value))}
                    className="text-sm border border-graystone-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ocean-500"
                  >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-graystone-600">Group by:</label>
                  <select
                    value={periodType}
                    onChange={(e) => setPeriodType(e.target.value)}
                    className="text-sm border border-graystone-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ocean-500"
                  >
                    <option value="quarter">Quarter</option>
                    <option value="month">Month</option>
                  </select>
                </div>
              </div>
            )}
            <div className="space-y-2">
              {YEARLY_SECTIONS.map(section => (
                <label
                  key={section.id}
                  className={cx(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition",
                    enabledSections[section.id] ? "bg-ocean-50 border-ocean-300" : "bg-white border-graystone-200 hover:border-graystone-300"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={enabledSections[section.id]}
                    onChange={() => toggleSection(section.id)}
                    className="w-4 h-4 rounded border-graystone-300 text-ocean-600 focus:ring-ocean-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-ocean-900">{section.label}</div>
                    <div className="text-xs text-graystone-500">{section.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Narrative Sections */}
          <div>
            <h3 className="text-sm font-semibold text-ocean-900 uppercase tracking-wider mb-3">Commentary (Optional)</h3>
            <div className="space-y-4">
              {NARRATIVE_SECTIONS.map(section => (
                <div key={section.id}>
                  <label
                    className={cx(
                      "flex items-center gap-3 p-3 rounded-t-lg border border-b-0 cursor-pointer transition",
                      enabledSections[section.id] ? "bg-ocean-50 border-ocean-300" : "bg-white border-graystone-200 hover:border-graystone-300 rounded-b-lg border-b"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={enabledSections[section.id]}
                      onChange={() => toggleSection(section.id)}
                      className="w-4 h-4 rounded border-graystone-300 text-ocean-600 focus:ring-ocean-500"
                    />
                    <span className="text-sm font-medium text-ocean-900">{section.label}</span>
                  </label>
                  {enabledSections[section.id] && (
                    <textarea
                      value={narratives[section.id]}
                      onChange={(e) => setNarratives(prev => ({ ...prev, [section.id]: e.target.value }))}
                      placeholder={section.placeholder}
                      rows={3}
                      className="w-full rounded-b-lg border border-ocean-300 border-t-0 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 resize-y"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-graystone-200 bg-graystone-50 rounded-b-2xl">
          <div className="text-xs text-graystone-500">
            {Object.values(enabledSections).filter(Boolean).length} section{Object.values(enabledSections).filter(Boolean).length !== 1 ? 's' : ''} selected
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-graystone-700 hover:bg-graystone-200 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={generateReport}
              disabled={!anySelected}
              className={cx(
                "flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition",
                anySelected
                  ? "bg-ocean-600 text-white hover:bg-ocean-700"
                  : "bg-graystone-200 text-graystone-400 cursor-not-allowed"
              )}
            >
              <Icon name="file-text" className="w-4 h-4" />
              Generate Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getStatusClass(status) {
  if (!status) return 'status-default';
  const s = status.toLowerCase();
  if (s === 'done' || s === 'delivered' || s === 'complete') return 'status-done';
  if (s.includes('progress') || s.includes('delivery')) return 'status-progress';
  if (s === 'blocked') return 'status-blocked';
  return 'status-default';
}

export default ReportExportModal;

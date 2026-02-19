import React, { useState, useMemo, useRef, useCallback } from 'react';
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

// ── Helpers ──────────────────────────────────────────────────

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

function formatOwner(owner) {
  if (Array.isArray(owner)) return owner.join(', ');
  return owner || '';
}

function formatDate(dateStr) {
  if (!dateStr) return '\u2014';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

// ── Report CSS (shared between preview and export) ──────────

const REPORT_CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a2332; line-height: 1.5; padding: 32px; max-width: 900px; margin: 0 auto; }
h1 { font-size: 24px; font-weight: 700; color: #0c4a6e; margin-bottom: 4px; }
h2 { font-size: 17px; font-weight: 600; color: #0c4a6e; margin: 28px 0 12px; padding-bottom: 6px; border-bottom: 2px solid #e0f2fe; }
h3 { font-size: 14px; font-weight: 600; color: #1a2332; margin: 16px 0 8px; }
.header { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 3px solid #0c4a6e; }
.header .subtitle { color: #64748b; font-size: 13px; }
.header .meta { color: #94a3b8; font-size: 11px; margin-top: 4px; }
.stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 12px 0; }
.stat-card { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 14px; text-align: center; }
.stat-card .value { font-size: 28px; font-weight: 700; color: #0c4a6e; }
.stat-card .label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px; }
th { background: #f0f9ff; color: #0c4a6e; font-weight: 600; text-align: left; padding: 8px 10px; border-bottom: 2px solid #bae6fd; }
td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; }
tr:last-child td { border-bottom: none; }
.status-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 500; }
.status-done { background: #dcfce7; color: #166534; }
.status-progress { background: #dbeafe; color: #1e40af; }
.status-blocked { background: #fee2e2; color: #991b1b; }
.status-default { background: #f1f5f9; color: #475569; }
.narrative { background: #fefce8; border-left: 4px solid #eab308; padding: 12px 14px; margin: 10px 0; border-radius: 0 8px 8px 0; white-space: pre-wrap; font-size: 13px; line-height: 1.6; }
.member-group { margin: 14px 0; }
.member-name { font-weight: 600; color: #0c4a6e; font-size: 13px; padding: 6px 0 2px; }
.period-group { margin: 16px 0; }
.period-label { font-weight: 600; color: #0c4a6e; font-size: 13px; padding: 6px 0 2px; border-bottom: 1px solid #e0f2fe; margin-bottom: 6px; }
.footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 10px; text-align: center; }
.empty-state { text-align: center; padding: 60px 20px; color: #94a3b8; }
.empty-state .icon { font-size: 48px; margin-bottom: 12px; }
.empty-state p { font-size: 14px; }
@media print {
  body { padding: 20px; }
  h2 { break-after: avoid; }
  table { break-inside: avoid; }
  .member-group { break-inside: avoid; }
}`;

// ── HTML Builder ─────────────────────────────────────────────

function buildReportHtml({ reportTitle, enabledSections, narratives, reportData, yearForReport, periodType, selectedManager, orgName }) {
  const now = new Date();
  const generatedDate = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const teamName = selectedManager?.team || 'Team';
  const managerName = selectedManager?.name || 'Manager';

  const anyEnabled = Object.values(enabledSections).some(Boolean);

  let body = '';

  // Header always shown
  body += `<div class="header">
  <h1>${escapeHtml(reportTitle)}</h1>
  <div class="subtitle">${escapeHtml(teamName)} &mdash; ${escapeHtml(managerName)}</div>
  <div class="meta">Generated ${generatedDate}</div>
</div>`;

  if (!anyEnabled) {
    body += `<div class="empty-state"><div class="icon">&#128196;</div><p>Select sections from the left panel to build your report</p></div>`;
  }

  if (!reportData) {
    return wrapHtml(reportTitle, teamName, body);
  }

  // Executive Summary narrative
  if (enabledSections.executiveSummary) {
    body += `<h2>Executive Summary</h2>`;
    body += narratives.executiveSummary.trim()
      ? `<div class="narrative">${escapeHtml(narratives.executiveSummary)}</div>`
      : `<div class="narrative" style="color:#94a3b8;font-style:italic;">Type your executive summary in the panel&hellip;</div>`;
  }

  // Summary Stats
  if (enabledSections.summaryStats) {
    body += `<h2>Summary</h2>
<div class="stat-grid">
  <div class="stat-card"><div class="value">${reportData.totalItems}</div><div class="label">Active Projects</div></div>
  <div class="stat-card"><div class="value">${reportData.dueThisMonth}</div><div class="label">Due This Month</div></div>
  <div class="stat-card"><div class="value">${reportData.memberData.length}</div><div class="label">Team Members</div></div>
</div>`;
  }

  // Team Members Summary
  if (enabledSections.teamMembers) {
    body += `<h2>Team Members</h2>
<table><tr><th>Name</th><th>Active Projects</th></tr>`;
    reportData.memberData.forEach(m => {
      body += `<tr><td>${escapeHtml(m.name)}</td><td>${m.items.length}</td></tr>`;
    });
    body += `</table>`;
  }

  // Projects by Member
  if (enabledSections.projectsByMember) {
    body += `<h2>Projects by Team Member</h2>`;
    reportData.memberData.forEach(m => {
      if (m.items.length === 0) return;
      body += `<div class="member-group">
<div class="member-name">${escapeHtml(m.name)} (${m.items.length})</div>
<table><tr><th>Project</th><th>Status</th><th>Deadline</th></tr>`;
      m.items.forEach(item => {
        body += `<tr>
<td>${escapeHtml(item.title || '')}</td>
<td><span class="status-badge ${getStatusClass(item.workflowStatus)}">${escapeHtml(item.workflowStatus || 'No status')}</span></td>
<td>${formatDate(item.date || item.timelineValue)}</td>
</tr>`;
      });
      body += `</table></div>`;
    });
  }

  // Key Highlights narrative
  if (enabledSections.keyHighlights) {
    body += `<h2>Key Highlights</h2>`;
    body += narratives.keyHighlights.trim()
      ? `<div class="narrative">${escapeHtml(narratives.keyHighlights)}</div>`
      : `<div class="narrative" style="color:#94a3b8;font-style:italic;">Type your key highlights in the panel&hellip;</div>`;
  }

  // Period Breakdown
  if (enabledSections.periodBreakdown) {
    body += `<h2>${yearForReport} &mdash; ${periodType === 'quarter' ? 'Quarterly' : 'Monthly'} Breakdown</h2>
<table><tr><th>Period</th><th>Projects</th></tr>`;
    if (reportData.periodData.length > 0) {
      reportData.periodData.forEach(p => {
        body += `<tr><td>${escapeHtml(p.key)}</td><td>${p.items.length}</td></tr>`;
      });
    } else {
      body += `<tr><td colspan="2" style="text-align:center;color:#94a3b8;">No projects scheduled for ${yearForReport}</td></tr>`;
    }
    body += `</table>`;
  }

  // Yearly Team Summary
  if (enabledSections.yearlyTeamSummary) {
    body += `<h2>${yearForReport} &mdash; Team Member Summary</h2>
<table><tr><th>Name</th><th>Projects in ${yearForReport}</th></tr>`;
    reportData.yearMemberData.forEach(m => {
      body += `<tr><td>${escapeHtml(m.name)}</td><td>${m.items.length}</td></tr>`;
    });
    body += `</table>`;
  }

  // Projects by Period
  if (enabledSections.projectsByPeriod) {
    body += `<h2>${yearForReport} &mdash; Projects by ${periodType === 'quarter' ? 'Quarter' : 'Month'}</h2>`;
    reportData.periodData.forEach(p => {
      body += `<div class="period-group">
<div class="period-label">${escapeHtml(p.key)} (${p.items.length})</div>
<table><tr><th>Project</th><th>Owner</th><th>Status</th><th>Date</th></tr>`;
      p.items.forEach(item => {
        body += `<tr>
<td>${escapeHtml(item.title || '')}</td>
<td>${escapeHtml(formatOwner(item.owner))}</td>
<td><span class="status-badge ${getStatusClass(item.workflowStatus)}">${escapeHtml(item.workflowStatus || 'No status')}</span></td>
<td>${formatDate(item.date || item.timelineValue)}</td>
</tr>`;
      });
      body += `</table></div>`;
    });
  }

  // Blockers & Risks narrative
  if (enabledSections.blockersRisks) {
    body += `<h2>Blockers &amp; Risks</h2>`;
    body += narratives.blockersRisks.trim()
      ? `<div class="narrative">${escapeHtml(narratives.blockersRisks)}</div>`
      : `<div class="narrative" style="color:#94a3b8;font-style:italic;">Type blockers &amp; risks in the panel&hellip;</div>`;
  }

  body += `\n<div class="footer">${escapeHtml(orgName)} &mdash; ${escapeHtml(reportTitle)} &mdash; Generated ${generatedDate}</div>`;

  return wrapHtml(reportTitle, teamName, body);
}

function wrapHtml(title, teamName, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)} - ${escapeHtml(teamName)}</title>
<style>${REPORT_CSS}</style>
</head>
<body>${body}</body>
</html>`;
}

// ── Component ────────────────────────────────────────────────

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
  const iframeRef = useRef(null);

  const toggleSection = (id) => {
    setEnabledSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAllInGroup = (sectionGroup, value) => {
    const updates = {};
    sectionGroup.forEach(s => { updates[s.id] = value; });
    setEnabledSections(prev => ({ ...prev, ...updates }));
  };

  const anySelected = Object.values(enabledSections).some(Boolean);

  // Compute report data
  const reportData = useMemo(() => {
    if (!selectedManager || !items) return null;

    const reports = selectedManager.reports || [];
    const now = new Date();
    const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const dueThisMonth = items.filter(item => {
      const itemDate = item.date || item.timelineValue;
      if (!itemDate) return false;
      return itemDate.startsWith(thisMonthStr) && (item.workflowStatus || '').toLowerCase() !== 'done';
    });

    const memberData = reports.map(memberName => {
      const memberItems = items.filter(i =>
        i.owner?.some(o => o.toLowerCase() === memberName.toLowerCase())
      );
      return { name: memberName, items: memberItems };
    });

    const yearItems = items.filter(item => {
      const itemDate = item.date || item.timelineValue;
      if (!itemDate) return false;
      return itemDate.startsWith(String(yearForReport));
    });

    const getPeriods = () => {
      if (periodType === 'quarter') {
        return [1, 2, 3, 4].map(q => ({
          key: `Q${q} ${yearForReport}`,
          filter: (item) => {
            const itemDate = item.date || item.timelineValue;
            if (!itemDate) return false;
            if (itemDate.includes(`Q${q}`)) return true;
            const month = parseInt(itemDate.split('-')[1]);
            return month >= (q - 1) * 3 + 1 && month <= q * 3;
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
          return parseInt(itemDate.split('-')[1]) === i + 1;
        }
      }));
    };

    const periods = getPeriods();
    const periodData = periods.map(p => ({
      ...p, items: yearItems.filter(p.filter)
    })).filter(p => p.items.length > 0);

    const yearMemberData = reports.map(memberName => ({
      name: memberName,
      items: yearItems.filter(i => i.owner?.some(o => o.toLowerCase() === memberName.toLowerCase()))
    }));

    return { totalItems: items.length, dueThisMonth: dueThisMonth.length, memberData, yearItems, periodData, yearMemberData };
  }, [selectedManager, items, yearForReport, periodType]);

  // Build preview HTML reactively
  const previewHtml = useMemo(() => {
    return buildReportHtml({
      reportTitle,
      enabledSections,
      narratives,
      reportData,
      yearForReport,
      periodType,
      selectedManager,
      orgName: APP_CONFIG?.ORG_NAME || 'Organisation',
    });
  }, [reportTitle, enabledSections, narratives, reportData, yearForReport, periodType, selectedManager, APP_CONFIG]);

  const handleExport = useCallback(() => {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(previewHtml);
      win.document.close();
    }
  }, [previewHtml]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 overflow-y-auto">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-[95vw] max-w-[1400px] my-6 mx-4 flex flex-col" style={{ maxHeight: 'calc(100vh - 48px)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-graystone-200 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-ocean-900 flex items-center gap-2">
              <Icon name="file-text" className="w-5 h-5" />
              Export Report
            </h2>
            <p className="text-xs text-graystone-500 mt-0.5">Configure sections on the left, preview updates live on the right</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-graystone-100 rounded-lg transition">
            <Icon name="x" className="w-5 h-5 text-graystone-500" />
          </button>
        </div>

        {/* Two-column body */}
        <div className="flex flex-1 min-h-0">
          {/* Left: Controls */}
          <div className="w-[380px] shrink-0 border-r border-graystone-200 overflow-y-auto p-5 space-y-5">
            {/* Report Title */}
            <div>
              <label className="block text-xs font-medium text-ocean-900 mb-1">Report Title</label>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                className="w-full rounded-lg border border-graystone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500"
              />
            </div>

            {/* Overview Sections */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-ocean-900 uppercase tracking-wider">Overview</h3>
                <div className="flex gap-2">
                  <button onClick={() => toggleAllInGroup(OVERVIEW_SECTIONS, true)} className="text-xs text-ocean-600 hover:text-ocean-800">All</button>
                  <span className="text-graystone-300">|</span>
                  <button onClick={() => toggleAllInGroup(OVERVIEW_SECTIONS, false)} className="text-xs text-ocean-600 hover:text-ocean-800">None</button>
                </div>
              </div>
              <div className="space-y-1.5">
                {OVERVIEW_SECTIONS.map(section => (
                  <label
                    key={section.id}
                    className={cx(
                      "flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition text-sm",
                      enabledSections[section.id] ? "bg-ocean-50 border-ocean-300" : "bg-white border-graystone-200 hover:border-graystone-300"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={enabledSections[section.id]}
                      onChange={() => toggleSection(section.id)}
                      className="w-3.5 h-3.5 rounded border-graystone-300 text-ocean-600 focus:ring-ocean-500"
                    />
                    <div>
                      <div className="font-medium text-ocean-900 text-sm leading-tight">{section.label}</div>
                      <div className="text-xs text-graystone-500 leading-tight">{section.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Yearly Sections */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-ocean-900 uppercase tracking-wider">Yearly Overview</h3>
                <div className="flex gap-2">
                  <button onClick={() => toggleAllInGroup(YEARLY_SECTIONS, true)} className="text-xs text-ocean-600 hover:text-ocean-800">All</button>
                  <span className="text-graystone-300">|</span>
                  <button onClick={() => toggleAllInGroup(YEARLY_SECTIONS, false)} className="text-xs text-ocean-600 hover:text-ocean-800">None</button>
                </div>
              </div>
              {(enabledSections.periodBreakdown || enabledSections.yearlyTeamSummary || enabledSections.projectsByPeriod) && (
                <div className="flex items-center gap-3 mb-2 p-2.5 bg-graystone-50 rounded-lg">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-medium text-graystone-600">Year:</label>
                    <select
                      value={yearForReport}
                      onChange={(e) => setYearForReport(parseInt(e.target.value))}
                      className="text-xs border border-graystone-200 rounded px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-ocean-500"
                    >
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-medium text-graystone-600">By:</label>
                    <select
                      value={periodType}
                      onChange={(e) => setPeriodType(e.target.value)}
                      className="text-xs border border-graystone-200 rounded px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-ocean-500"
                    >
                      <option value="quarter">Quarter</option>
                      <option value="month">Month</option>
                    </select>
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                {YEARLY_SECTIONS.map(section => (
                  <label
                    key={section.id}
                    className={cx(
                      "flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition text-sm",
                      enabledSections[section.id] ? "bg-ocean-50 border-ocean-300" : "bg-white border-graystone-200 hover:border-graystone-300"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={enabledSections[section.id]}
                      onChange={() => toggleSection(section.id)}
                      className="w-3.5 h-3.5 rounded border-graystone-300 text-ocean-600 focus:ring-ocean-500"
                    />
                    <div>
                      <div className="font-medium text-ocean-900 text-sm leading-tight">{section.label}</div>
                      <div className="text-xs text-graystone-500 leading-tight">{section.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Narrative Sections */}
            <div>
              <h3 className="text-xs font-semibold text-ocean-900 uppercase tracking-wider mb-2">Commentary</h3>
              <div className="space-y-3">
                {NARRATIVE_SECTIONS.map(section => (
                  <div key={section.id}>
                    <label
                      className={cx(
                        "flex items-center gap-2.5 p-2.5 border cursor-pointer transition text-sm",
                        enabledSections[section.id]
                          ? "bg-ocean-50 border-ocean-300 rounded-t-lg border-b-0"
                          : "bg-white border-graystone-200 hover:border-graystone-300 rounded-lg"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={enabledSections[section.id]}
                        onChange={() => toggleSection(section.id)}
                        className="w-3.5 h-3.5 rounded border-graystone-300 text-ocean-600 focus:ring-ocean-500"
                      />
                      <span className="font-medium text-ocean-900">{section.label}</span>
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

          {/* Right: Live Preview */}
          <div className="flex-1 min-w-0 bg-graystone-100 flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 bg-graystone-50 border-b border-graystone-200 shrink-0">
              <span className="text-xs font-medium text-graystone-600 flex items-center gap-1.5">
                <Icon name="eye" className="w-3.5 h-3.5" />
                Live Preview
              </span>
              <span className="text-xs text-graystone-400">
                {Object.values(enabledSections).filter(Boolean).length} section{Object.values(enabledSections).filter(Boolean).length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex-1 overflow-hidden p-4">
              <div className="h-full bg-white rounded-lg shadow-inner border border-graystone-200 overflow-hidden">
                <iframe
                  ref={iframeRef}
                  srcDoc={previewHtml}
                  title="Report Preview"
                  className="w-full h-full border-0"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-graystone-200 bg-graystone-50 rounded-b-2xl shrink-0">
          <div className="text-xs text-graystone-500">
            Opens in a new tab for printing / saving as PDF
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-graystone-700 hover:bg-graystone-200 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={!anySelected}
              className={cx(
                "flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition",
                anySelected
                  ? "bg-ocean-600 text-white hover:bg-ocean-700"
                  : "bg-graystone-200 text-graystone-400 cursor-not-allowed"
              )}
            >
              <Icon name="external-link" className="w-4 h-4" />
              Open Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportExportModal;

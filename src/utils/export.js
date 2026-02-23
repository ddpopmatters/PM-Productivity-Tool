/**
 * Export utilities for workflow items data
 */

/**
 * Convert entries to CSV string
 * @param {Array} entries - Array of entry objects
 * @param {Array<string>} columns - Column keys to include
 * @returns {string} CSV content
 */
export function entriesToCSV(entries, columns = ['title', 'workflowStatus', 'owner', 'team', 'date', 'tags', 'itemType']) {
  const headers = columns.map(col => {
    const labels = {
      title: 'Title',
      workflowStatus: 'Status',
      owner: 'Owner',
      team: 'Team',
      date: 'Date',
      timelineValue: 'Timeline',
      tags: 'Tags',
      itemType: 'Type',
      caption: 'Description',
      archived: 'Archived',
    };
    return labels[col] || col;
  });

  const escapeCSV = (val) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = entries.map(entry =>
    columns.map(col => {
      const val = entry[col];
      if (Array.isArray(val)) return escapeCSV(val.join('; '));
      return escapeCSV(val);
    }).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Convert entries to JSON string
 * @param {Array} entries - Array of entry objects
 * @param {Array<string>} columns - Column keys to include (null for all)
 * @returns {string} JSON content
 */
export function entriesToJSON(entries, columns = null) {
  const data = columns
    ? entries.map(entry => {
        const obj = {};
        columns.forEach(col => { obj[col] = entry[col]; });
        return obj;
      })
    : entries;
  return JSON.stringify(data, null, 2);
}

/**
 * Trigger a file download in the browser
 * @param {string} content - File content
 * @param {string} filename - Download filename
 * @param {string} mimeType - MIME type
 */
export function downloadFile(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export entries as CSV file
 * @param {Array} entries - Entries to export
 * @param {string} filename - Filename without extension
 */
export function exportCSV(entries, filename = 'momentum-export') {
  const csv = entriesToCSV(entries);
  downloadFile(csv, `${filename}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Export entries as JSON file
 * @param {Array} entries - Entries to export
 * @param {string} filename - Filename without extension
 */
export function exportJSON(entries, filename = 'momentum-export') {
  const json = entriesToJSON(entries);
  downloadFile(json, `${filename}.json`, 'application/json');
}

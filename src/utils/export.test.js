import { describe, it, expect } from 'vitest';
import { entriesToCSV, entriesToJSON } from './export';

const mockEntries = [
  {
    id: '1',
    title: 'Test Project',
    workflowStatus: 'In Progress',
    owner: ['Alice', 'Bob'],
    team: 'Engineering',
    date: '2026-03-01',
    tags: ['priority', 'Q1'],
    itemType: 'project',
    caption: 'A test project',
  },
  {
    id: '2',
    title: 'Item with "quotes", and commas',
    workflowStatus: 'Done',
    owner: ['Charlie'],
    team: 'Design',
    date: null,
    tags: [],
    itemType: 'job',
    caption: '',
  },
];

describe('entriesToCSV', () => {
  it('produces correct header row', () => {
    const csv = entriesToCSV(mockEntries);
    const header = csv.split('\n')[0];
    expect(header).toBe('Title,Status,Owner,Team,Date,Tags,Type');
  });

  it('joins array fields with semicolons', () => {
    const csv = entriesToCSV(mockEntries);
    const row1 = csv.split('\n')[1];
    expect(row1).toContain('Alice; Bob');
    expect(row1).toContain('priority; Q1');
  });

  it('escapes commas and quotes in values', () => {
    const csv = entriesToCSV(mockEntries);
    const row2 = csv.split('\n')[2];
    // Title with commas and quotes should be wrapped and quotes doubled
    expect(row2).toContain('"Item with ""quotes"", and commas"');
  });

  it('handles null/undefined values', () => {
    const csv = entriesToCSV(mockEntries);
    const row2 = csv.split('\n')[2];
    // date is null → empty string
    expect(row2).toContain(',,');
  });

  it('respects custom column selection', () => {
    const csv = entriesToCSV(mockEntries, ['title', 'team']);
    const header = csv.split('\n')[0];
    expect(header).toBe('Title,Team');
    const row1 = csv.split('\n')[1];
    expect(row1).toBe('Test Project,Engineering');
  });

  it('handles empty entries array', () => {
    const csv = entriesToCSV([]);
    expect(csv.split('\n')).toHaveLength(1); // header only
  });
});

describe('entriesToJSON', () => {
  it('returns valid JSON', () => {
    const json = entriesToJSON(mockEntries);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('includes all fields when columns is null', () => {
    const json = entriesToJSON(mockEntries, null);
    const parsed = JSON.parse(json);
    expect(parsed[0]).toHaveProperty('id');
    expect(parsed[0]).toHaveProperty('title');
    expect(parsed[0]).toHaveProperty('caption');
  });

  it('filters to specified columns', () => {
    const json = entriesToJSON(mockEntries, ['title', 'team']);
    const parsed = JSON.parse(json);
    expect(Object.keys(parsed[0])).toEqual(['title', 'team']);
    expect(parsed[0].title).toBe('Test Project');
    expect(parsed[0].team).toBe('Engineering');
  });

  it('handles empty entries array', () => {
    const json = entriesToJSON([]);
    expect(JSON.parse(json)).toEqual([]);
  });
});

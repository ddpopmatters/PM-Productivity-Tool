import { describe, it, expect } from 'vitest';
import { toPgArray, transformEntry } from './workflowItems';

// -- toPgArray ---------------------------------------------------------------

describe('toPgArray', () => {
  it('returns non-array values unchanged', () => {
    expect(toPgArray('hello')).toBe('hello');
    expect(toPgArray(42)).toBe(42);
    expect(toPgArray(null)).toBeNull();
    expect(toPgArray(undefined)).toBeUndefined();
  });

  it('converts an empty array to Postgres empty array literal', () => {
    expect(toPgArray([])).toBe('{}');
  });

  it('converts a single-element array', () => {
    expect(toPgArray(['Dan Davis'])).toBe('{"Dan Davis"}');
  });

  it('converts a multi-element array', () => {
    expect(toPgArray(['Dan', 'Jameen'])).toBe('{"Dan","Jameen"}');
  });

  it('escapes double quotes inside values', () => {
    expect(toPgArray(['He said "hello"'])).toBe('{"He said \\"hello\\""}');
  });

  it('escapes backslashes inside values', () => {
    expect(toPgArray(['path\\to\\file'])).toBe('{"path\\\\to\\\\file"}');
  });

  it('converts numbers inside array to strings', () => {
    expect(toPgArray([1, 2, 3])).toBe('{"1","2","3"}');
  });
});

// -- transformEntry ----------------------------------------------------------

describe('transformEntry', () => {
  const baseRow = {
    id: 'abc-123',
    title: 'Test Item',
    caption: 'A caption',
    workflow_status: 'In Delivery',
    team: 'Research',
    timeline_value: '2026-Q2',
    owner: ['Dan Davis'],
    owner_email: ['daniel.davis@populationmatters.org'],
    collaborators: ['Jameen Kaur'],
    tags: ['urgent'],
    subtasks: [{ text: 'Do thing', done: false }],
    documents: [],
    date: '2026-04-15',
    comments: [{ text: 'Nice', author: 'Dan' }],
    archived: false,
    dependencies: [],
    custom_fields: [{ key: 'priority', value: 'high' }],
    attachments: [],
    item_type: 'project',
    phase: 'Phase 1',
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-02-20T12:00:00Z',
  };

  it('maps snake_case DB columns to camelCase app fields', () => {
    const result = transformEntry(baseRow);
    expect(result.id).toBe('abc-123');
    expect(result.title).toBe('Test Item');
    expect(result.caption).toBe('A caption');
    expect(result.workflowStatus).toBe('In Delivery');
    expect(result.team).toBe('Research');
    expect(result.timelineValue).toBe('2026-Q2');
    expect(result.phase).toBe('Phase 1');
    expect(result.itemType).toBe('project');
    expect(result.createdAt).toBe('2026-02-01T00:00:00Z');
    expect(result.updatedAt).toBe('2026-02-20T12:00:00Z');
  });

  it('preserves arrays when owner/ownerEmail are already arrays', () => {
    const result = transformEntry(baseRow);
    expect(result.owner).toEqual(['Dan Davis']);
    expect(result.ownerEmail).toEqual(['daniel.davis@populationmatters.org']);
  });

  it('wraps scalar owner into an array', () => {
    const row = { ...baseRow, owner: 'Dan Davis', owner_email: 'dan@pm.org' };
    const result = transformEntry(row);
    expect(result.owner).toEqual(['Dan Davis']);
    expect(result.ownerEmail).toEqual(['dan@pm.org']);
  });

  it('returns empty array when owner/ownerEmail are falsy', () => {
    const row = { ...baseRow, owner: null, owner_email: undefined };
    const result = transformEntry(row);
    expect(result.owner).toEqual([]);
    expect(result.ownerEmail).toEqual([]);
  });

  it('defaults missing optional arrays to empty arrays', () => {
    const minimalRow = {
      id: '1',
      title: 'Minimal',
      caption: '',
      workflow_status: 'Idea',
      team: '',
      timeline_value: '',
      owner: null,
      owner_email: null,
      collaborators: null,
      tags: null,
      subtasks: null,
      documents: null,
      date: null,
      comments: null,
      archived: null,
      dependencies: null,
      custom_fields: null,
      attachments: null,
      item_type: null,
      phase: null,
      created_at: null,
      updated_at: null,
    };
    const result = transformEntry(minimalRow);
    expect(result.collaborators).toEqual([]);
    expect(result.tags).toEqual([]);
    expect(result.subtasks).toEqual([]);
    expect(result.documents).toEqual([]);
    expect(result.comments).toEqual([]);
    expect(result.dependencies).toEqual([]);
    expect(result.customFields).toEqual([]);
    expect(result.attachments).toEqual([]);
    expect(result.archived).toBe(false);
    expect(result.itemType).toBe('project');
  });
});

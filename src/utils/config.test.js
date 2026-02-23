import { describe, it, expect } from 'vitest';
import { getPhaseFromDate } from './config';

describe('getPhaseFromDate', () => {
  it('returns null for falsy input', () => {
    expect(getPhaseFromDate(null)).toBeNull();
    expect(getPhaseFromDate(undefined)).toBeNull();
    expect(getPhaseFromDate('')).toBeNull();
  });

  it('returns null for unrecognised format', () => {
    expect(getPhaseFromDate('not-a-date')).toBeNull();
    expect(getPhaseFromDate('2026/03/15')).toBeNull();
    expect(getPhaseFromDate('March 2026')).toBeNull();
  });

  // YYYY-MM-DD format
  it('maps a full date in Phase 1 range', () => {
    expect(getPhaseFromDate('2026-03-15')).toBe('Phase 1');
  });

  it('maps the first day of Phase 1', () => {
    expect(getPhaseFromDate('2026-02-01')).toBe('Phase 1');
  });

  it('maps the last day of Phase 1', () => {
    expect(getPhaseFromDate('2026-06-30')).toBe('Phase 1');
  });

  it('maps a date in Phase 2', () => {
    expect(getPhaseFromDate('2027-01-15')).toBe('Phase 2');
  });

  it('maps the first day of Phase 2', () => {
    expect(getPhaseFromDate('2026-07-01')).toBe('Phase 2');
  });

  it('maps a date in Phase 3', () => {
    expect(getPhaseFromDate('2029-06-15')).toBe('Phase 3');
  });

  it('returns null for a date before all phases', () => {
    expect(getPhaseFromDate('2025-12-31')).toBeNull();
  });

  it('returns null for a date after all phases', () => {
    expect(getPhaseFromDate('2030-07-01')).toBeNull();
  });

  // YYYY-MM format (mid-month heuristic)
  it('maps a month string to the correct phase', () => {
    expect(getPhaseFromDate('2026-04')).toBe('Phase 1');
    expect(getPhaseFromDate('2026-09')).toBe('Phase 2');
    expect(getPhaseFromDate('2029-01')).toBe('Phase 3');
  });

  // YYYY-QN format (quarter)
  it('maps Q1 2026 to Phase 1 (mid-quarter = Feb)', () => {
    expect(getPhaseFromDate('2026-Q1')).toBe('Phase 1');
  });

  it('maps Q3 2026 to Phase 2', () => {
    expect(getPhaseFromDate('2026-Q3')).toBe('Phase 2');
  });

  it('maps Q4 2029 to Phase 3', () => {
    expect(getPhaseFromDate('2029-Q4')).toBe('Phase 3');
  });

  // YYYY format (mid-year heuristic = Jul 01)
  it('maps a year string using mid-year heuristic', () => {
    // 2026 -> 2026-07-01 = first day of Phase 2
    expect(getPhaseFromDate('2026')).toBe('Phase 2');
    // 2027 -> 2027-07-01, within Phase 2 (Jul 2026 - Jun 2028)
    expect(getPhaseFromDate('2027')).toBe('Phase 2');
    // 2028 -> 2028-07-01 = first day of Phase 3 (Phase 2 ends Jun 2028)
    expect(getPhaseFromDate('2028')).toBe('Phase 3');
    // 2029 -> 2029-07-01, within Phase 3 (Jul 2028 - Jun 2030)
    expect(getPhaseFromDate('2029')).toBe('Phase 3');
  });

  it('returns null for a year entirely outside all phases', () => {
    expect(getPhaseFromDate('2031')).toBeNull();
    expect(getPhaseFromDate('2024')).toBeNull();
  });
});

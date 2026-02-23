import { describe, it, expect } from 'vitest';
import { isAdmin, isManager, canEditItem, getPreseededProfile } from './auth';

describe('isAdmin', () => {
  it('returns true for Jameen (admin)', () => {
    expect(isAdmin('jameen.kaur@populationmatters.org')).toBe(true);
  });

  it('returns true for Dan (admin)', () => {
    expect(isAdmin('daniel.davis@populationmatters.org')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isAdmin('JAMEEN.KAUR@POPULATIONMATTERS.ORG')).toBe(true);
    expect(isAdmin('Daniel.Davis@PopulationMatters.org')).toBe(true);
  });

  it('returns false for non-admin users', () => {
    expect(isAdmin('emma.lewendon-strutt@populationmatters.org')).toBe(false);
    expect(isAdmin('random@gmail.com')).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });
});

describe('isManager', () => {
  it('returns true for Jameen (manager in MANAGERS config)', () => {
    expect(isManager('jameen.kaur@populationmatters.org')).toBe(true);
  });

  it('returns true for Dan (manager in MANAGERS config)', () => {
    expect(isManager('daniel.davis@populationmatters.org')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isManager('JAMEEN.KAUR@POPULATIONMATTERS.ORG')).toBe(true);
  });

  it('returns false for non-manager users', () => {
    expect(isManager('emma.lewendon-strutt@populationmatters.org')).toBe(false);
    expect(isManager('random@gmail.com')).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isManager(null)).toBe(false);
    expect(isManager(undefined)).toBe(false);
  });
});

describe('canEditItem', () => {
  it('returns false for null entry', () => {
    expect(canEditItem(null, 'dan@example.com', 'Dan')).toBe(false);
  });

  it('returns true for admins regardless of ownership', () => {
    const entry = { owner: ['Someone Else'], collaborators: [] };
    expect(canEditItem(entry, 'jameen.kaur@populationmatters.org', 'Jameen')).toBe(true);
  });

  it('returns true if currentUser is in the owner array', () => {
    const entry = { owner: ['Dan Davis'], collaborators: [] };
    expect(canEditItem(entry, 'nobody@example.com', 'Dan Davis')).toBe(true);
  });

  it('returns true if currentUser is in collaborators', () => {
    const entry = { owner: ['Someone Else'], collaborators: ['Dan Davis'] };
    expect(canEditItem(entry, 'nobody@example.com', 'Dan Davis')).toBe(true);
  });

  it('returns false if user is not admin, owner, or collaborator', () => {
    const entry = { owner: ['Someone Else'], collaborators: ['Another Person'] };
    expect(canEditItem(entry, 'nobody@example.com', 'Dan Davis')).toBe(false);
  });
});

describe('getPreseededProfile', () => {
  it('returns the profile for a known seed user', () => {
    const profile = getPreseededProfile('daniel.davis@populationmatters.org');
    expect(profile).toBeDefined();
    expect(profile.name).toBe('Dan Davis');
    expect(profile.team).toBe('Advocacy & Influence');
    expect(profile.role).toBe('manager');
  });

  it('is case-insensitive', () => {
    const profile = getPreseededProfile('DANIEL.DAVIS@POPULATIONMATTERS.ORG');
    expect(profile).toBeDefined();
    expect(profile.name).toBe('Dan Davis');
  });

  it('returns undefined for unknown emails', () => {
    expect(getPreseededProfile('nobody@example.com')).toBeUndefined();
  });

  it('returns undefined for null/undefined', () => {
    expect(getPreseededProfile(null)).toBeUndefined();
    expect(getPreseededProfile(undefined)).toBeUndefined();
  });
});

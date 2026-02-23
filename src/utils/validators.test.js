import { describe, it, expect } from 'vitest';
import { Validators } from './validators';

describe('Validators.isValidEmail', () => {
  it('returns true for a valid email', () => {
    expect(Validators.isValidEmail('user@example.com')).toBe(true);
  });

  it('returns true for an org email', () => {
    expect(Validators.isValidEmail('dan@populationmatters.org')).toBe(true);
  });

  it('returns true and trims whitespace', () => {
    expect(Validators.isValidEmail('  user@example.com  ')).toBe(true);
  });

  it('returns false for null/undefined/empty', () => {
    expect(Validators.isValidEmail(null)).toBe(false);
    expect(Validators.isValidEmail(undefined)).toBe(false);
    expect(Validators.isValidEmail('')).toBe(false);
  });

  it('returns false for non-string', () => {
    expect(Validators.isValidEmail(123)).toBe(false);
    expect(Validators.isValidEmail({})).toBe(false);
  });

  it('returns false for invalid formats', () => {
    expect(Validators.isValidEmail('not-an-email')).toBe(false);
    expect(Validators.isValidEmail('@domain.com')).toBe(false);
    expect(Validators.isValidEmail('user@')).toBe(false);
    expect(Validators.isValidEmail('user@.com')).toBe(false);
  });
});

describe('Validators.isOrgEmail', () => {
  it('returns true for populationmatters.org email', () => {
    expect(Validators.isOrgEmail('dan@populationmatters.org')).toBe(true);
  });

  it('is case-insensitive on domain', () => {
    expect(Validators.isOrgEmail('Dan@PopulationMatters.org')).toBe(true);
  });

  it('returns false for non-org email', () => {
    expect(Validators.isOrgEmail('user@gmail.com')).toBe(false);
  });

  it('returns false for invalid email', () => {
    expect(Validators.isOrgEmail('notanemail')).toBe(false);
  });

  it('returns false for null', () => {
    expect(Validators.isOrgEmail(null)).toBe(false);
  });
});

describe('Validators.isNotEmpty', () => {
  it('returns true for non-empty string', () => {
    expect(Validators.isNotEmpty('hello')).toBe(true);
  });

  it('returns false for empty string', () => {
    expect(Validators.isNotEmpty('')).toBe(false);
  });

  it('returns false for whitespace-only string', () => {
    expect(Validators.isNotEmpty('   ')).toBe(false);
  });

  it('returns false for null and undefined', () => {
    expect(Validators.isNotEmpty(null)).toBe(false);
    expect(Validators.isNotEmpty(undefined)).toBe(false);
  });

  it('returns true for numbers, booleans, objects', () => {
    expect(Validators.isNotEmpty(0)).toBe(true);
    expect(Validators.isNotEmpty(false)).toBe(true);
    expect(Validators.isNotEmpty({})).toBe(true);
  });
});

describe('Validators.isValidPassword', () => {
  it('returns true for a string of 8+ characters', () => {
    expect(Validators.isValidPassword('12345678')).toBe(true);
    expect(Validators.isValidPassword('a long password indeed')).toBe(true);
  });

  it('returns false for strings shorter than 8 characters', () => {
    expect(Validators.isValidPassword('1234567')).toBe(false);
    expect(Validators.isValidPassword('')).toBe(false);
  });

  it('returns false for non-string input', () => {
    expect(Validators.isValidPassword(null)).toBe(false);
    expect(Validators.isValidPassword(undefined)).toBe(false);
    expect(Validators.isValidPassword(12345678)).toBe(false);
  });
});

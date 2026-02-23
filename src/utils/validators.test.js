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

// -- Form-level validators ---------------------------------------------------

describe('Validators.validateRequired', () => {
  it('returns null for non-empty string', () => {
    expect(Validators.validateRequired('hello')).toBeNull();
  });

  it('returns error for empty string', () => {
    expect(Validators.validateRequired('')).toBe('This field is required');
  });

  it('returns error for whitespace-only', () => {
    expect(Validators.validateRequired('   ')).toBe('This field is required');
  });

  it('returns error for null and undefined', () => {
    expect(Validators.validateRequired(null)).toBe('This field is required');
    expect(Validators.validateRequired(undefined)).toBe('This field is required');
  });

  it('returns null for numbers and booleans', () => {
    expect(Validators.validateRequired(0)).toBeNull();
    expect(Validators.validateRequired(false)).toBeNull();
  });
});

describe('Validators.validateMaxLength', () => {
  it('returns null when string is within limit', () => {
    const validate = Validators.validateMaxLength(10);
    expect(validate('short')).toBeNull();
  });

  it('returns null at exactly the limit', () => {
    const validate = Validators.validateMaxLength(5);
    expect(validate('12345')).toBeNull();
  });

  it('returns error when string exceeds limit', () => {
    const validate = Validators.validateMaxLength(5);
    expect(validate('123456')).toBe('Must be 5 characters or fewer');
  });

  it('returns null for non-string values', () => {
    const validate = Validators.validateMaxLength(5);
    expect(validate(null)).toBeNull();
    expect(validate(123)).toBeNull();
  });
});

describe('Validators.validateUrl', () => {
  it('returns null for valid URLs', () => {
    expect(Validators.validateUrl('https://example.com')).toBeNull();
    expect(Validators.validateUrl('http://localhost:3000')).toBeNull();
  });

  it('returns error for invalid URLs', () => {
    expect(Validators.validateUrl('not-a-url')).toBe('Must be a valid URL');
    expect(Validators.validateUrl('just some text')).toBe('Must be a valid URL');
  });

  it('returns null for empty/null (not required)', () => {
    expect(Validators.validateUrl('')).toBeNull();
    expect(Validators.validateUrl(null)).toBeNull();
    expect(Validators.validateUrl(undefined)).toBeNull();
  });
});

describe('Validators.validateDate', () => {
  it('returns null for valid date strings', () => {
    expect(Validators.validateDate('2025-01-15')).toBeNull();
    expect(Validators.validateDate('2025-12-31T23:59:59Z')).toBeNull();
  });

  it('returns error for invalid date strings', () => {
    expect(Validators.validateDate('not-a-date')).toBe('Must be a valid date');
  });

  it('returns null for empty/null (not required)', () => {
    expect(Validators.validateDate('')).toBeNull();
    expect(Validators.validateDate(null)).toBeNull();
  });
});

describe('Validators.validateForm', () => {
  it('returns null when all fields pass', () => {
    const values = { title: 'My Item', url: 'https://example.com' };
    const rules = {
      title: [Validators.validateRequired],
      url: [Validators.validateUrl],
    };
    expect(Validators.validateForm(values, rules)).toBeNull();
  });

  it('returns errors for failing fields', () => {
    const values = { title: '', url: 'bad' };
    const rules = {
      title: [Validators.validateRequired],
      url: [Validators.validateUrl],
    };
    const errors = Validators.validateForm(values, rules);
    expect(errors.title).toBe('This field is required');
    expect(errors.url).toBe('Must be a valid URL');
  });

  it('stops at first error per field', () => {
    const values = { name: '' };
    const rules = {
      name: [Validators.validateRequired, Validators.validateMaxLength(5)],
    };
    const errors = Validators.validateForm(values, rules);
    expect(errors.name).toBe('This field is required');
  });

  it('handles missing fields in values', () => {
    const values = {};
    const rules = { title: [Validators.validateRequired] };
    const errors = Validators.validateForm(values, rules);
    expect(errors.title).toBe('This field is required');
  });
});

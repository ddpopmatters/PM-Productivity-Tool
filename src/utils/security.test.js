import { describe, it, expect } from 'vitest';
import {
  sanitizeEmailForQuery,
  isSafeIdentifier,
  sanitizeForDisplay,
  validateFileForUpload,
  validateFilesForUpload,
  getAllowedExtensions,
  validatePassword,
  getPasswordRequirements,
  PASSWORD_REQUIREMENTS,
} from './security';

// -- sanitizeEmailForQuery ---------------------------------------------------

describe('sanitizeEmailForQuery', () => {
  it('returns sanitized lowercase email for valid input', () => {
    expect(sanitizeEmailForQuery('Dan@Example.COM')).toBe('dan@example.com');
  });

  it('trims whitespace', () => {
    expect(sanitizeEmailForQuery('  user@example.com  ')).toBe('user@example.com');
  });

  it('escapes quotes in the local part', () => {
    const result = sanitizeEmailForQuery("o'brien@example.com");
    expect(result).toContain("\\'");
  });

  it('returns null for null/undefined/empty', () => {
    expect(sanitizeEmailForQuery(null)).toBeNull();
    expect(sanitizeEmailForQuery(undefined)).toBeNull();
    expect(sanitizeEmailForQuery('')).toBeNull();
  });

  it('returns null for non-string', () => {
    expect(sanitizeEmailForQuery(42)).toBeNull();
  });

  it('returns null for invalid email format', () => {
    expect(sanitizeEmailForQuery('not-an-email')).toBeNull();
    expect(sanitizeEmailForQuery('@domain.com')).toBeNull();
  });

  it('returns null for email exceeding 254 characters', () => {
    const longLocal = 'a'.repeat(245);
    expect(sanitizeEmailForQuery(longLocal + '@example.com')).toBeNull();
  });
});

// -- isSafeIdentifier --------------------------------------------------------

describe('isSafeIdentifier', () => {
  it('returns true for valid identifiers', () => {
    expect(isSafeIdentifier('hello')).toBe(true);
    expect(isSafeIdentifier('_private')).toBe(true);
    expect(isSafeIdentifier('camelCase2')).toBe(true);
    expect(isSafeIdentifier('UPPER_CASE')).toBe(true);
  });

  it('returns false for identifiers starting with a digit', () => {
    expect(isSafeIdentifier('1abc')).toBe(false);
  });

  it('returns false for strings with special characters', () => {
    expect(isSafeIdentifier('hello-world')).toBe(false);
    expect(isSafeIdentifier('hello world')).toBe(false);
    expect(isSafeIdentifier('drop;table')).toBe(false);
  });

  it('returns false for null/undefined/empty', () => {
    expect(isSafeIdentifier(null)).toBe(false);
    expect(isSafeIdentifier(undefined)).toBe(false);
    expect(isSafeIdentifier('')).toBe(false);
  });

  it('returns false for non-string', () => {
    expect(isSafeIdentifier(123)).toBe(false);
  });
});

// -- sanitizeForDisplay ------------------------------------------------------

describe('sanitizeForDisplay', () => {
  it('escapes HTML special characters', () => {
    expect(sanitizeForDisplay('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('escapes ampersands', () => {
    expect(sanitizeForDisplay('A & B')).toBe('A &amp; B');
  });

  it('escapes single quotes', () => {
    expect(sanitizeForDisplay("it's")).toBe("it&#x27;s");
  });

  it('returns empty string for null/undefined/non-string', () => {
    expect(sanitizeForDisplay(null)).toBe('');
    expect(sanitizeForDisplay(undefined)).toBe('');
    expect(sanitizeForDisplay(42)).toBe('');
  });

  it('passes through clean strings unchanged', () => {
    expect(sanitizeForDisplay('Hello World')).toBe('Hello World');
  });
});

// -- getAllowedExtensions ----------------------------------------------------

describe('getAllowedExtensions', () => {
  it('returns a comma-separated string of extensions', () => {
    const result = getAllowedExtensions();
    expect(typeof result).toBe('string');
    expect(result).toContain('.pdf');
    expect(result).toContain('.jpg');
    expect(result).toContain('.png');
    expect(result).toContain('.csv');
  });
});

// -- validateFileForUpload ---------------------------------------------------

describe('validateFileForUpload', () => {
  function mockFile(name, type, size) {
    return new File([new ArrayBuffer(size || 100)], name, { type });
  }

  it('accepts a valid JPEG file', () => {
    const result = validateFileForUpload(mockFile('photo.jpg', 'image/jpeg'));
    expect(result.valid).toBe(true);
  });

  it('accepts a valid PDF', () => {
    const result = validateFileForUpload(mockFile('doc.pdf', 'application/pdf'));
    expect(result.valid).toBe(true);
  });

  it('rejects null / non-File input', () => {
    expect(validateFileForUpload(null).valid).toBe(false);
    expect(validateFileForUpload('not-a-file').valid).toBe(false);
  });

  it('rejects files with path traversal in name', () => {
    const file = mockFile('../etc/passwd.txt', 'text/plain');
    expect(validateFileForUpload(file).valid).toBe(false);
  });

  it('rejects files with no extension', () => {
    const file = mockFile('noext', 'image/jpeg');
    expect(validateFileForUpload(file).valid).toBe(false);
  });

  it('rejects disallowed MIME types', () => {
    const file = mockFile('script.exe', 'application/x-msdownload');
    expect(validateFileForUpload(file).valid).toBe(false);
  });

  it('rejects extension/MIME mismatch', () => {
    const file = mockFile('photo.png', 'image/jpeg');
    expect(validateFileForUpload(file).valid).toBe(false);
  });

  it('rejects double extensions hiding executables', () => {
    const file = mockFile('report.exe.pdf', 'application/pdf');
    expect(validateFileForUpload(file).valid).toBe(false);
  });
});

// -- validateFilesForUpload --------------------------------------------------

describe('validateFilesForUpload', () => {
  function mockFile(name, type) {
    return new File(['data'], name, { type });
  }

  it('separates valid and invalid files', () => {
    const files = [
      mockFile('good.pdf', 'application/pdf'),
      mockFile('bad.exe', 'application/x-msdownload'),
      mockFile('also-good.jpg', 'image/jpeg'),
    ];
    const { validFiles, invalidFiles } = validateFilesForUpload(files);
    expect(validFiles).toHaveLength(2);
    expect(invalidFiles).toHaveLength(1);
    expect(invalidFiles[0].error).toBeTruthy();
  });

  it('returns all valid when all files pass', () => {
    const files = [
      mockFile('a.txt', 'text/plain'),
      mockFile('b.csv', 'text/csv'),
    ];
    const { validFiles, invalidFiles } = validateFilesForUpload(files);
    expect(validFiles).toHaveLength(2);
    expect(invalidFiles).toHaveLength(0);
  });
});

// -- validatePassword --------------------------------------------------------

describe('validatePassword', () => {
  it('rejects null/undefined', () => {
    const result = validatePassword(null);
    expect(result.valid).toBe(false);
    expect(result.strength).toBe('weak');
  });

  it('rejects short passwords', () => {
    const result = validatePassword('Ab1!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('At least ' + PASSWORD_REQUIREMENTS.minLength + ' characters');
  });

  it('requires uppercase', () => {
    const result = validatePassword('abcdefg1!');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('uppercase'))).toBe(true);
  });

  it('requires lowercase', () => {
    const result = validatePassword('ABCDEFG1!');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('lowercase'))).toBe(true);
  });

  it('requires a number', () => {
    const result = validatePassword('Abcdefgh!');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('number'))).toBe(true);
  });

  it('requires a special character', () => {
    const result = validatePassword('Abcdefg1');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('special'))).toBe(true);
  });

  it('accepts a strong password meeting all requirements', () => {
    const result = validatePassword('Str0ng!Pass');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(['good', 'strong']).toContain(result.strength);
  });

  it('gives higher strength to longer passwords', () => {
    const short = validatePassword('Str0ng!P');     // 8 chars
    const long = validatePassword('Str0ng!Password1234'); // 20 chars
    const strengthOrder = ['weak', 'fair', 'good', 'strong'];
    expect(strengthOrder.indexOf(long.strength)).toBeGreaterThanOrEqual(
      strengthOrder.indexOf(short.strength)
    );
  });
});

// -- getPasswordRequirements -------------------------------------------------

describe('getPasswordRequirements', () => {
  it('returns an array of human-readable strings', () => {
    const reqs = getPasswordRequirements();
    expect(Array.isArray(reqs)).toBe(true);
    expect(reqs.length).toBeGreaterThanOrEqual(1);
    expect(reqs[0]).toContain(String(PASSWORD_REQUIREMENTS.minLength));
  });
});

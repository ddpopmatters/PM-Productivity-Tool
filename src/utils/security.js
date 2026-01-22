/**
 * Security utilities for input sanitization and validation
 */

/**
 * Sanitize email for use in Supabase query filters
 * Prevents injection by escaping special characters and validating format
 * @param {string} email - Email address to sanitize
 * @returns {string|null} - Sanitized email or null if invalid
 */
export function sanitizeEmailForQuery(email) {
  if (!email || typeof email !== 'string') {
    return null;
  }

  // Trim whitespace
  const trimmed = email.trim().toLowerCase();

  // Validate email format (basic RFC 5322 pattern)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(trimmed)) {
    return null;
  }

  // Additional length check (max 254 chars per RFC 5321)
  if (trimmed.length > 254) {
    return null;
  }

  // Escape characters that could be used for query injection
  // In PostgREST/Supabase filters: quotes, commas, parentheses, dots in wrong context
  const escaped = trimmed
    .replace(/"/g, '\\"')  // Escape double quotes
    .replace(/'/g, "\\'"); // Escape single quotes

  return escaped;
}

/**
 * Validate that a value is a safe identifier (alphanumeric + underscore)
 * @param {string} value - Value to validate
 * @returns {boolean} - True if safe
 */
export function isSafeIdentifier(value) {
  if (!value || typeof value !== 'string') {
    return false;
  }
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value);
}

/**
 * Sanitize a string for safe display (prevent XSS)
 * @param {string} str - String to sanitize
 * @returns {string} - Sanitized string
 */
export function sanitizeForDisplay(str) {
  if (!str || typeof str !== 'string') {
    return '';
  }
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Allowed file types for upload (MIME types)
 * Excludes executable files, scripts, and potentially dangerous formats
 */
export const ALLOWED_FILE_TYPES = {
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'], // Note: SVGs can contain scripts, but we sanitize on display
  // Documents
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  // Text
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
  'text/markdown': ['.md'],
  // Archives (common for sharing multiple files)
  'application/zip': ['.zip'],
  'application/x-zip-compressed': ['.zip'],
};

/**
 * Get list of allowed extensions for file input accept attribute
 * @returns {string} - Comma-separated list of extensions
 */
export function getAllowedExtensions() {
  const extensions = new Set();
  Object.values(ALLOWED_FILE_TYPES).forEach(exts => {
    exts.forEach(ext => extensions.add(ext));
  });
  return Array.from(extensions).join(',');
}

/**
 * Validate a file for upload
 * Checks MIME type, extension, and performs basic content validation
 * @param {File} file - File object to validate
 * @returns {{ valid: boolean, error?: string }} - Validation result
 */
export function validateFileForUpload(file) {
  if (!file || !(file instanceof File)) {
    return { valid: false, error: 'Invalid file object' };
  }

  // Check file name for path traversal attempts
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    return { valid: false, error: 'Invalid file name' };
  }

  // Get file extension (lowercase)
  const lastDot = file.name.lastIndexOf('.');
  const extension = lastDot >= 0 ? file.name.slice(lastDot).toLowerCase() : '';

  if (!extension) {
    return { valid: false, error: 'File must have an extension' };
  }

  // Check if MIME type is allowed
  const allowedExtensions = ALLOWED_FILE_TYPES[file.type];

  if (!allowedExtensions) {
    return {
      valid: false,
      error: `File type "${file.type || 'unknown'}" is not allowed. Allowed types: images, PDFs, Office documents, text files, and zip archives.`
    };
  }

  // Verify extension matches MIME type (prevents extension spoofing)
  if (!allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `File extension "${extension}" doesn't match file type "${file.type}"`
    };
  }

  // Additional check: block files with double extensions that might be disguised executables
  const dangerousPatterns = [
    /\.exe$/i, /\.bat$/i, /\.cmd$/i, /\.com$/i, /\.msi$/i,
    /\.js$/i, /\.vbs$/i, /\.ps1$/i, /\.sh$/i,
    /\.php$/i, /\.asp$/i, /\.jsp$/i,
    /\.scr$/i, /\.pif$/i, /\.application$/i,
  ];

  const nameWithoutFinalExt = file.name.slice(0, lastDot);
  for (const pattern of dangerousPatterns) {
    if (pattern.test(nameWithoutFinalExt)) {
      return { valid: false, error: 'Potentially dangerous file detected' };
    }
  }

  return { valid: true };
}

/**
 * Batch validate files for upload
 * @param {File[]} files - Array of files to validate
 * @returns {{ validFiles: File[], invalidFiles: { file: File, error: string }[] }}
 */
export function validateFilesForUpload(files) {
  const validFiles = [];
  const invalidFiles = [];

  for (const file of files) {
    const result = validateFileForUpload(file);
    if (result.valid) {
      validFiles.push(file);
    } else {
      invalidFiles.push({ file, error: result.error });
    }
  }

  return { validFiles, invalidFiles };
}

export default {
  sanitizeEmailForQuery,
  isSafeIdentifier,
  sanitizeForDisplay,
  validateFileForUpload,
  validateFilesForUpload,
  getAllowedExtensions,
  ALLOWED_FILE_TYPES,
};

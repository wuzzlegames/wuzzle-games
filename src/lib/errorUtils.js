// Error handling and formatting utilities

/**
 * Format Firebase authentication errors into user-friendly messages
 * @param {Error} error - The error object
 * @returns {string} User-friendly error message
 */
export function formatAuthError(error) {
  if (!error || !error.code) {
    return error?.message || 'An unexpected error occurred';
  }

  const errorMessages = {
    'auth/invalid-email': 'Invalid email address',
    'auth/user-disabled': 'This account has been disabled',
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/email-already-in-use': 'This email is already registered',
    'auth/weak-password': 'Password is too weak. Please use at least 6 characters',
    'auth/operation-not-allowed': 'This operation is not allowed',
    'auth/too-many-requests': 'Too many requests. Please try again later',
    'auth/network-request-failed': 'Network error. Please check your connection',
    'auth/popup-closed-by-user': 'Sign-in popup was closed',
    'auth/cancelled-popup-request': 'Sign-in was cancelled',
  };

  return errorMessages[error.code] || error.message || 'An authentication error occurred';
}

/**
 * Format Firebase database errors into user-friendly messages
 * @param {Error} error - The error object
 * @returns {string} User-friendly error message
 */
export function formatDatabaseError(error) {
  if (!error || !error.code) {
    return error?.message || 'A database error occurred';
  }

  const errorMessages = {
    'permission-denied': 'You do not have permission to perform this action',
    'unavailable': 'Service temporarily unavailable. Please try again',
    'network-error': 'Network error. Please check your connection',
  };

  return errorMessages[error.code] || error.message || 'A database error occurred';
}

/**
 * Format general errors into user-friendly messages
 * @param {Error|string} error - The error object or message
 * @returns {string} User-friendly error message
 */
export function formatError(error) {
  if (typeof error === 'string') {
    return error;
  }

  if (!error) {
    return 'An unexpected error occurred';
  }

  // Check if it's a Firebase auth error
  if (error.code && error.code.startsWith('auth/')) {
    return formatAuthError(error);
  }

  // Check if it's a Firebase database error
  if (error.code && (error.code === 'permission-denied' || error.code === 'unavailable')) {
    return formatDatabaseError(error);
  }

  return error.message || 'An unexpected error occurred';
}

/**
 * Log error in development, silently fail in production
 * @param {Error|string} error - The error to log
 * @param {string} context - Context where the error occurred
 */
export function logError(error, context = '') {
  if (import.meta.env.MODE === 'development' || import.meta.env.DEV) {
    const message = typeof error === 'string' ? error : error?.message || 'Unknown error';
    const prefix = context ? `[${context}]` : '';
    // eslint-disable-next-line no-console
    console.error(`${prefix} ${message}`, error);
  }
  // In production, errors are silently logged or sent to error tracking service
}

/**
 * Handle async operation with standardized error handling
 * @param {Function} asyncFn - Async function to execute
 * @param {Object} options - Options for error handling
 * @param {Function} options.onError - Callback for error handling
 * @param {string} options.context - Context for error logging
 * @param {boolean} options.rethrow - Whether to rethrow the error
 * @returns {Promise} Promise that resolves with result or rejects with formatted error
 */
export async function handleAsyncError(asyncFn, options = {}) {
  const { onError, context, rethrow = false } = options;

  try {
    return await asyncFn();
  } catch (error) {
    const formattedError = formatError(error);
    logError(error, context);

    if (onError) {
      onError(formattedError, error);
    }

    if (rethrow) {
      throw new Error(formattedError);
    }

    return null;
  }
}

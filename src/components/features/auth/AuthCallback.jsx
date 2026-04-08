import React, { useState, useEffect, useRef } from 'react';
import Icon from '../../ui/Icon';
import { getAuthCallbackContext } from '../../../utils/auth';

function isRlsError(error) {
  if (!error) return false;
  const message = typeof error.message === 'string' ? error.message.toLowerCase() : '';
  return error.code === '42501' || message.includes('row-level security');
}

function isDuplicateKeyError(error) {
  if (!error) return false;
  const message = typeof error.message === 'string' ? error.message.toLowerCase() : '';
  return error.code === '23505' || message.includes('duplicate key value');
}

function logClaimedAtWarning(Logger, error, context) {
  if (Logger?.warn) {
    Logger.warn(context, error);
    return;
  }

  if (Logger?.error) {
    Logger.error(error, context);
  }
}

/**
 * AuthCallback - Handles auth callback URLs (email confirmation, password reset, etc.)
 *
 * Features:
 * - Processes auth callbacks from Supabase
 * - Handles email confirmation, password reset, magic links, invites
 * - Password reset form with validation
 * - Success/error states with appropriate messaging
 *
 * @param {string} type - Callback type: 'signup', 'recovery', 'magiclink', 'invite'
 * @param {function} onContinue - Callback to continue to app/login
 * @param {function} onAuthChange - Callback when auth state changes
 * @param {object} supabase - Supabase client instance
 * @param {function} initSupabase - Function to initialize Supabase
 * @param {object} Logger - Logger object with error method
 * @param {object} config - App configuration (LOGO_URL, ORG_NAME)
 */
const AuthCallback = ({
  type,
  onContinue,
  onAuthChange,
  supabase,
  initSupabase,
  Logger,
  initialError = '',
  config = {}
}) => {
  const [status, setStatus] = useState('processing'); // 'processing', 'success', 'error', 'reset-password'
  const [error, setError] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [client, setClient] = useState(supabase || null);

  // Store onAuthChange in a ref to avoid stale closures and dependency issues
  const onAuthChangeRef = useRef(onAuthChange);
  onAuthChangeRef.current = onAuthChange;

  useEffect(() => {
    if (supabase) {
      setClient(supabase);
    }
  }, [supabase]);

  useEffect(() => {
    async function handleCallback() {
      try {
        const callbackContext = getAuthCallbackContext();
        const callbackError = initialError || callbackContext?.error || '';
        const callbackType = type || callbackContext?.type || 'magiclink';

        if (callbackError) {
          setError(callbackError);
          setStatus('error');
          return;
        }

        const activeSupabase = supabase || (initSupabase ? await initSupabase() : null);

        if (!activeSupabase) {
          setError('Unable to connect to authentication service.');
          setStatus('error');
          return;
        }

        setClient(activeSupabase);

        // Get the session from URL (Supabase handles the token exchange)
        const { data: { session }, error: sessionError } = await activeSupabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (callbackType === 'recovery') {
          if (!session) {
            setError('This password reset link is invalid or has expired.');
            setStatus('error');
            return;
          }

          // Password reset - show password form
          setStatus('reset-password');
          return;
        }

        if (session) {
          // Email confirmed or magic link - user is now signed in
          // Mark user as active by setting claimed_at
          if (session.user?.email) {
            const email = session.user.email.toLowerCase();
            const claimedAt = new Date().toISOString();

            try {
              const { data, error: selectError } = await activeSupabase
                .from('user_profiles')
                .select('email, claimed_at')
                .eq('email', email)
                .maybeSingle();

              if (selectError) {
                if (isRlsError(selectError)) {
                  logClaimedAtWarning(Logger, selectError, `RLS blocked user_profiles lookup during auth callback for ${email}`);
                } else if (Logger?.error) {
                  Logger.error(selectError, `Failed to load user profile during auth callback for ${email}`);
                }
              } else if (!data) {
                const { error: insertError } = await activeSupabase
                  .from('user_profiles')
                  .insert({ email, claimed_at: claimedAt });

                if (insertError) {
                  if (isDuplicateKeyError(insertError)) {
                    const { error: updateAfterInsertError } = await activeSupabase
                      .from('user_profiles')
                      .update({ claimed_at: claimedAt })
                      .eq('email', email)
                      .is('claimed_at', null);

                    if (updateAfterInsertError) {
                      if (isRlsError(updateAfterInsertError)) {
                        logClaimedAtWarning(Logger, updateAfterInsertError, `RLS blocked claimed_at update during auth callback for ${email}`);
                      } else if (Logger?.error) {
                        Logger.error(updateAfterInsertError, `Failed to set claimed_at during auth callback for ${email}`);
                      }
                    }
                  } else if (isRlsError(insertError)) {
                    logClaimedAtWarning(Logger, insertError, `RLS blocked user_profiles insert during auth callback for ${email}`);
                  } else if (Logger?.error) {
                    Logger.error(insertError, `Failed to create missing user profile during auth callback for ${email}`);
                  }
                }
              } else if (!data.claimed_at) {
                const { error: updateError } = await activeSupabase
                  .from('user_profiles')
                  .update({ claimed_at: claimedAt })
                  .eq('email', email)
                  .is('claimed_at', null);

                if (updateError) {
                  if (isRlsError(updateError)) {
                    logClaimedAtWarning(Logger, updateError, `RLS blocked claimed_at update during auth callback for ${email}`);
                  } else if (Logger?.error) {
                    Logger.error(updateError, `Failed to set claimed_at during auth callback for ${email}`);
                  }
                }
              }
            } catch (e) {
              if (Logger?.error) {
                Logger.error(e, `Unexpected claimed_at handling failure during auth callback for ${email}`);
              }
            }
          }
          setStatus('success');
          if (onAuthChangeRef.current) {
            onAuthChangeRef.current(session.user);
          }
        } else {
          // No session but also no error - might be already confirmed
          setStatus('success');
        }
      } catch (err) {
        if (Logger) Logger.error(err, 'Auth callback error');
        setError(err.message || 'Authentication failed. Please try again.');
        setStatus('error');
      }
    }

    handleCallback();
  }, [type, supabase, initSupabase, Logger, initialError]);

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (!client) {
        throw new Error('Unable to connect to authentication service.');
      }

      const { error } = await client.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      setStatus('success');
    } catch (err) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'signup': return 'Email Confirmed';
      case 'recovery': return status === 'success' ? 'Password Updated' : 'Reset Password';
      case 'magiclink': return 'Signed In';
      case 'invite': return 'Invitation Accepted';
      default: return 'Authentication Complete';
    }
  };

  const getMessage = () => {
    switch (type) {
      case 'signup': return 'Your email has been confirmed. You can now access Momentum Hub.';
      case 'recovery': return 'Your password has been updated successfully.';
      case 'magiclink': return 'You have been signed in successfully.';
      case 'invite': return 'Welcome! Your account is now active.';
      default: return 'Authentication successful.';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#cfebf8' }}>
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md border border-graystone-200">
        <div className="text-center mb-6">
          {config.LOGO_URL && (
            <img
              src={config.LOGO_URL}
              alt={config.ORG_NAME || 'Organization'}
              className="h-12 mx-auto mb-3"
            />
          )}
          <h1 className="text-2xl font-bold text-ocean-900 uppercase tracking-tight">Momentum Hub</h1>
        </div>

        {status === 'processing' && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ocean-500 mx-auto mb-4"></div>
            <p className="text-graystone-600">Processing...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="check" className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-ocean-900 mb-2 uppercase">{getTitle()}</h2>
            <p className="text-graystone-600 mb-6">{getMessage()}</p>
            <button
              onClick={onContinue}
              className="w-full bg-ocean-500 text-white py-3 rounded-xl font-semibold hover:bg-ocean-600 transition"
            >
              Go to Dashboard
            </button>
          </div>
        )}

        {status === 'reset-password' && (
          <div>
            <h2 className="text-xl font-bold text-ocean-900 mb-2 uppercase text-center">Set New Password</h2>
            <p className="text-graystone-600 mb-6 text-center text-sm">Enter your new password below.</p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-graystone-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-graystone-300 rounded-xl focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 outline-none transition"
                  placeholder="********"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                {newPassword && newPassword.length < 8 && (
                  <p className="text-red-600 text-xs mt-1">Password must be at least 8 characters</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-graystone-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className={`w-full px-4 py-3 border border-graystone-300 rounded-xl focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 outline-none transition ${confirmNewPassword && newPassword !== confirmNewPassword ? 'border-red-300' : ''}`}
                  placeholder="********"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                {confirmNewPassword && newPassword !== confirmNewPassword && (
                  <p className="text-red-600 text-xs mt-1">Passwords do not match</p>
                )}
              </div>
              <button
                type="submit"
                disabled={loading || newPassword.length < 8 || newPassword !== confirmNewPassword}
                className="w-full bg-ocean-500 text-white py-3 rounded-xl font-semibold hover:bg-ocean-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="x" className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-ocean-900 mb-2 uppercase">Something Went Wrong</h2>
            <p className="text-graystone-600 mb-2">{error || 'Authentication failed.'}</p>
            <p className="text-graystone-500 text-sm mb-6">The link may have expired. Please try again.</p>
            <button
              onClick={onContinue}
              className="w-full bg-ocean-500 text-white py-3 rounded-xl font-semibold hover:bg-ocean-600 transition"
            >
              Go to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;

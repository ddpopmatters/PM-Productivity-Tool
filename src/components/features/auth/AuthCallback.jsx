import React, { useState, useEffect, useRef } from 'react';
import Icon from '../../ui/Icon';

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
  config = {}
}) => {
  const [status, setStatus] = useState('processing'); // 'processing', 'success', 'error', 'reset-password'
  const [error, setError] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Store onAuthChange in a ref to avoid stale closures and dependency issues
  const onAuthChangeRef = useRef(onAuthChange);
  onAuthChangeRef.current = onAuthChange;

  useEffect(() => {
    async function handleCallback() {
      try {
        if (initSupabase) {
          await initSupabase();
        }
        if (!supabase) {
          setError('Unable to connect to authentication service.');
          setStatus('error');
          return;
        }

        // Get the session from URL (Supabase handles the token exchange)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (type === 'recovery') {
          // Password reset - show password form
          setStatus('reset-password');
        } else if (session) {
          // Email confirmed or magic link - user is now signed in
          // Mark user as active by setting claimed_at
          if (supabase && session.user?.email) {
            try {
              const email = session.user.email.toLowerCase();
              const { data } = await supabase
                .from('user_profiles')
                .select('claimed_at')
                .eq('email', email)
                .single();
              if (data && !data.claimed_at) {
                await supabase
                  .from('user_profiles')
                  .update({ claimed_at: new Date().toISOString() })
                  .eq('email', email);
              }
            } catch (e) {
              // Non-critical — don't block callback flow
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
  }, [type, supabase, initSupabase, Logger]);

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
      const { error } = await supabase.auth.updateUser({
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

import React, { useState, useEffect } from 'react';

/**
 * LoginScreen - Authentication screen with sign in, sign up, and password reset
 *
 * Features:
 * - Sign in with email/password
 * - Sign up with email confirmation
 * - Password reset via email
 * - Loading states and error handling
 * - Form validation
 *
 * @param {function} onAuthChange - Callback when auth state changes (not currently used, handled by listener)
 * @param {object} supabase - Supabase client instance
 * @param {function} initSupabase - Function to initialize Supabase, returns promise resolving to boolean
 * @param {object} Validators - Validators object with isValidEmail method
 * @param {object} Logger - Logger object with error method
 * @param {boolean} authEnabled - Whether authentication is enabled (APP_CONFIG.AUTH_ENABLED)
 */
const LoginScreen = ({
  onAuthChange,
  supabase,
  initSupabase,
  Validators,
  Logger,
  authEnabled = true
}) => {
  const [mode, setMode] = useState('signin'); // 'signin', 'signup', 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [supabaseReady, setSupabaseReady] = useState(false);

  useEffect(() => {
    if (initSupabase) {
      initSupabase().then((ready) => setSupabaseReady(ready));
    }
  }, [initSupabase]);

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!supabase) return;

    if (Validators && !Validators.isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (error) throw error;
      // Auth state change listener will handle the rest
    } catch (err) {
      if (Logger) Logger.error(err, 'Sign in error');
      setError(err.message || 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!supabase) return;

    if (Validators && !Validators.isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (error) throw error;

      if (data.user && !data.session) {
        // Email confirmation required
        setSuccess('Check your email to confirm your account.');
        setMode('signin');
      }
      // If session exists, auth state listener handles it
    } catch (err) {
      if (Logger) Logger.error(err, 'Sign up error');
      setError(err.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: window.location.origin }
      );

      if (error) throw error;
      setSuccess('Check your email for password reset instructions.');
    } catch (err) {
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#cfebf8' }}>
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-ocean-900 mb-2">Momentum Hub</h1>
          <p className="text-graystone-600">
            {mode === 'signin' ? 'Sign in to your account' :
             mode === 'signup' ? 'Create your account' :
             'Reset your password'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {success}
          </div>
        )}

        {/* Password Reset Form */}
        {mode === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-graystone-700 mb-1 required-indicator">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-graystone-300 rounded-xl focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 outline-none transition"
                placeholder="you@example.com"
                required
                aria-required="true"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !supabaseReady}
              className="w-full bg-ocean-500 text-white py-3 rounded-xl font-semibold hover:bg-ocean-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => { setMode('signin'); setError(''); setSuccess(''); }}
                className="text-sm text-ocean-600 hover:underline"
              >
                Back to sign in
              </button>
            </div>
          </form>
        )}

        {/* Sign In Form */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-graystone-700 mb-1 required-indicator">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-graystone-300 rounded-xl focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 outline-none transition"
                placeholder="you@example.com"
                required
                aria-required="true"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-graystone-700 mb-1 required-indicator">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-graystone-300 rounded-xl focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 outline-none transition"
                placeholder="********"
                required
                aria-required="true"
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !supabaseReady}
              className="w-full bg-ocean-500 text-white py-3 rounded-xl font-semibold hover:bg-ocean-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => { setMode('reset'); setError(''); setSuccess(''); }}
                className="text-sm text-ocean-600 hover:underline"
              >
                Forgot password?
              </button>
            </div>
          </form>
        )}

        {/* Sign Up Form */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-graystone-700 mb-1 required-indicator">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-graystone-300 rounded-xl focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 outline-none transition"
                placeholder="you@example.com"
                required
                aria-required="true"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-graystone-700 mb-1 required-indicator">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-graystone-300 rounded-xl focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 outline-none transition"
                placeholder="********"
                required
                aria-required="true"
                minLength={8}
                autoComplete="new-password"
              />
              {password && password.length < 8 && (
                <p className="validation-message validation-error">Password must be at least 8 characters</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-graystone-700 mb-1 required-indicator">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-4 py-3 border border-graystone-300 rounded-xl focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 outline-none transition ${confirmPassword && password !== confirmPassword ? 'input-error' : ''}`}
                placeholder="********"
                required
                aria-required="true"
                minLength={8}
                autoComplete="new-password"
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="validation-message validation-error">Passwords do not match</p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !supabaseReady}
              className="w-full bg-ocean-500 text-white py-3 rounded-xl font-semibold hover:bg-ocean-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Please wait...' : 'Create Account'}
            </button>
          </form>
        )}

        {(mode === 'signin' || mode === 'signup') && (
          <div className="mt-6 text-center">
            {mode === 'signin' ? (
              <p className="text-sm text-graystone-600">
                Don't have an account?{' '}
                <button
                  onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}
                  className="text-ocean-600 font-semibold hover:underline"
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p className="text-sm text-graystone-600">
                Already have an account?{' '}
                <button
                  onClick={() => { setMode('signin'); setError(''); setSuccess(''); }}
                  className="text-ocean-600 font-semibold hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        )}

        {!supabaseReady && authEnabled && (
          <div className="mt-4 text-center text-sm text-amber-600">
            Loading authentication...
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginScreen;

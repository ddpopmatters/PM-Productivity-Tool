import React, { useState, useEffect } from 'react';
import { initSupabase } from './api/supabase';
import { APP_CONFIG } from './utils/config';
import { Logger } from './utils/logger';

// Temporary App component during migration
// This will be replaced with the full app as components are migrated
function App() {
  const [status, setStatus] = useState('initializing');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const supabase = await initSupabase();
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setUser(session.user);
          }
          setStatus('ready');
        } else {
          setStatus('no-supabase');
        }
      } catch (error) {
        Logger.error(error, 'App initialization');
        setStatus('error');
      }
    };
    init();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-ocean-50 to-aqua-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <h1 className="text-3xl font-heading text-ocean-900 mb-4">
          {APP_CONFIG.ORG_NAME}
        </h1>
        <h2 className="text-xl text-ocean-700 mb-6">Momentum Hub</h2>

        {status === 'initializing' && (
          <div className="text-graystone-600">
            <div className="animate-spin w-8 h-8 border-4 border-ocean-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            Initializing...
          </div>
        )}

        {status === 'ready' && (
          <div className="text-green-600">
            <div className="text-4xl mb-4">✓</div>
            <p className="font-medium">Vite build working!</p>
            {user && <p className="text-sm text-graystone-600 mt-2">Logged in as: {user.email}</p>}
            <p className="text-sm text-graystone-500 mt-4">
              Migration in progress. Full app coming soon.
            </p>
          </div>
        )}

        {status === 'no-supabase' && (
          <div className="text-yellow-600">
            <p>Supabase not configured</p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-red-600">
            <p>Initialization error</p>
          </div>
        )}

        <a
          href={`${import.meta.env.BASE_URL}legacy.html`}
          className="inline-block mt-6 px-6 py-3 bg-ocean-500 text-white rounded-lg hover:bg-ocean-600 transition"
        >
          Go to Current App
        </a>
      </div>
    </div>
  );
}

export default App;

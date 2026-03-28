import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from './contexts';
import App from './App';
import './index.css';

// React.StrictMode is intentionally omitted. Supabase's gotrue-js uses the
// Navigator Locks API to serialise auth operations. Strict Mode's double-effect
// invocation creates two concurrent lock acquisitions, causing a 5-second stall
// on every page load. This is a known gotrue-js + Strict Mode incompatibility.
ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter basename="/PM-Productivity-Tool/">
    <AppProvider>
      <App />
    </AppProvider>
  </BrowserRouter>
);

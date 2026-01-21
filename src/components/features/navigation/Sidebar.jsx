import React from 'react';
import clsx from 'clsx';
import Icon from '../../ui/Icon';

/**
 * Sidebar - Main navigation sidebar component
 *
 * Features:
 * - Mobile-responsive with overlay
 * - Navigation menu items with role-based visibility
 * - Admin console (admin only)
 * - Add new item button
 * - User profile section with initials avatar
 * - Dark mode toggle
 * - Sign out button
 *
 * @param {string} currentView - Currently active view ID
 * @param {function} onNavigate - Navigation callback (viewId) => void
 * @param {string} currentUser - Current user's display name
 * @param {string} userEmail - Current user's email
 * @param {function} onSignOut - Sign out callback
 * @param {boolean} darkMode - Dark mode state
 * @param {function} setDarkMode - Dark mode toggle callback
 * @param {boolean} isOpen - Mobile sidebar open state
 * @param {function} onClose - Close sidebar callback (mobile)
 * @param {function} isAdmin - Function to check if user is admin
 * @param {function} isManager - Function to check if user is manager
 * @param {object} config - App configuration (LOGO_URL, ORG_NAME, AUTH_ENABLED)
 */
const Sidebar = ({
  currentView,
  onNavigate,
  currentUser,
  userEmail,
  onSignOut,
  darkMode,
  setDarkMode,
  isOpen,
  onClose,
  isAdmin,
  isManager,
  config = {}
}) => {
  const userIsAdmin = isAdmin ? isAdmin(userEmail) : false;
  const userIsManager = isManager ? isManager(userEmail) : false;

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
    { id: 'personal', label: 'Your Projects', icon: 'folder' },
    { id: 'jobs', label: 'Jobs', icon: 'clipboard-list' },
    { id: 'workstreams', label: 'Workstreams', icon: 'layers' },
    // Manager Hub only visible to managers and admins
    ...(userIsManager || userIsAdmin ? [{ id: 'manager-hub', label: 'Manager Hub', icon: 'briefcase' }] : []),
    { id: 'todo', label: 'To-Do List', icon: 'check-square' },
    { id: 'whiteboards', label: 'Whiteboards', icon: 'layout' },
    { id: 'productivity-tools', label: 'Productivity Tools', icon: 'wrench' }
  ];

  const handleNavigation = (id) => {
    onNavigate(id);
    if (onClose) onClose(); // Close sidebar on mobile after navigation
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div className={clsx(
        "w-64 bg-white flex flex-col h-screen fixed left-0 top-0 z-50 border-r border-ocean-100 shadow-sm transition-transform duration-300 ease-in-out",
        "lg:translate-x-0 lg:z-10",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo/Header */}
        <div className="p-6 border-b border-ocean-100">
          {config.LOGO_URL && (
            <img
              src={config.LOGO_URL}
              alt={config.ORG_NAME || 'Organization'}
              className="h-10 mb-4"
            />
          )}
          <h1 className="text-2xl text-ocean-900">{(currentUser || 'User').split(' ')[0]}'s Project Hub</h1>
          <p className="text-xs text-ocean-600 mt-1">Workflow Management</p>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto" role="navigation" aria-label="Main navigation">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.id)}
              aria-current={currentView === item.id ? 'page' : undefined}
              className={clsx(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all group",
                currentView === item.id
                  ? "bg-ocean-500 text-white shadow-lg"
                  : "text-ocean-900 hover:bg-ocean-50"
              )}
            >
              <div className="relative flex items-center justify-center">
                {/* Hover Circle - Behind Icon */}
                <div
                  className={clsx(
                    "absolute w-10 h-10 rounded-full transition-all duration-300",
                    currentView === item.id
                      ? "scale-0 opacity-0"
                      : "scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100"
                  )}
                  style={{ backgroundColor: '#0CFFFF' }}
                ></div>

                <Icon name={item.icon} className="w-5 h-5 relative z-10" />
              </div>
              <span className="font-heading text-sm tracking-wide">{item.label}</span>
            </button>
          ))}

          {/* Admin Console - Only visible to admin */}
          {userIsAdmin && (
            <button
              onClick={() => handleNavigation('admin')}
              aria-current={currentView === 'admin' ? 'page' : undefined}
              className={clsx(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all group mt-4 border-t border-ocean-100 pt-4",
                currentView === 'admin'
                  ? "bg-amber-500 text-white shadow-lg"
                  : "text-amber-700 hover:bg-amber-50 bg-amber-50/50"
              )}
            >
              <div className="relative flex items-center justify-center">
                <Icon name="shield" className="w-5 h-5 relative z-10" />
              </div>
              <span className="font-heading text-sm tracking-wide">Admin Console</span>
            </button>
          )}
        </nav>

        {/* Add New Item - Special Button */}
        <div className="p-4 border-t border-ocean-100">
          <button
            onClick={() => handleNavigation('add-item')}
            className={clsx(
              "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-left transition-all font-semibold",
              currentView === 'add-item'
                ? "bg-ocean-600 text-white shadow-lg"
                : "bg-ocean-500 text-white hover:bg-ocean-600 shadow-md"
            )}
          >
            <Icon name="plus-circle" className="w-5 h-5" />
            <span className="font-heading text-sm tracking-wide">Add New Item</span>
          </button>
        </div>

        {/* User Profile Section */}
        <div className="p-4 border-t border-ocean-100">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-ocean-50">
            <div className="w-10 h-10 rounded-full bg-ocean-500 flex items-center justify-center text-white font-bold">
              {(currentUser || 'U').split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-ocean-900 truncate">{currentUser}</div>
              <div className="text-xs text-ocean-600">{userIsAdmin ? 'Administrator' : userIsManager ? 'Manager' : 'Team Member'}</div>
            </div>
          </div>

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-full mt-2 flex items-center justify-between px-4 py-2 text-sm text-graystone-600 hover:bg-graystone-100 rounded-lg transition"
          >
            <div className="flex items-center gap-2">
              <Icon name={darkMode ? "sun" : "moon"} className="w-4 h-4" />
              <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </div>
            <div className={clsx(
              "w-10 h-5 rounded-full transition-colors relative",
              darkMode ? "bg-ocean-500" : "bg-graystone-300"
            )}>
              <div className={clsx(
                "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                darkMode ? "translate-x-5" : "translate-x-0.5"
              )}></div>
            </div>
          </button>

          {/* Sign Out Button - Only when auth is enabled */}
          {config.AUTH_ENABLED && onSignOut && (
            <button
              onClick={onSignOut}
              className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 text-sm text-graystone-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <Icon name="log-out" className="w-4 h-4" />
              Sign Out
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;

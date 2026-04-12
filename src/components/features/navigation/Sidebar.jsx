import React, { useState } from 'react';
import clsx from 'clsx';
import { Globe, GitBranch } from 'lucide-react';
import Icon from '../../ui/Icon';

/**
 * Sidebar - Main navigation sidebar component
 *
 * @param {string} currentView - Currently active view ID
 * @param {function} onNavigate - Navigation callback (viewId) => void
 * @param {string} currentUser - Current user's display name
 * @param {string} userEmail - Current user's email
 * @param {function} onSignOut - Sign out callback
 * @param {boolean} isOpen - Mobile sidebar open state
 * @param {function} onClose - Close sidebar callback (mobile)
 * @param {function} isAdmin - Function to check if user is admin
 * @param {function} isManager - Function to check if user is manager
 * @param {object} config - App configuration (LOGO_URL, ORG_NAME, AUTH_ENABLED)
 * @param {function} onAddNewItem - Callback to open add new item modal
 */
const Sidebar = ({
  currentView,
  onNavigate,
  currentUser,
  userEmail,
  onSignOut,
  isOpen,
  onClose,
  isAdmin,
  isManager,
  config = {},
  onAddNewItem
}) => {
  const userIsAdmin = isAdmin ? isAdmin(userEmail) : false;
  const userIsManager = isManager ? isManager(userEmail) : false;
  const customIcons = { GitBranch };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
    { id: 'personal', label: 'Your Projects', icon: 'folder' },
    { id: 'jobs', label: 'Tasks', icon: 'clipboard-list' },
    { id: 'workstreams', label: 'Workstreams', icon: 'layers' },
    { id: 'website', label: 'Website', icon: Globe },
    { id: 'braindump-inbox', label: 'Brain Dump Inbox', icon: 'inbox' },
    ...(userIsManager || userIsAdmin ? [{ id: 'manager-hub', label: 'Manager Hub', icon: 'briefcase' }] : []),
    { id: 'todo', label: 'My Planner', icon: 'calendar' },
    { id: 'pages', label: 'Pages', icon: 'layout' },
    { id: 'events-calendar', label: 'Calendar', icon: 'calendar-days' },
    { id: 'whiteboards', label: 'Whiteboards', icon: 'presentation' },
    { id: 'mindmaps', label: 'Mindmaps', icon: 'GitBranch' },
    { id: 'productivity-tools', label: 'Productivity Tools', icon: 'wrench' },
  ];

  const handleNavigation = (id) => {
    onNavigate(id);
    if (onClose) onClose();
  };

  const initials = (currentUser || 'U').split(' ').map(n => n[0]).join('').slice(0, 2);

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
        "w-64 bg-ocean-800 flex flex-col h-screen fixed left-0 top-0 z-50 transition-transform duration-300 ease-in-out",
        "lg:translate-x-0 lg:z-10",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo area — white inset box */}
        <div className="bg-white border-b border-graystone-200 px-6 py-4">
          {config.LOGO_URL ? (
            <img
              src={config.LOGO_URL}
              alt={config.ORG_NAME || 'Organization'}
              className="h-8"
            />
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-ocean-600 rounded-lg flex items-center justify-center">
                <Icon name="zap" className="w-4 h-4 text-white" />
              </div>
              <span className="text-base font-semibold text-ocean-900">Momentum Hub</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5" role="navigation" aria-label="Main navigation">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.id)}
              aria-current={currentView === item.id ? 'page' : undefined}
              className={clsx(
                "w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                currentView === item.id
                  ? "bg-white rounded-l-xl text-ocean-900 font-medium"
                  : "text-ocean-200 hover:bg-ocean-700 hover:text-white rounded-xl"
              )}
            >
              {typeof item.icon === 'string' && customIcons[item.icon] ? (
                React.createElement(customIcons[item.icon], { className: 'w-4 h-4 flex-shrink-0' })
              ) : typeof item.icon === 'string' ? (
                <Icon name={item.icon} className="w-4 h-4 flex-shrink-0" />
              ) : (
                <item.icon className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{item.label}</span>
            </button>
          ))}

          {/* Admin Console */}
          {userIsAdmin && (
            <button
              onClick={() => handleNavigation('admin')}
              aria-current={currentView === 'admin' ? 'page' : undefined}
              className={clsx(
                "w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors mt-2",
                currentView === 'admin'
                  ? "bg-white rounded-l-xl text-ocean-900 font-medium"
                  : "text-ocean-200 hover:bg-ocean-700 hover:text-white rounded-xl"
              )}
            >
              <Icon name="shield" className="w-4 h-4 flex-shrink-0" />
              <span>Admin Console</span>
            </button>
          )}
        </nav>

        {/* CTA */}
        <div className="px-3 pb-3">
          <button
            onClick={() => {
              if (onAddNewItem) {
                onAddNewItem();
                if (onClose) onClose();
              } else {
                handleNavigation('add-item');
              }
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-ocean-500 text-white hover:bg-ocean-400 shadow-md transition-colors"
          >
            <Icon name="plus-circle" className="w-4 h-4" />
            Add New Item
          </button>
        </div>

        {/* User area */}
        <div className="border-t border-ocean-700 p-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-ocean-700">
            <div className="w-8 h-8 rounded-full bg-ocean-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{currentUser}</div>
              <div className="text-xs text-ocean-300">{userIsAdmin ? 'Administrator' : userIsManager ? 'Manager' : 'Team Member'}</div>
            </div>
          </div>

          {config.AUTH_ENABLED && onSignOut && (
            <button
              onClick={onSignOut}
              className="w-full mt-2 text-sm text-ocean-400 hover:text-white transition-colors text-center py-1"
            >
              Sign out
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;

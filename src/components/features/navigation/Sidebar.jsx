import React, { useState } from 'react';
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
 * @param {function} onAddNewItem - Callback to open add new item modal
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
  config = {},
  onAddNewItem
}) => {
  const userIsAdmin = isAdmin ? isAdmin(userEmail) : false;
  const userIsManager = isManager ? isManager(userEmail) : false;

  // Dashboard is standalone at top
  const dashboardItem = { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' };

  const menuSections = [
    {
      title: 'YOUR WORK',
      items: [
        { id: 'personal', label: 'Your Projects', icon: 'folder', description: 'Bigger work that moves through stages' },
        { id: 'jobs', label: 'Tasks', icon: 'clipboard-list', description: 'Simple items to tick off' },
        { id: 'workstreams', label: 'Workstreams', icon: 'layers', description: 'Requests that come in from others' },
        ...(userIsManager || userIsAdmin ? [{ id: 'manager-hub', label: 'Manager Hub', icon: 'briefcase' }] : []),
      ]
    },
    {
      title: 'TOOLS',
      items: [
        { id: 'whiteboards', label: 'Whiteboards', icon: 'layout' },
        { id: 'productivity-tools', label: 'Productivity Tools', icon: 'wrench' },
      ]
    }
  ];

  // Track which menu item is being hovered
  const [hoveredItem, setHoveredItem] = useState(null);

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
          {config.LOGO_URL ? (
            <img
              src={config.LOGO_URL}
              alt={config.ORG_NAME || 'Organization'}
              className="h-10 mb-4"
            />
          ) : (
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-ocean-500 to-ocean-600 rounded-xl flex items-center justify-center shadow-lg">
                <Icon name="zap" className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-ocean-900 leading-tight">Momentum</h2>
                <p className="text-xs text-ocean-500 font-medium -mt-0.5">Hub</p>
              </div>
            </div>
          )}
          <h1 className="text-lg text-ocean-900 font-medium">{(currentUser || 'User').split(' ')[0]}'s Workspace</h1>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-4 overflow-y-auto" role="navigation" aria-label="Main navigation">
          {/* Dashboard - Standalone at top */}
          <button
            onClick={() => handleNavigation(dashboardItem.id)}
            aria-current={currentView === dashboardItem.id ? 'page' : undefined}
            className={clsx(
              "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all group",
              currentView === dashboardItem.id
                ? "bg-ocean-500 text-white shadow-lg"
                : "text-ocean-900 hover:bg-ocean-50"
            )}
          >
            <div className="relative w-5 h-5 flex-shrink-0">
              <div
                className={clsx(
                  "absolute -inset-2 rounded-full transition-all duration-300",
                  currentView === dashboardItem.id
                    ? "scale-0 opacity-0"
                    : "scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100"
                )}
                style={{ backgroundColor: '#0CFFFF' }}
              />
              <Icon
                name={dashboardItem.icon}
                className={clsx(
                  "w-5 h-5 relative z-10 transition-colors duration-300",
                  currentView === dashboardItem.id
                    ? "text-white"
                    : "text-ocean-900 group-hover:text-white"
                )}
                style={{ color: currentView === dashboardItem.id ? 'white' : '#11607d' }}
              />
            </div>
            <span className="font-heading text-sm tracking-wide">{dashboardItem.label}</span>
          </button>

          {/* Sectioned menu items */}
          {menuSections.map((section, sectionIdx) => (
            <div key={section.title}>
              {/* Section Header */}
              <h3 className="px-4 mb-2 text-[10px] font-bold text-graystone-400 tracking-wider uppercase">
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.items.map(item => (
                  <div
                    key={item.id}
                    onMouseEnter={() => item.description && setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <button
                      onClick={() => handleNavigation(item.id)}
                      aria-current={currentView === item.id ? 'page' : undefined}
                      className={clsx(
                        "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all group",
                        currentView === item.id
                          ? "bg-ocean-500 text-white shadow-lg"
                          : "text-ocean-900 hover:bg-ocean-50"
                      )}
                    >
                      <div className="relative w-5 h-5 flex-shrink-0">
                        <div
                          className={clsx(
                            "absolute -inset-2 rounded-full transition-all duration-300",
                            currentView === item.id
                              ? "scale-0 opacity-0"
                              : "scale-0 opacity-0 group-hover:scale-100 group-hover:opacity-100"
                          )}
                          style={{ backgroundColor: '#0CFFFF' }}
                        />
                        <Icon
                          name={item.icon}
                          className={clsx(
                            "w-5 h-5 relative z-10 transition-colors duration-300",
                            currentView === item.id
                              ? "text-white"
                              : "text-ocean-900 group-hover:text-white"
                          )}
                          style={{ color: currentView === item.id ? 'white' : '#11607d' }}
                        />
                      </div>
                      <span className="font-heading text-sm tracking-wide">{item.label}</span>
                    </button>
                    {/* Accordion description on hover */}
                    {item.description && (
                      <div
                        className={clsx(
                          "overflow-hidden transition-all duration-300 ease-in-out",
                          hoveredItem === item.id ? "max-h-16 opacity-100" : "max-h-0 opacity-0"
                        )}
                      >
                        <p className="px-4 py-2 ml-8 text-xs text-ocean-600 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Admin Console - Only visible to admin */}
          {userIsAdmin && (
            <div className="pt-2 border-t border-ocean-100">
              <h3 className="px-4 mb-2 text-[10px] font-bold text-ocean-500 tracking-wider uppercase">
                ADMIN
              </h3>
              <button
                onClick={() => handleNavigation('admin')}
                aria-current={currentView === 'admin' ? 'page' : undefined}
                className={clsx(
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all group",
                  currentView === 'admin'
                    ? "bg-ocean-500 text-white shadow-lg"
                    : "text-ocean-700 hover:bg-ocean-50"
                )}
              >
                <div className="relative flex items-center justify-center">
                  <Icon name="shield" className="w-5 h-5 relative z-10" />
                </div>
                <span className="font-heading text-sm tracking-wide">Admin Console</span>
              </button>
            </div>
          )}
        </nav>

        {/* Action Buttons */}
        <div className="p-4 border-t border-ocean-100 space-y-2">
          <button
            onClick={() => {
              handleNavigation('todo');
            }}
            className={clsx(
              "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all font-semibold shadow-md",
              currentView === 'todo'
                ? "bg-ocean-600 text-white hover:bg-ocean-700"
                : "bg-ocean-50 text-ocean-700 hover:bg-ocean-100 border border-ocean-200"
            )}
          >
            <Icon name="calendar" className="w-5 h-5" />
            <span className="font-heading text-sm tracking-wide">My Planner</span>
          </button>
          <button
            onClick={() => {
              if (onAddNewItem) {
                onAddNewItem();
                if (onClose) onClose();
              } else {
                handleNavigation('add-item');
              }
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all font-semibold bg-ocean-500 text-white hover:bg-ocean-600 shadow-md"
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

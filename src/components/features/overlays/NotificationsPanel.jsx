import React, { useEffect } from 'react';

/**
 * NotificationsPanel - Slide-in panel for displaying notifications
 *
 * @param {boolean} isOpen - Whether the panel is visible
 * @param {function} onClose - Called when the panel should close
 * @param {Array} notifications - Array of notification objects
 * @param {function} onNotificationClick - Called with notification when clicked
 */
function NotificationsPanel({ isOpen, onClose, notifications, onNotificationClick }) {
  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const getActivityIcon = (actionType) => {
    switch (actionType) {
      case 'created': return 'plus-circle';
      case 'status_changed': return 'refresh-cw';
      case 'comment_added': return 'message-circle';
      case 'subtask_added': return 'list-plus';
      case 'subtask_completed': return 'check-circle';
      case 'subtask_uncompleted': return 'circle';
      case 'description_updated': return 'edit-3';
      case 'invite_sent': return 'user-plus';
      case 'role_changed': return 'shield';
      case 'login': return 'log-in';
      default: return 'activity';
    }
  };

  const getActivityMessage = (notification) => {
    const { action_type, actor_name, target_title, details } = notification;
    const actor = actor_name || 'Someone';

    switch (action_type) {
      case 'created':
        return `${actor} created "${target_title}"`;
      case 'status_changed':
        return `${actor} moved "${target_title}" to ${details?.to_status || 'a new status'}`;
      case 'comment_added':
        return `${actor} commented on "${target_title}"`;
      case 'subtask_added':
        return `${actor} added a subtask to "${target_title}"`;
      case 'subtask_completed':
        return `${actor} completed a subtask in "${target_title}"`;
      case 'subtask_uncompleted':
        return `${actor} reopened a subtask in "${target_title}"`;
      case 'description_updated':
        return `${actor} updated the description of "${target_title}"`;
      case 'invite_sent':
        return `${actor} sent you an invitation`;
      case 'role_changed':
        return `Your role was changed to ${details?.to_role || 'a new role'}`;
      default:
        return `${actor} performed an action on "${target_title}"`;
    }
  };

  useEffect(() => {
    if (isOpen && typeof lucide !== 'undefined') {
      setTimeout(() => lucide.createIcons(), 50);
    }
  }, [isOpen, notifications]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end pt-16 pr-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notifications-panel-title"
    >
      <div
        className="fixed inset-0 bg-black/20"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-96 max-h-[calc(100vh-6rem)] overflow-hidden animate-in slide-in-from-right-5 duration-300">
        <div className="sticky top-0 bg-white border-b border-graystone-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i data-lucide="bell" className="w-5 h-5 text-ocean-600" aria-hidden="true"></i>
            <h2 id="notifications-panel-title" className="text-lg font-bold text-ocean-900">Notifications</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-graystone-100 rounded-full transition"
            aria-label="Close notifications"
          >
            <i data-lucide="x" className="w-5 h-5 text-graystone-500" aria-hidden="true"></i>
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(100vh-10rem)]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <i data-lucide="inbox" className="w-12 h-12 text-graystone-300 mx-auto mb-3"></i>
              <p className="text-graystone-500 text-sm">No notifications yet</p>
              <p className="text-graystone-400 text-xs mt-1">Activity related to your items will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-graystone-100">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => onNotificationClick?.(notification)}
                  className="p-4 hover:bg-ocean-50/50 cursor-pointer transition"
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-9 h-9 bg-ocean-100 rounded-full flex items-center justify-center">
                      <i data-lucide={getActivityIcon(notification.action_type)} className="w-4 h-4 text-ocean-600"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-ocean-900 leading-snug">
                        {getActivityMessage(notification)}
                      </p>
                      <p className="text-xs text-graystone-500 mt-1">
                        {formatTimeAgo(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <div className="sticky bottom-0 bg-white border-t border-graystone-200 p-3">
            <p className="text-xs text-center text-graystone-500">
              Showing {notifications.length} recent notifications
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default NotificationsPanel;

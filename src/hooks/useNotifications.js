import { useEffect, useState, useCallback } from 'react';
import { getSupabase } from '../api/supabase';
import { Logger } from '../utils/logger';

/**
 * useNotifications - Hook for real-time notifications
 *
 * Fetches notifications from Supabase and subscribes to real-time updates.
 * Falls back to activity log if notifications table doesn't exist.
 *
 * @param {string} userId - Current user's ID or email
 * @returns {Object} { notifications, unreadCount, markAsRead, markAllAsRead }
 */
export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications on mount and when userId changes
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !userId) return;

    let channel = null;

    const fetchNotifications = async () => {
      try {
        // Try to fetch from notifications table first
        const { data, error } = await supabase
          .from('activity_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          Logger.error({ error }, 'Failed to fetch notifications');
          return;
        }

        if (data) {
          // Transform activity log to notification format
          const transformed = data.map(item => ({
            id: item.id,
            action_type: item.action_type,
            actor_name: item.actor_name,
            target_title: item.target_title,
            target_id: item.target_id,
            details: item.details,
            created_at: item.created_at,
            read: item.read || false,
            entryId: item.target_id,
          }));
          setNotifications(transformed);
          setUnreadCount(transformed.filter(n => !n.read).length);
        }
      } catch (err) {
        Logger.error({ err }, 'Error fetching notifications');
      }
    };

    fetchNotifications();

    // Subscribe to real-time updates
    try {
      channel = supabase
        .channel('activity_log_changes')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_log',
        }, (payload) => {
          const newNotification = {
            id: payload.new.id,
            action_type: payload.new.action_type,
            actor_name: payload.new.actor_name,
            target_title: payload.new.target_title,
            target_id: payload.new.target_id,
            details: payload.new.details,
            created_at: payload.new.created_at,
            read: false,
            entryId: payload.new.target_id,
          };
          setNotifications(prev => [newNotification, ...prev].slice(0, 50));
          setUnreadCount(prev => prev + 1);
        })
        .subscribe();
    } catch (err) {
      Logger.error({ err }, 'Failed to subscribe to notifications');
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [userId]);

  // Mark a single notification as read
  const markAsRead = useCallback(async (notificationId) => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('activity_log')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        Logger.error({ error }, 'Failed to mark notification as read');
        return;
      }

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      Logger.error({ err }, 'Failed to mark notification as read');
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('activity_log')
        .update({ read: true })
        .in('id', unreadIds);

      if (error) {
        Logger.error({ error }, 'Failed to mark all notifications as read');
        return;
      }

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      Logger.error({ err }, 'Failed to mark all notifications as read');
    }
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
}

export default useNotifications;

import { useState, useCallback } from 'react';
import * as service from '../services/events';

export function useEvents() {
  const [events, setEvents] = useState([]);

  const loadEvents = useCallback(async () => {
    const data = await service.fetchEvents();
    setEvents(data);
  }, []);

  const handleCreateEvent = useCallback(async (eventData, currentUser, userEmail) => {
    const saved = await service.createEvent({
      ...eventData,
      createdBy: currentUser,
      createdByEmail: userEmail,
    });
    if (saved) {
      setEvents(prev => [...prev, saved].sort((a, b) => a.event_date.localeCompare(b.event_date)));
    }
    return saved;
  }, []);

  const handleUpdateEvent = useCallback(async (id, updates) => {
    const updated = await service.updateEvent(id, updates);
    if (updated) {
      setEvents(prev => prev.map(e => e.id === id ? updated : e));
    }
    return updated;
  }, []);

  const handleDeleteEvent = useCallback(async (id) => {
    const result = await service.deleteEvent(id);
    if (result) {
      setEvents(prev => prev.filter(e => e.id !== id));
    }
    return result;
  }, []);

  return {
    events,
    loadEvents,
    createEvent: handleCreateEvent,
    updateEvent: handleUpdateEvent,
    deleteEvent: handleDeleteEvent,
  };
}

import { useEffect, useState, useCallback } from 'react';
import {
  fetchDashboardRequests,
  fetchRequesterRequests,
} from '../services/landingPageRequests';

export function useLandingPageRequests(pagesRole, userId) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    if (!pagesRole) {
      setRequests([]);
      setError(null);
      setLoading(false);
      return [];
    }

    if (pagesRole === 'requester' && !userId) {
      setRequests([]);
      setError('Missing user ID');
      setLoading(false);
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const data = pagesRole === 'builder' || pagesRole === 'approver'
        ? await fetchDashboardRequests()
        : await fetchRequesterRequests(userId);

      setRequests(data);
      return data;
    } catch (err) {
      setRequests([]);
      setError(err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [pagesRole, userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    requests,
    loading,
    error,
    refetch,
  };
}

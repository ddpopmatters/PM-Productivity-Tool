import { useEffect, useState, useCallback } from 'react';
import {
  fetchDashboardRequests,
  fetchRequesterRequests,
} from '../services/landingPageRequests';

const FETCH_TIMEOUT_MS = 15_000;

function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Request timed out — the database may be waking up. Please retry.')), ms)
  );
  return Promise.race([promise, timeout]);
}

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
      const fetchFn = pagesRole === 'builder' || pagesRole === 'approver'
        ? fetchDashboardRequests()
        : fetchRequesterRequests(userId);

      const data = await withTimeout(fetchFn, FETCH_TIMEOUT_MS);
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

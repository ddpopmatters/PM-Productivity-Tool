import { useState, useCallback } from 'react';
import * as service from '../services/mindmaps';

export function useMindmaps() {
  const [mindmaps, setMindmaps] = useState([]);

  const loadMindmaps = useCallback(async (email) => {
    const data = await service.fetchMindmaps(email);
    setMindmaps(data);
  }, []);

  return {
    mindmaps,
    setMindmaps,
    loadMindmaps,
    mindmapApi: service,
  };
}

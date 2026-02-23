import { useState, useCallback } from 'react';
import * as service from '../services/whiteboards';

export function useWhiteboards() {
  const [whiteboards, setWhiteboards] = useState([]);
  const [currentWhiteboardId, setCurrentWhiteboardId] = useState(null);

  const loadWhiteboards = useCallback(async (email) => {
    const data = await service.fetchWhiteboards(email);
    setWhiteboards(data);
  }, []);

  return {
    whiteboards,
    setWhiteboards,
    currentWhiteboardId,
    setCurrentWhiteboardId,
    loadWhiteboards,
    // Pass through service methods for components that need direct API access
    whiteboardApi: service,
  };
}

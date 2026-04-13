import React from 'react';
import { useWebsiteProject } from '../../../hooks';
import WebsiteView from './WebsiteView';

export function WebsiteRoute({ mindmaps, setMindmaps, mindmapApi, onOpenMindmap }) {
  const websiteHook = useWebsiteProject();

  return (
    <WebsiteView
      websiteHook={websiteHook}
      mindmaps={mindmaps}
      setMindmaps={setMindmaps}
      mindmapApi={mindmapApi}
      onOpenMindmap={onOpenMindmap}
    />
  );
}

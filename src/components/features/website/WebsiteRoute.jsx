import React from 'react';
import { useWebsiteProject } from '../../../hooks';
import WebsiteView from './WebsiteView';

export function WebsiteRoute() {
  const websiteHook = useWebsiteProject();

  return <WebsiteView websiteHook={websiteHook} />;
}

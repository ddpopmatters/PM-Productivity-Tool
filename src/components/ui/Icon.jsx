import React, { useRef, useLayoutEffect } from 'react';

/**
 * Icon component - Lucide icon wrapper
 *
 * Prevents React reconciliation errors with Lucide icons by managing
 * icon rendering outside React's virtual DOM.
 *
 * Requires the global `lucide` object to be loaded via CDN.
 *
 * @param {string} name - Lucide icon name (e.g., 'home', 'settings', 'user')
 * @param {string} className - Additional CSS classes
 * @param {number|string} size - Icon size (number for px, string for any unit)
 */
const Icon = ({ name, className = "", size, ...props }) => {
  const iconRef = useRef(null);

  // Extract only size classes for the SVG, rest goes on wrapper
  const sizeMatch = className.match(/[wh]-\d+|[wh]-\[\d+px\]/g) || [];
  const sizeClasses = sizeMatch.join(' ');

  useLayoutEffect(() => {
    if (iconRef.current && window.lucide) {
      // Clear any existing content safely (avoid innerHTML for security)
      while (iconRef.current.firstChild) {
        iconRef.current.removeChild(iconRef.current.firstChild);
      }
      // Create the icon element
      const iconEl = document.createElement('i');
      iconEl.setAttribute('data-lucide', name);
      // Only apply size classes to inner element
      if (sizeClasses) iconEl.className = sizeClasses;
      if (size) {
        iconEl.style.width = typeof size === 'number' ? `${size}px` : size;
        iconEl.style.height = typeof size === 'number' ? `${size}px` : size;
      }
      iconRef.current.appendChild(iconEl);
      // Transform just this icon
      window.lucide.createIcons({ nodes: [iconEl] });
    }
  }, [name, sizeClasses, size]);

  return <span ref={iconRef} className={`inline-flex ${className}`} {...props} />;
};

export default Icon;

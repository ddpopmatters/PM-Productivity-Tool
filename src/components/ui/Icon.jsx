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

  useLayoutEffect(() => {
    if (iconRef.current && window.lucide) {
      // Clear any existing content
      iconRef.current.innerHTML = '';
      // Create the icon element
      const iconEl = document.createElement('i');
      iconEl.setAttribute('data-lucide', name);
      if (className) iconEl.className = className;
      if (size) {
        iconEl.style.width = typeof size === 'number' ? `${size}px` : size;
        iconEl.style.height = typeof size === 'number' ? `${size}px` : size;
      }
      iconRef.current.appendChild(iconEl);
      // Transform just this icon
      window.lucide.createIcons({ nodes: [iconEl] });
    }
  }, [name, className, size]);

  return <span ref={iconRef} className="inline-flex" {...props} />;
};

export default Icon;

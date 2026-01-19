import React from 'react';
import clsx from 'clsx';

const Badge = React.memo(function Badge({ variant = 'default', className = '', children }) {
  const styles = {
    default: 'bg-aqua-100 text-ocean-700',
    secondary: 'bg-graystone-100 text-graystone-700',
    outline: 'border border-aqua-200 text-ocean-700 bg-aqua-50',
    success: 'bg-green-100 text-green-700',
    neutral: 'bg-graystone-100 text-graystone-600',
    // Additional variants for future use
    primary: 'bg-ocean-100 text-ocean-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-aqua-100 text-aqua-700'
  };

  return (
    <span className={clsx('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', styles[variant], className)}>
      {children}
    </span>
  );
});

export default Badge;

import React from 'react';
import clsx from 'clsx';

const Input = React.forwardRef(function Input({
  type = 'text',
  className = '',
  disabled = false,
  ...props
}, ref) {
  return (
    <input
      ref={ref}
      type={type}
      disabled={disabled}
      className={clsx(
        'w-full rounded-xl border border-graystone-300 px-4 py-2.5 text-sm text-ocean-900 placeholder-graystone-400',
        'focus:border-aqua-400 focus:outline-none focus:ring-2 focus:ring-aqua-100',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
      {...props}
    />
  );
});

export default Input;

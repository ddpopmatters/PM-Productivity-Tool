import React from 'react';
import clsx from 'clsx';

const Button = React.memo(function Button({
  type = "button",
  variant = "solid",
  size = "md",
  disabled = false,
  className = "",
  onClick,
  children,
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-aqua-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

  const variants = {
    solid:
      "bg-ocean-600 text-white shadow-sm hover:bg-ocean-700",
    outline:
      "border border-graystone-300 bg-white text-graystone-700 hover:bg-graystone-100",
    secondary:
      "bg-graystone-100 text-graystone-900 hover:bg-graystone-200",
    ghost: "text-graystone-700 hover:bg-graystone-100",
    destructive:
      "bg-rose-600 text-white hover:bg-rose-700",
    cta:
      "bg-ocean-600 text-white shadow-sm hover:bg-ocean-700",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
  };

  const sizes = {
    sm: "px-4 py-1.5 text-xs",
    md: "px-6 py-2 text-sm",
    lg: "px-7 py-3 text-base",
    icon: "h-10 w-10",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx(base, variants[variant] || variants.solid, sizes[size], className)}
    >
      {children}
    </button>
  );
});

export default Button;

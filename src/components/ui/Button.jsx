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
    "heading-font inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0F9DDE]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#CFEBF8] disabled:cursor-not-allowed disabled:opacity-60";

  const variants = {
    solid:
      "border border-black bg-black text-white shadow-[0_0_30px_rgba(15,157,222,0.35)] hover:-translate-y-0.5 hover:bg-white hover:text-black",
    outline:
      "border border-black bg-white text-black hover:-translate-y-0.5 hover:bg-black hover:text-white",
    ghost: "text-black hover:bg-black/10",
    destructive:
      "border border-rose-500 bg-rose-600 text-white shadow-[0_0_25px_rgba(244,63,94,0.35)] hover:-translate-y-0.5 hover:bg-rose-700",
    cta:
      "border border-[#0F9DDE]/40 bg-white text-black shadow-[0_0_35px_rgba(15,157,222,0.3)] hover:-translate-y-0.5 hover:shadow-[0_0_45px_rgba(15,157,222,0.45)]",
    // Additional variants for backwards compatibility
    danger: "border border-rose-500 bg-rose-600 text-white shadow-[0_0_25px_rgba(244,63,94,0.35)] hover:-translate-y-0.5 hover:bg-rose-700",
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

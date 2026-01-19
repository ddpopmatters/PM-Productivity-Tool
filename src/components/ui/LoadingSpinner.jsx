import React from 'react';
import clsx from 'clsx';

const LoadingSpinner = React.memo(function LoadingSpinner({ size = "md", text = "", className = "" }) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4"
  };

  return (
    <div className={clsx("flex flex-col items-center justify-center", className)} role="status" aria-live="polite">
      <div
        className={clsx(
          sizeClasses[size] || sizeClasses.md,
          "border-ocean-200 border-t-ocean-600 rounded-full animate-spin"
        )}
        aria-hidden="true"
      />
      {text && <span className="text-sm text-graystone-600 mt-2">{text}</span>}
      <span className="sr-only">{text || "Loading..."}</span>
    </div>
  );
});

export default LoadingSpinner;

import React from 'react';
import clsx from 'clsx';

const COLOR_CLASSES = {
  ocean:  { bg: 'bg-ocean-100',  text: 'text-ocean-700',  dot: 'bg-ocean-500' },
  green:  { bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  pink:   { bg: 'bg-pink-100',   text: 'text-pink-700',   dot: 'bg-pink-500' },
  teal:   { bg: 'bg-teal-100',   text: 'text-teal-700',   dot: 'bg-teal-500' },
  red:    { bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500' },
};

const EventChip = ({ event, onClick, dimmed = false }) => {
  const colors = COLOR_CLASSES[event.color] || COLOR_CLASSES.ocean;

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(event); }}
      className={clsx(
        "w-full text-left px-1.5 py-0.5 rounded text-[11px] leading-tight truncate transition-opacity",
        colors.bg, colors.text,
        dimmed && "opacity-50"
      )}
      title={event.title}
    >
      {event.title}
    </button>
  );
};

export { COLOR_CLASSES };
export default EventChip;

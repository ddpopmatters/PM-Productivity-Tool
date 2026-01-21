import React from 'react';

const ImageElement = ({ element, isSelected, onSelect, onUpdate, onDelete }) => {
  const content = element.content || {};
  const imageUrl = content.url || '';
  const altText = content.alt || 'Image';

  return (
    <div
      className={`absolute cursor-move ${isSelected ? 'ring-2 ring-ocean-500 ring-offset-2' : ''}`}
      style={{
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        zIndex: element.z_index || 0
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(element.id);
      }}
    >
      <img
        src={imageUrl}
        alt={altText}
        className="w-full h-full object-contain rounded-lg"
        style={{ pointerEvents: 'none' }}
        draggable={false}
      />
    </div>
  );
};

export default ImageElement;

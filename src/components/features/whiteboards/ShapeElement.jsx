import React from 'react';

const ShapeElement = ({ element, isSelected, onSelect, onUpdate, onDelete }) => {
  const content = element.content || {};
  const shapeType = content.shapeType || 'rectangle';
  const fill = content.fill || '#93c5fd';
  const stroke = content.stroke || '#3b82f6';
  const strokeWidth = content.strokeWidth || 2;
  const cornerRadius = content.cornerRadius || 0;

  const renderShape = () => {
    switch (shapeType) {
      case 'rectangle':
        return (
          <rect
            x={strokeWidth / 2}
            y={strokeWidth / 2}
            width={element.width - strokeWidth}
            height={element.height - strokeWidth}
            rx={cornerRadius}
            ry={cornerRadius}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        );
      case 'circle':
        const cx = element.width / 2;
        const cy = element.height / 2;
        const rx = (element.width - strokeWidth) / 2;
        const ry = (element.height - strokeWidth) / 2;
        return (
          <ellipse
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        );
      case 'line':
        return (
          <line
            x1={strokeWidth}
            y1={element.height / 2}
            x2={element.width - strokeWidth}
            y2={element.height / 2}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        );
      case 'arrow':
        const arrowSize = 12;
        const y = element.height / 2;
        return (
          <g>
            <line
              x1={strokeWidth}
              y1={y}
              x2={element.width - arrowSize - strokeWidth}
              y2={y}
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            <polygon
              points={`${element.width - strokeWidth},${y} ${element.width - arrowSize - strokeWidth},${y - arrowSize / 2} ${element.width - arrowSize - strokeWidth},${y + arrowSize / 2}`}
              fill={stroke}
            />
          </g>
        );
      default:
        return null;
    }
  };

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
      <svg
        width={element.width}
        height={element.height}
        style={{ overflow: 'visible' }}
      >
        {renderShape()}
      </svg>
    </div>
  );
};

export default ShapeElement;

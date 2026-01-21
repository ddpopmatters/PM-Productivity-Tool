import React, { useState, useRef } from 'react';

const WhiteboardElement = ({
  element,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  viewport
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(element.content?.title || 'Whiteboard');
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [paths, setPaths] = useState(element.content?.paths || []);
  const [currentPath, setCurrentPath] = useState([]);
  const [brushColor, setBrushColor] = useState(element.content?.brushColor || '#1f2937');
  const [brushSize, setBrushSize] = useState(element.content?.brushSize || 2);

  const handleMouseDown = (e) => {
    if (!isEditing) return;
    e.stopPropagation();
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDrawing(true);
    setCurrentPath([{ x, y }]);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !isEditing) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentPath(prev => [...prev, { x, y }]);
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentPath.length > 1) {
      const newPaths = [...paths, { points: currentPath, color: brushColor, size: brushSize }];
      setPaths(newPaths);
      onUpdate(element.id, {
        content: { ...element.content, paths: newPaths, brushColor, brushSize }
      });
    }
    setCurrentPath([]);
  };

  const clearCanvas = () => {
    setPaths([]);
    onUpdate(element.id, {
      content: { ...element.content, paths: [] }
    });
  };

  const renderPaths = () => {
    return paths.map((path, i) => (
      <polyline
        key={i}
        points={path.points.map(p => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke={path.color}
        strokeWidth={path.size}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ));
  };

  return (
    <div
      className={`absolute rounded-lg shadow-lg cursor-move select-none ${isSelected ? 'ring-2 ring-ocean-500' : ''}`}
      style={{
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        backgroundColor: element.background_color || '#ffffff',
        borderColor: element.border_color || '#e5e7eb',
        borderWidth: '2px',
        borderStyle: 'solid',
        zIndex: element.z_index
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(element.id);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-graystone-200 bg-graystone-50 rounded-t-lg">
        <span className="text-sm font-medium text-graystone-700">{title}</span>
        {isEditing && (
          <div className="flex items-center gap-2">
            {/* Brush color */}
            <input
              type="color"
              value={brushColor}
              onChange={(e) => setBrushColor(e.target.value)}
              className="w-6 h-6 cursor-pointer"
              title="Brush color"
            />
            {/* Brush size */}
            <select
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="text-xs px-1 py-0.5 rounded border border-graystone-300"
            >
              <option value={1}>Thin</option>
              <option value={2}>Medium</option>
              <option value={4}>Thick</option>
              <option value={8}>Bold</option>
            </select>
            <button
              onClick={(e) => { e.stopPropagation(); clearCanvas(); }}
              className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
            >
              Clear
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setIsEditing(false); }}
              className="text-xs px-2 py-1 bg-ocean-100 text-ocean-600 rounded hover:bg-ocean-200"
            >
              Done
            </button>
          </div>
        )}
      </div>

      {/* Drawing canvas */}
      <svg
        ref={canvasRef}
        className="w-full h-full"
        style={{
          cursor: isEditing ? 'crosshair' : 'move',
          height: 'calc(100% - 40px)'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {renderPaths()}
        {currentPath.length > 0 && (
          <polyline
            points={currentPath.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={brushColor}
            strokeWidth={brushSize}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>

      {/* Resize handles when selected */}
      {isSelected && !isEditing && (
        <div className="absolute -right-1 -bottom-1 w-3 h-3 bg-ocean-500 border border-white rounded-sm cursor-se-resize" />
      )}
    </div>
  );
};

export default WhiteboardElement;

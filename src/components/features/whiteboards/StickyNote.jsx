import React, { useState, useRef } from 'react';

// Default configuration if not provided
const DEFAULT_TEXT_SIZES = [
  { name: 'Small', title: '12px', body: '10px' },
  { name: 'Medium', title: '16px', body: '14px' },
  { name: 'Large', title: '20px', body: '16px' },
  { name: 'Extra Large', title: '24px', body: '18px' }
];

const DEFAULT_FONT_FAMILIES = [
  { name: 'System', value: 'system-ui, -apple-system, sans-serif' },
  { name: 'Serif', value: 'Georgia, serif' },
  { name: 'Mono', value: 'ui-monospace, monospace' },
  { name: 'Handwritten', value: 'Caveat, cursive' }
];

const DEFAULT_TEXT_COLORS = [
  { name: 'Dark', color: '#1f2937' },
  { name: 'Gray', color: '#6b7280' },
  { name: 'Red', color: '#dc2626' },
  { name: 'Orange', color: '#ea580c' },
  { name: 'Blue', color: '#2563eb' },
  { name: 'Green', color: '#16a34a' },
  { name: 'Purple', color: '#9333ea' }
];

const StickyNote = ({
  element,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  viewport,
  TEXT_SIZES = DEFAULT_TEXT_SIZES,
  FONT_FAMILIES = DEFAULT_FONT_FAMILIES,
  TEXT_COLORS = DEFAULT_TEXT_COLORS
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(element.content?.title || '');
  const [description, setDescription] = useState(element.content?.description || '');
  const [showFormatting, setShowFormatting] = useState(false);
  const noteRef = useRef(null);
  const editContainerRef = useRef(null);

  // Text formatting from content
  const fontSize = element.content?.fontSize || 'Medium';
  const fontFamily = element.content?.fontFamily || FONT_FAMILIES[0].value;
  const isBold = element.content?.bold || false;
  const isItalic = element.content?.italic || false;
  const textColor = element.text_color || '#1f2937';

  const sizeConfig = TEXT_SIZES.find(s => s.name === fontSize) || TEXT_SIZES[1];

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleBlur = (e) => {
    setTimeout(() => {
      if (editContainerRef.current && !editContainerRef.current.contains(document.activeElement)) {
        setIsEditing(false);
        setShowFormatting(false);
        if (title !== element.content?.title || description !== element.content?.description) {
          onUpdate(element.id, {
            content: { ...element.content, title, description }
          });
        }
      }
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
      setShowFormatting(false);
      if (title !== element.content?.title || description !== element.content?.description) {
        onUpdate(element.id, {
          content: { ...element.content, title, description }
        });
      }
    }
    e.stopPropagation();
  };

  const updateFormatting = (updates) => {
    const newContent = { ...element.content, ...updates };
    onUpdate(element.id, { content: newContent });
  };

  const updateTextColor = (color) => {
    onUpdate(element.id, { text_color: color });
  };

  return (
    <div
      ref={noteRef}
      className={`absolute rounded-lg shadow-md cursor-move select-none ${isSelected ? 'ring-2 ring-ocean-500' : ''}`}
      style={{
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        backgroundColor: element.background_color,
        borderColor: element.border_color,
        borderWidth: '2px',
        borderStyle: 'solid',
        zIndex: element.z_index
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(element.id);
      }}
      onDoubleClick={handleDoubleClick}
    >
      <div className="p-3 h-full flex flex-col overflow-hidden">
        {isEditing ? (
          <div ref={editContainerRef} className="flex flex-col h-full">
            {/* Formatting toolbar */}
            <div className="flex items-center gap-1 mb-2 pb-2 border-b border-graystone-300 flex-wrap">
              {/* Font size dropdown */}
              <select
                value={fontSize}
                onChange={(e) => updateFormatting({ fontSize: e.target.value })}
                className="text-xs px-1 py-0.5 rounded border border-graystone-300 bg-white"
                onClick={(e) => e.stopPropagation()}
              >
                {TEXT_SIZES.map(size => (
                  <option key={size.name} value={size.name}>{size.name}</option>
                ))}
              </select>

              {/* Font family dropdown */}
              <select
                value={fontFamily}
                onChange={(e) => updateFormatting({ fontFamily: e.target.value })}
                className="text-xs px-1 py-0.5 rounded border border-graystone-300 bg-white"
                onClick={(e) => e.stopPropagation()}
              >
                {FONT_FAMILIES.map(font => (
                  <option key={font.name} value={font.value}>{font.name}</option>
                ))}
              </select>

              {/* Bold button */}
              <button
                onClick={(e) => { e.stopPropagation(); updateFormatting({ bold: !isBold }); }}
                className={`w-6 h-6 text-xs font-bold rounded ${isBold ? 'bg-ocean-500 text-white' : 'bg-graystone-100 hover:bg-graystone-200'}`}
              >
                B
              </button>

              {/* Italic button */}
              <button
                onClick={(e) => { e.stopPropagation(); updateFormatting({ italic: !isItalic }); }}
                className={`w-6 h-6 text-xs italic rounded ${isItalic ? 'bg-ocean-500 text-white' : 'bg-graystone-100 hover:bg-graystone-200'}`}
              >
                I
              </button>

              {/* Text color */}
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowFormatting(!showFormatting); }}
                  className="w-6 h-6 text-xs rounded bg-graystone-100 hover:bg-graystone-200 flex items-center justify-center"
                  title="Text color"
                >
                  <span style={{ color: textColor }}>A</span>
                </button>
                {showFormatting && (
                  <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg p-2 flex gap-1 z-50">
                    {TEXT_COLORS.map(c => (
                      <button
                        key={c.name}
                        onClick={(e) => { e.stopPropagation(); updateTextColor(c.color); setShowFormatting(false); }}
                        className="w-5 h-5 rounded-full border border-graystone-300"
                        style={{ backgroundColor: c.color }}
                        title={c.name}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              placeholder="Title"
              className="bg-transparent border-none outline-none w-full mb-1"
              style={{
                color: textColor,
                fontSize: sizeConfig.title,
                fontFamily: fontFamily,
                fontWeight: isBold ? 'bold' : 'normal',
                fontStyle: isItalic ? 'italic' : 'normal'
              }}
              autoFocus
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              placeholder="Add notes..."
              className="bg-transparent border-none outline-none w-full flex-1 resize-none"
              style={{
                color: textColor,
                fontSize: sizeConfig.body,
                fontFamily: fontFamily,
                fontWeight: isBold ? 'bold' : 'normal',
                fontStyle: isItalic ? 'italic' : 'normal'
              }}
            />
          </div>
        ) : (
          <>
            <div
              className="truncate"
              style={{
                color: textColor,
                fontSize: sizeConfig.title,
                fontFamily: fontFamily,
                fontWeight: isBold ? 'bold' : 'bold',
                fontStyle: isItalic ? 'italic' : 'normal'
              }}
            >
              {title || 'Untitled'}
            </div>
            <div
              className="mt-1 flex-1 overflow-hidden whitespace-pre-wrap"
              style={{
                color: textColor,
                fontSize: sizeConfig.body,
                fontFamily: fontFamily,
                fontWeight: isBold ? 'bold' : 'normal',
                fontStyle: isItalic ? 'italic' : 'normal'
              }}
            >
              {description || 'Double-click to edit'}
            </div>
          </>
        )}
      </div>

      {/* Resize handles when selected */}
      {isSelected && !isEditing && (
        <>
          <div className="absolute -right-1 -bottom-1 w-3 h-3 bg-ocean-500 border border-white rounded-sm cursor-se-resize" />
        </>
      )}
    </div>
  );
};

export default StickyNote;

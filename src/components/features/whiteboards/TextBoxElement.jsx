import React, { useState, useEffect, useRef } from 'react';

const TextBoxElement = ({ element, isSelected, onSelect, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(element.content?.text || '');
  const textareaRef = useRef(null);

  useEffect(() => {
    setText(element.content?.text || '');
  }, [element.content?.text]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (text !== element.content?.text) {
      onUpdate(element.id, {
        content: { ...element.content, text }
      });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
      setText(element.content?.text || '');
    }
  };

  const content = element.content || {};
  const fontSize = content.fontSize || '16px';
  const fontFamily = content.fontFamily || 'system-ui, -apple-system, sans-serif';
  const fontWeight = content.fontWeight || 'normal';
  const fontStyle = content.fontStyle || 'normal';

  return (
    <div
      className={`absolute cursor-move ${isSelected ? 'ring-2 ring-ocean-500 ring-offset-2' : ''}`}
      style={{
        left: element.x,
        top: element.y,
        width: element.width,
        minHeight: element.height,
        zIndex: element.z_index || 0,
        color: element.text_color || '#1f2937'
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(element.id);
      }}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full h-full bg-transparent border-none outline-none resize-none"
          style={{
            fontSize,
            fontFamily,
            fontWeight,
            fontStyle,
            color: element.text_color || '#1f2937',
            minHeight: element.height
          }}
        />
      ) : (
        <div
          className="w-full h-full whitespace-pre-wrap break-words"
          style={{
            fontSize,
            fontFamily,
            fontWeight,
            fontStyle,
            minHeight: element.height,
            padding: '4px'
          }}
        >
          {text || 'Double-click to edit'}
        </div>
      )}
    </div>
  );
};

export default TextBoxElement;

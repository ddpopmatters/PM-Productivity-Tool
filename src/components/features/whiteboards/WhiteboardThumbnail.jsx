import React, { useState, useEffect } from 'react';
import Icon from '../../ui/Icon';
import { Logger } from '../../../utils/logger';

const WhiteboardThumbnail = ({ whiteboardId, WHITEBOARD_API }) => {
  const [elements, setElements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadElements = async () => {
      if (!whiteboardId || !WHITEBOARD_API) {
        setLoading(false);
        return;
      }
      try {
        const data = await WHITEBOARD_API.fetchElements(whiteboardId);
        setElements(data || []);
      } catch (err) {
        Logger.error(err, 'Failed to load whiteboard elements');
      }
      setLoading(false);
    };
    loadElements();
  }, [whiteboardId, WHITEBOARD_API]);

  if (loading) {
    return (
      <div className="aspect-video bg-ocean-50 rounded-lg flex items-center justify-center">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-ocean-400"></div>
      </div>
    );
  }

  if (elements.length === 0) {
    return (
      <div className="aspect-video bg-ocean-50 rounded-lg flex items-center justify-center">
        <Icon name="layout" className="w-12 h-12 text-ocean-300" />
      </div>
    );
  }

  // Calculate bounds to fit all elements
  const bounds = elements.reduce(
    (acc, el) => ({
      minX: Math.min(acc.minX, el.x || 0),
      minY: Math.min(acc.minY, el.y || 0),
      maxX: Math.max(acc.maxX, (el.x || 0) + (el.width || 100)),
      maxY: Math.max(acc.maxY, (el.y || 0) + (el.height || 100)),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  );

  // Add padding
  const padding = 20;
  bounds.minX -= padding;
  bounds.minY -= padding;
  bounds.maxX += padding;
  bounds.maxY += padding;

  const contentWidth = bounds.maxX - bounds.minX;
  const contentHeight = bounds.maxY - bounds.minY;

  // Preview container is aspect-video (16:9), calculate scale
  const previewWidth = 280; // approximate width of the card
  const previewHeight = previewWidth * (9 / 16);
  const scaleX = previewWidth / contentWidth;
  const scaleY = previewHeight / contentHeight;
  const scale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down

  // Center the content
  const offsetX = (previewWidth - contentWidth * scale) / 2 - bounds.minX * scale;
  const offsetY = (previewHeight - contentHeight * scale) / 2 - bounds.minY * scale;

  const renderElement = (el) => {
    const style = {
      position: 'absolute',
      left: el.x * scale + offsetX,
      top: el.y * scale + offsetY,
      width: (el.width || 100) * scale,
      height: (el.height || 100) * scale,
    };

    switch (el.element_type) {
      case 'sticky':
        return (
          <div
            key={el.id}
            style={{
              ...style,
              backgroundColor: el.background_color || '#fef3c7',
              borderRadius: 4 * scale,
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            }}
          />
        );

      case 'text':
        return (
          <div
            key={el.id}
            style={{
              ...style,
              fontSize: Math.max(6, 12 * scale),
              color: el.text_color || '#1f2937',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
            }}
          >
            {el.content?.text?.slice(0, 20) || ''}
          </div>
        );

      case 'shape':
        const shapeType = el.content?.shapeType || 'rectangle';
        if (shapeType === 'circle') {
          return (
            <div
              key={el.id}
              style={{
                ...style,
                backgroundColor: el.content?.fill || el.background_color || '#93c5fd',
                borderRadius: '50%',
                border: `${Math.max(1, 2 * scale)}px solid ${el.content?.stroke || el.border_color || '#3b82f6'}`,
              }}
            />
          );
        }
        return (
          <div
            key={el.id}
            style={{
              ...style,
              backgroundColor: el.content?.fill || el.background_color || '#93c5fd',
              borderRadius: (el.content?.cornerRadius || 4) * scale,
              border: `${Math.max(1, 2 * scale)}px solid ${el.content?.stroke || el.border_color || '#3b82f6'}`,
            }}
          />
        );

      case 'image':
        return (
          <div
            key={el.id}
            style={{
              ...style,
              backgroundColor: '#e5e7eb',
              borderRadius: 4 * scale,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {el.content?.url ? (
              <img
                src={el.content.url}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <Icon name="image" className="text-graystone-400" style={{ width: 12 * scale, height: 12 * scale }} />
            )}
          </div>
        );

      case 'whiteboard':
        return (
          <div
            key={el.id}
            style={{
              ...style,
              backgroundColor: el.background_color || '#ffffff',
              border: `${Math.max(1, 1 * scale)}px solid ${el.border_color || '#e5e7eb'}`,
              borderRadius: 4 * scale,
            }}
          />
        );

      default:
        return (
          <div
            key={el.id}
            style={{
              ...style,
              backgroundColor: el.background_color || '#e5e7eb',
              borderRadius: 4 * scale,
            }}
          />
        );
    }
  };

  return (
    <div
      className="aspect-video bg-white rounded-lg relative overflow-hidden border border-ocean-100"
      style={{ width: '100%' }}
    >
      {elements
        .sort((a, b) => (a.z_index || 0) - (b.z_index || 0))
        .map(renderElement)}
    </div>
  );
};

export default WhiteboardThumbnail;

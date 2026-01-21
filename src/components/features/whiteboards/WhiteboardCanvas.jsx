import React, { useState, useEffect, useRef } from 'react';
import Icon from '../../ui/Icon';

// Default sticky colors if not provided
const DEFAULT_STICKY_COLORS = [
  { name: 'Yellow', bg: '#fef3c7', border: '#fbbf24' },
  { name: 'Green', bg: '#d1fae5', border: '#34d399' },
  { name: 'Blue', bg: '#dbeafe', border: '#60a5fa' },
  { name: 'Pink', bg: '#fce7f3', border: '#f472b6' },
  { name: 'Purple', bg: '#ede9fe', border: '#a78bfa' },
  { name: 'Orange', bg: '#ffedd5', border: '#fb923c' },
];

const WhiteboardCanvas = ({
  whiteboardId,
  whiteboard,
  onBack,
  userEmail,
  currentUser,
  // Dependencies passed as props
  WHITEBOARD_API,
  supabase,
  Logger,
  STICKY_COLORS = DEFAULT_STICKY_COLORS,
  // Element components passed as props
  StickyNote,
  WhiteboardElement,
  TextBoxElement,
  ImageElement,
  ShapeElement,
}) => {
  const [elements, setElements] = useState([]);
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [activeTool, setActiveTool] = useState('select');
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [resizeStart, setResizeStart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [showShapesMenu, setShowShapesMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Undo/Redo history
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoAction = useRef(false);

  const canvasRef = useRef(null);
  const contentRef = useRef(null);
  const lastPanPosition = useRef({ x: 0, y: 0 });
  const channelRef = useRef(null);
  const imageInputRef = useRef(null);

  // Load elements on mount
  useEffect(() => {
    const loadElements = async () => {
      setLoading(true);
      const data = await WHITEBOARD_API.fetchElements(whiteboardId);
      setElements(data);
      setLoading(false);
    };
    loadElements();

    // Subscribe to real-time changes
    channelRef.current = WHITEBOARD_API.subscribeToWhiteboard(whiteboardId, (payload) => {
      if (payload.eventType === 'INSERT') {
        // Only add if not already present (prevents duplicates from local + realtime)
        setElements(prev => {
          if (prev.some(el => el.id === payload.new.id)) {
            return prev;
          }
          return [...prev, payload.new];
        });
      } else if (payload.eventType === 'UPDATE') {
        setElements(prev => prev.map(el => el.id === payload.new.id ? payload.new : el));
      } else if (payload.eventType === 'DELETE') {
        setElements(prev => prev.filter(el => el.id !== payload.old.id));
      }
    });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [whiteboardId]);

  // Undo function
  const handleUndo = () => {
    if (historyIndex <= 0) return;

    const newIndex = historyIndex - 1;
    const previousState = JSON.parse(history[newIndex]);

    isUndoRedoAction.current = true;
    setElements(previousState);
    setHistoryIndex(newIndex);
    setSelectedElementId(null);
  };

  // Redo function
  const handleRedo = () => {
    if (historyIndex >= history.length - 1) return;

    const newIndex = historyIndex + 1;
    const nextState = JSON.parse(history[newIndex]);

    isUndoRedoAction.current = true;
    setElements(nextState);
    setHistoryIndex(newIndex);
    setSelectedElementId(null);
  };

  const handleDeleteElement = async (id) => {
    setElements(prev => prev.filter(el => el.id !== id));
    setSelectedElementId(null);
    await WHITEBOARD_API.deleteElement(id);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      // Undo: Ctrl/Cmd + Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementId) {
          handleDeleteElement(selectedElementId);
        }
      } else if (e.key === 'Escape') {
        setSelectedElementId(null);
        setActiveTool('select');
      } else if (e.key === 'v' || e.key === 'V') {
        setActiveTool('select');
      } else if (e.key === 's' || e.key === 'S') {
        if (!e.metaKey && !e.ctrlKey) {
          setActiveTool('sticky');
        }
      } else if (e.key === 'd' || e.key === 'D') {
        if (!e.metaKey && !e.ctrlKey) {
          setActiveTool('whiteboard');
        }
      } else if (e.key === 't' || e.key === 'T') {
        if (!e.metaKey && !e.ctrlKey) {
          setActiveTool('text');
        }
      } else if (e.key === 'i' || e.key === 'I') {
        if (!e.metaKey && !e.ctrlKey) {
          imageInputRef.current?.click();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, historyIndex, history]);

  // Track element changes for undo/redo (only after initial load)
  useEffect(() => {
    if (loading) return;
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      return;
    }

    // Create a snapshot of current elements
    const snapshot = JSON.stringify(elements);

    // Don't add to history if it's the same as the current state
    if (history[historyIndex] === snapshot) return;

    // Remove any future history when new action is performed
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(snapshot);

    // Keep history size reasonable (max 50 states)
    if (newHistory.length > 50) {
      newHistory.shift();
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    } else {
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [elements, loading]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Handle image upload
  const handleImageUpload = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;

    // Convert to base64 for storage (for simplicity; production would use Supabase Storage)
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target.result;

      // Get image dimensions
      const img = new Image();
      img.onload = async () => {
        // Scale down if too large (max 600px width)
        let width = img.width;
        let height = img.height;
        const maxWidth = 600;
        if (width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = height * ratio;
        }

        // Calculate center position on canvas
        const rect = canvasRef.current?.getBoundingClientRect();
        const centerX = rect ? (rect.width / 2 - viewport.x) / viewport.zoom - width / 2 : 100;
        const centerY = rect ? (rect.height / 2 - viewport.y) / viewport.zoom - height / 2 : 100;

        const newElement = await WHITEBOARD_API.createElement({
          whiteboard_id: whiteboardId,
          element_type: 'image',
          x: centerX,
          y: centerY,
          width: width,
          height: height,
          content: {
            url: dataUrl,
            alt: file.name,
            originalWidth: img.width,
            originalHeight: img.height
          },
          background_color: 'transparent',
          border_color: 'transparent',
          text_color: '#1f2937',
          z_index: elements.length,
          created_by: userEmail
        });

        if (newElement) {
          setElements(prev => [...prev, newElement]);
          setSelectedElementId(newElement.id);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleImageInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
      e.target.value = ''; // Reset input
    }
  };

  // Handle paste event for images
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) handleImageUpload(file);
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [whiteboardId, elements.length, viewport]);

  const handleCanvasClick = async (e) => {
    if (e.target !== canvasRef.current) return;

    const shapeTool = ['rectangle', 'circle', 'line', 'arrow'].includes(activeTool);
    if (activeTool === 'sticky' || activeTool === 'whiteboard' || activeTool === 'text' || shapeTool) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - viewport.x) / viewport.zoom;
      const y = (e.clientY - rect.top - viewport.y) / viewport.zoom;

      let elementConfig;
      if (activeTool === 'whiteboard') {
        elementConfig = {
          element_type: 'whiteboard',
          x: x - 200,
          y: y - 150,
          width: 400,
          height: 300,
          content: { title: 'Drawing Board', paths: [] },
          background_color: '#ffffff',
          border_color: '#e5e7eb'
        };
      } else if (activeTool === 'text') {
        elementConfig = {
          element_type: 'text',
          x: x - 100,
          y: y - 20,
          width: 200,
          height: 40,
          content: { text: 'Double-click to edit', fontSize: '16px', fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 'normal', fontStyle: 'normal' },
          background_color: 'transparent',
          border_color: 'transparent'
        };
      } else if (activeTool === 'rectangle') {
        elementConfig = {
          element_type: 'shape',
          x: x - 75,
          y: y - 50,
          width: 150,
          height: 100,
          content: { shapeType: 'rectangle', fill: '#93c5fd', stroke: '#3b82f6', strokeWidth: 2, cornerRadius: 8 },
          background_color: '#93c5fd',
          border_color: '#3b82f6'
        };
      } else if (activeTool === 'circle') {
        elementConfig = {
          element_type: 'shape',
          x: x - 50,
          y: y - 50,
          width: 100,
          height: 100,
          content: { shapeType: 'circle', fill: '#fca5a5', stroke: '#ef4444', strokeWidth: 2 },
          background_color: '#fca5a5',
          border_color: '#ef4444'
        };
      } else if (activeTool === 'line') {
        elementConfig = {
          element_type: 'shape',
          x: x - 75,
          y: y,
          width: 150,
          height: 4,
          content: { shapeType: 'line', stroke: '#6b7280', strokeWidth: 3 },
          background_color: 'transparent',
          border_color: '#6b7280'
        };
      } else if (activeTool === 'arrow') {
        elementConfig = {
          element_type: 'shape',
          x: x - 75,
          y: y - 10,
          width: 150,
          height: 20,
          content: { shapeType: 'arrow', stroke: '#6b7280', strokeWidth: 3 },
          background_color: 'transparent',
          border_color: '#6b7280'
        };
      } else {
        elementConfig = {
          element_type: 'sticky',
          x: x - 100,
          y: y - 75,
          width: 200,
          height: 150,
          content: { title: '', description: '' },
          background_color: STICKY_COLORS[0].bg,
          border_color: STICKY_COLORS[0].border
        };
      }

      const newElement = await WHITEBOARD_API.createElement({
        whiteboard_id: whiteboardId,
        ...elementConfig,
        text_color: '#1f2937',
        z_index: elements.length,
        created_by: userEmail
      });

      if (newElement) {
        setElements(prev => [...prev, newElement]);
        setSelectedElementId(newElement.id);
        setActiveTool('select');
      }
    } else {
      setSelectedElementId(null);
    }
  };

  const handleMouseDown = (e) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      setIsPanning(true);
      lastPanPosition.current = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      const dx = e.clientX - lastPanPosition.current.x;
      const dy = e.clientY - lastPanPosition.current.y;
      setViewport(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
      lastPanPosition.current = { x: e.clientX, y: e.clientY };
    } else if (dragStart) {
      const dx = (e.clientX - dragStart.mouseX) / viewport.zoom;
      const dy = (e.clientY - dragStart.mouseY) / viewport.zoom;
      setElements(prev => prev.map(el =>
        el.id === dragStart.elementId
          ? { ...el, x: dragStart.elementX + dx, y: dragStart.elementY + dy }
          : el
      ));
    } else if (resizeStart) {
      const dx = (e.clientX - resizeStart.mouseX) / viewport.zoom;
      const dy = (e.clientY - resizeStart.mouseY) / viewport.zoom;
      setElements(prev => prev.map(el =>
        el.id === resizeStart.elementId
          ? {
              ...el,
              width: Math.max(100, resizeStart.width + dx),
              height: Math.max(80, resizeStart.height + dy)
            }
          : el
      ));
    }
  };

  const handleMouseUp = async () => {
    if (dragStart) {
      const element = elements.find(el => el.id === dragStart.elementId);
      if (element) {
        await WHITEBOARD_API.updateElement(element.id, { x: element.x, y: element.y });
      }
      setDragStart(null);
    }
    if (resizeStart) {
      const element = elements.find(el => el.id === resizeStart.elementId);
      if (element) {
        await WHITEBOARD_API.updateElement(element.id, { width: element.width, height: element.height });
      }
      setResizeStart(null);
    }
    setIsPanning(false);
  };

  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
      setViewport(v => ({
        ...v,
        zoom: Math.max(0.25, Math.min(4, v.zoom * zoomDelta))
      }));
    }
  };

  const handleElementMouseDown = (e, element) => {
    if (activeTool !== 'select') return;
    e.stopPropagation();
    setSelectedElementId(element.id);
    setDragStart({
      elementId: element.id,
      elementX: element.x,
      elementY: element.y,
      mouseX: e.clientX,
      mouseY: e.clientY
    });
  };

  const handleResizeMouseDown = (e, element) => {
    e.stopPropagation();
    setResizeStart({
      elementId: element.id,
      width: element.width,
      height: element.height,
      mouseX: e.clientX,
      mouseY: e.clientY
    });
  };

  const handleUpdateElement = async (id, updates) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
    await WHITEBOARD_API.updateElement(id, updates);
  };

  const handleChangeColor = async (color) => {
    if (!selectedElementId) return;
    await handleUpdateElement(selectedElementId, {
      background_color: color.bg,
      border_color: color.border
    });
    setShowColorPicker(false);
  };

  const handleShare = async () => {
    if (!shareEmail.trim() || !whiteboard) return;
    const updatedSharedWith = [...(whiteboard.shared_with || []), shareEmail.trim()];
    await WHITEBOARD_API.updateWhiteboard(whiteboardId, {
      is_shared: true,
      shared_with: updatedSharedWith,
      share_mode: 'edit'
    });
    setShareEmail('');
    setShowShareModal(false);
  };

  // Export functions
  const exportAsPNG = async () => {
    if (!contentRef.current || isExporting) return;
    setIsExporting(true);
    setShowExportMenu(false);

    try {
      // Calculate bounding box of all elements
      if (elements.length === 0) {
        alert('No elements to export');
        setIsExporting(false);
        return;
      }

      const minX = Math.min(...elements.map(el => el.x)) - 20;
      const minY = Math.min(...elements.map(el => el.y)) - 20;
      const maxX = Math.max(...elements.map(el => el.x + el.width)) + 20;
      const maxY = Math.max(...elements.map(el => el.y + el.height)) + 20;
      const width = maxX - minX;
      const height = maxY - minY;

      const canvas = await window.html2canvas(contentRef.current, {
        backgroundColor: '#f3f4f6',
        scale: 2,
        x: minX,
        y: minY,
        width: width,
        height: height,
        scrollX: -minX,
        scrollY: -minY,
        windowWidth: width,
        windowHeight: height
      });

      const link = document.createElement('a');
      link.download = `${whiteboard?.title || 'whiteboard'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      Logger.error(error, 'Export PNG error');
      alert('Failed to export as PNG');
    }
    setIsExporting(false);
  };

  const exportAsPDF = async () => {
    if (!contentRef.current || isExporting) return;
    setIsExporting(true);
    setShowExportMenu(false);

    try {
      if (elements.length === 0) {
        alert('No elements to export');
        setIsExporting(false);
        return;
      }

      const minX = Math.min(...elements.map(el => el.x)) - 20;
      const minY = Math.min(...elements.map(el => el.y)) - 20;
      const maxX = Math.max(...elements.map(el => el.x + el.width)) + 20;
      const maxY = Math.max(...elements.map(el => el.y + el.height)) + 20;
      const width = maxX - minX;
      const height = maxY - minY;

      const canvas = await window.html2canvas(contentRef.current, {
        backgroundColor: '#f3f4f6',
        scale: 2,
        x: minX,
        y: minY,
        width: width,
        height: height,
        scrollX: -minX,
        scrollY: -minY,
        windowWidth: width,
        windowHeight: height
      });

      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = window.jspdf;
      const orientation = width > height ? 'landscape' : 'portrait';
      const pdf = new jsPDF(orientation, 'px', [width, height]);
      pdf.addImage(imgData, 'PNG', 0, 0, width, height);
      pdf.save(`${whiteboard?.title || 'whiteboard'}.pdf`);
    } catch (error) {
      Logger.error(error, 'Export PDF error');
      alert('Failed to export as PDF');
    }
    setIsExporting(false);
  };

  const selectedElement = elements.find(el => el.id === selectedElementId);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white dark:bg-graystone-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-graystone-800 border-b border-graystone-200 dark:border-graystone-700 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-2 text-graystone-600 hover:bg-graystone-100 dark:text-graystone-400 dark:hover:bg-graystone-700 rounded-lg transition-colors"
          >
            <Icon name="arrow-left" className="w-5 h-5" />
          </button>
          <h2 className="font-semibold text-graystone-900 dark:text-white">{whiteboard?.title || 'Whiteboard'}</h2>
        </div>

        {/* Tools */}
        <div className="flex items-center gap-1 bg-graystone-100 dark:bg-graystone-700 rounded-lg p-1">
          <button
            onClick={() => setActiveTool('select')}
            className={`p-2 rounded-md transition-colors ${activeTool === 'select' ? 'bg-white dark:bg-graystone-600 shadow-sm' : 'hover:bg-graystone-200 dark:hover:bg-graystone-600'}`}
            title="Select (V)"
          >
            <Icon name="mouse-pointer-2" className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('sticky')}
            className={`p-2 rounded-md transition-colors ${activeTool === 'sticky' ? 'bg-white dark:bg-graystone-600 shadow-sm' : 'hover:bg-graystone-200 dark:hover:bg-graystone-600'}`}
            title="Sticky Note (S)"
          >
            <Icon name="sticky-note" className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('whiteboard')}
            className={`p-2 rounded-md transition-colors ${activeTool === 'whiteboard' ? 'bg-white dark:bg-graystone-600 shadow-sm' : 'hover:bg-graystone-200 dark:hover:bg-graystone-600'}`}
            title="Drawing Board (D)"
          >
            <Icon name="pen-tool" className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('text')}
            className={`p-2 rounded-md transition-colors ${activeTool === 'text' ? 'bg-white dark:bg-graystone-600 shadow-sm' : 'hover:bg-graystone-200 dark:hover:bg-graystone-600'}`}
            title="Text Box (T)"
          >
            <Icon name="type" className="w-4 h-4" />
          </button>
          <button
            onClick={() => imageInputRef.current?.click()}
            className="p-2 rounded-md transition-colors hover:bg-graystone-200 dark:hover:bg-graystone-600"
            title="Add Image (I)"
          >
            <Icon name="image" className="w-4 h-4" />
          </button>
          {/* Shapes dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowShapesMenu(!showShapesMenu)}
              className={`p-2 rounded-md transition-colors ${['rectangle', 'circle', 'line', 'arrow'].includes(activeTool) ? 'bg-white dark:bg-graystone-600 shadow-sm' : 'hover:bg-graystone-200 dark:hover:bg-graystone-600'}`}
              title="Shapes"
            >
              <Icon name="shapes" className="w-4 h-4" />
            </button>
            {showShapesMenu && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-graystone-800 rounded-lg shadow-lg border border-graystone-200 dark:border-graystone-700 p-1 z-50">
                <button
                  onClick={() => { setActiveTool('rectangle'); setShowShapesMenu(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-graystone-100 dark:hover:bg-graystone-700 rounded"
                >
                  <Icon name="square" className="w-4 h-4" />
                  Rectangle
                </button>
                <button
                  onClick={() => { setActiveTool('circle'); setShowShapesMenu(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-graystone-100 dark:hover:bg-graystone-700 rounded"
                >
                  <Icon name="circle" className="w-4 h-4" />
                  Circle
                </button>
                <button
                  onClick={() => { setActiveTool('line'); setShowShapesMenu(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-graystone-100 dark:hover:bg-graystone-700 rounded"
                >
                  <Icon name="minus" className="w-4 h-4" />
                  Line
                </button>
                <button
                  onClick={() => { setActiveTool('arrow'); setShowShapesMenu(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-graystone-100 dark:hover:bg-graystone-700 rounded"
                >
                  <Icon name="arrow-right" className="w-4 h-4" />
                  Arrow
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right side tools */}
        <div className="flex items-center gap-2">
          {/* Color picker */}
          {selectedElement && (
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="p-2 rounded-lg border border-graystone-300 dark:border-graystone-600"
                style={{ backgroundColor: selectedElement.background_color }}
              >
                <Icon name="palette" className="w-4 h-4" />
              </button>
              {showColorPicker && (
                <div className="absolute right-0 top-full mt-2 p-2 bg-white dark:bg-graystone-800 rounded-lg shadow-lg border border-graystone-200 dark:border-graystone-700 flex gap-1 z-50">
                  {STICKY_COLORS.map(color => (
                    <button
                      key={color.name}
                      onClick={() => handleChangeColor(color)}
                      className="w-6 h-6 rounded-full border-2"
                      style={{ backgroundColor: color.bg, borderColor: color.border }}
                      title={color.name}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Undo/Redo buttons */}
          <div className="flex items-center border-r border-graystone-300 dark:border-graystone-600 pr-2 mr-2">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className="p-2 hover:bg-graystone-100 dark:hover:bg-graystone-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
              title="Undo (Ctrl+Z)"
            >
              <Icon name="undo-2" className="w-4 h-4 text-graystone-600 dark:text-graystone-400" />
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              className="p-2 hover:bg-graystone-100 dark:hover:bg-graystone-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
              title="Redo (Ctrl+Y)"
            >
              <Icon name="redo-2" className="w-4 h-4 text-graystone-600 dark:text-graystone-400" />
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 text-sm text-graystone-600 dark:text-graystone-400">
            <button
              onClick={() => setViewport(v => ({ ...v, zoom: Math.max(0.25, v.zoom - 0.1) }))}
              className="p-1 hover:bg-graystone-100 dark:hover:bg-graystone-700 rounded"
            >
              <Icon name="minus" className="w-4 h-4" />
            </button>
            <span className="w-12 text-center">{Math.round(viewport.zoom * 100)}%</span>
            <button
              onClick={() => setViewport(v => ({ ...v, zoom: Math.min(4, v.zoom + 0.1) }))}
              className="p-1 hover:bg-graystone-100 dark:hover:bg-graystone-700 rounded"
            >
              <Icon name="plus" className="w-4 h-4" />
            </button>
          </div>

          {/* Export button */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={isExporting}
              className="flex items-center gap-2 px-3 py-1.5 text-graystone-700 dark:text-graystone-300 hover:bg-graystone-100 dark:hover:bg-graystone-700 rounded-lg transition-colors text-sm disabled:opacity-50"
            >
              {isExporting ? (
                <div className="w-4 h-4 border-2 border-graystone-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Icon name="download" className="w-4 h-4" />
              )}
              Export
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-graystone-800 rounded-lg shadow-lg border border-graystone-200 dark:border-graystone-700 p-1 z-50 min-w-[140px]">
                <button
                  onClick={exportAsPNG}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-graystone-100 dark:hover:bg-graystone-700 rounded text-left"
                >
                  <Icon name="image" className="w-4 h-4" />
                  Export as PNG
                </button>
                <button
                  onClick={exportAsPDF}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-graystone-100 dark:hover:bg-graystone-700 rounded text-left"
                >
                  <Icon name="file-text" className="w-4 h-4" />
                  Export as PDF
                </button>
              </div>
            )}
          </div>

          {/* Share button */}
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 transition-colors text-sm"
          >
            <Icon name="share-2" className="w-4 h-4" />
            Share
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 min-h-0 overflow-hidden bg-graystone-100 dark:bg-graystone-900 relative"
        style={{
          cursor: isPanning ? 'grabbing' : (['sticky', 'whiteboard', 'text', 'rectangle', 'circle', 'line', 'arrow'].includes(activeTool) ? 'crosshair' : 'default'),
          height: 'calc(100vh - 56px)'
        }}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Grid background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
            backgroundSize: `${20 * viewport.zoom}px ${20 * viewport.zoom}px`,
            backgroundPosition: `${viewport.x}px ${viewport.y}px`
          }}
        />

        {/* Canvas content */}
        <div
          ref={contentRef}
          className="absolute"
          style={{
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
            transformOrigin: '0 0'
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center w-screen h-screen">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ocean-600"></div>
            </div>
          ) : (
            elements.map(element => (
              <div
                key={element.id}
                onMouseDown={(e) => handleElementMouseDown(e, element)}
              >
                {element.element_type === 'sticky' && StickyNote && (
                  <StickyNote
                    element={element}
                    isSelected={selectedElementId === element.id}
                    onSelect={setSelectedElementId}
                    onUpdate={handleUpdateElement}
                    onDelete={handleDeleteElement}
                    viewport={viewport}
                  />
                )}
                {element.element_type === 'whiteboard' && WhiteboardElement && (
                  <WhiteboardElement
                    element={element}
                    isSelected={selectedElementId === element.id}
                    onSelect={setSelectedElementId}
                    onUpdate={handleUpdateElement}
                    onDelete={handleDeleteElement}
                    viewport={viewport}
                  />
                )}
                {element.element_type === 'text' && TextBoxElement && (
                  <TextBoxElement
                    element={element}
                    isSelected={selectedElementId === element.id}
                    onSelect={setSelectedElementId}
                    onUpdate={handleUpdateElement}
                    onDelete={handleDeleteElement}
                  />
                )}
                {element.element_type === 'image' && ImageElement && (
                  <ImageElement
                    element={element}
                    isSelected={selectedElementId === element.id}
                    onSelect={setSelectedElementId}
                    onUpdate={handleUpdateElement}
                    onDelete={handleDeleteElement}
                  />
                )}
                {element.element_type === 'shape' && ShapeElement && (
                  <ShapeElement
                    element={element}
                    isSelected={selectedElementId === element.id}
                    onSelect={setSelectedElementId}
                    onUpdate={handleUpdateElement}
                    onDelete={handleDeleteElement}
                  />
                )}
                {selectedElementId === element.id && (
                  <div
                    className="absolute w-3 h-3 bg-ocean-500 border border-white rounded-sm cursor-se-resize"
                    style={{
                      left: element.x + element.width - 6,
                      top: element.y + element.height - 6,
                      zIndex: element.z_index + 1
                    }}
                    onMouseDown={(e) => handleResizeMouseDown(e, element)}
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowShareModal(false)}>
          <div className="bg-white dark:bg-graystone-800 rounded-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-graystone-900 dark:text-white mb-4">Share Whiteboard</h2>
            <p className="text-sm text-graystone-600 dark:text-graystone-400 mb-4">
              Enter an email address to share this whiteboard with someone.
            </p>
            <input
              type="email"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full px-4 py-2 border border-graystone-300 dark:border-graystone-600 rounded-lg bg-white dark:bg-graystone-900 text-graystone-900 dark:text-white focus:ring-2 focus:ring-ocean-500 focus:border-transparent"
              onKeyDown={(e) => e.key === 'Enter' && handleShare()}
            />

            {/* Current shared users */}
            {whiteboard?.shared_with?.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-graystone-700 dark:text-graystone-300 mb-2">Shared with:</p>
                <div className="space-y-1">
                  {whiteboard.shared_with.map(email => (
                    <div key={email} className="flex items-center justify-between py-1 px-2 bg-graystone-50 dark:bg-graystone-700 rounded">
                      <span className="text-sm text-graystone-600 dark:text-graystone-400">{email}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 text-graystone-600 dark:text-graystone-400 hover:bg-graystone-100 dark:hover:bg-graystone-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleShare}
                disabled={!shareEmail.trim()}
                className="px-4 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 transition-colors disabled:opacity-50"
              >
                Share
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input for image upload */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageInputChange}
        className="hidden"
      />
    </div>
  );
};

export default WhiteboardCanvas;

import React, { useState, useRef } from 'react';
import Icon from '../../ui/Icon';

const MindMapTool = ({ onBack }) => {
  const [nodes, setNodes] = useState([
    { id: 'root', text: 'Main Idea', x: 400, y: 300, color: '#8b5cf6', parentId: null }
  ]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [editText, setEditText] = useState('');
  const [dragging, setDragging] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);

  const nodeColors = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];

  const handleAddChild = (parentId) => {
    const parent = nodes.find(n => n.id === parentId);
    if (!parent) return;

    const children = nodes.filter(n => n.parentId === parentId);
    const angle = (children.length * 45) - 90;
    const distance = 150;
    const radians = (angle * Math.PI) / 180;

    const newNode = {
      id: Date.now().toString(),
      text: 'New idea',
      x: parent.x + Math.cos(radians) * distance,
      y: parent.y + Math.sin(radians) * distance,
      color: nodeColors[(nodes.length) % nodeColors.length],
      parentId: parentId
    };

    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
    setEditingNodeId(newNode.id);
    setEditText('New idea');
  };

  const handleDeleteNode = (nodeId) => {
    if (nodeId === 'root') return; // Can't delete root

    // Get all descendants
    const getDescendants = (id) => {
      const children = nodes.filter(n => n.parentId === id);
      let descendants = [...children];
      children.forEach(child => {
        descendants = [...descendants, ...getDescendants(child.id)];
      });
      return descendants;
    };

    const toDelete = [nodeId, ...getDescendants(nodeId).map(n => n.id)];
    setNodes(prev => prev.filter(n => !toDelete.includes(n.id)));
    setSelectedNodeId(null);
  };

  const handleStartEdit = (node) => {
    setEditingNodeId(node.id);
    setEditText(node.text);
  };

  const handleFinishEdit = () => {
    if (editingNodeId && editText.trim()) {
      setNodes(prev => prev.map(n =>
        n.id === editingNodeId ? { ...n, text: editText.trim() } : n
      ));
    }
    setEditingNodeId(null);
    setEditText('');
  };

  const handleMouseDown = (e, node) => {
    if (editingNodeId === node.id) return;
    e.stopPropagation();
    setSelectedNodeId(node.id);
    setDragging(node.id);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left - rect.width / 2,
      y: e.clientY - rect.top - rect.height / 2
    });
  };

  const handleMouseMove = (e) => {
    if (!dragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - dragOffset.x;
    const y = e.clientY - rect.top - dragOffset.y;

    setNodes(prev => prev.map(n =>
      n.id === dragging ? { ...n, x: Math.max(60, Math.min(rect.width - 60, x)), y: Math.max(30, Math.min(rect.height - 30, y)) } : n
    ));
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  const handleCanvasClick = (e) => {
    if (e.target === canvasRef.current) {
      setSelectedNodeId(null);
      if (editingNodeId) handleFinishEdit();
    }
  };

  const handleColorChange = (nodeId, color) => {
    setNodes(prev => prev.map(n =>
      n.id === nodeId ? { ...n, color } : n
    ));
  };

  const handleReset = () => {
    if (!confirm('Reset mind map? This cannot be undone.')) return;
    setNodes([{ id: 'root', text: 'Main Idea', x: 400, y: 300, color: '#8b5cf6', parentId: null }]);
    setSelectedNodeId(null);
  };

  // Get lines between connected nodes
  const getLines = () => {
    return nodes
      .filter(n => n.parentId)
      .map(node => {
        const parent = nodes.find(p => p.id === node.parentId);
        if (!parent) return null;
        return {
          id: `line-${node.id}`,
          x1: parent.x,
          y1: parent.y,
          x2: node.x,
          y2: node.y,
          color: node.color
        };
      })
      .filter(Boolean);
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div className="p-6 h-[calc(100vh-100px)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="flex items-center gap-2 text-ocean-600 hover:text-ocean-700">
          <Icon name="arrow-left" className="w-5 h-5" />
          Back
        </button>
        <div className="flex items-center gap-3">
          {selectedNodeId && (
            <>
              <button
                onClick={() => handleAddChild(selectedNodeId)}
                className="flex items-center gap-2 px-3 py-1.5 bg-violet-500 text-white rounded-lg hover:bg-violet-600 text-sm"
              >
                <Icon name="plus" className="w-4 h-4" />
                Add Child
              </button>
              {selectedNodeId !== 'root' && (
                <button
                  onClick={() => handleDeleteNode(selectedNodeId)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                >
                  <Icon name="trash-2" className="w-4 h-4" />
                </button>
              )}
            </>
          )}
          <button
            onClick={handleReset}
            className="text-sm text-graystone-500 hover:text-red-500"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-ocean-900">Mind Map</h1>
          <p className="text-sm text-graystone-600">Click a node to select, double-click to edit, drag to move</p>
        </div>
        {selectedNode && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-graystone-500">Color:</span>
            {nodeColors.map(color => (
              <button
                key={color}
                onClick={() => handleColorChange(selectedNodeId, color)}
                className={`w-6 h-6 rounded-full transition-transform ${selectedNode.color === color ? 'ring-2 ring-offset-2 ring-graystone-400 scale-110' : ''}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 bg-white rounded-xl shadow-lg relative overflow-hidden cursor-default"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
      >
        {/* SVG for lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {getLines().map(line => (
            <line
              key={line.id}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={line.color}
              strokeWidth="2"
              strokeOpacity="0.5"
            />
          ))}
        </svg>

        {/* Nodes */}
        {nodes.map(node => (
          <div
            key={node.id}
            className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-move select-none ${
              selectedNodeId === node.id ? 'z-20' : 'z-10'
            }`}
            style={{ left: node.x, top: node.y }}
            onMouseDown={(e) => handleMouseDown(e, node)}
            onDoubleClick={() => handleStartEdit(node)}
          >
            <div
              className={`px-4 py-2 rounded-xl text-white font-medium shadow-lg transition-all ${
                selectedNodeId === node.id ? 'ring-4 ring-offset-2 ring-violet-300 scale-110' : 'hover:scale-105'
              } ${node.id === 'root' ? 'text-lg' : 'text-sm'}`}
              style={{ backgroundColor: node.color, minWidth: node.id === 'root' ? '120px' : '80px' }}
            >
              {editingNodeId === node.id ? (
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleFinishEdit();
                    if (e.key === 'Escape') { setEditingNodeId(null); setEditText(''); }
                  }}
                  onBlur={handleFinishEdit}
                  className="bg-transparent border-none outline-none text-center text-white w-full"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="text-center block">{node.text}</span>
              )}
            </div>
          </div>
        ))}

        {/* Empty state hint */}
        {nodes.length === 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-sm text-graystone-400 bg-white/80 px-4 py-2 rounded-lg">
            Click the main idea, then use "Add Child" to start brainstorming
          </div>
        )}
      </div>

      <p className="text-center text-xs text-graystone-400 mt-4">
        Session only - your mind map resets when you refresh
      </p>
    </div>
  );
};

export default MindMapTool;

import React, { useState, useEffect } from 'react';
import Icon from '../../ui/Icon';

const WhiteboardPreviewCard = ({ workflowItemId, itemTitle, userEmail, currentUser, onNavigate, WHITEBOARD_API }) => {
  const [whiteboard, setWhiteboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const loadWhiteboard = async () => {
      if (!workflowItemId) {
        setLoading(false);
        return;
      }
      const wb = await WHITEBOARD_API.fetchWhiteboardByWorkflowItem(workflowItemId);
      setWhiteboard(wb);
      setLoading(false);
    };
    loadWhiteboard();
  }, [workflowItemId]);

  const handleCreateWhiteboard = async () => {
    setCreating(true);
    const newWb = await WHITEBOARD_API.createWhiteboard({
      title: `${itemTitle} - Whiteboard`,
      description: `Whiteboard for: ${itemTitle}`,
      owner_email: userEmail,
      owner_name: currentUser,
      workflow_item_id: workflowItemId,
      canvas_width: 3000,
      canvas_height: 2000
    });
    setWhiteboard(newWb);
    setCreating(false);
  };

  if (loading) {
    return (
      <div className="animate-pulse bg-graystone-100 dark:bg-graystone-700 h-20 rounded-lg" />
    );
  }

  if (!whiteboard) {
    return (
      <button
        onClick={handleCreateWhiteboard}
        disabled={creating}
        className="w-full p-4 border-2 border-dashed border-graystone-300 dark:border-graystone-600 rounded-lg
                   hover:border-ocean-400 hover:bg-ocean-50 dark:hover:bg-ocean-900/20 transition-colors
                   flex items-center justify-center gap-2 text-graystone-500 dark:text-graystone-400
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {creating ? (
          <>
            <Icon name="loader-2" className="w-5 h-5 animate-spin" />
            Creating...
          </>
        ) : (
          <>
            <Icon name="plus" className="w-5 h-5" />
            Create Whiteboard
          </>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={() => onNavigate(whiteboard.id)}
      className="w-full p-4 bg-gradient-to-br from-ocean-50 to-sky-50
                 dark:from-ocean-900/30 dark:to-sky-900/30
                 border border-ocean-200 dark:border-ocean-700 rounded-lg
                 hover:shadow-md transition-shadow text-left group"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white dark:bg-graystone-800 rounded-lg shadow-sm">
          <Icon name="layout" className="w-6 h-6 text-ocean-600 dark:text-ocean-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-ocean-900 dark:text-ocean-100 truncate">
            {whiteboard.title}
          </div>
          <div className="text-sm text-graystone-500 dark:text-graystone-400">
            Click to open whiteboard
          </div>
        </div>
        <Icon name="arrow-right" className="w-5 h-5 text-ocean-400 group-hover:translate-x-1 transition-transform" />
      </div>
    </button>
  );
};

export default WhiteboardPreviewCard;

import { useState } from 'react';
import clsx from 'clsx';
import { Icon } from '../../ui';

export default function CommentsSection({
  entry,
  currentUser,
  USERS,
  onUpdateEntry,
  userProfilesCache,
  sendNotificationEmail,
}) {
  const [commentText, setCommentText] = useState('');
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionOptions, setMentionOptions] = useState([]);

  const updateMentionOptions = (value) => {
    const match = value.match(/@([a-z0-9\s]*)$/i);
    if (match) {
      const query = match[1].trim().toLowerCase();
      setMentionQuery(query);
      const pool = Array.from(
        new Set([...(entry.collaborators || []), ...(entry.owner || []), ...USERS])
      ).filter(Boolean);
      setMentionOptions(pool.filter((name) => name.toLowerCase().includes(query)).slice(0, 6));
    } else {
      setMentionQuery('');
      setMentionOptions([]);
    }
  };

  const handleCommentChange = (e) => {
    setCommentText(e.target.value);
    updateMentionOptions(e.target.value);
  };

  const handleMentionPick = (name) => {
    setCommentText((prev) => prev.replace(/@([a-z0-9\s]*)$/i, `@${name} `));
    setMentionQuery('');
    setMentionOptions([]);
  };

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const newComment = {
      id: `c${Date.now()}`,
      text: commentText.trim(),
      author: currentUser,
      timestamp: new Date().toISOString(),
    };

    const existingComments = entry.comments || [];
    onUpdateEntry(entry.id, { comments: [...existingComments, newComment] });

    // Notify mentioned users
    const mentionMatches = commentText.match(/@([A-Za-z\s]+?)(?=\s|$|@)/g);
    if (mentionMatches) {
      mentionMatches.map((m) => m.slice(1).trim()).forEach((name) => {
        const profile = userProfilesCache.find(
          (p) => p.name.toLowerCase() === name.toLowerCase()
        );
        if (profile?.email) {
          sendNotificationEmail(profile.email, profile.name, 'mention', entry.title, entry.id, {
            comment: commentText.substring(0, 200),
          });
        }
      });
    }

    setCommentText('');
    setMentionQuery('');
    setMentionOptions([]);
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-graystone-200 shadow-sm">
      <h3 className="text-lg font-bold text-ocean-900 mb-4">Activity & Comments</h3>

      {entry.comments && entry.comments.length > 0 ? (
        <div className="space-y-4 mb-4 max-h-[400px] overflow-y-auto">
          {entry.comments.map((comment) => (
            <div key={comment.id} className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-aqua-100 flex items-center justify-center text-ocean-700 font-bold text-sm shrink-0">
                {comment.author ? comment.author.charAt(0) : 'U'}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-graystone-900">
                    {comment.author || 'User'}
                  </span>
                  <span className="text-xs text-graystone-500">
                    {comment.timestamp ? new Date(comment.timestamp).toLocaleString() : 'Recently'}
                  </span>
                </div>
                <div className="text-sm text-graystone-700 bg-graystone-50 p-3 rounded-tr-xl rounded-br-xl rounded-bl-xl">
                  {comment.text}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-graystone-500 mb-4">
          No comments yet. Be the first to comment!
        </div>
      )}

      {/* Add Comment */}
      <div className="flex gap-3 pt-4 border-t border-graystone-100">
        <div className="w-10 h-10 rounded-full bg-ocean-500 flex items-center justify-center text-white font-bold text-sm">
          {currentUser ? currentUser.charAt(0) : 'U'}
        </div>
        <form className="flex-1" onSubmit={handleCommentSubmit}>
          <div className="relative">
            <textarea
              placeholder="Add a comment... use @ to mention"
              value={commentText}
              onChange={handleCommentChange}
              className="w-full px-4 py-3 border-2 border-graystone-200 rounded-xl focus:border-ocean-500 focus:outline-none resize-none transition-colors"
              rows="3"
            />
            {mentionOptions.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 rounded-xl border border-ocean-200 bg-white shadow-xl z-10 overflow-hidden">
                <div className="px-3 py-2 bg-ocean-50 border-b border-graystone-200">
                  <span className="text-xs font-medium text-ocean-700">Mention someone</span>
                </div>
                {mentionOptions.map((name, idx) => (
                  <button
                    type="button"
                    key={name}
                    onClick={() => handleMentionPick(name)}
                    className={clsx(
                      'w-full text-left px-3 py-2.5 text-sm text-graystone-800 hover:bg-ocean-50 flex items-center gap-3 transition-colors',
                      idx === 0 && 'bg-ocean-50/50'
                    )}
                  >
                    <span className="w-8 h-8 rounded-full bg-ocean-100 text-ocean-700 flex items-center justify-center text-sm font-bold">
                      {name.split(' ').map((n) => n[0]).join('').substring(0, 2)}
                    </span>
                    <span className="font-medium">{name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              className="px-4 py-2 bg-ocean-500 text-white rounded-lg hover:bg-ocean-600 transition-colors font-medium text-sm"
            >
              Post Comment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

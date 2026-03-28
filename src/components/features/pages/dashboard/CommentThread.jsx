import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  addComment,
  fetchComments,
} from '../../../../services/landingPageRequests';
import { SEED_USERS } from '../../../../utils/config';
import { formatRelativeDate } from './dashboardUtils';

const KNOWN_USER_NAMES = new Set(SEED_USERS.map((user) => user.name.toLowerCase()));
const USER_BY_EMAIL = new Map(SEED_USERS.map((user) => [user.email, user]));
const MENTION_SPLIT_PATTERN = /(@[A-Za-z][A-Za-z-]*(?:\s[A-Za-z][A-Za-z-]*)*)(?=\s@|\s|$)/;

function renderCommentBody(body) {
  return body.split(MENTION_SPLIT_PATTERN).map((segment, index) => {
    const name = segment.startsWith('@') ? segment.slice(1).trim().toLowerCase() : '';

    if (name && KNOWN_USER_NAMES.has(name)) {
      return (
        <mark
          key={`${segment}-${index}`}
          className="rounded bg-ocean-100 px-0.5 text-ocean-700 dark:bg-ocean-500/20 dark:text-ocean-300"
        >
          {segment}
        </mark>
      );
    }

    return <React.Fragment key={`${segment}-${index}`}>{segment}</React.Fragment>;
  });
}

function CommentBubble({ comment }) {
  const authorName = comment.author_name || comment.author_email || 'Unknown user';

  return (
    <div className="rounded-lg border border-graystone-200 bg-graystone-50 p-3 dark:border-slate-700 dark:bg-slate-950/60">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ocean-900 dark:text-slate-100">{authorName}</p>
          <p className="text-xs text-graystone-500 dark:text-slate-400">{comment.author_email}</p>
        </div>
        <p className="text-right text-xs text-graystone-500 dark:text-slate-400">
          {formatRelativeDate(comment.created_at)}
        </p>
      </div>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm text-graystone-800 dark:text-slate-200">
        {renderCommentBody(comment.body || '')}
      </p>
    </div>
  );
}

export function CommentThread({
  requestId,
  userId,
  userEmail,
  currentUser,
}) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionStart, setMentionStart] = useState(-1);
  const [mentions, setMentions] = useState(() => new Set());
  const textareaRef = useRef(null);

  const loadComments = useCallback(async () => {
    if (!requestId) {
      setComments([]);
      setLoading(false);
      return [];
    }

    setLoading(true);
    const nextComments = await fetchComments(requestId);
    setComments(nextComments);
    setLoading(false);
    return nextComments;
  }, [requestId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!requestId) {
        setComments([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const nextComments = await fetchComments(requestId);
      if (cancelled) return;
      setComments(nextComments);
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [requestId]);

  const filteredUsers = useMemo(() => {
    if (mentionQuery === null) return [];

    return SEED_USERS
      .filter((user) => user.name.toLowerCase().includes(mentionQuery.toLowerCase()))
      .slice(0, 6);
  }, [mentionQuery]);

  const handleChange = useCallback((event) => {
    const nextBody = event.target.value;
    const caretPosition = event.target.selectionStart ?? nextBody.length;

    setBody(nextBody);
    setError('');
    setMentions((previousMentions) => {
      const nextMentions = new Set();
      previousMentions.forEach((email) => {
        const matchedUser = USER_BY_EMAIL.get(email);
        if (matchedUser && nextBody.includes(`@${matchedUser.name}`)) {
          nextMentions.add(email);
        }
      });
      return nextMentions;
    });

    let nextMentionQuery = null;
    let nextMentionStart = -1;

    for (let index = caretPosition - 1; index >= 0; index -= 1) {
      const character = nextBody[index];

      if (character === '@' && (index === 0 || /\s/.test(nextBody[index - 1]))) {
        const fragment = nextBody.slice(index + 1, caretPosition);
        if (!/\s/.test(fragment)) {
          nextMentionQuery = fragment;
          nextMentionStart = index;
        }
        break;
      }

      if (/\s/.test(character)) {
        break;
      }
    }

    setMentionQuery(nextMentionQuery);
    setMentionStart(nextMentionStart);
  }, []);

  const insertMention = useCallback((user) => {
    const textarea = textareaRef.current;
    const caretPosition = textarea?.selectionStart ?? body.length;

    if (mentionStart < 0) return;

    const mentionText = `@${user.name} `;
    const nextBody = `${body.slice(0, mentionStart)}${mentionText}${body.slice(caretPosition)}`;
    const nextCaretPosition = mentionStart + mentionText.length;

    setBody(nextBody);
    setError('');
    setMentions((previousMentions) => {
      const nextMentions = new Set(previousMentions);
      nextMentions.add(user.email);
      return nextMentions;
    });
    setMentionQuery(null);
    setMentionStart(-1);

    window.requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(nextCaretPosition, nextCaretPosition);
    });
  }, [body, mentionStart]);

  const handleSubmit = useCallback(async () => {
    const trimmedBody = body.trim();

    if (!trimmedBody) {
      setError('Add a comment before posting.');
      return;
    }

    setSubmitting(true);
    setError('');

    const savedComment = await addComment(
      requestId,
      trimmedBody,
      userId,
      userEmail,
      currentUser,
      Array.from(mentions),
    );

    if (!savedComment) {
      setError('We could not post that comment.');
      setSubmitting(false);
      return;
    }

    setBody('');
    setMentions(new Set());
    setMentionQuery(null);
    setMentionStart(-1);
    await loadComments();
    setSubmitting(false);
  }, [body, currentUser, loadComments, mentions, requestId, userEmail, userId]);

  return (
    <div className="rounded-xl border border-graystone-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h3 className="text-sm font-semibold text-ocean-900 dark:text-slate-100">Comments</h3>

      <div className="mt-4 space-y-4">
        {comments.map((comment) => (
          <CommentBubble key={comment.id} comment={comment} />
        ))}
        {loading && (
          <p className="text-sm text-graystone-500 dark:text-slate-400">Loading comments…</p>
        )}
        {comments.length === 0 && !loading && (
          <p className="text-sm text-graystone-500 dark:text-slate-400">No comments yet. Be the first to add one.</p>
        )}
      </div>

      <div className="relative mt-4">
        <textarea
          ref={textareaRef}
          value={body}
          onChange={handleChange}
          rows={3}
          placeholder="Add a comment… type @ to mention someone"
          className="w-full rounded-lg border border-graystone-300 px-3 py-2 text-sm text-graystone-800 outline-none transition focus:border-ocean-600 focus:ring-2 focus:ring-ocean-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-ocean-500/20"
        />
        {mentionQuery !== null && filteredUsers.length > 0 && (
          <ul className="absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border border-graystone-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
            {filteredUsers.map((user) => (
              <li key={user.email}>
                <button
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    insertMention(user);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-graystone-50 dark:hover:bg-slate-800"
                >
                  <span className="font-medium text-ocean-900 dark:text-slate-100">{user.name}</span>
                  <span className="text-xs text-graystone-500 dark:text-slate-400">{user.email}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !body.trim()}
          className="rounded-lg bg-ocean-600 px-4 py-2 text-sm text-white transition-colors hover:bg-ocean-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Posting…' : 'Post comment'}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-rose-600 dark:text-rose-300">{error}</p>}
    </div>
  );
}

export default CommentThread;

export const EFFORT_LEVELS = ['low', 'medium', 'high'];

export const EFFORT_LABELS = {
  low: 'Low effort',
  medium: 'Medium effort',
  high: 'High effort',
};

const EFFORT_TAG_PREFIX = 'effort:';

export function isEffortTag(tag) {
  return typeof tag === 'string' && tag.startsWith(EFFORT_TAG_PREFIX);
}

export function getTaskEffort(taskOrTags) {
  const tags = Array.isArray(taskOrTags) ? taskOrTags : taskOrTags?.tags;
  if (!Array.isArray(tags)) return null;

  const effortTag = tags.find((tag) => isEffortTag(tag));
  if (!effortTag) return null;

  const effort = effortTag.slice(EFFORT_TAG_PREFIX.length);
  return EFFORT_LEVELS.includes(effort) ? effort : null;
}

export function getUserTaskTags(tags = []) {
  return (Array.isArray(tags) ? tags : []).filter((tag) => !isEffortTag(tag));
}

export function setTaskEffort(tags = [], effort) {
  const nextTags = getUserTaskTags(tags);
  if (!effort || !EFFORT_LEVELS.includes(effort)) {
    return nextTags;
  }
  return [...nextTags, `${EFFORT_TAG_PREFIX}${effort}`];
}

function getEffortRank(task) {
  const effort = getTaskEffort(task);
  if (!effort) return EFFORT_LEVELS.length;
  return EFFORT_LEVELS.indexOf(effort);
}

export function compareTasksByEffortThenSortOrder(a, b) {
  const effortDelta = getEffortRank(a) - getEffortRank(b);
  if (effortDelta !== 0) return effortDelta;
  return (a.sort_order ?? 0) - (b.sort_order ?? 0);
}

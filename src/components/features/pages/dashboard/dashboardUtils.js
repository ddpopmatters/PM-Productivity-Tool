const LOCKED_STATUSES = new Set(['approved', 'in_progress', 'first_draft', 'revision_1', 'revision_2', 'live']);

export const STATUS_LABELS = {
  submitted: 'Submitted',
  pending_review: 'Awaiting review',
  needs_more_info: 'Needs more info',
  approved: 'Approved',
  in_progress: 'Build in progress',
  first_draft: 'First draft',
  revision_1: 'Revision 1',
  revision_2: 'Revision 2',
  live: 'Live',
  archived: 'Archived',
};

export function parseDateValue(dateValue, endOfDay = false) {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return new Date(dateValue);

  const parsed =
    typeof dateValue === 'string' && dateValue.includes('T')
      ? new Date(dateValue)
      : new Date(`${dateValue}T${endOfDay ? '23:59:59' : '00:00:00'}`);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(dateValue, fallback = 'Not set') {
  const parsedDate = parseDateValue(dateValue);
  if (!parsedDate) return fallback;

  return parsedDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateValue, fallback = 'Not set') {
  const parsedDate = parseDateValue(dateValue);
  if (!parsedDate) return fallback;

  return parsedDate.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeDate(dateValue) {
  const parsedDate = parseDateValue(dateValue);
  if (!parsedDate) return 'Not set';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDay = new Date(parsedDate);
  targetDay.setHours(0, 0, 0, 0);

  const diffInDays = Math.round((targetDay.getTime() - today.getTime()) / 86400000);
  const time = parsedDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (diffInDays === 0) return `Today at ${time}`;
  if (diffInDays === -1) return `Yesterday at ${time}`;

  return formatDateTime(parsedDate);
}

export function getDaysToGoLive(goLiveDate) {
  const parsedDate = parseDateValue(goLiveDate);
  if (!parsedDate) return null;
  return Math.ceil((parsedDate.getTime() - Date.now()) / 86400000);
}

export function getStatusLabel(status) {
  return STATUS_LABELS[status] || 'Submitted';
}

export function getPageGoalLabel(goal) {
  switch (goal) {
    case 'signup':
      return 'Signup';
    case 'share':
      return 'Share';
    case 'other':
      return 'Other';
    default:
      return 'Donate';
  }
}

export function getAssetStatusLabel(status) {
  return status === 'owner_pending' ? 'Owner pending' : 'Attached';
}

export function getFeedbackTypeLabel(type) {
  switch (type) {
    case 'copy_edit':
      return 'Copy edit';
    case 'broken_element':
      return 'Broken element';
    default:
      return 'Content change';
  }
}

export function getRequestSummaryItems(request) {
  return [
    { label: 'Requester', value: request?.requester_email || 'Unknown requester' },
    { label: 'Page goal', value: getPageGoalLabel(request?.page_goal) },
    { label: 'Audience', value: request?.audience || 'No audience provided', fullWidth: true },
    { label: 'Copy status', value: getAssetStatusLabel(request?.copy_status) },
    { label: 'Copy owner', value: request?.copy_owner || 'Not needed' },
    { label: 'Copy due date', value: request?.copy_due_date ? formatDate(request.copy_due_date) : 'Not needed' },
    { label: 'Asset status', value: getAssetStatusLabel(request?.asset_status) },
    { label: 'Asset owner', value: request?.asset_owner || 'Not needed' },
    { label: 'Asset due date', value: request?.asset_due_date ? formatDate(request.asset_due_date) : 'Not needed' },
    { label: 'Go-live date', value: request?.go_live_date ? formatDate(request.go_live_date) : 'Not set' },
    {
      label: 'Expedited justification',
      value: request?.expedited_justification || 'Not provided',
      fullWidth: true,
    },
    { label: 'Named approver', value: request?.named_approver || 'Not set' },
    { label: 'Revision rounds agreed', value: `${request?.revision_rounds_agreed || 2}` },
    {
      label: 'Extended rounds reason',
      value: request?.extended_rounds_reason || 'Not needed',
      fullWidth: true,
    },
  ];
}

export function subtractWorkingDays(date, n) {
  const d = new Date(date);
  let removed = 0;
  while (removed < n) {
    d.setDate(d.getDate() - 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) removed += 1;
  }
  return d;
}

export function getTimelineMilestones(goLiveDate) {
  const offsets = [28, 20, 14, 7, 3, 0];
  const labels = ['Brief confirmed', 'Build starts', 'First draft', 'Revision 1', 'Revision 2', 'Go-live'];

  return labels.map((label, index) => ({
    label,
    date: offsets[index] === 0 ? parseDateValue(goLiveDate) : subtractWorkingDays(goLiveDate, offsets[index]),
    isLive: offsets[index] === 0,
  }));
}

export function getMilestoneIndex(status) {
  switch (status) {
    case 'pending_review':
    case 'submitted':
    case 'needs_more_info':
      return 0;
    case 'approved':
    case 'in_progress':
      return 1;
    case 'first_draft':
      return 2;
    case 'revision_1':
      return 3;
    case 'revision_2':
      return 4;
    case 'live':
    case 'archived':
      return 5;
    default:
      return 0;
  }
}

export function getStatusUpdateFields(request, newStatus) {
  if (newStatus === 'needs_more_info') {
    return { brief_locked_at: null };
  }

  if (LOCKED_STATUSES.has(newStatus) && !request?.brief_locked_at) {
    return { brief_locked_at: new Date().toISOString() };
  }

  return {};
}

export function getNextStatusAction(request) {
  switch (request?.status) {
    case 'submitted':
    case 'pending_review':
    case 'needs_more_info':
      return { status: 'approved', label: 'Approved' };
    case 'approved':
      return { status: 'in_progress', label: 'In progress' };
    case 'in_progress':
      return { status: 'first_draft', label: 'First draft' };
    case 'revision_1':
      return Number(request?.revision_rounds_agreed) === 3
        ? { status: 'revision_2', label: 'Revision 2' }
        : { status: 'live', label: 'Live' };
    case 'revision_2':
      return { status: 'live', label: 'Live' };
    case 'live':
      return { status: 'archived', label: 'Archived' };
    default:
      return null;
  }
}

function hasFeedbackForRound(feedbackItems, roundNumber) {
  return (feedbackItems || []).some((feedback) => Number(feedback?.round_number) === roundNumber);
}

export function getTurnInfo(request, pagesRole, feedbackItems) {
  let party = 'builder';
  let description = 'Review the brief and approve or request more information';
  let actionLabel = 'Approve brief';

  switch (request?.status) {
    case 'submitted':
    case 'pending_review':
      party = 'builder';
      description = 'Review the brief and approve or request more information';
      actionLabel = 'Approve brief';
      break;
    case 'needs_more_info':
      party = 'requester';
      description = 'Update your brief then re-submit it to the builder';
      actionLabel = 'Re-submit brief';
      break;
    case 'approved':
      party = 'builder';
      description = 'Brief approved — start the build when you\'re ready';
      actionLabel = 'Start build';
      break;
    case 'in_progress':
      party = 'builder';
      description = 'Build the page, then submit the first draft for review';
      actionLabel = 'Submit first draft';
      break;
    case 'first_draft':
      party = 'approver';
      description = 'The first draft is ready — review and approve or request revisions';
      actionLabel = 'Approve — go live';
      break;
    case 'revision_1':
      if (hasFeedbackForRound(feedbackItems, 1)) {
        party = 'builder';
        description = 'Revision 1 feedback is in — implement changes and submit';
        actionLabel = 'Submit revision';
      } else {
        party = 'requester';
        description = 'Submit your revision 1 feedback for the builder';
        actionLabel = 'Submit feedback';
      }
      break;
    case 'revision_2':
      if (hasFeedbackForRound(feedbackItems, 2)) {
        party = 'builder';
        description = 'Revision 2 feedback is in — implement changes and submit';
        actionLabel = 'Submit revision';
      } else {
        party = 'requester';
        description = 'Submit your revision 2 feedback for the builder';
        actionLabel = 'Submit feedback';
      }
      break;
    case 'live':
      party = 'done';
      description = 'This page is live';
      actionLabel = null;
      break;
    case 'archived':
      party = 'done';
      description = 'This request is archived';
      actionLabel = null;
      break;
    default:
      break;
  }

  const isYourTurn = party !== 'done' && pagesRole === party;
  const heading =
    party === 'done'
      ? 'Complete'
      : isYourTurn
        ? 'Your turn'
        : `Waiting for ${party.charAt(0).toUpperCase() + party.slice(1)}`;

  return {
    party,
    isYourTurn,
    heading,
    description,
    actionLabel,
  };
}

export function getCurrentRound(status) {
  if (status === 'revision_2') return 2;
  if (status === 'revision_1') return 1;
  return null;
}

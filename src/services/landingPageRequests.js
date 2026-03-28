import { getSupabase } from '../api/supabase';
import { Logger } from '../utils/logger';

const toNullable = (value) => {
  if (value === undefined || value === null || value === '') return null;
  return value;
};

export async function fetchDashboardRequests() {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('landing_page_requests')
    .select('*')
    .neq('status', 'archived')
    .order('go_live_date', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    Logger.error(error, 'Supabase fetch error');
    return [];
  }

  const requests = data || [];
  if (requests.length === 0) return requests;

  const requestIds = requests.map(request => request.id);
  const { data: amendments, error: amendmentsError } = await supabase
    .from('amendments')
    .select('request_id')
    .in('request_id', requestIds)
    .eq('status', 'pending');

  if (amendmentsError) {
    Logger.error(amendmentsError, 'Supabase fetch error');
    return [];
  }

  const amendmentCounts = (amendments || []).reduce((counts, amendment) => {
    counts[amendment.request_id] = (counts[amendment.request_id] || 0) + 1;
    return counts;
  }, {});

  return requests.map(request => ({
    ...request,
    amendment_count: amendmentCounts[request.id] || 0,
    pending_amendment_count: amendmentCounts[request.id] || 0,
  }));
}

export async function fetchRequesterRequests(userId) {
  const supabase = getSupabase();
  if (!supabase || !userId) return [];

  const { data, error } = await supabase
    .from('landing_page_requests')
    .select('*')
    .eq('requester_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    Logger.error(error, 'Supabase fetch error');
    return [];
  }

  return data || [];
}

export async function fetchRequestById(id) {
  const supabase = getSupabase();
  if (!supabase || !id) return null;

  const { data, error } = await supabase
    .from('landing_page_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    Logger.error(error, 'Supabase fetch error');
    return null;
  }

  return data || null;
}

export async function fetchRevisionFeedback(requestId) {
  const supabase = getSupabase();
  if (!supabase || !requestId) return [];

  const { data, error } = await supabase
    .from('revision_feedback')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true });

  if (error) {
    Logger.error(error, 'Supabase fetch error');
    return [];
  }

  return data || [];
}

export async function fetchAmendments(requestId) {
  const supabase = getSupabase();
  if (!supabase || !requestId) return [];

  const { data, error } = await supabase
    .from('amendments')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: false });

  if (error) {
    Logger.error(error, 'Supabase fetch error');
    return [];
  }

  return data || [];
}

export async function createRequest(data, userId, userEmail) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: inserted, error } = await supabase
    .from('landing_page_requests')
    .insert([{
      requester_id: userId,
      requester_email: userEmail,
      title: data.title,
      page_type: data.pageType,
      page_goal: data.pageGoal,
      audience: data.audience,
      copy_status: data.copyStatus,
      copy_owner: toNullable(data.copyOwner),
      copy_due_date: toNullable(data.copyDueDate),
      asset_status: data.assetStatus,
      asset_owner: toNullable(data.assetOwner),
      asset_due_date: toNullable(data.assetDueDate),
      go_live_date: data.goLiveDate,
      expedited_justification: toNullable(data.expeditedJustification),
      named_approver: data.namedApprover,
      revision_rounds_agreed: data.revisionRoundsAgreed ?? 2,
      extended_rounds_reason: toNullable(data.extendedRoundsReason),
      document_links: data.documentLinks ?? [],
    }])
    .select()
    .single();

  if (error) {
    Logger.error(error, 'Supabase save error');
    return null;
  }

  return inserted;
}

export async function updateRequestStatus(id, status, extraFields = {}) {
  const supabase = getSupabase();
  if (!supabase || !id) return null;

  const updateObj = {
    ...extraFields,
    status,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('landing_page_requests')
    .update(updateObj)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    Logger.error(error, `Supabase update error for id ${id}`);
    return null;
  }

  return data;
}

export async function updateBuilderNotes(id, notes) {
  const supabase = getSupabase();
  if (!supabase || !id) return null;

  const { data, error } = await supabase
    .from('landing_page_requests')
    .update({
      builder_notes: notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    Logger.error(error, `Supabase update error for id ${id}`);
    return null;
  }

  return data;
}

export async function addRevisionFeedback(requestId, feedbackType, description, roundNumber, createdBy) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('revision_feedback')
    .insert([{
      request_id: requestId,
      feedback_type: feedbackType,
      description,
      round_number: roundNumber,
      created_by: createdBy,
    }])
    .select()
    .single();

  if (error) {
    Logger.error(error, 'Supabase save error');
    return null;
  }

  return data;
}

export async function flagFeedback(feedbackItemId, flagReason) {
  const supabase = getSupabase();
  if (!supabase || !feedbackItemId) return null;

  const { data, error } = await supabase
    .from('revision_feedback')
    .update({
      is_flagged: true,
      flag_reason: flagReason,
    })
    .eq('id', feedbackItemId)
    .select()
    .single();

  if (error) {
    Logger.error(error, `Supabase update error for id ${feedbackItemId}`);
    return null;
  }

  return data;
}

export async function raiseAmendment(requestId, justification, requestedBy) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('amendments')
    .insert([{
      request_id: requestId,
      justification,
      requested_by: requestedBy,
    }])
    .select()
    .single();

  if (error) {
    Logger.error(error, 'Supabase save error');
    return null;
  }

  return data;
}

export async function resolveAmendment(amendmentId, decision) {
  const supabase = getSupabase();
  if (!supabase || !amendmentId) return null;

  const { data, error } = await supabase
    .from('amendments')
    .update({
      status: decision,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', amendmentId)
    .select()
    .single();

  if (error) {
    Logger.error(error, `Supabase update error for id ${amendmentId}`);
    return null;
  }

  return data;
}

export async function fetchRequestFiles(requestId) {
  const supabase = getSupabase();
  if (!supabase || !requestId) return [];

  const { data, error } = await supabase
    .from('request_files')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true });

  if (error) {
    Logger.error(error, 'Supabase fetch error');
    return [];
  }

  return data || [];
}

export async function uploadRequestFile(file, requestId, userId) {
  const supabase = getSupabase();
  if (!supabase || !file || !requestId) return null;

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${requestId}/${Date.now()}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from('pages-hub-files')
    .upload(filePath, file, { upsert: false });

  if (uploadError) {
    Logger.error(uploadError, 'Supabase storage upload error');
    return null;
  }

  const { data: inserted, error: dbError } = await supabase
    .from('request_files')
    .insert([{
      request_id: requestId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type || null,
      uploaded_by: userId,
    }])
    .select()
    .single();

  if (dbError) {
    Logger.error(dbError, 'Supabase file record error');
    return null;
  }

  return inserted;
}

export async function getRequestFileUrl(filePath) {
  const supabase = getSupabase();
  if (!supabase || !filePath) return null;

  const { data } = supabase.storage
    .from('pages-hub-files')
    .getPublicUrl(filePath);

  return data?.publicUrl || null;
}

export async function deleteRequestFile(fileId, filePath) {
  const supabase = getSupabase();
  if (!supabase || !fileId) return false;

  if (filePath) {
    await supabase.storage.from('pages-hub-files').remove([filePath]);
  }

  const { error } = await supabase.from('request_files').delete().eq('id', fileId);
  if (error) {
    Logger.error(error, 'Supabase file delete error');
    return false;
  }

  return true;
}

export async function updatePageUrl(id, pageUrl) {
  const supabase = getSupabase();
  if (!supabase || !id) return null;

  const { data, error } = await supabase
    .from('landing_page_requests')
    .update({ page_url: pageUrl, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    Logger.error(error, 'Supabase update error');
    return null;
  }

  return data;
}

export async function appendStatusHistory(id, status, changedBy) {
  const supabase = getSupabase();
  if (!supabase || !id) return null;

  const { data: current } = await supabase
    .from('landing_page_requests')
    .select('status_history')
    .eq('id', id)
    .single();

  const history = current?.status_history || [];
  const updated = [
    ...history,
    { status, changed_at: new Date().toISOString(), changed_by: changedBy },
  ];

  const { data, error } = await supabase
    .from('landing_page_requests')
    .update({ status_history: updated, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    Logger.error(error, 'Supabase update error');
    return null;
  }

  return data;
}

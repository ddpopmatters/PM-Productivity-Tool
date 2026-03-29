import React, { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import {
  fetchRequestFiles,
  getRequestFileUrl,
  uploadRequestFile,
} from '../../../../services/landingPageRequests';

function isHtmlFile(file) {
  return file?.file_name?.toLowerCase().endsWith('.html') || file?.mime_type === 'text/html';
}

function getFileTimestamp(file) {
  const timestamp = file?.created_at ? new Date(file.created_at).getTime() : 0;
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getLatestHtmlFile(files) {
  return (files || [])
    .filter(isHtmlFile)
    .sort((left, right) => getFileTimestamp(right) - getFileTimestamp(left))[0] || null;
}

export function BuilderDraftCard({
  requestId,
  userId,
  pagesRole,
  request,
  onUploaded,
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [latestDraft, setLatestDraft] = useState(null);
  const [loadingDraft, setLoadingDraft] = useState(true);

  useEffect(() => {
    setLatestDraft(null);
    setUploadError('');
  }, [requestId]);

  useEffect(() => {
    let isCancelled = false;

    async function loadLatestDraft() {
      if (pagesRole !== 'builder' || !requestId) {
        setLatestDraft(null);
        setLoadingDraft(false);
        return;
      }

      setLoadingDraft(true);

      try {
        const files = await fetchRequestFiles(requestId);
        const latestHtmlFile = getLatestHtmlFile(files);

        if (!latestHtmlFile) {
          if (!isCancelled) {
            setLatestDraft(null);
          }
          return;
        }

        const url = await getRequestFileUrl(latestHtmlFile.file_path);

        if (!isCancelled) {
          setLatestDraft({
            ...latestHtmlFile,
            url,
          });
        }
      } catch (error) {
        if (!isCancelled) {
          setLatestDraft(null);
        }
      } finally {
        if (!isCancelled) {
          setLoadingDraft(false);
        }
      }
    }

    loadLatestDraft();

    return () => {
      isCancelled = true;
    };
  }, [pagesRole, requestId, request]);

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.html') && file.type !== 'text/html') {
      setUploadError('Please choose an HTML file.');
      event.target.value = '';
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      const result = await uploadRequestFile(file, requestId, userId);

      if (!result) {
        setUploadError('Upload failed. Please try again.');
      } else {
        const url = await getRequestFileUrl(result.file_path);
        setLatestDraft({ ...result, url });
        onUploaded?.();
      }
    } catch (error) {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  if (pagesRole !== 'builder') {
    return null;
  }

  return (
    <div className="rounded-xl border border-graystone-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h3 className="text-sm font-semibold text-ocean-900 dark:text-slate-100">HTML draft</h3>
      <p className="mt-1 text-xs text-graystone-500 dark:text-slate-400">
        Upload the built HTML file for the requester to preview.
      </p>

      {latestDraft && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm dark:bg-emerald-500/10">
          <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="flex-1 truncate text-emerald-800 dark:text-emerald-300">{latestDraft.file_name}</span>
          <span className="text-xs text-emerald-600 dark:text-emerald-400">Current draft</span>
        </div>
      )}

      <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-graystone-300 px-4 py-3 text-sm text-graystone-600 hover:border-ocean-400 hover:text-ocean-700 dark:border-slate-600 dark:text-slate-400">
        <input
          type="file"
          accept=".html,text/html"
          className="sr-only"
          disabled={uploading || loadingDraft}
          onChange={handleUpload}
        />
        {loadingDraft
          ? 'Checking current draft...'
          : uploading
            ? 'Uploading...'
            : latestDraft
              ? 'Upload new version'
              : 'Choose HTML file'}
      </label>

      {uploadError && <p className="mt-2 text-sm text-rose-600 dark:text-rose-300">{uploadError}</p>}
    </div>
  );
}

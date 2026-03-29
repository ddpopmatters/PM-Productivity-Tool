import React, { useEffect, useState } from 'react';
import { Monitor } from 'lucide-react';
import {
  fetchRequestFiles,
  getRequestFileUrl,
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

export function DraftPreviewPanel({ requestId, request }) {
  const [draftFile, setDraftFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [htmlContent, setHtmlContent] = useState(null);
  const [fetchingHtml, setFetchingHtml] = useState(false);

  useEffect(() => {
    setDraftFile(null);
    setHtmlContent(null);
    setPreviewOpen(false);
  }, [requestId]);

  useEffect(() => {
    let isCancelled = false;

    async function loadLatestDraft() {
      if (!requestId) {
        setDraftFile(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const files = await fetchRequestFiles(requestId);
        const latestHtmlFile = getLatestHtmlFile(files);

        if (!latestHtmlFile) {
          if (!isCancelled) {
            setDraftFile(null);
            setHtmlContent(null);
          }
          return;
        }

        const url = await getRequestFileUrl(latestHtmlFile.file_path);

        if (!isCancelled) {
          setDraftFile({
            ...latestHtmlFile,
            url,
          });
          setHtmlContent(null);
        }
      } catch (error) {
        if (!isCancelled) {
          setDraftFile(null);
          setHtmlContent(null);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadLatestDraft();

    return () => {
      isCancelled = true;
    };
  }, [requestId, request]);

  useEffect(() => {
    if (!previewOpen || htmlContent !== null || !draftFile?.url) return undefined;

    let isCancelled = false;
    setFetchingHtml(true);

    fetch(draftFile.url)
      .then((response) => response.text())
      .then((text) => {
        if (!isCancelled) {
          setHtmlContent(text);
          setFetchingHtml(false);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setHtmlContent('');
          setFetchingHtml(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [previewOpen, htmlContent, draftFile]);

  if ((loading && !draftFile) || !draftFile) {
    return null;
  }

  return (
    <div className="rounded-xl border border-ocean-200 bg-white shadow-sm dark:border-ocean-500/30 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4 text-ocean-600 dark:text-ocean-400" />
          <h3 className="text-sm font-semibold text-ocean-900 dark:text-slate-100">Draft preview</h3>
          <span className="rounded-full bg-ocean-100 px-2 py-0.5 text-xs font-medium text-ocean-700 dark:bg-ocean-500/20 dark:text-ocean-300">
            {draftFile.file_name}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setPreviewOpen((open) => !open)}
          className="rounded-lg border border-graystone-300 px-3 py-1.5 text-sm text-graystone-700 transition-colors hover:bg-graystone-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {previewOpen ? 'Hide preview' : 'View draft'}
        </button>
      </div>

      {previewOpen && (
        <div className="border-t border-graystone-200 dark:border-slate-700">
          {fetchingHtml ? (
            <div className="flex h-64 items-center justify-center text-sm text-graystone-500 dark:text-slate-400">
              Loading preview...
            </div>
          ) : (
            <iframe
              title="Draft preview"
              srcDoc={htmlContent || ''}
              sandbox="allow-scripts allow-forms"
              className="h-[600px] w-full rounded-b-xl border-0"
            />
          )}
        </div>
      )}
    </div>
  );
}

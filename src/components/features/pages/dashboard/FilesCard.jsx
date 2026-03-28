import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, FileText } from 'lucide-react';
import {
  fetchRequestFiles,
  getRequestFileUrl,
} from '../../../../services/landingPageRequests';

function normalizeLinks(documentLinks) {
  if (!Array.isArray(documentLinks)) return [];

  return documentLinks
    .map((link, index) => {
      if (typeof link === 'string') {
        return {
          label: `Reference link ${index + 1}`,
          url: link,
        };
      }

      if (!link?.url) return null;

      return {
        label: link.label || `Reference link ${index + 1}`,
        url: link.url,
      };
    })
    .filter(Boolean);
}

export default function FilesCard({ requestId, request }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const documentLinks = useMemo(() => normalizeLinks(request?.document_links), [request?.document_links]);

  useEffect(() => {
    let isCancelled = false;

    async function loadFiles() {
      if (!requestId) {
        setFiles([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const uploadedFiles = await fetchRequestFiles(requestId);
        const filesWithUrls = await Promise.all(
          (uploadedFiles || []).map(async (file) => ({
            ...file,
            url: await getRequestFileUrl(file.file_path),
          }))
        );

        if (!isCancelled) {
          setFiles(filesWithUrls);
        }
      } catch (err) {
        if (!isCancelled) {
          setFiles([]);
          setError(err?.message || 'We could not load files for this request.');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadFiles();

    return () => {
      isCancelled = true;
    };
  }, [requestId]);

  const hasContent = files.length > 0 || documentLinks.length > 0;

  return (
    <div className="rounded-xl border border-graystone-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-base font-semibold text-ocean-900 dark:text-slate-100">Files &amp; links</h2>

      {loading ? (
        <p className="mt-3 text-sm text-graystone-600 dark:text-slate-400">Loading files…</p>
      ) : error ? (
        <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{error}</p>
      ) : !hasContent ? (
        <p className="mt-3 text-sm text-graystone-700 dark:text-slate-300">No files attached yet.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-graystone-200 p-3 dark:border-slate-700"
            >
              <div className="flex min-w-0 items-center gap-3">
                <FileText className="h-4 w-4 shrink-0 text-aqua-500" />
                <span className="truncate text-sm text-graystone-800 dark:text-slate-200">{file.file_name}</span>
              </div>
              {file.url ? (
                <a
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-sm font-medium text-ocean-700 hover:text-ocean-800 dark:text-ocean-300 dark:hover:text-ocean-200"
                >
                  Download
                </a>
              ) : (
                <span className="shrink-0 text-xs text-graystone-500 dark:text-slate-400">Unavailable</span>
              )}
            </div>
          ))}

          {documentLinks.map((link) => (
            <a
              key={`${link.label}-${link.url}`}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-3 rounded-lg border border-graystone-200 p-3 transition-colors hover:bg-graystone-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <div className="flex min-w-0 items-center gap-3">
                <ExternalLink className="h-4 w-4 shrink-0 text-aqua-500" />
                <span className="truncate text-sm text-graystone-800 dark:text-slate-200">{link.label}</span>
              </div>
              <span className="shrink-0 text-sm font-medium text-ocean-700 dark:text-ocean-300">Open</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

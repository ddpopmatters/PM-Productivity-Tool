import { useState, useRef } from 'react';
import clsx from 'clsx';
import { Icon, LoadingSpinner } from '../../ui';
import { validateFilesForUpload, getAllowedExtensions } from '../../../utils/security';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileIcon(type) {
  if (type?.startsWith('image/')) return 'image';
  if (type?.startsWith('video/')) return 'video';
  if (type?.includes('pdf')) return 'file-text';
  if (type?.includes('spreadsheet') || type?.includes('excel')) return 'table';
  if (type?.includes('document') || type?.includes('word')) return 'file-text';
  return 'file';
}

export default function AttachmentsCard({ entry, canEdit, onUpdateEntry, SUPABASE_API, Logger }) {
  const [uploadingFile, setUploadingFile] = useState(false);
  const attachmentInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const { validFiles: typeValidFiles, invalidFiles: typeInvalidFiles } = validateFilesForUpload(files);

    if (typeInvalidFiles.length > 0) {
      alert(
        `${typeInvalidFiles.length} file(s) have invalid types and will be skipped:\n${typeInvalidFiles.map((f) => `${f.file.name}: ${f.error}`).join('\n')}`
      );
    }

    const oversizedFiles = typeValidFiles.filter((f) => f.size > MAX_FILE_SIZE);
    const validFiles = typeValidFiles.filter((f) => f.size <= MAX_FILE_SIZE);

    if (oversizedFiles.length > 0) {
      alert(
        `${oversizedFiles.length} file(s) exceed the 10MB limit and will be skipped:\n${oversizedFiles.map((f) => f.name).join('\n')}`
      );
    }

    if (!validFiles.length) {
      if (attachmentInputRef.current) attachmentInputRef.current.value = '';
      return;
    }

    setUploadingFile(true);
    const uploadedFiles = [];
    const failedFiles = [];

    try {
      for (const file of validFiles) {
        try {
          const result = await SUPABASE_API.uploadFile(file, entry.id);
          if (result) {
            uploadedFiles.push(result);
          } else {
            failedFiles.push(file.name);
          }
        } catch (fileErr) {
          Logger.error(fileErr, `Failed to upload ${file.name}`);
          failedFiles.push(file.name);
        }
      }

      if (uploadedFiles.length > 0) {
        const existingAttachments = entry.attachments || [];
        onUpdateEntry(entry.id, { attachments: [...existingAttachments, ...uploadedFiles] });
      }

      if (failedFiles.length > 0) {
        alert(`Failed to upload ${failedFiles.length} file(s):\n${failedFiles.join('\n')}`);
      }
    } catch (err) {
      Logger.error(err, 'Upload error');
      alert('An error occurred while uploading files. Please try again.');
    } finally {
      setUploadingFile(false);
      if (attachmentInputRef.current) attachmentInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async (attachment) => {
    if (attachment.path) {
      await SUPABASE_API.deleteFile(attachment.path);
    }
    const newAttachments = (entry.attachments || []).filter((a) => a.id !== attachment.id);
    onUpdateEntry(entry.id, { attachments: newAttachments });
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-graystone-200 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-ocean-900">Attachments</h3>
        {canEdit && (
          <button
            onClick={() => attachmentInputRef.current?.click()}
            disabled={uploadingFile}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-ocean-50 transition-colors disabled:opacity-50"
            aria-label={uploadingFile ? 'Uploading file' : 'Attach file'}
          >
            {uploadingFile ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Icon name="paperclip" className="w-5 h-5 text-ocean-600" />
            )}
          </button>
        )}
        <input
          ref={attachmentInputRef}
          type="file"
          multiple
          onChange={handleFileUpload}
          className="hidden"
          accept={getAllowedExtensions()}
        />
      </div>
      {entry.attachments && entry.attachments.length > 0 ? (
        <div className="space-y-2">
          {entry.attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-3 bg-graystone-50 rounded-xl group"
            >
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 flex-1 min-w-0 hover:text-ocean-600 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-ocean-100 flex items-center justify-center shrink-0">
                  <Icon name={getFileIcon(attachment.type)} className="w-5 h-5 text-ocean-600" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-graystone-900 truncate">{attachment.name}</div>
                  <div className="text-xs text-graystone-500">{formatFileSize(attachment.size)}</div>
                </div>
              </a>
              {canEdit && (
                <button
                  onClick={() => handleDeleteAttachment(attachment)}
                  className="p-2 hover:bg-red-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Icon name="trash-2" className="w-4 h-4 text-red-500" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div
          className={clsx(
            'text-sm text-graystone-500 text-center py-6 bg-graystone-50 rounded-xl border-2 border-dashed border-graystone-200 transition-colors',
            canEdit && 'cursor-pointer hover:border-ocean-300 hover:bg-ocean-50/30'
          )}
          onClick={() => canEdit && attachmentInputRef.current?.click()}
        >
          <div className="flex justify-center mb-2">
            <Icon name="upload-cloud" className="w-8 h-8 text-graystone-300" />
          </div>
          <div>No attachments</div>
          {canEdit && <div className="text-xs text-ocean-500 mt-1">Click to upload</div>}
        </div>
      )}
    </div>
  );
}

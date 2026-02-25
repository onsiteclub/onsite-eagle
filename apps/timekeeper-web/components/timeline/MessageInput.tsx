'use client';

import { useState } from 'react';

interface MessageInputProps {
  disabled?: boolean;
  sending?: boolean;
  onSend: (content: string, files: File[]) => Promise<void> | void;
}

export function MessageInput({ disabled, sending, onSend }: MessageInputProps) {
  const [value, setValue] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);

  const submit = async () => {
    const content = value.trim();
    if ((!content && files.length === 0) || disabled || sending) return;
    setValue('');
    const queued = files;
    setFiles([]);
    await onSend(content, queued);
  };

  return (
    <div className="border-t border-border bg-white p-3">
      <div
        className={`mb-2 rounded-lg border border-dashed p-2 text-xs text-text-secondary ${dragging ? 'border-primary bg-primary-light' : 'border-border'}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const dropped = Array.from(e.dataTransfer.files || []).filter((f) => f.type.startsWith('image/'));
          if (dropped.length > 0) setFiles((prev) => [...prev, ...dropped]);
        }}
      >
        Drag and drop photos here (optional)
      </div>

      {files.length > 0 ? (
        <div className="mb-2 text-xs text-text-secondary">
          {files.length} photo(s) queued
        </div>
      ) : null}

      <div className="flex gap-2 items-end">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Type a message..."
          disabled={disabled || sending}
          className="flex-1 rounded-xl border border-border px-3 py-2 text-sm text-text-primary resize-none min-h-[44px] max-h-28 focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <button
          onClick={submit}
          disabled={disabled || sending || (!value.trim() && files.length === 0)}
          className="h-11 px-4 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50"
          type="button"
        >
          {sending ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

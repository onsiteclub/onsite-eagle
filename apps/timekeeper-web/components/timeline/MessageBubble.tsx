'use client';

import type { TimelineMessage } from '@onsite/timeline';
import { SENDER_CONFIG } from '@onsite/timeline/constants';
import { formatMessageTime } from '@onsite/timeline/data';

interface MessageBubbleProps {
  message: TimelineMessage;
  isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const cfg = SENDER_CONFIG[message.sender_type] || SENDER_CONFIG.system;

  if (isOwn) {
    return (
      <div className="w-full flex justify-end mb-2">
        <div className="max-w-[80%] rounded-xl bg-primary text-white px-3 py-2 border border-primary">
          <p className="text-sm leading-5 whitespace-pre-wrap">{message.content}</p>
          <p className="text-[11px] mt-1 text-right text-white/80">{formatMessageTime(message.created_at)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-start mb-2">
      <div className="max-w-[80%] rounded-xl bg-white px-3 py-2 border border-border border-l-4" style={{ borderLeftColor: cfg.color }}>
        <p className="text-xs font-semibold mb-0.5" style={{ color: cfg.color }}>
          {message.sender_name || cfg.label}
        </p>
        <p className="text-sm text-text-primary leading-5 whitespace-pre-wrap">{message.content}</p>
        <p className="text-[11px] mt-1 text-right text-text-muted">{formatMessageTime(message.created_at)}</p>
      </div>
    </div>
  );
}

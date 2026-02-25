'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { TimelineMessage } from '@onsite/timeline';
import { fetchMessages, sendMessage, subscribeToMessages, formatDateDivider } from '@onsite/timeline/data';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';

interface FeedItem {
  key: string;
  type: 'date' | 'message';
  date?: string;
  message?: TimelineMessage;
}

const supabase = createClient();

export function TimelineFeed() {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [senderName, setSenderName] = useState('Worker');
  const [messages, setMessages] = useState<TimelineMessage[]>([]);

  const loadContextAndMessages = useCallback(async () => {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;

    if (!user) {
      setSiteId(null);
      setMessages([]);
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const { data: profile } = await supabase
      .from('core_profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    setSenderName(profile?.full_name || user.email || 'Worker');

    const { data: workerSite } = await supabase
      .from('egl_site_workers')
      .select('site_id')
      .eq('worker_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    const resolvedSiteId = workerSite?.site_id || null;
    setSiteId(resolvedSiteId);

    if (!resolvedSiteId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const result = await fetchMessages(supabase as never, {
      site_id: resolvedSiteId,
      limit: 150,
    });
    setMessages((result.data || []).slice().reverse());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadContextAndMessages();
  }, [loadContextAndMessages]);

  useEffect(() => {
    if (!siteId) return undefined;
    const unsubscribe = subscribeToMessages(
      supabase as never,
      {
        site_id: siteId,
        onMessage: (newMessage: TimelineMessage) => setMessages((prev) => [newMessage, ...prev]),
      },
    );

    return unsubscribe;
  }, [siteId]);

  const items = useMemo<FeedItem[]>(() => {
    const list: FeedItem[] = [];
    let previousDate: string | null = null;

    for (const message of messages) {
      const dateKey = new Date(message.created_at).toDateString();
      if (dateKey !== previousDate) {
        list.push({ key: `d-${dateKey}`, type: 'date', date: message.created_at });
        previousDate = dateKey;
      }
      list.push({ key: `m-${message.id}`, type: 'message', message });
    }

    return list;
  }, [messages]);

  const handleSend = useCallback(
    async (content: string, files: File[]) => {
      if (!siteId) return;
      setSending(true);

      const attachmentNote = files.length > 0 ? `\n\n[${files.length} photo(s) queued for upload]` : '';
      const message = `${content || 'Attachment'}${attachmentNote}`.trim();

      await sendMessage(supabase as never, {
        site_id: siteId,
        sender_type: 'worker',
        sender_id: userId || undefined,
        sender_name: senderName,
        content: message,
        source_app: 'timekeeper',
      });

      setSending(false);
    },
    [siteId, userId, senderName],
  );

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-white p-6 text-text-secondary">
        Loading timeline...
      </div>
    );
  }

  if (!siteId) {
    return (
      <div className="rounded-xl border border-border bg-white p-6">
        <h2 className="text-base font-semibold text-text-primary">No site assigned</h2>
        <p className="text-sm text-text-secondary mt-1">
          Link this worker to a jobsite in Monitor to enable timeline updates.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden">
      <div className="h-[62vh] overflow-y-auto flex flex-col-reverse p-3 bg-surface">
        <div>
          {items.map((item) => {
            if (item.type === 'date' && item.date) {
              return (
                <div key={item.key} className="my-3 flex items-center gap-2">
                  <div className="h-px bg-border flex-1" />
                  <span className="text-xs text-text-muted font-semibold">{formatDateDivider(item.date)}</span>
                  <div className="h-px bg-border flex-1" />
                </div>
              );
            }

            return (
              <MessageBubble
                key={item.key}
                message={item.message!}
                isOwn={!!userId && item.message?.sender_id === userId}
              />
            );
          })}
        </div>
      </div>

      <MessageInput disabled={!siteId} sending={sending} onSend={handleSend} />
    </div>
  );
}

'use client';

import { TimelineFeed } from '@/components/timeline/TimelineFeed';

export default function TimelinePage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Timeline</h1>
        <p className="text-sm text-text-secondary mt-1">
          Site events and updates from all team members
        </p>
      </div>

      <TimelineFeed />
    </div>
  );
}

/**
 * Plans Page — Timekeeper Web
 *
 * View construction plans, upload photos/findings.
 * PDF/image viewer for plans distributed by foreman.
 *
 * Data: @onsite/media
 * UI: Web (React 19 / Tailwind)
 */

'use client';

export default function PlansPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Plans</h1>
        <p className="text-sm text-text-secondary mt-1">
          Construction plans and site documentation
        </p>
      </div>

      {/* Placeholder */}
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-border">
        <span className="text-5xl mb-4">📐</span>
        <h2 className="text-lg font-semibold text-text-primary mb-2">Construction Plans</h2>
        <p className="text-sm text-text-secondary text-center max-w-sm">
          View plans received from your foreman.
          Upload photos and findings from the job site.
          PDF and image viewer.
        </p>
      </div>
    </div>
  );
}

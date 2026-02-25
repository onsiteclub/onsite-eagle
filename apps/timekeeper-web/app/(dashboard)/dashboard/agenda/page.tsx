/**
 * Agenda Page — Timekeeper Web
 *
 * Site calendar (read-only for worker).
 * House deadlines, inspections, deliveries.
 *
 * Data: @onsite/agenda
 * UI: Web (React 19 / Tailwind)
 */

'use client';

export default function AgendaPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Agenda</h1>
        <p className="text-sm text-text-secondary mt-1">
          Site schedule and upcoming events
        </p>
      </div>

      {/* Placeholder */}
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-border">
        <span className="text-5xl mb-4">📅</span>
        <h2 className="text-lg font-semibold text-text-primary mb-2">Site Agenda</h2>
        <p className="text-sm text-text-secondary text-center max-w-sm">
          View site schedule (read-only).
          House deadlines, inspections, and deliveries.
          Events shared by your foreman.
        </p>
      </div>
    </div>
  );
}

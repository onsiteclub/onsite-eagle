"use client";

import { Check, Truck, Package, AlertTriangle, Clock } from "lucide-react";

const STEPS = [
  { key: "requested", label: "Requested", icon: Package, bg: "bg-amber-500", text: "text-amber-600", ring: "ring-amber-200", border: "border-amber-500", hoverBg: "group-hover:bg-amber-500" },
  { key: "in_transit", label: "In Transit", icon: Truck, bg: "bg-blue-500", text: "text-blue-600", ring: "ring-blue-200", border: "border-blue-500", hoverBg: "group-hover:bg-blue-500" },
  { key: "delivered", label: "Delivered", icon: Check, bg: "bg-green-500", text: "text-green-600", ring: "ring-green-200", border: "border-green-500", hoverBg: "group-hover:bg-green-500" },
] as const;

const STATUS_TO_STEP: Record<string, number> = {
  requested: 0,
  acknowledged: 0,
  in_transit: 1,
  delivered: 2,
  problem: 0,
};

/** Format timestamp as "HH:MM" */
function fmtTime(ts: string | null | undefined): string | null {
  if (!ts) return null;
  const d = new Date(ts);
  if (isNaN(d.getTime())) return null;
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

type Props = {
  status: string;
  timestamps?: {
    requested_at?: string | null;
    in_transit_at?: string | null;
    delivered_at?: string | null;
  };
  interactive?: boolean;
  onStepClick?: (step: "in_transit" | "delivered") => void;
  showProblemButton?: boolean;
  onProblemClick?: () => void;
  disabled?: boolean;
  transitDisabled?: boolean;
};

export function StatusStepper({
  status,
  timestamps,
  interactive,
  onStepClick,
  showProblemButton,
  onProblemClick,
  disabled,
  transitDisabled,
}: Props) {
  const currentStep = STATUS_TO_STEP[status] ?? 0;
  const isProblem = status === "problem";

  const tsMap: Record<string, string | null> = {
    requested: fmtTime(timestamps?.requested_at),
    in_transit: fmtTime(timestamps?.in_transit_at),
    delivered: fmtTime(timestamps?.delivered_at),
  };

  // Problem button appears on the segment of the current phase
  // step 0 (requested) → segment between circles 0-1
  // step 1 (in_transit) → segment between circles 1-2
  const problemSegment = currentStep; // 0 = first line, 1 = second line

  function renderCircle(i: number) {
    const step = STEPS[i];
    const isCompleted = !isProblem && currentStep > i;
    const isCurrent = !isProblem && currentStep === i;
    const isNext = !isProblem && currentStep === i - 1;
    const Icon = step.icon;
    const ts = tsMap[step.key];

    const canClick =
      interactive && isNext && !disabled &&
      !(step.key === "in_transit" && transitDisabled);

    return (
      <button
        key={step.key}
        type="button"
        disabled={!canClick}
        onClick={() => {
          if (canClick && onStepClick) {
            onStepClick(step.key as "in_transit" | "delivered");
          }
        }}
        className={`
          relative flex flex-col items-center gap-0.5 shrink-0 z-10
          ${canClick ? "cursor-pointer group" : "cursor-default"}
        `}
      >
        <div
          className={`
            w-8 h-8 rounded-full flex items-center justify-center transition-all
            ${isCompleted
              ? `${step.bg} text-white`
              : isCurrent
              ? `${step.bg} text-white ring-2 ${step.ring} ring-offset-1`
              : canClick
              ? `bg-white border-2 ${step.border} ${step.text} ${step.hoverBg} group-hover:text-white group-active:scale-90`
              : "bg-gray-100 border border-gray-200 text-gray-400"
            }
          `}
        >
          {isCompleted ? (
            <Check size={14} strokeWidth={3} />
          ) : (
            <Icon size={14} />
          )}
        </div>
        <span
          className={`text-xs font-medium leading-none whitespace-nowrap ${
            isCompleted || isCurrent || canClick
              ? step.text
              : "text-gray-400"
          }`}
        >
          {step.label}
        </span>
        {ts && (
          <span className="flex items-center gap-0.5 text-xs text-text-muted leading-none mt-0.5">
            <Clock size={8} />
            {ts}
          </span>
        )}
      </button>
    );
  }

  function renderLine(segmentIndex: number) {
    // segmentIndex 0 = between circles 0-1, segmentIndex 1 = between circles 1-2
    const isActive = !isProblem && currentStep > segmentIndex;
    const showProblem = showProblemButton && !isProblem && problemSegment === segmentIndex;

    // Colors for active vs inactive segments
    const activeColors = segmentIndex === 0
      ? "border-blue-400"
      : "border-green-400";

    return (
      <div key={`line-${segmentIndex}`} className="flex-1 relative flex items-center" style={{ marginTop: 16 }}>
        {/* The timeline line */}
        <div
          className={`w-full border-t-2 transition-colors ${
            isActive
              ? `${activeColors} border-solid`
              : "border-gray-300 border-dashed"
          }`}
        />
        {/* Problem button on the line */}
        {showProblem && (
          <button
            type="button"
            onClick={onProblemClick}
            disabled={disabled}
            className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 top-0 w-6 h-6 rounded-full flex items-center justify-center bg-white border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-400 active:scale-90 transition disabled:opacity-40 z-20 shadow-sm"
            title="Report problem"
          >
            <AlertTriangle size={11} />
          </button>
        )}
        {/* Problem badge on the line when in problem state */}
        {isProblem && problemSegment === segmentIndex && (
          <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 top-0 flex flex-col items-center z-20">
            <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm">
              <AlertTriangle size={11} />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-start px-1">
      {renderCircle(0)}
      {renderLine(0)}
      {renderCircle(1)}
      {renderLine(1)}
      {renderCircle(2)}
    </div>
  );
}

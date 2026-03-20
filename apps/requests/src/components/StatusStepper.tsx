"use client";

import { Check, Truck, Package, AlertTriangle, Clock } from "lucide-react";

const STEPS = [
  { key: "requested", label: "Requested", icon: Package, color: "amber", bg: "bg-amber-500", text: "text-amber-600", ring: "ring-amber-200", border: "border-amber-500", line: "bg-amber-400", hoverBg: "group-hover:bg-amber-500" },
  { key: "in_transit", label: "In Transit", icon: Truck, color: "blue", bg: "bg-blue-500", text: "text-blue-600", ring: "ring-blue-200", border: "border-blue-500", line: "bg-blue-400", hoverBg: "group-hover:bg-blue-500" },
  { key: "delivered", label: "Delivered", icon: Check, color: "green", bg: "bg-green-500", text: "text-green-600", ring: "ring-green-200", border: "border-green-500", line: "bg-green-400", hoverBg: "group-hover:bg-green-500" },
] as const;

const STATUS_TO_STEP: Record<string, number> = {
  requested: 0,
  acknowledged: 0,
  in_transit: 1,
  delivered: 2,
  problem: -1,
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
  /** Timestamps for each phase */
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

  return (
    <div className="flex items-start gap-0 px-1">
      {STEPS.map((step, i) => {
        const isCompleted = !isProblem && currentStep > i;
        const isCurrent = !isProblem && currentStep === i;
        const isNext = !isProblem && currentStep === i - 1;
        const Icon = step.icon;
        const ts = tsMap[step.key];

        const canClick =
          interactive && isNext && !disabled &&
          !(step.key === "in_transit" && transitDisabled);

        // Line color between steps
        const lineActive = isCompleted || isCurrent;
        const prevStep = i > 0 ? STEPS[i - 1] : null;
        // Use the color of the step the line leads TO if active
        const lineColor = lineActive
          ? step.line
          : isProblem
          ? "bg-red-200"
          : "bg-gray-200";

        return (
          <div key={step.key} className="flex items-start flex-1 last:flex-none">
            {/* Connector line */}
            {i > 0 && (
              <div className={`h-[2px] flex-1 mx-0.5 rounded-full mt-4 transition-colors ${lineColor}`} />
            )}

            {/* Step */}
            <button
              type="button"
              disabled={!canClick}
              onClick={() => {
                if (canClick && onStepClick) {
                  onStepClick(step.key as "in_transit" | "delivered");
                }
              }}
              className={`
                relative flex flex-col items-center gap-0.5 shrink-0
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
                    : isProblem && i <= (STATUS_TO_STEP[status] ?? 0)
                    ? "bg-red-500 text-white"
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
                className={`text-[10px] font-medium leading-none whitespace-nowrap ${
                  isCompleted || isCurrent
                    ? step.text
                    : canClick
                    ? step.text
                    : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
              {/* Timestamp under step */}
              {ts && (
                <span className="flex items-center gap-0.5 text-[9px] text-text-muted leading-none mt-0.5">
                  <Clock size={8} />
                  {ts}
                </span>
              )}
            </button>
          </div>
        );
      })}

      {/* Problem indicator */}
      {isProblem && (
        <>
          <div className="h-[2px] w-3 mx-0.5 bg-red-300 rounded-full mt-4" />
          <div className="flex flex-col items-center gap-0.5 shrink-0">
            <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center ring-2 ring-red-200 ring-offset-1">
              <AlertTriangle size={14} />
            </div>
            <span className="text-[10px] font-medium text-red-600 leading-none">Problem</span>
          </div>
        </>
      )}

      {/* Problem button for operator */}
      {showProblemButton && !isProblem && (
        <button
          type="button"
          onClick={onProblemClick}
          disabled={disabled}
          className="ml-2 mt-0 w-8 h-8 rounded-full flex items-center justify-center bg-white border border-red-200 text-red-500 hover:bg-red-50 active:scale-90 transition disabled:opacity-40 shrink-0"
          title="Report problem"
        >
          <AlertTriangle size={14} />
        </button>
      )}
    </div>
  );
}

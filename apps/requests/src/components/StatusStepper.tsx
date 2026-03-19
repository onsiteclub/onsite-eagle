"use client";

import { Check, Truck, Package, AlertTriangle } from "lucide-react";

const STEPS = [
  { key: "requested", label: "Requested", icon: Package },
  { key: "in_transit", label: "In Transit", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Check },
] as const;

const STATUS_TO_STEP: Record<string, number> = {
  requested: 0,
  acknowledged: 0,
  in_transit: 1,
  delivered: 2,
  problem: -1, // special
};

type Props = {
  status: string;
  /** Makes steps clickable (operator mode) */
  interactive?: boolean;
  /** Called when operator clicks next step */
  onStepClick?: (step: "in_transit" | "delivered") => void;
  /** Show problem button (operator only) */
  showProblemButton?: boolean;
  onProblemClick?: () => void;
  /** Disable interactions (another card is active, or already has transit) */
  disabled?: boolean;
  /** Disable only the in_transit step (another request is already in transit) */
  transitDisabled?: boolean;
};

export function StatusStepper({
  status,
  interactive,
  onStepClick,
  showProblemButton,
  onProblemClick,
  disabled,
  transitDisabled,
}: Props) {
  const currentStep = STATUS_TO_STEP[status] ?? 0;
  const isProblem = status === "problem";

  return (
    <div className="flex items-center gap-0 px-1">
      {STEPS.map((step, i) => {
        const isCompleted = !isProblem && currentStep > i;
        const isCurrent = !isProblem && currentStep === i;
        const isFuture = !isProblem && currentStep < i;
        const isNext = !isProblem && currentStep === i - 1;
        const Icon = step.icon;

        // For operator: next step is clickable
        const canClick =
          interactive && isNext && !disabled &&
          !(step.key === "in_transit" && transitDisabled);

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            {/* Connector line (before each step except first) */}
            {i > 0 && (
              <div
                className={`h-[2px] flex-1 mx-0.5 rounded-full transition-colors ${
                  isCompleted || isCurrent
                    ? "bg-brand"
                    : isProblem
                    ? "bg-red-200"
                    : "bg-gray-200"
                }`}
              />
            )}

            {/* Step circle */}
            <button
              type="button"
              disabled={!canClick}
              onClick={() => {
                if (canClick && onStepClick) {
                  onStepClick(step.key as "in_transit" | "delivered");
                }
              }}
              className={`
                relative flex flex-col items-center gap-1 shrink-0
                ${canClick ? "cursor-pointer group" : "cursor-default"}
              `}
            >
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center transition-all
                  ${isCompleted
                    ? "bg-brand text-white"
                    : isCurrent
                    ? "bg-brand text-white ring-2 ring-brand/30 ring-offset-1"
                    : isProblem && i <= (STATUS_TO_STEP[status] ?? 0)
                    ? "bg-red-500 text-white"
                    : canClick
                    ? "bg-white border-2 border-brand text-brand group-hover:bg-brand group-hover:text-white group-active:scale-90"
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
                    ? "text-brand"
                    : canClick
                    ? "text-brand"
                    : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </button>
          </div>
        );
      })}

      {/* Problem indicator (if status is problem) */}
      {isProblem && (
        <>
          <div className="h-[2px] w-3 mx-0.5 bg-red-300 rounded-full" />
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center ring-2 ring-red-200 ring-offset-1">
              <AlertTriangle size={14} />
            </div>
            <span className="text-[10px] font-medium text-red-600 leading-none">Problem</span>
          </div>
        </>
      )}

      {/* Problem button for operator (only when not already problem) */}
      {showProblemButton && !isProblem && (
        <button
          type="button"
          onClick={onProblemClick}
          disabled={disabled}
          className="ml-2 w-8 h-8 rounded-full flex items-center justify-center bg-white border border-red-200 text-red-500 hover:bg-red-50 active:scale-90 transition disabled:opacity-40 shrink-0"
          title="Report problem"
        >
          <AlertTriangle size={14} />
        </button>
      )}
    </div>
  );
}

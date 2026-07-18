"use client";

/**
 * The 4-segment wizard progress indicator from the wireframe:
 * completed steps show a green check, the current step a dark "Step N" pill,
 * and upcoming steps a muted number. Connectors turn green once passed.
 */
export default function StepProgress({
  current,
  total,
}: {
  current: number; // 1-based
  total: number;
}) {
  const steps = Array.from({ length: total }, (_, i) => i + 1);

  return (
    <div className="flex items-center" aria-label={`Step ${current} of ${total}`}>
      {steps.map((step, i) => {
        const done = step < current;
        const active = step === current;
        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            {active ? (
              <span className="px-4 h-9 inline-flex items-center rounded-full bg-cream text-ink text-sm font-semibold whitespace-nowrap">
                Step {step}
              </span>
            ) : (
              <span
                className={`w-9 h-9 inline-flex items-center justify-center rounded-full text-sm font-semibold flex-shrink-0 ${
                  done ? "bg-green-500 text-white" : "bg-cream/15 text-cream/50"
                }`}
              >
                {done ? "✓" : step}
              </span>
            )}
            {i < steps.length - 1 && (
              <span
                className={`h-0.5 flex-1 mx-1.5 rounded-full ${
                  done ? "bg-green-500" : "bg-cream/15"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

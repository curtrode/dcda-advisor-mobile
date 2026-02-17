import { cn } from '@/lib/utils'
import type { WizardPart } from '@/types'
import { Check } from 'lucide-react'

interface PhaseInfo {
  key: WizardPart
  label: string
  stepCount: number
}

interface StepIndicatorProps {
  /** Which phase is currently active */
  currentPart: WizardPart
  /** How many steps into the current phase (0-based index within that phase) */
  currentStepInPart: number
  /** Total steps in each phase, ordered */
  phases: PhaseInfo[]
  className?: string
}

const PHASE_ORDER: WizardPart[] = ['completed', 'transition', 'schedule', 'review', 'submit']

function getPhaseIndex(part: WizardPart): number {
  return PHASE_ORDER.indexOf(part)
}

export function StepIndicator({ currentPart, currentStepInPart, phases, className }: StepIndicatorProps) {
  const currentPhaseIdx = getPhaseIndex(currentPart)
  // Transition is not a user-facing phase — fold it into schedule visually
  const displayPhases = phases.filter(p => p.key !== 'transition')

  // Find the active display phase (transition maps to schedule)
  const activeDisplayKey = currentPart === 'transition' ? 'schedule' : currentPart

  return (
    <div className={cn("bg-primary px-4 pt-2.5 pb-3 space-y-1.5", className)}>
      {/* Phase segments */}
      <div className="flex gap-1.5">
        {displayPhases.map((phase) => {
          const phaseIdx = getPhaseIndex(phase.key)
          const isActive = phase.key === activeDisplayKey
          const isComplete = phaseIdx < currentPhaseIdx && !(phase.key === 'schedule' && currentPart === 'transition')

          // Calculate fill percentage for active phase
          let fillPercent = 0
          if (isComplete) {
            fillPercent = 100
          } else if (isActive) {
            const totalInPhase = phase.stepCount
            if (totalInPhase > 0) {
              // If we're in transition, show ~10% fill for the schedule bar
              if (currentPart === 'transition') {
                fillPercent = 10
              } else {
                fillPercent = Math.min(100, Math.round(((currentStepInPart + 1) / totalInPhase) * 100))
              }
            }
          }

          return (
            <div key={phase.key} className="flex-1 flex flex-col items-center gap-1">
              {/* Label */}
              <span className={cn(
                "text-[10px] font-semibold uppercase tracking-wider leading-none flex items-center gap-1",
                isActive
                  ? "text-white"
                  : isComplete
                    ? "text-white/70"
                    : "text-white/30"
              )}>
                {isComplete && <Check className="size-2.5" />}
                {phase.label}
              </span>
              {/* Bar */}
              <div className="w-full h-1 rounded-full bg-white/15 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-400 ease-out",
                    isComplete ? "bg-white/60" : isActive ? "bg-white" : ""
                  )}
                  style={{ width: `${fillPercent}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Step counter */}
      {(() => {
        const activePhase = displayPhases.find(p => p.key === activeDisplayKey)
        if (!activePhase || activePhase.stepCount === 0) return null

        // For transition, show "Getting ready..." instead of step counter
        if (currentPart === 'transition') {
          return (
            <div className="text-[11px] text-white/50 text-center">
              Preparing your schedule…
            </div>
          )
        }

        return (
          <div className="text-[11px] text-white/50 text-center">
            Step {currentStepInPart + 1} of {activePhase.stepCount} in {activePhase.label}
          </div>
        )
      })()}
    </div>
  )
}

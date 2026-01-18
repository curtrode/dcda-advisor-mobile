import { cn } from '@/lib/utils'

interface StepIndicatorProps {
  totalSteps: number
  currentStep: number
  onStepClick?: (index: number) => void
  className?: string
}

export function StepIndicator({ totalSteps, currentStep, onStepClick, className }: StepIndicatorProps) {
  return (
    <div className={cn("flex justify-center gap-1.5 py-4 px-4 bg-card border-b overflow-x-auto", className)}>
      {Array.from({ length: totalSteps }).map((_, index) => {
        const isClickable = index < currentStep && !!onStepClick
        
        return (
          <button
            key={index}
            onClick={() => isClickable && onStepClick?.(index)}
            disabled={!isClickable}
            aria-label={`Go to step ${index + 1}`}
            className={cn(
              "h-2 rounded-full transition-all duration-200 shrink-0",
              index < currentStep
                ? "w-2 bg-success hover:bg-success/80 cursor-pointer" // Completed
                : index === currentStep
                ? "w-6 bg-primary cursor-default" // Active
                : "w-2 bg-border cursor-default" // Future
            )}
          />
        )
      })}
    </div>
  )
}

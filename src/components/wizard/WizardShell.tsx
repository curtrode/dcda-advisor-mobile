import type { ReactNode } from 'react'
import { StepIndicator } from './StepIndicator'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/useTheme'
import { Moon, Sun } from 'lucide-react'
import type { WizardPart } from '@/types'

interface PhaseInfo {
  key: WizardPart
  label: string
  stepCount: number
}

interface WizardShellProps {
  // Progress
  currentPart: WizardPart
  currentStepInPart: number
  phases: PhaseInfo[]

  // Step identity (for transition animation)
  stepKey?: string

  // Content
  children: ReactNode

  // Navigation
  canGoBack: boolean
  canGoNext: boolean
  onBack: () => void
  onNext: () => void
  nextLabel?: string
  nextDisabled?: boolean
  showBackButton?: boolean
  showNextButton?: boolean
}

export function WizardShell({
  currentPart,
  currentStepInPart,
  phases,
  stepKey,
  children,
  canGoBack,
  onBack,
  onNext,
  nextLabel = 'Next',
  nextDisabled = false,
  showBackButton = true,
  showNextButton = true,
}: WizardShellProps) {
  const { isDark, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-6 py-6 flex items-center gap-4 shrink-0 shadow-xl relative z-20">
        <div className="bg-white/10 p-1.5 rounded-2xl backdrop-blur-sm border border-white/20">
          <img
            src={import.meta.env.BASE_URL + 'DCDA_AddRan_logo.jpg'}
            alt="DCDA"
            className="h-12 w-auto rounded-lg bg-white shadow-sm object-contain"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight leading-none truncate">DCDA Advisor</h1>
          <p className="text-sm font-medium text-primary-foreground/80 mt-1 truncate">Degree Planning Tool</p>
        </div>
        <button
          onClick={toggleTheme}
          className="p-3 rounded-xl hover:bg-white/10 active:bg-white/20 transition-all border border-white/10 backdrop-blur-sm"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
        </button>
      </header>

      {/* Segmented Progress Indicator (replaces dot stepper + part label bar) */}
      <StepIndicator
        currentPart={currentPart}
        currentStepInPart={currentStepInPart}
        phases={phases}
      />

      {/* Content — fade+slide on step change */}
      <main className="flex-1 overflow-y-auto px-5 py-6 pb-28">
        <div
          key={stepKey}
          className="animate-fade-in-up"
        >
          {children}
        </div>
      </main>

      {/* Bottom Navigation */}
      {(showNextButton || (showBackButton && canGoBack)) && (
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t px-5 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] flex gap-3">
          {showBackButton && canGoBack && (
            <Button
              variant="secondary"
              onClick={onBack}
              className="flex-1"
            >
              Back
            </Button>
          )}
          {showNextButton && (
            <Button
              onClick={onNext}
              disabled={nextDisabled}
              className={cn("flex-1", !canGoBack && "w-full")}
            >
              {nextLabel}
            </Button>
          )}
        </nav>
      )}
    </div>
  )
}

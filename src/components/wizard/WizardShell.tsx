import type { ReactNode } from 'react'
import { StepIndicator } from './StepIndicator'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/useTheme'
import { Moon, Sun } from 'lucide-react'

interface WizardShellProps {
  // Header
  totalSteps: number
  currentStep: number
  partLabel: string

  // Content
  children: ReactNode

  // Navigation
  canGoBack: boolean
  canGoNext: boolean
  onBack: () => void
  onNext: () => void
  onStepClick?: (index: number) => void
  nextLabel?: string
  nextDisabled?: boolean
  showBackButton?: boolean
}

export function WizardShell({
  totalSteps,
  currentStep,
  partLabel,
  children,
  canGoBack,
  onBack,
  onNext,
  onStepClick,
  nextLabel = 'Next',
  nextDisabled = false,
  showBackButton = true,
}: WizardShellProps) {
  const { isDark, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground px-5 py-4 flex items-center gap-3 shrink-0">
        <img
          src={import.meta.env.BASE_URL + 'android-chrome-192x192.png'}
          alt="DCDA"
          className="w-10 h-10 rounded-lg bg-white"
        />
        <div className="flex-1">
          <h1 className="text-lg font-semibold">DCDA Advisor</h1>
          <p className="text-xs opacity-80">Degree Planning Tool</p>
        </div>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </header>

      {/* Step Indicator */}
      <StepIndicator 
        totalSteps={totalSteps} 
        currentStep={currentStep} 
        onStepClick={onStepClick} 
      />

      {/* Part Label */}
      <div className="bg-primary text-primary-foreground text-xs font-semibold uppercase tracking-wide px-5 py-2">
        {partLabel}
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-5 py-6 pb-28">
        {children}
      </main>

      {/* Bottom Navigation */}
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
        <Button
          onClick={onNext}
          disabled={nextDisabled}
          className={cn("flex-1", !canGoBack && "w-full")}
        >
          {nextLabel}
        </Button>
      </nav>
    </div>
  )
}

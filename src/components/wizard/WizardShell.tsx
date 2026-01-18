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

      {/* Step Indicator */}
      <StepIndicator 
        totalSteps={totalSteps} 
        currentStep={currentStep} 
        onStepClick={onStepClick} 
      />

      {/* Part Label */}
      <div className="bg-primary/90 text-primary-foreground text-xs font-bold uppercase tracking-wider px-6 py-3 shadow-sm relative z-10 backdrop-blur-sm border-t border-white/10">
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

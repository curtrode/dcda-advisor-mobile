import { Button } from '@/components/ui/button'
import { ArrowRight, CheckCircle2, CalendarClock, History } from 'lucide-react'
import { categoryNames } from '@/services/courses'

interface TransitionStepProps {
  onNext: () => void
  unmetCount: number
  selections: {
    intro: string | null
    statistics: string | null
    coding: string | null
    mmAuthoring: string | null
    dcElectives: string[]
    daElectives: string[]
  }
}

export function TransitionStep({ onNext, unmetCount, selections }: TransitionStepProps) {
  // Helper to check if a category has any selections
  const hasSelection = (key: keyof typeof selections) => {
    const val = selections[key]
    return Array.isArray(val) ? val.length > 0 : val !== null
  }

  // Count actually completed categories (to show specific progress)
  const completedCategories = Object.keys(selections).filter(k => 
    hasSelection(k as keyof typeof selections)
  )

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center space-y-8 animate-in fade-in duration-500">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
        <div className="relative bg-card p-6 rounded-full border-2 border-primary shadow-xl">
          <CheckCircle2 className="w-12 h-12 text-primary" />
        </div>
      </div>

      <div className="space-y-4 max-w-md w-full">
        <h2 className="text-3xl font-bold tracking-tight">Great job so far!</h2>
        
        {/* Completed Summary */}
        {completedCategories.length > 0 && (
          <div className="bg-card border rounded-xl overflow-hidden text-left shadow-sm">
            <div className="bg-muted/50 px-4 py-3 border-b flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground" />
              <span className="font-semibold text-sm">Completed Requirements</span>
            </div>
            <div className="divide-y max-h-48 overflow-y-auto">
              {(['intro', 'statistics', 'coding', 'mmAuthoring'] as const).map(key => {
                if (!selections[key]) return null
                return (
                  <div key={key} className="px-4 py-2.5 flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{categoryNames[key]}</span>
                    <span className="font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded text-xs">
                      {selections[key]}
                    </span>
                  </div>
                )
              })}
              
              {/* Multi-select categories */}
              {selections.dcElectives.length > 0 && (
                <div className="px-4 py-2.5 text-sm space-y-1">
                  <div className="text-muted-foreground mb-1">{categoryNames.dcElective}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selections.dcElectives.map(c => (
                      <span key={c} className="font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded text-xs">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {selections.daElectives.length > 0 && (
                <div className="px-4 py-2.5 text-sm space-y-1">
                  <div className="text-muted-foreground mb-1">{categoryNames.daElective}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selections.daElectives.map(c => (
                      <span key={c} className="font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded text-xs">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-4 text-left">
          <div className="bg-primary/10 p-2 rounded-lg shrink-0">
            <CalendarClock className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-primary">Your Next Steps</p>
            <p className="text-sm text-muted-foreground">
              We have identified <span className="font-bold text-foreground">{unmetCount} requirements</span> you still need to fulfill.
            </p>
          </div>
        </div>
      </div>

      <div className="pt-2 w-full max-w-xs">
        <Button 
          size="lg" 
          onClick={onNext}
          className="w-full gap-2 text-lg h-12 shadow-md"
        >
          Build My Schedule <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  )
}

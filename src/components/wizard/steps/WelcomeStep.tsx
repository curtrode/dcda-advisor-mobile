import { useRef } from 'react'
import { AlertCircle, Heart, Calendar, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { StudentData } from '@/types'

interface WelcomeStepProps {
  onImport?: (data: Partial<StudentData>) => void
}

export function WelcomeStep({ onImport }: WelcomeStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onImport) return

    try {
      const content = await file.text()
      const { parseCSVImport } = await import('@/services/export')
      const data = parseCSVImport(content)
      if (data) {
        onImport(data)
      } else {
        alert('Invalid file format. Please select a DCDA CSV export file.')
      }
    } catch (error) {
      console.error('Import error:', error)
      alert('Failed to import file. Please try again.')
    }

    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Welcome to DCDA Advising</h2>
        <p className="text-sm text-muted-foreground mb-4">
          This tool helps you plan your Digital Culture & Data Analytics degree requirements.
        </p>

        <div className="space-y-2 text-sm text-muted-foreground border-l-2 pl-4 py-1">
          <p><strong>Step 1:</strong> Tell us what you've already taken.</p>
          <p><strong>Step 2:</strong> Plan your future semesters.</p>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-2 flex-1 min-w-0">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100">FERPA Privacy Notice</h3>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              This planning tool stores data locally on your device only. No information is sent to external servers.
              Your course selections and academic data remain private and are protected under FERPA (Family Educational Rights and Privacy Act).
            </p>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex gap-3">
          <Heart className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-3 flex-1 min-w-0">
            <h3 className="font-semibold text-amber-900 dark:text-amber-100">Always Check with Your Advisor</h3>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              While this tool provides helpful guidance, it's important to always verify your degree plan with a DCDA advisor.
              They can provide personalized advice, account for transfer credits, and ensure you're on track to graduate.
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
              Schedule regular check-ins with your DCDA advisor throughout your academic journey.
            </p>
            <Button
              asChild
              variant="outline"
              className="w-full h-auto whitespace-normal py-3 bg-white dark:bg-amber-900 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-800"
            >
              <a
                href="https://calendly.com/c-rode/appointments"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-center"
              >
                <Calendar className="h-4 w-4 shrink-0" />
                <span>Schedule an Advising Appointment</span>
              </a>
            </Button>
          </div>
        </div>
      </div>

      <div className="pt-2 space-y-3">
        <p className="text-sm text-muted-foreground text-center">
          Click "Next" to begin planning your degree requirements
        </p>

        {onImport && (
          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground text-center mb-2">
              Have a previous plan? Import it to continue where you left off.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import Previous Plan (CSV)
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

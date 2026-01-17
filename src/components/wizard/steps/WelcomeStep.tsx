import { AlertCircle, Heart, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function WelcomeStep() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Welcome to DCDA Advising</h2>
        <p className="text-sm text-muted-foreground">
          This tool helps you plan your Digital Culture & Data Analytics degree requirements.
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
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
          <div className="space-y-3 min-w-0 flex-1">
            <h3 className="font-semibold text-amber-900 dark:text-amber-100">Always Check with Your Advisor</h3>
            <p className="text-sm text-amber-800 dark:text-amber-200 break-words">
              While this tool provides helpful guidance, it's important to always verify your degree plan with a DCDA advisor.
              They can provide personalized advice, account for transfer credits, and ensure you're on track to graduate.
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium break-words">
              Schedule regular check-ins with your DCDA advisor throughout your academic journey.
            </p>
            <Button
              asChild
              variant="outline"
              className="w-full bg-white dark:bg-amber-900 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-800"
            >
              <a
                href="https://calendly.com/c-rode/appointments"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-sm"
              >
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Schedule an Advising Appointment</span>
              </a>
            </Button>
          </div>
        </div>
      </div>

      <div className="pt-2">
        <p className="text-sm text-muted-foreground text-center">
          Click "Next" to begin planning your degree requirements
        </p>
      </div>
    </div>
  )
}

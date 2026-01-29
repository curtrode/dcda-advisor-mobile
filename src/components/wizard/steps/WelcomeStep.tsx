import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Step icons from public folder
const BASE_URL = import.meta.env.BASE_URL
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { StudentData } from '@/types'

interface WelcomeStepProps {
  onImport?: (data: Partial<StudentData>) => void
  onNext?: () => void
}

export function WelcomeStep({ onImport, onNext }: WelcomeStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showFerpa, setShowFerpa] = useState(false)

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
        <p className="text-sm text-muted-foreground">
          This tool helps you plan your Digital Culture & Data Analytics degree requirements.
        </p>
      </div>

      {/* Part Steps - Visual Guide */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 py-3 border-b border-border/50">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/15 text-primary font-semibold text-sm shrink-0">
            1
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground text-sm">Record Your History</p>
            <p className="text-xs text-muted-foreground">Tell us what you've already taken</p>
          </div>
          <img src={`${BASE_URL}go_back_icon.png`} alt="" className="w-6 h-6 shrink-0 opacity-50" />
        </div>

        <div className="flex items-center gap-3 py-3 border-b border-border/50">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/15 text-primary font-semibold text-sm shrink-0">
            2
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground text-sm">Plan Your Semester</p>
            <p className="text-xs text-muted-foreground">Schedule upcoming courses</p>
          </div>
          <img src={`${BASE_URL}plan_icon.png`} alt="" className="w-6 h-6 shrink-0 opacity-50" />
        </div>

        <div className="flex items-center gap-3 py-3 border-b border-border/50">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/15 text-primary font-semibold text-sm shrink-0">
            3
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground text-sm">Review Your Plan</p>
            <p className="text-xs text-muted-foreground">See your personalized degree audit</p>
          </div>
          <img src={`${BASE_URL}review_icon.png`} alt="" className="w-6 h-6 shrink-0 opacity-50" />
        </div>

        <div className="flex items-center gap-3 py-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/15 text-primary font-semibold text-sm shrink-0">
            4
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground text-sm">Save & Submit</p>
            <p className="text-xs text-muted-foreground">Export and schedule an appointment</p>
          </div>
          <img src={`${BASE_URL}submit_icon.png`} alt="" className="w-6 h-6 shrink-0 opacity-50" />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-muted/50 border rounded-lg p-3 space-y-3">
        {onImport && (
          <>
            <p className="text-xs text-muted-foreground">
              Returning? Pick up where you left off:
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </>
        )}
        <div className="flex gap-2">
          {onImport && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
          )}
          {onNext && (
            <Button
              className="flex-1"
              onClick={onNext}
            >
              {onImport ? 'Start Fresh' : 'Get Started'}
            </Button>
          )}
        </div>
      </div>

      {/* Inline info links */}
      {/* TODO: Update FERPA notice text once Power Automate integration is enabled (data will be sent externally) */}
      <p className="text-sm text-muted-foreground text-center">
        Your data stays on your device unless you choose to share it with your advisor (
        <button
          type="button"
          onClick={() => setShowFerpa(true)}
          className="text-primary underline underline-offset-2 hover:text-primary/80"
        >
          privacy notice
        </button>
        ). Questions?{' '}
        <a
          href="https://calendly.com/c-rode/appointments"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:text-primary/80"
        >
          Schedule time with an advisor
        </a>
        .
      </p>

      {/* FERPA Dialog */}
      <Dialog open={showFerpa} onOpenChange={setShowFerpa}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>FERPA Privacy Notice</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This planning tool stores data locally on your device only. No information is sent to external servers.
            Your course selections and academic data remain private and are protected under FERPA (Family Educational Rights and Privacy Act).
          </p>
        </DialogContent>
      </Dialog>
    </div>
  )
}

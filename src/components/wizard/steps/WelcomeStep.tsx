import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
        <p className="text-sm text-muted-foreground mb-4">
          This tool helps you plan your Digital Culture & Data Analytics degree requirements.
        </p>

        <div className="space-y-2 text-sm text-muted-foreground border-l-2 pl-4 py-1">
          <p><strong>Part 1:</strong> Tell us what you've already taken.</p>
          <p><strong>Part 2:</strong> Plan your upcoming semester.</p>
          <p><strong>Part 3:</strong> Review and export your plan.</p>
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
        Your data stays on your device (
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

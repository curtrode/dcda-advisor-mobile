import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Eye, Printer, Download, Calendar, Mail, Send, ChevronDown, ChevronUp, RotateCcw, Copy, Check } from 'lucide-react'
import type { StudentData } from '@/types'
import { useRequirements } from '@/hooks/useRequirements'
import { generatePdfBlob, downloadPdf, printPdf } from '@/services/export'
import { recordAnonymousSubmission, trackExport } from '@/services/analytics'

interface ReviewActionsStepProps {
  studentData: StudentData
  generalElectives?: string[]
  scheduledSelections?: Record<string, string | string[] | null>
  updateStudentData: (updates: Partial<StudentData>) => void
  onStartOver: () => void
}

export function ReviewActionsStep({ studentData, generalElectives, scheduledSelections, updateStudentData, onStartOver }: ReviewActionsStepProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewFilename, setPreviewFilename] = useState<string>('')
  const [showExportOptions, setShowExportOptions] = useState(false)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const [submitFilename, setSubmitFilename] = useState('')
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [copied, setCopied] = useState(false)
  const { degreeProgress, requirements } = useRequirements(studentData, generalElectives)
  const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

  const selectedDegreeType = studentData.degreeType || 'major'
  const completedHours = degreeProgress?.completedHours ?? 0
  const totalHoursRequired = selectedDegreeType === 'major' ? requirements.major.totalHours : requirements.minor.totalHours

  // Cleanup blob URL to prevent memory leaks
  const revokePreviewUrl = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const handlePreview = useCallback(() => {
    revokePreviewUrl()
    const { blobUrl, filename } = generatePdfBlob({ studentData, generalElectives, scheduledSelections })
    setPreviewUrl(blobUrl)
    setPreviewFilename(filename)
  }, [studentData, generalElectives, revokePreviewUrl])

  const handleClosePreview = useCallback(() => {
    revokePreviewUrl()
    setPreviewUrl(null)
  }, [revokePreviewUrl])

  const handlePrint = () => {
    const { blobUrl } = generatePdfBlob({ studentData, generalElectives, scheduledSelections })
    printPdf(blobUrl, () => URL.revokeObjectURL(blobUrl))
    trackExport('print')
  }

  const handleDownloadPdf = () => {
    if (previewUrl) {
      downloadPdf(previewUrl, previewFilename)
      trackExport('pdf')
    }
  }

  const handleSubmitToAdvisor = () => {
    const { blobUrl, filename } = generatePdfBlob({ studentData, generalElectives, scheduledSelections })
    downloadPdf(blobUrl, filename)
    URL.revokeObjectURL(blobUrl)
    setSubmitFilename(filename)
    setShowSubmitConfirm(true)

    // Record anonymous submission for analytics (fire-and-forget, no PII)
    const progressPct = Math.min(100, Math.round((completedHours / totalHoursRequired) * 100))
    recordAnonymousSubmission(studentData, progressPct)
    trackExport('email')
  }

  const handleOpenEmail = () => {
    const date = new Date().toLocaleDateString()
    const degreeLabel = studentData.degreeType === 'major' ? 'Major' : 'Minor'
    const progressPercent = Math.min(100, Math.round((completedHours / totalHoursRequired) * 100))

    const subject = `DCDA Advising Record: ${studentData.name}`
    const body = `Hi Professor Rode,

I've completed my DCDA advising plan using the advising wizard and wanted to share it with you ahead of our meeting. Please find my plan attached — I'd love to go over it together and make sure I'm on the right track.

---
DCDA Advising Record

Student: ${studentData.name}
Degree: DCDA ${degreeLabel}
Expected Graduation: ${studentData.expectedGraduation || 'Not specified'}
Date: ${date}
Progress: ${completedHours}/${totalHoursRequired} hours (${progressPercent}%)

Notes/Questions:
${studentData.notes || 'None'}

---
Advising plan PDF attached.
Submitted via DCDA Advisor Mobile`

    const cc = studentData.email ? `&cc=${encodeURIComponent(studentData.email)}` : ''
    const mailtoUrl = `mailto:c.rode@tcu.edu?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}${cc}`
    window.location.href = mailtoUrl
    setEmailSent(true)
  }

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText('c.rode@tcu.edu')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select text for manual copy (clipboard API may be blocked)
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h2 className="text-xl font-semibold mb-2">Save & Submit</h2>
        <p className="text-sm text-muted-foreground">
          Schedule an appointment, add notes, and submit your plan.
        </p>
      </div>

      {/* 1. Make Appointment — primary CTA, first */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 space-y-3">
        <h3 className="font-semibold text-primary text-lg">Schedule an Appointment</h3>
        <p className="text-sm text-muted-foreground">
          Meet with your advisor to review your plan and make sure you're on track.
        </p>
        <Button
          asChild
          className="w-full"
          size="lg"
        >
          <a
            href="https://calendly.com/c-rode/appointments"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2"
          >
            <Calendar className="size-5" />
            Schedule Advising Appointment
          </a>
        </Button>
      </div>

      {/* 2. Notes Section */}
      <div className="space-y-3">
        <label htmlFor="notes" className="text-sm font-semibold block px-1">
          Notes or Questions for Advisor
        </label>
        <Textarea
          id="notes"
          placeholder="Add any questions about transfer credits, specific courses, or career goals..."
          value={studentData.notes || ''}
          onChange={(e) => updateStudentData({ notes: e.target.value })}
          className="text-base"
        />
      </div>

      {/* 3. Submit — single prominent action */}
      <Button
        className="w-full gap-2"
        size="lg"
        onClick={handleSubmitToAdvisor}
      >
        <Send className="size-5" />
        Submit Plan to Advisor
      </Button>
      <p className="text-xs text-muted-foreground text-center -mt-3">
        Optional — downloads your plan as PDF and opens an email to your advisor.
      </p>

      {/* 4. More export options — collapsed */}
      <div className="border rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowExportOptions(!showExportOptions)}
          aria-expanded={showExportOptions}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          <span>More export options</span>
          {showExportOptions
            ? <ChevronUp className="size-4" />
            : <ChevronDown className="size-4" />
          }
        </button>
        {showExportOptions && (
          <div className="grid grid-cols-2 gap-3 p-4 pt-0 border-t">
            <Button
              variant="outline"
              className="flex-col h-auto py-3 gap-1.5"
              onClick={handlePreview}
            >
              <Eye className="size-4" />
              <span className="text-xs">Preview PDF</span>
            </Button>

            {!isMobile && (
              <Button
                variant="outline"
                className="flex-col h-auto py-3 gap-1.5"
                onClick={handlePrint}
              >
                <Printer className="size-4" />
                <span className="text-xs">Print PDF</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Tip */}
      <div className="flex items-start gap-3 text-sm text-muted-foreground px-1">
        <Mail className="size-4 mt-0.5 flex-shrink-0" />
        <p>
          <strong>Tip:</strong> Save your PDF and email it before your meeting so your advisor can review it in advance.
        </p>
      </div>

      {/* Start Over */}
      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={() => setShowResetConfirm(true)}
          className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors inline-flex items-center gap-1.5"
        >
          <RotateCcw className="size-3.5" />
          Start Over
        </button>
      </div>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitConfirm} onOpenChange={(open) => {
        setShowSubmitConfirm(open)
        if (!open) { setEmailSent(false); setCopied(false) }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{emailSent ? 'Email Opened' : 'Plan Downloaded'}</DialogTitle>
          </DialogHeader>
          {!emailSent ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Your advising plan has been saved as:
              </p>
              <div className="bg-muted rounded-lg px-3 py-2 text-sm font-mono break-all">
                {submitFilename}
              </div>
              <p className="text-sm text-muted-foreground">
                An email will open next. Please <strong>attach the downloaded PDF</strong> before sending.
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setShowSubmitConfirm(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleOpenEmail} className="flex-1 gap-2">
                  <Mail className="size-4" />
                  Open Email
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                If your email app opened, attach <strong>{submitFilename}</strong> and send.
              </p>
              <p className="text-sm text-muted-foreground">
                If nothing happened, email your advisor directly:
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm font-mono">
                  c.rode@tcu.edu
                </div>
                <Button variant="outline" size="icon" onClick={handleCopyEmail} className="shrink-0">
                  {copied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
                </Button>
              </div>
              <Button variant="secondary" onClick={() => { setShowSubmitConfirm(false); setEmailSent(false) }} className="w-full">
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* PDF Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={(open) => !open && handleClosePreview()}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>PDF Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 p-4">
            {previewUrl && (
              <iframe
                src={previewUrl}
                className="w-full h-full border rounded-lg"
                title="PDF Preview"
              />
            )}
          </div>
          <div className="p-4 pt-0 flex gap-2">
            <Button variant="secondary" onClick={() => setPreviewUrl(null)} className="flex-1">
              Close
            </Button>
            <Button onClick={handleDownloadPdf} className="flex-1">
              <Download className="size-4 mr-2" />
              Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Start Over?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will clear all your selections and return to the beginning.
              This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => { setShowResetConfirm(false); onStartOver() }}
                className="flex-1 gap-2"
              >
                <RotateCcw className="size-4" />
                Start Over
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

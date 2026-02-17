import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Eye, Printer, Download, Calendar, Mail, Send, ChevronDown, ChevronUp } from 'lucide-react'
import type { StudentData } from '@/types'
import { useRequirements } from '@/hooks/useRequirements'
import { generatePdfBlob, downloadPdf, printPdf, exportToCSV } from '@/services/export'

interface ReviewActionsStepProps {
  studentData: StudentData
  generalElectives?: string[]
  updateStudentData: (updates: Partial<StudentData>) => void
}

export function ReviewActionsStep({ studentData, generalElectives, updateStudentData }: ReviewActionsStepProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewFilename, setPreviewFilename] = useState<string>('')
  const [showExportOptions, setShowExportOptions] = useState(false)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const [submitFilename, setSubmitFilename] = useState('')
  const { degreeProgress, requirements } = useRequirements(studentData, generalElectives)
  const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

  const selectedDegreeType = studentData.degreeType || 'major'
  const majorTotalHours = requirements.major.totalHours
  const minorTotalHours = requirements.minor.totalHours
  
  const completedCourseHours = studentData.completedCourses.length * 3
  const specialCreditHours = studentData.specialCredits.length * 3
  const totalCompletedHours = completedCourseHours + specialCreditHours
  
  const majorHours = selectedDegreeType === 'major' 
    ? (degreeProgress?.completedHours ?? 0)
    : Math.min(totalCompletedHours, majorTotalHours)
  const minorHours = selectedDegreeType === 'minor'
    ? (degreeProgress?.completedHours ?? 0)
    : Math.min(totalCompletedHours, minorTotalHours)

  // Cleanup blob URL to prevent memory leaks
  const revokePreviewUrl = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const handlePreview = useCallback(() => {
    revokePreviewUrl()
    const { blobUrl, filename } = generatePdfBlob({ studentData, generalElectives })
    setPreviewUrl(blobUrl)
    setPreviewFilename(filename)
  }, [studentData, generalElectives, revokePreviewUrl])

  const handleClosePreview = useCallback(() => {
    revokePreviewUrl()
    setPreviewUrl(null)
  }, [revokePreviewUrl])

  const handlePrint = () => {
    const { blobUrl } = generatePdfBlob({ studentData, generalElectives })
    printPdf(blobUrl, () => URL.revokeObjectURL(blobUrl))
  }

  const handleDownload = () => {
    exportToCSV({ ...studentData, generalElectives })
  }

  const handleDownloadPdf = () => {
    if (previewUrl) {
      downloadPdf(previewUrl, previewFilename)
    }
  }

  const handleSubmitToAdvisor = () => {
    // Download the CSV file first
    const filename = exportToCSV({ ...studentData, generalElectives })
    setSubmitFilename(filename)
    setShowSubmitConfirm(true)
  }

  const handleOpenEmail = () => {
    const date = new Date().toLocaleDateString()
    const degreeLabel = studentData.degreeType === 'major' ? 'Major' : 'Minor'
    const progressHours = selectedDegreeType === 'major' ? majorHours : minorHours
    const totalHours = selectedDegreeType === 'major' ? majorTotalHours : minorTotalHours
    const progressPercent = Math.round((progressHours / totalHours) * 100)

    const subject = `DCDA Advising Record: ${studentData.name}`
    const body = `DCDA Advising Record

Student: ${studentData.name}
Degree: DCDA ${degreeLabel}
Expected Graduation: ${studentData.expectedGraduation || 'Not specified'}
Date: ${date}
Progress: ${progressHours}/${totalHours} hours (${progressPercent}%)

Notes/Questions:
${studentData.notes || 'None'}

---
Advising plan CSV attached.
Submitted via DCDA Advisor Mobile`

    const mailtoUrl = `mailto:c.rode@tcu.edu?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.location.href = mailtoUrl
    setShowSubmitConfirm(false)
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
        Downloads your plan as CSV and opens an email to your advisor.
      </p>

      {/* 4. More export options — collapsed */}
      <div className="border rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowExportOptions(!showExportOptions)}
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

            <Button
              variant="outline"
              className="flex-col h-auto py-3 gap-1.5"
              onClick={handleDownload}
            >
              <Download className="size-4" />
              <span className="text-xs">Save CSV</span>
            </Button>
          </div>
        )}
      </div>

      {/* Tip */}
      <div className="flex items-start gap-3 text-sm text-muted-foreground px-1">
        <Mail className="size-4 mt-0.5 flex-shrink-0" />
        <p>
          <strong>Tip:</strong> Save your PDF or CSV and email it before your meeting so your advisor can review it in advance.
        </p>
      </div>

      {/* Submit Confirmation Dialog — replaces alert() */}
      <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Plan Downloaded</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your advising plan has been saved as:
            </p>
            <div className="bg-muted rounded-lg px-3 py-2 text-sm font-mono break-all">
              {submitFilename}
            </div>
            <p className="text-sm text-muted-foreground">
              An email will open next. Please <strong>attach the downloaded file</strong> before sending.
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
    </div>
  )
}

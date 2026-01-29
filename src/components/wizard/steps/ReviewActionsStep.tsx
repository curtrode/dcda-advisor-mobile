import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Eye, Printer, Download, Calendar, Mail, Send } from 'lucide-react'
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
  const { degreeProgress, requirements } = useRequirements(studentData, generalElectives)

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

  // Organize courses by category for email
  const completedByCategory: Record<string, string[]> = {}
  const scheduledByCategory: Record<string, string[]> = {}
  const neededCategories: { category: string; name: string; remaining: number }[] = []
  const assignedScheduledCourses = new Set<string>()

  if (degreeProgress) {
    const sortedCategories = [...degreeProgress.categories].sort((a, b) => {
      if (a.id === 'generalElectives') return 1
      if (b.id === 'generalElectives') return -1
      const aIsElective = a.id === 'dcElective' || a.id === 'daElective'
      const bIsElective = b.id === 'dcElective' || b.id === 'daElective'
      if (aIsElective && !bIsElective) return 1
      if (!aIsElective && bIsElective) return -1
      return 0
    })

    for (const cat of sortedCategories) {
      if (cat.completedCourses.length > 0) {
        completedByCategory[cat.name] = cat.completedCourses
      }

      const isAlreadySatisfied = cat.completed >= cat.required

      if (!isAlreadySatisfied) {
        const scheduledInCat = studentData.scheduledCourses.filter((code) =>
          cat.courses.includes(code) && !assignedScheduledCourses.has(code)
        )
        if (scheduledInCat.length > 0) {
          scheduledByCategory[cat.name] = scheduledInCat
          scheduledInCat.forEach((code) => {
            assignedScheduledCourses.add(code)
          })
        }

        const totalFilled = cat.completed + scheduledInCat.length
        if (totalFilled < cat.required) {
          const remaining = cat.required - totalFilled
          neededCategories.push({ category: cat.id, name: cat.name, remaining })
        }
      } else {
        if (cat.completed < cat.required) {
          const remaining = cat.required - cat.completed
          neededCategories.push({ category: cat.id, name: cat.name, remaining })
        }
      }
    }
  }

  // Cleanup blob URL to prevent memory leaks
  const revokePreviewUrl = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const handlePreview = useCallback(() => {
    // Revoke previous URL before creating new one
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
    printPdf(blobUrl)
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000)
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

    // Show alert with instructions
    alert(`Your advising plan has been downloaded as:\n\n${filename}\n\nAn email will now open. Please attach the downloaded file before sending.`)

    // Build a simple email body (advisor-facing)
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
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h2 className="text-xl font-semibold mb-2">Save & Submit</h2>
        <p className="text-sm text-muted-foreground">
          Add notes, save your plan, and schedule an advising appointment.
        </p>
      </div>

      {/* Notes Section */}
      <div className="space-y-3">
        <label htmlFor="notes" className="text-lg font-semibold block px-1">
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

      {/* Export Buttons - 2x2 Grid */}
      <div className="grid grid-cols-2 gap-3 pt-4">
        <Button
          variant="outline"
          className="flex-col h-auto py-4 gap-2"
          onClick={handlePreview}
        >
          <Eye className="size-5" />
          <span className="text-sm">Preview PDF</span>
        </Button>

        <Button
          variant="outline"
          className="flex-col h-auto py-4 gap-2"
          onClick={handlePrint}
        >
          <Printer className="size-5" />
          <span className="text-sm">Print PDF</span>
        </Button>

        <Button
          variant="outline"
          className="flex-col h-auto py-4 gap-2"
          onClick={handleDownload}
        >
          <Download className="size-5" />
          <span className="text-sm">Save CSV</span>
        </Button>

        <Button
          variant="default"
          className="flex-col h-auto py-4 gap-2"
          onClick={handleSubmitToAdvisor}
        >
          <Send className="size-5" />
          <span className="text-sm">Submit</span>
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Submit sends your advising record via email. You may also bring a printed copy to your appointment.
      </p>

      {/* Make Appointment */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-primary">Make an Appointment</h3>
        <p className="text-sm text-muted-foreground">
          Schedule an advising appointment to review your plan together and ensure you're on track.
        </p>
        <div className="flex items-start gap-3 text-sm text-muted-foreground">
          <Mail className="size-4 mt-0.5 flex-shrink-0" />
          <p>
            <strong>Tip:</strong> Save your PDF or CSV and email it before your meeting so your advisor can review it in advance.
          </p>
        </div>
        <Button
          asChild
          className="w-full"
        >
          <a
            href="https://calendly.com/c-rode/appointments"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2"
          >
            <Calendar className="size-4" />
            Schedule Advising Appointment
          </a>
        </Button>
      </div>

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

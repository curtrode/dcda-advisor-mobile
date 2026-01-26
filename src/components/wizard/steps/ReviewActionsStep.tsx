import { useState } from 'react'
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
import { generatePdfBlob, downloadPdf, printPdf, exportToCSV, downloadAdvisorCSV } from '@/services/export'

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

  const handlePreview = () => {
    const { blobUrl, filename } = generatePdfBlob({ studentData, generalElectives })
    setPreviewUrl(blobUrl)
    setPreviewFilename(filename)
  }

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
    const date = new Date().toLocaleDateString()
    const degreeLabel = studentData.degreeType === 'major' ? 'Major' : 'Minor'

    const progressHours = selectedDegreeType === 'major' ? majorHours : minorHours
    const totalHours = selectedDegreeType === 'major' ? majorTotalHours : minorTotalHours
    const progressPercent = Math.round((progressHours / totalHours) * 100)

    // Download the CSV file first
    const filename = downloadAdvisorCSV(studentData, { progressHours, totalHours, progressPercent })

    // Build a simple email body
    const subject = `DCDA Advising Record: ${studentData.name}`
    const body = `DCDA Advising Record
═══════════════════════════════════════

Name: ${studentData.name}
Degree Type: DCDA ${degreeLabel}
Expected Graduation: ${studentData.expectedGraduation || 'Not specified'}
Date: ${date}
Progress: ${progressHours}/${totalHours} hours (${progressPercent}%)

───────────────────────────────────────
IMPORTANT: Please attach the CSV file that was just downloaded:
${filename}
───────────────────────────────────────

Notes/Questions:
${studentData.notes || 'None'}

Submitted via DCDA Advisor Mobile`

    // Small delay to ensure download starts before email opens
    setTimeout(() => {
      const mailtoUrl = `mailto:c.rode@tcu.edu?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      window.open(mailtoUrl, '_blank')
    }, 500)
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

      {/* Export Buttons */}
      <div className="space-y-3 pt-4">
        <Button
          variant="outline"
          className="w-full justify-start gap-3"
          onClick={handlePreview}
        >
          <Eye className="size-5" />
          Preview PDF
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start gap-3"
          onClick={handlePrint}
        >
          <Printer className="size-5" />
          Print PDF
        </Button>

        <Button
          variant="outline"
          className="w-full justify-start gap-3"
          onClick={handleDownload}
        >
          <Download className="size-5" />
          Save CSV
        </Button>

        {/* Submit to Advisor */}
        <div className="pt-3 border-t space-y-2">
          <div className="text-xs text-muted-foreground px-1">
            <strong>Optional:</strong> Submit your advising record for program records
          </div>
          <Button
            variant="default"
            className="w-full justify-center gap-3"
            onClick={handleSubmitToAdvisor}
          >
            <Send className="size-5" />
            Submit to Advisor
          </Button>
          <p className="text-[10px] text-muted-foreground px-1">
            Opens an email with your advising data. You may also bring a printed copy to your advising appointment.
          </p>
        </div>
      </div>

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
      <Dialog open={!!previewUrl} onOpenChange={(open) => !open && setPreviewUrl(null)}>
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

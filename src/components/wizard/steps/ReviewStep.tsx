import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Eye, Printer, Download } from 'lucide-react'
import type { StudentData } from '@/types'
import { useRequirements } from '@/hooks/useRequirements'
import { generatePdfBlob, downloadPdf, printPdf, exportToCSV } from '@/services/export'
import { getCapstoneTargetSemester, getCourseByCode } from '@/services/courses'
import { cn } from '@/lib/utils'

interface ReviewStepProps {
  studentData: StudentData
  generalElectives?: string[]
}

interface SummarySectionProps {
  title: string
  status: 'complete' | 'scheduled' | 'needed'
  count: number
  children: React.ReactNode
}

function SummarySection({ title, status, count, children }: SummarySectionProps) {
  const statusColors = {
    complete: 'bg-green-100 text-green-800',
    scheduled: 'bg-blue-100 text-blue-800',
    needed: 'bg-amber-100 text-amber-800',
  }

  const statusLabels = {
    complete: 'courses',
    scheduled: 'courses',
    needed: 'remaining',
  }

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      <div className="bg-muted px-4 py-3 flex items-center justify-between">
        <span className="font-semibold text-sm">{title}</span>
        <span className={cn("text-xs px-2 py-1 rounded font-medium", statusColors[status])}>
          {count} {statusLabels[status]}
        </span>
      </div>
      <div className="divide-y">
        {children}
      </div>
    </div>
  )
}

interface CourseRowProps {
  code: string
  category: string
  showCheck?: boolean
}

function CourseRow({ code, category, showCheck = false }: CourseRowProps) {
  const course = getCourseByCode(code)
  return (
    <div className="px-4 py-3 flex justify-between items-center text-sm">
      <div>
        <div className="font-medium">{showCheck && '✓ '}{code}</div>
        <div className="text-xs text-muted-foreground">{category}</div>
      </div>
      {course && (
        <div className="text-xs text-muted-foreground text-right max-w-[120px] truncate">
          {course.title}
        </div>
      )}
    </div>
  )
}

export function ReviewStep({ studentData, generalElectives }: ReviewStepProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewFilename, setPreviewFilename] = useState<string>('')
  const { degreeProgress } = useRequirements(studentData, generalElectives)

  const capstoneTarget = getCapstoneTargetSemester(studentData.expectedGraduation)

  // Organize courses by status
  const completedByCategory: Record<string, string[]> = {}
  const scheduledByCategory: Record<string, string[]> = {}
  const neededCategories: { category: string; name: string; remaining: number }[] = []
  const assignedScheduledCourses = new Set<string>() // Track courses already assigned to avoid double-counting

  if (degreeProgress) {
    // Process in priority order: required categories first, then electives, then general
    // This ensures multi-category courses (e.g., MM Auth, Coding) fill their required category first,
    // then electives (DC/DA), then General Electives
    const sortedCategories = [...degreeProgress.categories].sort((a, b) => {
      // General Electives should be last
      if (a.id === 'generalElectives') return 1
      if (b.id === 'generalElectives') return -1

      // DC/DA Electives before General
      const aIsElective = a.id === 'dcElective' || a.id === 'daElective'
      const bIsElective = b.id === 'dcElective' || b.id === 'daElective'
      if (aIsElective && !bIsElective) return 1
      if (!aIsElective && bIsElective) return -1

      // Keep original order for required categories
      return 0
    })

    for (const cat of sortedCategories) {
      if (cat.completedCourses.length > 0) {
        completedByCategory[cat.name] = cat.completedCourses
      }

      // Check if this category still needs courses (not yet satisfied by completed courses alone)
      const isAlreadySatisfied = cat.completed >= cat.required

      // Only assign scheduled courses to this category if requirement is not yet satisfied
      if (!isAlreadySatisfied) {
        const scheduledInCat = studentData.scheduledCourses.filter((code) =>
          cat.courses.includes(code) && !assignedScheduledCourses.has(code)
        )
        if (scheduledInCat.length > 0) {
          scheduledByCategory[cat.name] = scheduledInCat
          // Mark these courses as assigned
          scheduledInCat.forEach((code) => assignedScheduledCourses.add(code))
        }

        // Check if still needed after scheduled courses
        const totalFilled = cat.completed + scheduledInCat.length
        if (totalFilled < cat.required) {
          const remaining = cat.required - totalFilled
          neededCategories.push({ category: cat.id, name: cat.name, remaining })
        }
      } else {
        // Category is already satisfied, check if still needed
        if (cat.completed < cat.required) {
          const remaining = cat.required - cat.completed
          neededCategories.push({ category: cat.id, name: cat.name, remaining })
        }
      }
    }
  }

  // Count totals
  const completedCount = Object.values(completedByCategory).flat().length
  const scheduledCount = Object.values(scheduledByCategory).flat().length
  const neededCount = neededCategories.length

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
    exportToCSV(studentData)
  }

  const handleDownloadPdf = () => {
    if (previewUrl) {
      downloadPdf(previewUrl, previewFilename)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Your Advising Plan</h2>
        <p className="text-sm text-muted-foreground">
          {studentData.name} • DCDA {studentData.degreeType === 'major' ? 'Major' : 'Minor'} • Graduating {studentData.expectedGraduation}
        </p>
      </div>

      {/* Completed Courses */}
      {completedCount > 0 && (
        <SummarySection title="Completed Courses" status="complete" count={completedCount}>
          {Object.entries(completedByCategory).map(([category, codes]) =>
            codes.map((code) => (
              <CourseRow key={code} code={code} category={category} showCheck />
            ))
          )}
        </SummarySection>
      )}

      {/* Scheduled Courses */}
      {scheduledCount > 0 && (
        <SummarySection title="Scheduled: Spring 2026" status="scheduled" count={scheduledCount}>
          {Object.entries(scheduledByCategory).map(([category, codes]) =>
            codes.map((code) => (
              <CourseRow key={code} code={code} category={category} />
            ))
          )}
        </SummarySection>
      )}

      {/* Still Needed */}
      {neededCount > 0 && (
        <SummarySection title="Still Needed" status="needed" count={neededCount}>
          {neededCategories.map(({ category, name }) => (
            <div key={category} className="px-4 py-3 flex justify-between items-center text-sm">
              <div>
                <div className="font-medium">—</div>
                <div className="text-xs text-muted-foreground">{name}</div>
              </div>
              {category === 'capstone' && capstoneTarget && (
                <div className="text-xs text-muted-foreground">
                  Target: {capstoneTarget}
                </div>
              )}
            </div>
          ))}
        </SummarySection>
      )}

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

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Eye, Printer, Download, CalendarDays, Calendar, Mail, Send } from 'lucide-react'
import type { StudentData } from '@/types'
import { useRequirements } from '@/hooks/useRequirements'
import { generatePdfBlob, downloadPdf, printPdf, exportToCSV } from '@/services/export'
import { getCapstoneTargetSemester, getCourseByCode, buildSemesterPlan, type SemesterPlan } from '@/services/courses'
import { cn } from '@/lib/utils'

// Dual Progress Bar Component
interface DualProgressProps {
  majorHours: number
  majorTotal: number
  minorHours: number
  minorTotal: number
  selectedDegree: 'major' | 'minor'
}

function DualProgressBars({ majorHours, majorTotal, minorHours, minorTotal, selectedDegree }: DualProgressProps) {
  const majorPercent = Math.min(100, Math.round((majorHours / majorTotal) * 100))
  const minorPercent = Math.min(100, Math.round((minorHours / minorTotal) * 100))
  
  return (
    <div className="bg-card border rounded-xl p-4 space-y-3">
      <div className="text-sm font-medium text-muted-foreground">Progress Comparison</div>
      
      {/* Major Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className={cn("font-medium", selectedDegree === 'major' ? 'text-primary' : 'text-muted-foreground')}>
            Major {selectedDegree === 'major' && '(selected)'}
          </span>
          <span className="text-muted-foreground">{majorHours}/{majorTotal} hrs ({majorPercent}%)</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all",
              selectedDegree === 'major' ? 'bg-primary' : 'bg-muted-foreground/40'
            )}
            style={{ width: `${majorPercent}%` }}
          />
        </div>
      </div>
      
      {/* Minor Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className={cn("font-medium", selectedDegree === 'minor' ? 'text-primary' : 'text-muted-foreground')}>
            Minor {selectedDegree === 'minor' && '(selected)'}
          </span>
          <span className="text-muted-foreground">{minorHours}/{minorTotal} hrs ({minorPercent}%)</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all",
              selectedDegree === 'minor' ? 'bg-primary' : 'bg-muted-foreground/40'
            )}
            style={{ width: `${minorPercent}%` }}
          />
        </div>
      </div>
      
      {/* Insight message */}
      {minorPercent === 100 && majorPercent < 100 && selectedDegree === 'major' && (
        <p className="text-xs text-green-600 dark:text-green-400 mt-2">
          ✓ You've completed enough for a minor! Continue {majorTotal - majorHours} more hours for the major.
        </p>
      )}
      {majorPercent === 100 && selectedDegree === 'minor' && (
        <p className="text-xs text-green-600 dark:text-green-400 mt-2">
          ✓ You've completed enough courses for a major!
        </p>
      )}
    </div>
  )
}

interface ReviewStepProps {
  studentData: StudentData
  generalElectives?: string[]
  updateStudentData: (updates: Partial<StudentData>) => void
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

// Semester Plan Table Component
interface SemesterPlanTableProps {
  plan: SemesterPlan[]
}

function SemesterPlanTable({ plan }: SemesterPlanTableProps) {
  if (plan.length === 0) return null
  
  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      <div className="bg-muted px-4 py-3 flex items-center gap-2">
        <CalendarDays className="size-4" />
        <span className="font-semibold text-sm">Suggested Semester Plan</span>
      </div>
      
      {/* Responsive Grid Layout - Stacks on mobile, Grid on larger screens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border">
        {plan.map(({ semester, courses }) => (
          <div key={semester} className="bg-card p-4 flex flex-col gap-3">
            <div className="font-semibold text-xs uppercase tracking-wider text-muted-foreground border-b pb-1">
              {semester}
            </div>
            
            {courses.length > 0 ? (
              <div className="space-y-2">
                {courses.map((course, idx) => (
                  <div key={idx} className="bg-muted/40 rounded px-2.5 py-2 border border-border/50">
                    <div className={cn(
                      "font-medium text-xs",
                      course.code === '—' ? 'text-muted-foreground' : ''
                    )}>
                      {course.code}
                    </div>
                    {course.category && (
                      <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {course.category}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground italic py-1">No courses</div>
            )}
          </div>
        ))}
      </div>

      <div className="px-4 py-3 text-[10px] text-muted-foreground border-t bg-muted/30">
        — indicates course to be determined. Plan is a suggestion only.
      </div>
    </div>
  )
}

export function ReviewStep({ studentData, generalElectives, updateStudentData }: ReviewStepProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewFilename, setPreviewFilename] = useState<string>('')
  const { degreeProgress, requirements } = useRequirements(studentData, generalElectives)

  // Calculate progress for both degree types (for dual progress bars)
  const selectedDegreeType = studentData.degreeType || 'major'
  const majorTotalHours = requirements.major.totalHours
  const minorTotalHours = requirements.minor.totalHours
  
  // For the selected degree, use actual calculated progress
  // For the other degree, do a simple count of completed course hours (capped)
  const completedCourseHours = studentData.completedCourses.length * 3
  const specialCreditHours = studentData.specialCredits.length * 3
  const totalCompletedHours = completedCourseHours + specialCreditHours
  
  const majorHours = selectedDegreeType === 'major' 
    ? (degreeProgress?.completedHours ?? 0)
    : Math.min(totalCompletedHours, majorTotalHours)
  const minorHours = selectedDegreeType === 'minor'
    ? (degreeProgress?.completedHours ?? 0)
    : Math.min(totalCompletedHours, minorTotalHours)

  const capstoneTarget = getCapstoneTargetSemester(studentData.expectedGraduation)

  // Organize courses by status
  const completedByCategory: Record<string, string[]> = {}
  const scheduledByCategory: Record<string, string[]> = {}
  const scheduledCourseCategories: Record<string, string> = {} // course code -> category name
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
          // Mark these courses as assigned and track their categories
          scheduledInCat.forEach((code) => {
            assignedScheduledCourses.add(code)
            scheduledCourseCategories[code] = cat.name
          })
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
  const neededCoursesCount = neededCategories.reduce((sum, cat) => sum + cat.remaining, 0)
  
  // Build semester plan
  const semesterPlan = buildSemesterPlan(
    studentData.scheduledCourses,
    scheduledCourseCategories,
    neededCategories,
    studentData.expectedGraduation,
    studentData.includeSummer || false
  )

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
    
    // Build completed courses by category
    const completedSection = Object.entries(completedByCategory).length > 0
      ? Object.entries(completedByCategory)
          .map(([category, codes]) => `  ${category}:\n    ${codes.join(', ')}`)
          .join('\n')
      : '  None'

    // Build scheduled courses by category
    const scheduledSection = Object.entries(scheduledByCategory).length > 0
      ? Object.entries(scheduledByCategory)
          .map(([category, codes]) => `  ${category}:\n    ${codes.join(', ')}`)
          .join('\n')
      : '  None'

    // Build special credits section
    const specialCreditsSection = studentData.specialCredits.length > 0
      ? studentData.specialCredits
          .map(c => `  • ${c.type.charAt(0).toUpperCase() + c.type.slice(1).replace('-', ' ')}: ${c.description}\n    Counts as: ${c.countsAs}`)
          .join('\n')
      : '  None'

    // Build remaining requirements section
    const remainingSection = neededCategories.length > 0
      ? neededCategories
          .map(cat => `  • ${cat.name}: ${cat.remaining} course${cat.remaining > 1 ? 's' : ''} needed`)
          .join('\n')
      : '  All requirements satisfied!'

    // Progress summary
    const progressHours = selectedDegreeType === 'major' ? majorHours : minorHours
    const totalHours = selectedDegreeType === 'major' ? majorTotalHours : minorTotalHours
    const progressPercent = Math.round((progressHours / totalHours) * 100)

    // Build CSV data for machine parsing (compact format)
    const csvData = [
      'DCDA_MOBILE_EXPORT,v1',
      `name,${studentData.name}`,
      `degreeType,${studentData.degreeType || ''}`,
      `expectedGraduation,${studentData.expectedGraduation || ''}`,
      `completedCourses,${studentData.completedCourses.join(';')}`,
      `scheduledCourses,${studentData.scheduledCourses.join(';')}`,
      studentData.specialCredits.length > 0
        ? `specialCredits,${JSON.stringify(studentData.specialCredits.map(c => ({ type: c.type, description: c.description, countsAs: c.countsAs })))}`
        : '',
      studentData.courseCategories && Object.keys(studentData.courseCategories).length > 0
        ? `courseCategories,${JSON.stringify(studentData.courseCategories)}`
        : '',
      generalElectives && generalElectives.length > 0
        ? `generalElectives,${generalElectives.join(';')}`
        : '',
      studentData.notes ? `notes,${studentData.notes.replace(/\n/g, '\\n')}` : '',
    ].filter(Boolean).join('\n')

    const subject = `DCDA Advising Record: ${studentData.name}`
    const body = `═══════════════════════════════════════
       DCDA ADVISING RECORD
═══════════════════════════════════════

📋 STUDENT INFORMATION
───────────────────────────────────────
Name:                ${studentData.name}
Degree Type:         DCDA ${degreeLabel}
Expected Graduation: ${studentData.expectedGraduation || 'Not specified'}
Date Submitted:      ${date}

📊 PROGRESS: ${progressHours}/${totalHours} hours (${progressPercent}%)
───────────────────────────────────────

✅ COMPLETED COURSES (by category)
───────────────────────────────────────
${completedSection}

📅 SCHEDULED COURSES - Spring 2026
───────────────────────────────────────
${scheduledSection}

📝 SPECIAL CREDITS
───────────────────────────────────────
${specialCreditsSection}

⏳ REMAINING REQUIREMENTS
───────────────────────────────────────
${remainingSection}

💬 NOTES/QUESTIONS
───────────────────────────────────────
${studentData.notes || 'None'}

═══════════════════════════════════════
         CSV DATA (for records)
═══════════════════════════════════════
${csvData}
═══════════════════════════════════════

Submitted via DCDA Advisor Mobile`

    const mailtoUrl = `mailto:c.rode@tcu.edu?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(mailtoUrl, '_blank')
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h2 className="text-xl font-semibold mb-2">Your Advising Plan</h2>
        <p className="text-sm text-muted-foreground">
          {studentData.name} • DCDA {studentData.degreeType === 'major' ? 'Major' : 'Minor'} • Graduating {studentData.expectedGraduation}
        </p>
      </div>

      {/* Dual Progress Bars */}
      <DualProgressBars
        majorHours={majorHours}
        majorTotal={majorTotalHours}
        minorHours={minorHours}
        minorTotal={minorTotalHours}
        selectedDegree={selectedDegreeType}
      />

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
      {neededCoursesCount > 0 && (
        <SummarySection title="Still Needed" status="needed" count={neededCoursesCount}>
          {neededCategories.map(({ category, name, remaining }) => (
            <div key={category} className="px-4 py-3 flex justify-between items-center text-sm">
              <div>
                <div className="font-medium">
                  {category === 'generalElectives' && remaining > 1
                    ? `${remaining} courses`
                    : '—'}
                </div>
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

      {/* Semester Plan Table */}
      {(scheduledCount > 0 || neededCoursesCount > 0) && (
        <SemesterPlanTable plan={semesterPlan} />
      )}

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
            Submit your advising record for program records
          </div>
          <Button
            variant="default"
            className="w-full justify-start gap-3"
            onClick={handleSubmitToAdvisor}
          >
            <Send className="size-5" />
            Submit to Advisor
          </Button>
          <p className="text-[10px] text-muted-foreground px-1">
            Opens an email with your advising data. Just click Send!
          </p>
        </div>
      </div>

      {/* Farewell / Next Steps */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-primary">Next Steps</h3>
        <p className="text-sm text-muted-foreground">
          Great job completing your degree plan! To make sure you're on track, schedule an advising appointment to review your plan together.
        </p>
        <div className="flex items-start gap-3 text-sm text-muted-foreground">
          <Mail className="size-4 mt-0.5 flex-shrink-0" />
          <p>
            <strong>Tip:</strong> Save your PDF or CSV and email it to your advisor before your meeting so they can review it in advance.
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

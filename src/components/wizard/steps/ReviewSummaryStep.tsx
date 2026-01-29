import type { StudentData } from '@/types'
import { useRequirements } from '@/hooks/useRequirements'
import { getCourseByCode, buildSemesterPlan, getNextSemesterTerm } from '@/services/courses'
import { cn } from '@/lib/utils'
import { CalendarDays } from 'lucide-react'

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

interface SummarySectionProps {
  title: string
  status: 'complete' | 'scheduled' | 'needed'
  count: number
  children: React.ReactNode
}

function SummarySection({ title, status, count, children }: SummarySectionProps) {
  const statusColors = {
    complete: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    needed: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
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

interface ReviewSummaryStepProps {
  studentData: StudentData
  generalElectives?: string[]
}

export function ReviewSummaryStep({ studentData, generalElectives }: ReviewSummaryStepProps) {
  const { degreeProgress, requirements } = useRequirements(studentData, generalElectives)

  // Calculate progress for both degree types (for dual progress bars)
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

  // Organize courses by status
  const completedByCategory: Record<string, string[]> = {}
  const scheduledByCategory: Record<string, string[]> = {}
  const scheduledCourseCategories: Record<string, string> = {}
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
            scheduledCourseCategories[code] = cat.name
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

  const completedCount = Object.values(completedByCategory).flat().length
  const scheduledCount = Object.values(scheduledByCategory).flat().length
  const neededCoursesCount = neededCategories.reduce((sum, cat) => sum + cat.remaining, 0)
  
  const semesterPlan = buildSemesterPlan(
    studentData.scheduledCourses,
    scheduledCourseCategories,
    neededCategories,
    studentData.expectedGraduation,
    studentData.includeSummer || false
  )

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

      {/* Completed & Scheduled Courses - Side by Side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {completedCount > 0 && (
          <SummarySection title="Completed Courses" status="complete" count={completedCount}>
            {Object.entries(completedByCategory).map(([category, codes]) =>
              codes.map((code) => (
                <CourseRow key={code} code={code} category={category} showCheck />
              ))
            )}
          </SummarySection>
        )}

        {scheduledCount > 0 && (
          <SummarySection title={`Scheduled: ${getNextSemesterTerm()}`} status="scheduled" count={scheduledCount}>
            {Object.entries(scheduledByCategory).map(([category, codes]) =>
              codes.map((code) => (
                <CourseRow key={code} code={code} category={category} />
              ))
            )}
          </SummarySection>
        )}
      </div>

      {/* Remaining Plan */}
      {(scheduledCount > 0 || neededCoursesCount > 0) && (
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="bg-muted px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4" />
              <span className="font-semibold text-sm">Remaining Plan</span>
            </div>
            {neededCoursesCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {neededCoursesCount} course{neededCoursesCount !== 1 ? 's' : ''} still needed
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border">
            {semesterPlan.map(({ semester, courses }) => (
              <div key={semester} className="bg-card p-4 flex flex-col gap-3">
                <div className="font-semibold text-xs uppercase tracking-wider text-muted-foreground border-b pb-1">
                  {semester}
                </div>
                
                {courses.length > 0 ? (
                  <div className="space-y-2">
                    {courses.map((course, idx) => (
                      <div key={idx} className={cn(
                        "rounded px-2.5 py-2 border",
                        course.code === '—' 
                          ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50' 
                          : 'bg-muted/40 border-border/50'
                      )}>
                        <div className={cn(
                          "font-medium text-xs",
                          course.code === '—' ? 'text-amber-700 dark:text-amber-400' : ''
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
      )}
    </div>
  )
}

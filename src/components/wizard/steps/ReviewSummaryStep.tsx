import type { StudentData } from '@/types'
import { useRequirements } from '@/hooks/useRequirements'
import { getCourseByCode, buildSemesterPlan, getNextSemesterTerm } from '@/services/courses'
import { cn } from '@/lib/utils'
import { CalendarDays, Check } from 'lucide-react'

// Hero Progress Component — large percentage with bar
interface ProgressHeroProps {
  hours: number
  totalHours: number
  degreeLabel: string
  altHours?: number
  altTotalHours?: number
  altDegreeLabel?: string
  showAltInsight?: boolean
}

function ProgressHero({ hours, totalHours, degreeLabel, altHours, altTotalHours, altDegreeLabel, showAltInsight }: ProgressHeroProps) {
  const percent = Math.min(100, Math.round((hours / totalHours) * 100))
  const altPercent = altHours && altTotalHours ? Math.min(100, Math.round((altHours / altTotalHours) * 100)) : 0
  
  return (
    <div className="bg-gradient-to-br from-primary to-primary-light rounded-2xl p-5 text-primary-foreground">
      <div className="flex items-center gap-4">
        <div className="text-5xl font-extrabold leading-none tabular-nums">
          {percent}<span className="text-2xl font-semibold">%</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold mb-1.5">
            DCDA {degreeLabel} Progress
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="text-xs mt-1 opacity-80">
            {hours} of {totalHours} credit hours completed
          </div>
        </div>
      </div>
      {showAltInsight && altPercent === 100 && altDegreeLabel && (
        <div className="mt-3 px-3 py-2 bg-white/10 rounded-lg text-xs flex items-center gap-1.5">
          <Check className="size-3.5" />
          You've also completed enough for a {altDegreeLabel.toLowerCase()} ({altHours}/{altTotalHours} hrs)
        </div>
      )}
      {showAltInsight && altPercent < 100 && altPercent > 0 && altDegreeLabel && altHours !== undefined && altTotalHours !== undefined && (
        <div className="mt-3 px-3 py-2 bg-white/10 rounded-lg text-xs opacity-80">
          {altDegreeLabel} progress: {altHours}/{altTotalHours} hrs ({altPercent}%)
        </div>
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
    <div className={cn(
      "px-4 py-3 flex justify-between items-center text-sm border-l-[3px]",
      showCheck ? "border-l-green-500" : "border-l-blue-500"
    )}>
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

      {/* Progress Hero */}
      <ProgressHero
        hours={selectedDegreeType === 'major' ? majorHours : minorHours}
        totalHours={selectedDegreeType === 'major' ? majorTotalHours : minorTotalHours}
        degreeLabel={selectedDegreeType === 'major' ? 'Major' : 'Minor'}
        altHours={selectedDegreeType === 'major' ? minorHours : majorHours}
        altTotalHours={selectedDegreeType === 'major' ? minorTotalHours : majorTotalHours}
        altDegreeLabel={selectedDegreeType === 'major' ? 'Minor' : 'Major'}
        showAltInsight
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

      {/* Remaining Plan — horizontal scroll on mobile */}
      {(scheduledCount > 0 || neededCoursesCount > 0) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4" />
              <span className="font-semibold text-sm">Semester Plan</span>
            </div>
            <div className="flex items-center gap-2">
              {neededCoursesCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  {neededCoursesCount} course{neededCoursesCount !== 1 ? 's' : ''} needed
                </span>
              )}
              {semesterPlan.length > 1 && (
                <span className="text-xs text-muted-foreground sm:hidden">Swipe →</span>
              )}
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory -mx-5 px-5 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible">
            {semesterPlan.map(({ semester, courses }) => (
              <div key={semester} className="min-w-[220px] max-w-[260px] sm:min-w-0 sm:max-w-none bg-card border rounded-xl overflow-hidden snap-start shrink-0 sm:shrink">
                <div className="bg-muted px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b">
                  {semester}
                </div>
                
                <div className="p-2.5 space-y-2">
                  {courses.length > 0 ? (
                    courses.map((course, idx) => (
                      <div key={idx} className={cn(
                        "rounded-lg px-3 py-2.5 border-l-[3px]",
                        course.code === '—' 
                          ? 'bg-amber-50 dark:bg-amber-950/30 border-l-amber-400' 
                          : 'bg-muted/40 border-l-blue-500'
                      )}>
                        <div className={cn(
                          "font-semibold text-xs",
                          course.code === '—' ? 'text-amber-700 dark:text-amber-400' : ''
                        )}>
                          {course.code}
                        </div>
                        {course.category && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {course.category}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-muted-foreground italic py-2 px-1">No courses</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            — = course to be determined. Plan is a suggestion only.
          </p>
        </div>
      )}
    </div>
  )
}

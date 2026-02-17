import { useEffect } from 'react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { RequirementCategoryId } from '@/types'
import { getOfferedCoursesForCategory, categoryNames, getEnrollmentWarning, getNextSemesterTerm } from '@/services/courses'
import { AlertTriangle, CalendarDays } from 'lucide-react'

// Blue accent classes for schedule phase (vs purple for history)
const scheduleAccent = {
  border: 'border-blue-500',
  bg: 'bg-blue-500',
  selectedCard: 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 shadow-sm shadow-blue-500/10',
  chip: 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40',
  skipSelected: 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 text-blue-600',
}

interface ScheduleStepProps {
  categoryId: RequirementCategoryId
  selectedCourse: string | null
  selectedCourses?: string[] // For multi-select (generalElectives)
  multiSelect?: boolean
  allSelectedCourses: string[]
  allScheduledCourses: string[]
  completedRequiredCourses: string[]
  onSelectCourse: (courseCode: string) => void
  onDeselectCourse?: (courseCode: string) => void
  onSkip: () => void
  isSkipped: boolean
  degreeType: 'major' | 'minor'
}

export function ScheduleStep({
  categoryId,
  selectedCourse,
  selectedCourses = [],
  multiSelect = false,
  allSelectedCourses,
  allScheduledCourses,
  completedRequiredCourses,
  onSelectCourse,
  onDeselectCourse,
  onSkip,
  isSkipped,
  degreeType,
}: ScheduleStepProps) {
  // Get courses offered next semester for this category
  // For multi-select, exclude already scheduled but keep selected ones visible
  const excludeCourses = multiSelect
    ? [...allSelectedCourses, ...allScheduledCourses.filter((c) => !selectedCourses.includes(c))]
    : [...allSelectedCourses, ...allScheduledCourses.filter((c) => c !== selectedCourse)]
  const availableCourses = getOfferedCoursesForCategory(categoryId, degreeType, excludeCourses, completedRequiredCourses)

  // Auto-skip when no courses are available
  useEffect(() => {
    if (availableCourses.length === 0 && !isSkipped) {
      onSkip()
    }
  }, [availableCourses.length, isSkipped, onSkip])

  const categoryName = categoryNames[categoryId]

  // Multi-select mode for general electives
  if (multiSelect) {
    return (
      <div className="space-y-6">
        {/* Semester context banner */}
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 rounded-xl">
          <CalendarDays className="size-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <div>
            <div className="text-sm font-semibold text-blue-700 dark:text-blue-300">
              Scheduling for {getNextSemesterTerm()}
            </div>
            <div className="text-xs text-blue-600/70 dark:text-blue-400/70">
              Choose courses to take next semester
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">
            Which {categoryName} courses?
          </h2>
          <p className="text-sm text-muted-foreground">
            Select one or more courses to schedule. You can select multiple General Electives.
          </p>
        </div>

        {availableCourses.length > 0 ? (
          <div className="space-y-3">
            {availableCourses.map((course) => {
              const warning = getEnrollmentWarning(course.code)
              const isSelected = selectedCourses.includes(course.code)

              return (
                <label
                  key={course.code}
                  className={cn(
                    "flex items-stretch rounded-xl border-2 cursor-pointer transition-all overflow-hidden",
                    isSelected
                      ? scheduleAccent.selectedCard
                      : "border-border bg-card hover:border-blue-300 dark:hover:border-blue-700"
                  )}
                >
                  {/* Left accent bar — blue for schedule */}
                  <div className={cn(
                    "w-1 shrink-0 transition-colors",
                    isSelected ? scheduleAccent.bg : "bg-transparent"
                  )} />
                  <div className="flex items-start gap-3 p-4 flex-1 min-w-0">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          onSelectCourse(course.code)
                        } else if (onDeselectCourse) {
                          onDeselectCourse(course.code)
                        }
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="mb-1">
                        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded", scheduleAccent.chip)}>
                          {course.code}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-foreground leading-snug">{course.title}</div>
                      {warning && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-md px-2.5 py-1.5">
                          <AlertTriangle className="size-3.5 shrink-0" />
                          <span>{warning}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </label>
              )
            })}

            {/* Skip Option */}
            <button
              type="button"
              onClick={onSkip}
              className={cn(
                "w-full flex items-center justify-center p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all",
                isSkipped && selectedCourses.length === 0
                  ? scheduleAccent.skipSelected
                  : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"
              )}
            >
              <span className="text-sm font-medium">Skip for now</span>
            </button>
          </div>
        ) : (
          <div className="text-center py-8 space-y-4">
            <p className="text-muted-foreground">
              No courses for this category are offered in {getNextSemesterTerm()}.
            </p>
            <p className="text-sm text-muted-foreground">
              This category has been automatically skipped. You can plan for a future semester.
            </p>
            {/* Fallback Skip button in case auto-skip hasn't fired */}
            {!isSkipped && (
              <button
                type="button"
                onClick={onSkip}
                className="px-4 py-2 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground transition-all"
              >
                <span className="text-sm font-medium">Skip for now</span>
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  // Single-select mode (original behavior)

  return (
    <div className="space-y-6">
      {/* Semester context banner */}
      <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 rounded-xl">
        <CalendarDays className="size-5 text-blue-600 dark:text-blue-400 shrink-0" />
        <div>
          <div className="text-sm font-semibold text-blue-700 dark:text-blue-300">
            Scheduling for {getNextSemesterTerm()}
          </div>
          <div className="text-xs text-blue-600/70 dark:text-blue-400/70">
            Choose a course to take next semester
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">
          Which {categoryName} course?
        </h2>
        <p className="text-sm text-muted-foreground">
          These courses are offered next semester and fulfill your {categoryName} requirement.
        </p>
      </div>

      {availableCourses.length > 0 ? (
        <RadioGroup
          value={isSkipped ? 'skip' : (selectedCourse || '')}
          onValueChange={(value) => {
            if (value === 'skip') {
              onSkip()
            } else {
              onSelectCourse(value)
            }
          }}
        >
          {availableCourses.map((course) => {
            const warning = getEnrollmentWarning(course.code)

            return (
              <label
                key={course.code}
                className={cn(
                  "flex items-stretch rounded-xl border-2 cursor-pointer transition-all overflow-hidden",
                  selectedCourse === course.code && !isSkipped
                    ? scheduleAccent.selectedCard
                    : "border-border bg-card hover:border-blue-300 dark:hover:border-blue-700"
                )}
              >
                {/* Left accent bar — blue for schedule */}
                <div className={cn(
                  "w-1 shrink-0 transition-colors",
                  selectedCourse === course.code && !isSkipped ? scheduleAccent.bg : "bg-transparent"
                )} />
                <div className="flex items-start gap-3 p-4 flex-1 min-w-0">
                  <RadioGroupItem value={course.code} className="mt-1" />
                  <div className="flex-1">
                    <div className="mb-1">
                      <span className={cn("text-xs font-semibold px-2 py-0.5 rounded", scheduleAccent.chip)}>
                        {course.code}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-foreground leading-snug">{course.title}</div>
                    {warning && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-md px-2.5 py-1.5">
                        <AlertTriangle className="size-3.5 shrink-0" />
                        <span>{warning}</span>
                      </div>
                    )}
                  </div>
                </div>
              </label>
            )
          })}

          {/* Skip Option */}
          <label
            className={cn(
              "flex items-center justify-center p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all",
              isSkipped
                ? scheduleAccent.skipSelected
                : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"
            )}
          >
            <RadioGroupItem value="skip" className="sr-only" />
            <span className="text-sm font-medium">Skip for now</span>
          </label>
        </RadioGroup>
      ) : (
        <div className="text-center py-8 space-y-4">
          <p className="text-muted-foreground">
            No courses for this category are offered in {getNextSemesterTerm()}.
          </p>
          <p className="text-sm text-muted-foreground">
            This category has been automatically skipped. You can plan for a future semester.
          </p>
          {/* Fallback Skip button in case auto-skip hasn't fired */}
          {!isSkipped && (
            <button
              type="button"
              onClick={onSkip}
              className="px-4 py-2 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground transition-all"
            >
              <span className="text-sm font-medium">Skip for now</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

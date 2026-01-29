import { useEffect } from 'react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { RequirementCategoryId } from '@/types'
import { getOfferedCoursesForCategory, categoryNames, getEnrollmentWarning, getSectionsForCourse, getNextSemesterTerm } from '@/services/courses'
import { AlertTriangle } from 'lucide-react'

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
        <div>
          <h2 className="text-xl font-semibold mb-2">
            Which {categoryName} courses for {getNextSemesterTerm()}?
          </h2>
          <p className="text-sm text-muted-foreground">
            Select one or more courses to schedule for next semester. You can select multiple General Electives.
          </p>
        </div>

        {availableCourses.length > 0 ? (
          <div className="space-y-3">
            {availableCourses.map((course) => {
              const warning = getEnrollmentWarning(course.code)
              const sections = getSectionsForCourse(course.code)
              const sectionInfo = sections.length > 0 ? sections[0] : null
              const isSelected = selectedCourses.includes(course.code)

              return (
                <label
                  key={course.code}
                  className={cn(
                    "flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                    isSelected
                      ? "border-primary bg-accent"
                      : "border-border bg-card hover:border-primary/50"
                  )}
                >
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
                    <div className="font-semibold">{course.code}</div>
                    <div className="text-sm text-muted-foreground">{course.title}</div>
                    {sectionInfo && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {sectionInfo.schedule} • {sectionInfo.modality}
                      </div>
                    )}
                    {warning && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600">
                        <AlertTriangle className="size-3.5" />
                        <span>{warning}</span>
                      </div>
                    )}
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
                  ? "border-primary bg-accent text-primary"
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
      <div>
        <h2 className="text-xl font-semibold mb-2">
          Which {categoryName} course for {getNextSemesterTerm()}?
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
            const sections = getSectionsForCourse(course.code)
            const sectionInfo = sections.length > 0 ? sections[0] : null

            return (
              <label
                key={course.code}
                className={cn(
                  "flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                  selectedCourse === course.code && !isSkipped
                    ? "border-primary bg-accent"
                    : "border-border bg-card hover:border-primary/50"
                )}
              >
                <RadioGroupItem value={course.code} className="mt-1" />
                <div className="flex-1">
                  <div className="font-semibold">{course.code}</div>
                  <div className="text-sm text-muted-foreground">{course.title}</div>
                  {sectionInfo && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {sectionInfo.schedule} • {sectionInfo.modality}
                    </div>
                  )}
                  {warning && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600">
                      <AlertTriangle className="size-3.5" />
                      <span>{warning}</span>
                    </div>
                  )}
                </div>
              </label>
            )
          })}

          {/* Skip Option */}
          <label
            className={cn(
              "flex items-center justify-center p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all",
              isSkipped
                ? "border-primary bg-accent text-primary"
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

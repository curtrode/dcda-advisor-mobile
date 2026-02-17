import { useState } from 'react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Info, Search, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RequirementCategoryId, Course } from '@/types'
import { getCoursesForCategory, isMutuallyExcluded } from '@/services/courses'

// Info button component — 36px touch target minimum
function CourseInfoButton({ course, onClick }: { course: Course; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClick()
      }}
      className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-accent border border-transparent hover:border-border transition-colors shrink-0"
      aria-label={`Info about ${course.code}`}
    >
      <Info className="size-5" />
    </button>
  )
}

interface CourseStepProps {
  categoryId: RequirementCategoryId
  title: string
  hint?: string
  selectedCourse: string | null // For single-select categories
  selectedCourses: string[] // For multi-select (general electives)
  allSelectedCourses: string[] // All courses selected so far (for exclusions)
  completedRequiredCourses?: string[] // Courses used to fulfill required categories (for elective filtering)
  multiSelect?: boolean
  onSelectCourse: (courseCode: string) => void
  onDeselectCourse: (courseCode: string) => void
  onSelectNotYet: () => void
  isNotYetSelected: boolean
  degreeType: 'major' | 'minor'
}

export function CourseStep({
  categoryId,
  title,
  hint,
  selectedCourse,
  selectedCourses,
  allSelectedCourses,
  completedRequiredCourses = [],
  multiSelect = false,
  onSelectCourse,
  onDeselectCourse,
  onSelectNotYet,
  isNotYetSelected,
  degreeType,
}: CourseStepProps) {
  const [infoCourse, setInfoCourse] = useState<Course | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Get courses for this category, excluding already selected courses
  const categoryCourses = getCoursesForCategory(categoryId, degreeType, completedRequiredCourses)
  const availableCourses = categoryCourses.filter(
    (course) =>
      !allSelectedCourses.includes(course.code) ||
      selectedCourse === course.code ||
      selectedCourses.includes(course.code)
  )

  // Filter out mutually excluded courses
  const filteredCourses = availableCourses.filter(
    (course) =>
      !isMutuallyExcluded(course.code, allSelectedCourses.filter((c) => c !== course.code))
  )

  // Search filter
  const searchedCourses = filteredCourses.filter(course => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      course.code.toLowerCase().includes(q) ||
      course.title.toLowerCase().includes(q) ||
      course.description?.toLowerCase().includes(q)
    )
  })

  // Check if this is a DC or DA elective category (single category multi-select with "not yet")
  const isSingleCategoryMultiSelect = categoryId === 'dcElective' || categoryId === 'daElective'

  // Is filtering needed? (Long lists)
  const showSearch = categoryCourses.length > 10

  if (multiSelect) {
    // Group courses by category
    const digitalCultureCourses = searchedCourses.filter((c) => c.category === 'Digital Culture')
    const dataAnalyticsCourses = searchedCourses.filter((c) => c.category === 'Data Analytics')
    const mmAuthoringCourses = searchedCourses.filter((c) => c.category === 'Multimedia Authoring')
    const honorsCourses = searchedCourses.filter((c) => c.category === 'Honors Seminars & Capstone')

    // For DC/DA electives, only show the relevant category
    const coursesToShow = isSingleCategoryMultiSelect
      ? (categoryId === 'dcElective' ? digitalCultureCourses : dataAnalyticsCourses)
      : searchedCourses
    
    // For general electives on majors, only show MM Authoring and Honors (DC/DA already captured)
    const isGeneralElectivesForMajor = categoryId === 'generalElectives' && degreeType === 'major'

    const renderCourseList = (courses: typeof searchedCourses) => {
      return courses.map((course) => {
        const isSelected = selectedCourses.includes(course.code)
        const selectionIndex = selectedCourses.indexOf(course.code)
        const isFirstSelection = selectionIndex === 0
        
        return (
          <label
            key={course.code}
            className={cn(
              "flex items-stretch rounded-xl border-2 cursor-pointer transition-all overflow-hidden",
              isSelected
                ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
                : "border-border bg-card hover:border-primary/50"
            )}
          >
            {/* Left accent bar */}
            <div className={cn(
              "w-1 shrink-0 transition-colors",
              isSelected ? "bg-primary" : "bg-transparent"
            )} />
            <div className="flex items-center gap-3 p-4 flex-1 min-w-0">
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onSelectCourse(course.code)
                  } else {
                    onDeselectCourse(course.code)
                  }
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                    {course.code}
                  </span>
                  {isSingleCategoryMultiSelect && isSelected && (
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      isFirstSelection 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      {isFirstSelection ? 'Elective' : 'Gen Elective'}
                    </span>
                  )}
                </div>
                <div className="text-sm font-medium text-foreground leading-snug">{course.title}</div>
              </div>
              <CourseInfoButton course={course} onClick={() => setInfoCourse(course)} />
            </div>
          </label>
        )
      })
    }

    const renderCourseGroup = (courses: typeof filteredCourses, categoryLabel: string) => {
      if (courses.length === 0) return null

      return (
        <div key={categoryLabel} className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
            {categoryLabel}
          </h3>
          {renderCourseList(courses)}
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">{title}</h2>
          {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
        </div>

        {/* Search Input */}
        {showSearch && (
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        )}

        {/* "Haven't taken any" as first-class option */}
        {isSingleCategoryMultiSelect && (
          <button
            type="button"
            onClick={onSelectNotYet}
            className={cn(
              "w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all text-left",
              isNotYetSelected
                ? "border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-950/30"
                : "border-border hover:border-amber-300 dark:hover:border-amber-700"
            )}
          >
            <Checkbox checked={isNotYetSelected} onCheckedChange={() => onSelectNotYet()} />
            <div className="flex-1">
              <div className="text-sm font-semibold text-foreground">Haven't taken any</div>
              <div className="text-xs text-muted-foreground">I haven't completed courses in this category yet</div>
            </div>
          </button>
        )}

        {/* Selection count indicator (only when courses are selected) */}
        {isSingleCategoryMultiSelect && selectedCourses.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 w-fit">
            <Check className="h-4 w-4" />{selectedCourses.length} selected
          </div>
        )}

        <div className="space-y-6">
          {searchedCourses.length === 0 ? (
             <div className="text-center py-8 text-black/50">
               No courses found matching "{searchQuery}"
             </div>
          ) : isSingleCategoryMultiSelect ? (
            // Single category (DC or DA electives)
            <div className="space-y-3">
              {renderCourseList(coursesToShow)}
            </div>
          ) : isGeneralElectivesForMajor ? (
            // General electives for majors - only Honors Seminars (DC/DA already on separate screens)
            <>
              {renderCourseGroup(honorsCourses, 'Honors Seminars')}
            </>
          ) : (
            // General electives for minors - show all categories
            <>
              {renderCourseGroup(digitalCultureCourses, 'Digital Culture')}
              {renderCourseGroup(dataAnalyticsCourses, 'Data Analytics')}
              {renderCourseGroup(mmAuthoringCourses, 'Multimedia Authoring')}
              {renderCourseGroup(honorsCourses, 'Honors Seminars')}
            </>
          )}
        </div>

        {/* Empty state for general electives */}
        {categoryId === 'generalElectives' && (
          (isGeneralElectivesForMajor 
            ? (honorsCourses.length === 0)
            : filteredCourses.length === 0
          ) && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No additional courses available.
            </p>
          )
        )}

        {/* Course Info Dialog */}
        <Dialog open={!!infoCourse} onOpenChange={(open) => !open && setInfoCourse(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg">{infoCourse?.code}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <h3 className="font-semibold">{infoCourse?.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {infoCourse?.description}
              </p>
              <div className="flex gap-2 text-xs text-muted-foreground pt-2 border-t">
                <span className="bg-muted px-2 py-1 rounded">{infoCourse?.category}</span>
                <span className="bg-muted px-2 py-1 rounded">{infoCourse?.college}</span>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // Single select with radio buttons
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">{title}</h2>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
        {!hint && (
          <p className="text-sm text-muted-foreground">
            Select the course you've completed, or "Not yet" if still needed.
          </p>
        )}
      </div>

      {/* Search Input */}
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      )}

      <RadioGroup
        value={isNotYetSelected ? 'not-yet' : (selectedCourse || '')}
        onValueChange={(value) => {
          if (value === 'not-yet') {
            onSelectNotYet()
          } else {
            onSelectCourse(value)
          }
        }}
      >
        {/* "Not yet" as first-class option in the list */}
        <label
          className={cn(
            "flex items-center gap-3 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all",
            isNotYetSelected
              ? "border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-950/30"
              : "border-border hover:border-amber-300 dark:hover:border-amber-700"
          )}
        >
          <RadioGroupItem value="not-yet" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-foreground">Haven't taken this yet</div>
            <div className="text-xs text-muted-foreground">I still need to complete this requirement</div>
          </div>
        </label>

        {searchedCourses.length === 0 && showSearch && (
           <div className="text-center py-8 text-black/50">
             No courses found matching "{searchQuery}"
           </div>
        )}

        {searchedCourses.map((course) => (
          <label
            key={course.code}
            className={cn(
              "flex items-stretch rounded-xl border-2 cursor-pointer transition-all overflow-hidden",
              selectedCourse === course.code && !isNotYetSelected
                ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
                : "border-border bg-card hover:border-primary/50"
            )}
          >
            {/* Left accent bar */}
            <div className={cn(
              "w-1 shrink-0 transition-colors",
              selectedCourse === course.code && !isNotYetSelected ? "bg-primary" : "bg-transparent"
            )} />
            <div className="flex items-center gap-3 p-4 flex-1 min-w-0">
              <RadioGroupItem value={course.code} />
              <div className="flex-1 min-w-0">
                <div className="mb-1">
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                    {course.code}
                  </span>
                </div>
                <div className="text-sm font-medium text-foreground leading-snug">{course.title}</div>
              </div>
              <CourseInfoButton course={course} onClick={() => setInfoCourse(course)} />
            </div>
          </label>
        ))}
      </RadioGroup>

      {/* Course Info Dialog */}
      <Dialog open={!!infoCourse} onOpenChange={(open) => !open && setInfoCourse(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">{infoCourse?.code}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <h3 className="font-semibold">{infoCourse?.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {infoCourse?.description}
            </p>
            <div className="flex gap-2 text-xs text-muted-foreground pt-2 border-t">
              <span className="bg-muted px-2 py-1 rounded">{infoCourse?.category}</span>
              <span className="bg-muted px-2 py-1 rounded">{infoCourse?.college}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

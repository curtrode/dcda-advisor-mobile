import { useCallback, useMemo, useState } from 'react'
import { useStudentData } from '@/hooks/useStudentData'
import { useWizardFlow } from '@/hooks/useWizardFlow'
import {
  WizardShell,
  NameStep,
  GraduationStep,
  CourseStep,
  SpecialCreditsStep,
  ScheduleStep,
  ReviewStep,
} from '@/components/wizard'
import type { RequirementCategoryId } from '@/types'

// Track selections per category for Part 1
interface CategorySelections {
  intro: string | null
  statistics: string | null
  coding: string | null
  mmAuthoring: string | null
  dcElective: string | null
  daElective: string | null
  generalElectives: string[]
}

// Track "not yet" selections per category
type NotYetSelections = Record<RequirementCategoryId, boolean>

// Track scheduled courses per category for Part 2
type ScheduledSelections = Record<RequirementCategoryId, string | null>

function App() {
  const {
    studentData,
    isLoaded,
    updateStudentData,
    addSpecialCredit,
    removeSpecialCredit,
    resetStudentData,
  } = useStudentData()

  const wizard = useWizardFlow(studentData)

  // Local state for category selections during Part 1
  const [categorySelections, setCategorySelections] = useState<CategorySelections>({
    intro: null,
    statistics: null,
    coding: null,
    mmAuthoring: null,
    dcElective: null,
    daElective: null,
    generalElectives: [],
  })

  // Track which categories are "not yet"
  const [notYetSelections, setNotYetSelections] = useState<NotYetSelections>({
    intro: false,
    statistics: false,
    coding: false,
    mmAuthoring: false,
    capstone: false,
    dcElective: false,
    daElective: false,
    generalElectives: false,
  })

  // Track scheduled courses for Part 2
  const [scheduledSelections, setScheduledSelections] = useState<ScheduledSelections>({
    intro: null,
    statistics: null,
    coding: null,
    mmAuthoring: null,
    capstone: null,
    dcElective: null,
    daElective: null,
    generalElectives: null,
  })

  // Track skipped categories in Part 2
  const [skippedCategories, setSkippedCategories] = useState<Set<RequirementCategoryId>>(new Set())

  // All completed courses (for exclusion logic)
  const allCompletedCourses = useMemo(() => {
    const courses: string[] = []
    Object.entries(categorySelections).forEach(([, value]) => {
      if (Array.isArray(value)) {
        courses.push(...value)
      } else if (value) {
        courses.push(value)
      }
    })
    return courses
  }, [categorySelections])

  // All scheduled courses
  const allScheduledCourses = useMemo(() => {
    return Object.values(scheduledSelections).filter((c): c is string => c !== null)
  }, [scheduledSelections])

  // Courses being used to fulfill required categories (for excluding from elective options)
  const completedRequiredCourses = useMemo(() => {
    const courses: string[] = []
    // Only include courses from required categories (intro, statistics, coding, mmAuthoring, capstone)
    const requiredCategories: (keyof CategorySelections)[] = ['intro', 'statistics', 'coding', 'mmAuthoring']

    for (const cat of requiredCategories) {
      const value = categorySelections[cat]
      if (value && typeof value === 'string') {
        courses.push(value)
      }
    }
    return courses
  }, [categorySelections])

  // Handle course selection for a single-select category
  const handleSelectCourse = useCallback((categoryId: RequirementCategoryId, courseCode: string) => {
    setCategorySelections((prev) => ({
      ...prev,
      [categoryId]: courseCode,
    }))
    setNotYetSelections((prev) => ({
      ...prev,
      [categoryId]: false,
    }))
  }, [])

  // Handle "not yet" selection
  const handleSelectNotYet = useCallback((categoryId: RequirementCategoryId) => {
    setCategorySelections((prev) => ({
      ...prev,
      [categoryId]: categoryId === 'generalElectives' ? [] : null,
    }))
    setNotYetSelections((prev) => ({
      ...prev,
      [categoryId]: true,
    }))
  }, [])

  // Handle multi-select for general electives
  const handleAddGeneralElective = useCallback((courseCode: string) => {
    setCategorySelections((prev) => ({
      ...prev,
      generalElectives: [...prev.generalElectives, courseCode],
    }))
    setNotYetSelections((prev) => ({
      ...prev,
      generalElectives: false,
    }))
  }, [])

  const handleRemoveGeneralElective = useCallback((courseCode: string) => {
    setCategorySelections((prev) => ({
      ...prev,
      generalElectives: prev.generalElectives.filter((c) => c !== courseCode),
    }))
  }, [])

  // Handle scheduling a course in Part 2
  const handleScheduleCourse = useCallback((categoryId: RequirementCategoryId, courseCode: string) => {
    setScheduledSelections((prev) => ({
      ...prev,
      [categoryId]: courseCode,
    }))
    setSkippedCategories((prev) => {
      const next = new Set(prev)
      next.delete(categoryId)
      return next
    })
  }, [])

  // Handle skipping a category in Part 2
  const handleSkipCategory = useCallback((categoryId: RequirementCategoryId) => {
    setScheduledSelections((prev) => ({
      ...prev,
      [categoryId]: null,
    }))
    setSkippedCategories((prev) => new Set(prev).add(categoryId))
  }, [])

  // Determine if we can proceed to next step
  const canProceed = useMemo(() => {
    const { currentStep } = wizard

    switch (currentStep.id) {
      case 'name':
        return studentData.name.trim().length > 0
      case 'graduation':
        return studentData.expectedGraduation !== null
      case 'intro':
      case 'statistics':
      case 'coding':
      case 'mmAuthoring':
      case 'dcElective':
      case 'daElective':
        return categorySelections[currentStep.id] !== null || notYetSelections[currentStep.id]
      case 'generalElectives':
        return true // Can proceed even with no selections
      case 'specialCredits':
        return true // Can proceed with no credits
      case 'schedule':
        // Part 2: must select a course or skip
        if (currentStep.categoryId) {
          return scheduledSelections[currentStep.categoryId] !== null || skippedCategories.has(currentStep.categoryId)
        }
        return true
      case 'review':
        return true
      default:
        return true
    }
  }, [wizard, studentData, categorySelections, notYetSelections, scheduledSelections, skippedCategories])

  // Handle next button
  const handleNext = useCallback(() => {
    const { currentStep, goNext, setUnmetCategories } = wizard

    // Special handling for transitioning from Part 1 to Part 2
    if (currentStep.id === 'specialCredits') {
      // Save all completed courses to student data
      const completedCourses = allCompletedCourses
      updateStudentData({ completedCourses })

      // Determine unmet categories for Part 2
      const unmet: RequirementCategoryId[] = []
      const requiredCategories: RequirementCategoryId[] = ['intro', 'statistics', 'coding', 'mmAuthoring']

      // Add electives for major
      if (studentData.degreeType === 'major') {
        requiredCategories.push('dcElective', 'daElective')
      }

      for (const cat of requiredCategories) {
        if (notYetSelections[cat]) {
          unmet.push(cat)
        }
      }

      setUnmetCategories(unmet)
    }

    goNext()
  }, [wizard, allCompletedCourses, updateStudentData, notYetSelections, studentData.degreeType])

  // Handle start over
  const handleStartOver = useCallback(() => {
    resetStudentData()
    wizard.reset()
    setCategorySelections({
      intro: null,
      statistics: null,
      coding: null,
      mmAuthoring: null,
      dcElective: null,
      daElective: null,
      generalElectives: [],
    })
    setNotYetSelections({
      intro: false,
      statistics: false,
      coding: false,
      mmAuthoring: false,
      capstone: false,
      dcElective: false,
      daElective: false,
      generalElectives: false,
    })
    setScheduledSelections({
      intro: null,
      statistics: null,
      coding: null,
      mmAuthoring: null,
      capstone: null,
      dcElective: null,
      daElective: null,
      generalElectives: null,
    })
    setSkippedCategories(new Set())
  }, [resetStudentData, wizard])

  // Render current step content
  const renderStep = () => {
    const { currentStep } = wizard

    switch (currentStep.id) {
      case 'name':
        return (
          <NameStep
            value={studentData.name}
            onChange={(name) => updateStudentData({ name })}
            onNext={wizard.goNext}
          />
        )

      case 'graduation':
        return (
          <GraduationStep
            value={studentData.expectedGraduation}
            onChange={(graduation) => updateStudentData({ expectedGraduation: graduation })}
          />
        )

      case 'intro':
      case 'statistics':
      case 'coding':
      case 'mmAuthoring':
      case 'dcElective':
      case 'daElective':
        return (
          <CourseStep
            categoryId={currentStep.id as RequirementCategoryId}
            title={currentStep.title}
            selectedCourse={categorySelections[currentStep.id]}
            selectedCourses={[]}
            allSelectedCourses={allCompletedCourses}
            completedRequiredCourses={completedRequiredCourses}
            onSelectCourse={(code) => handleSelectCourse(currentStep.id as RequirementCategoryId, code)}
            onDeselectCourse={() => {}}
            onSelectNotYet={() => handleSelectNotYet(currentStep.id as RequirementCategoryId)}
            isNotYetSelected={notYetSelections[currentStep.id as RequirementCategoryId]}
            degreeType={studentData.degreeType || 'major'}
          />
        )

      case 'generalElectives': {
        // For general electives, only exclude courses from OTHER categories, not general electives themselves
        const otherCategoryCourses = [
          categorySelections.intro,
          categorySelections.statistics,
          categorySelections.coding,
          categorySelections.mmAuthoring,
          categorySelections.dcElective,
          categorySelections.daElective,
        ].filter((c): c is string => c !== null)

        return (
          <CourseStep
            categoryId="generalElectives"
            title={currentStep.title}
            hint="Select any other DCDA courses you've completed. These count toward your General Electives."
            selectedCourse={null}
            selectedCourses={categorySelections.generalElectives}
            allSelectedCourses={otherCategoryCourses}
            multiSelect
            onSelectCourse={handleAddGeneralElective}
            onDeselectCourse={handleRemoveGeneralElective}
            onSelectNotYet={() => handleSelectNotYet('generalElectives')}
            isNotYetSelected={notYetSelections.generalElectives}
            degreeType={studentData.degreeType || 'major'}
          />
        )
      }

      case 'specialCredits':
        return (
          <SpecialCreditsStep
            credits={studentData.specialCredits}
            onAddCredit={addSpecialCredit}
            onRemoveCredit={removeSpecialCredit}
          />
        )

      case 'schedule':
        if (currentStep.categoryId) {
          return (
            <ScheduleStep
              categoryId={currentStep.categoryId}
              selectedCourse={scheduledSelections[currentStep.categoryId]}
              allSelectedCourses={allCompletedCourses}
              allScheduledCourses={allScheduledCourses}
              completedRequiredCourses={completedRequiredCourses}
              onSelectCourse={(code) => handleScheduleCourse(currentStep.categoryId!, code)}
              onSkip={() => handleSkipCategory(currentStep.categoryId!)}
              isSkipped={skippedCategories.has(currentStep.categoryId)}
              degreeType={studentData.degreeType || 'major'}
            />
          )
        }
        return null

      case 'review':
        return (
          <ReviewStep
            studentData={{
              ...studentData,
              completedCourses: allCompletedCourses,
              scheduledCourses: allScheduledCourses,
            }}
            generalElectives={categorySelections.generalElectives}
          />
        )

      default:
        return null
    }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <WizardShell
      totalSteps={wizard.totalSteps}
      currentStep={wizard.currentStepIndex}
      partLabel={wizard.partLabel}
      canGoBack={wizard.canGoBack}
      canGoNext={wizard.canGoNext}
      onBack={wizard.goBack}
      onNext={wizard.isLastStep ? handleStartOver : handleNext}
      nextLabel={wizard.isLastStep ? 'Start Over' : 'Next'}
      nextDisabled={!canProceed}
      showBackButton={true}
    >
      {renderStep()}
    </WizardShell>
  )
}

export default App

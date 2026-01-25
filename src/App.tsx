import { useCallback, useMemo, useState, useEffect } from 'react'
import { useStudentData } from '@/hooks/useStudentData'
import { useWizardFlow } from '@/hooks/useWizardFlow'
import {
  WizardShell,
  WelcomeStep,
  NameStep,
  GraduationStep,
  CourseStep,
  SpecialCreditsStep,
  TransitionStep,
  ScheduleStep,
  ReviewStep,
} from '@/components/wizard'
import { InstallPrompt } from '@/components/InstallPrompt'
import { getRequiredCategoryCourses } from '@/services/courses'
import type { RequirementCategoryId, StudentData } from '@/types'
import requirementsData from '../data/requirements.json'

// Track selections per category for Part 1
interface CategorySelections {
  intro: string | null
  statistics: string | null
  coding: string | null
  mmAuthoring: string | null
  dcElectives: string[]  // Multi-select: first counts as elective, rest overflow to general
  daElectives: string[]  // Multi-select: first counts as elective, rest overflow to general
  generalElectives: string[]
}

// Track "not yet" selections per category
type NotYetSelections = Record<RequirementCategoryId, boolean>

// Track scheduled courses per category for Part 2
// generalElectives can have multiple selections, others are single-select
type ScheduledSelections = Omit<Record<RequirementCategoryId, string | null>, 'generalElectives'> & {
  generalElectives: string[]
}

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
    dcElectives: [],
    daElectives: [],
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
    generalElectives: [],
  })

  // Track skipped categories in Part 2
  const [skippedCategories, setSkippedCategories] = useState<Set<RequirementCategoryId>>(new Set())

  // Track pending navigation after import
  const [pendingImportNav, setPendingImportNav] = useState<'plan' | 'review' | null>(null)

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
    const courses: string[] = []
    for (const [key, value] of Object.entries(scheduledSelections)) {
      if (key === 'generalElectives' && Array.isArray(value)) {
        courses.push(...value)
      } else if (typeof value === 'string') {
        courses.push(value)
      }
    }
    return courses
  }, [scheduledSelections])

  // Courses being used to fulfill required categories (for excluding from elective options)
  const completedRequiredCourses = useMemo(() => {
    const courses: string[] = []
    // Only include courses from required categories
    // For minors: statistics, coding, mmAuthoring
    // For majors: intro, statistics, coding, mmAuthoring
    const requiredCategories = (studentData.degreeType === 'minor'
      ? ['statistics', 'coding', 'mmAuthoring']
      : ['intro', 'statistics', 'coding', 'mmAuthoring']) as (keyof CategorySelections & keyof NotYetSelections)[]

    for (const cat of requiredCategories) {
      const value = categorySelections[cat]
      // Ensure we don't include courses if the category was marked "Not Yet"
      // (This ensures courses from skipped required categories WILL show up in elective lists)
      if (value && typeof value === 'string' && !notYetSelections[cat]) {
        courses.push(value)
      }
    }
    return courses
  }, [categorySelections, studentData.degreeType, notYetSelections])

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
      [categoryId]: categoryId === 'generalElectives' || categoryId === 'dcElective' || categoryId === 'daElective' ? [] : null,
    }))
    setNotYetSelections((prev) => ({
      ...prev,
      [categoryId]: true,
    }))
  }, [])

  // Handle multi-select for DC electives
  const handleAddDCElective = useCallback((courseCode: string) => {
    setCategorySelections((prev) => ({
      ...prev,
      dcElectives: [...prev.dcElectives, courseCode],
    }))
    setNotYetSelections((prev) => ({
      ...prev,
      dcElective: false,
    }))
  }, [])

  const handleRemoveDCElective = useCallback((courseCode: string) => {
    setCategorySelections((prev) => ({
      ...prev,
      dcElectives: prev.dcElectives.filter((c) => c !== courseCode),
    }))
  }, [])

  // Handle multi-select for DA electives
  const handleAddDAElective = useCallback((courseCode: string) => {
    setCategorySelections((prev) => ({
      ...prev,
      daElectives: [...prev.daElectives, courseCode],
    }))
    setNotYetSelections((prev) => ({
      ...prev,
      daElective: false,
    }))
  }, [])

  const handleRemoveDAElective = useCallback((courseCode: string) => {
    setCategorySelections((prev) => ({
      ...prev,
      daElectives: prev.daElectives.filter((c) => c !== courseCode),
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

  // Handle adding a scheduled general elective in Part 2
  const handleAddScheduledGeneralElective = useCallback((courseCode: string) => {
    setScheduledSelections((prev) => ({
      ...prev,
      generalElectives: [...prev.generalElectives, courseCode],
    }))
    setSkippedCategories((prev) => {
      const next = new Set(prev)
      next.delete('generalElectives')
      return next
    })
  }, [])

  // Handle removing a scheduled general elective in Part 2
  const handleRemoveScheduledGeneralElective = useCallback((courseCode: string) => {
    setScheduledSelections((prev) => ({
      ...prev,
      generalElectives: prev.generalElectives.filter((c) => c !== courseCode),
    }))
  }, [])

  // Handle skipping a category in Part 2
  const handleSkipCategory = useCallback((categoryId: RequirementCategoryId) => {
    setScheduledSelections((prev) => ({
      ...prev,
      [categoryId]: categoryId === 'generalElectives' ? [] : null,
    }))
    setSkippedCategories((prev) => new Set(prev).add(categoryId))
  }, [])

  // Determine if we can proceed to next step
  const canProceed = useMemo(() => {
    const { currentStep } = wizard

    switch (currentStep.id) {
      case 'welcome':
        return true // Can always proceed from welcome screen
      case 'name':
        return studentData.name.trim().length > 0 && studentData.degreeType !== null
      case 'graduation':
        return studentData.expectedGraduation !== null
      case 'intro':
      case 'statistics':
      case 'coding':
      case 'mmAuthoring':
        return categorySelections[currentStep.id] !== null || notYetSelections[currentStep.id]
      case 'dcElective':
        return categorySelections.dcElectives.length > 0 || notYetSelections.dcElective
      case 'daElective':
        return categorySelections.daElectives.length > 0 || notYetSelections.daElective
      case 'specialCredits':
        return true // Can proceed with no credits
      case 'schedule':
        // Part 2: must select a course or skip
        if (currentStep.categoryId) {
          if (currentStep.categoryId === 'generalElectives') {
            // For general electives, allow proceeding if at least one is selected or skipped
            return scheduledSelections.generalElectives.length > 0 || skippedCategories.has(currentStep.categoryId)
          }
          return scheduledSelections[currentStep.categoryId] !== null || skippedCategories.has(currentStep.categoryId)
        }
        return true
      case 'review':
        return true
      default:
        return true
    }
  }, [wizard, studentData, categorySelections, notYetSelections, scheduledSelections, skippedCategories])

  // Helper: Calculate unmet categories based on selections
  const calculateUnmetCategories = useCallback((
    degreeType: 'major' | 'minor',
    currentNotYetSelections: NotYetSelections
  ): RequirementCategoryId[] => {
    const unmet: RequirementCategoryId[] = []
    
    // Check Core Requirement Categories
    // For minors: statistics, coding, mmAuthoring
    // For majors: intro, statistics, coding, mmAuthoring, dcElective, daElective
    const requiredCategories: RequirementCategoryId[] = degreeType === 'minor'
      ? ['statistics', 'coding', 'mmAuthoring']
      : ['intro', 'statistics', 'coding', 'mmAuthoring', 'dcElective', 'daElective']

    for (const cat of requiredCategories) {
      if (currentNotYetSelections[cat]) {
        unmet.push(cat)
      }
    }

    // Check General Electives
    // Calculate how many General Electives slots are filled by:
    // 1. Explicit General selections (none in current UI, but kept for logic)
    // 2. Overflow from DC Electives (first 1 counts for DC, rest for General)
    // 3. Overflow from DA Electives (first 1 counts for DA, rest for General)
    // 4. Special Credits (all count as General in current simplified UI)
    const dcOverflow = Math.max(0, categorySelections.dcElectives.length - 1)
    const daOverflow = Math.max(0, categorySelections.daElectives.length - 1)
    
    const filledGeneralSlots = 
      categorySelections.generalElectives.length + 
      dcOverflow + 
      daOverflow + 
      studentData.specialCredits.length
      
    // Get requirement count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requirements = requirementsData as any
    const requiredGeneralCount = requirements[degreeType].generalElectives.count
    
    if (filledGeneralSlots < requiredGeneralCount) {
      unmet.push('generalElectives')
    }
    
    return unmet
  }, [categorySelections, studentData.specialCredits])

  // Handle next button
  const handleNext = useCallback(() => {
    const { currentStep, goNext, setUnmetCategories } = wizard

    // Special handling for transitioning from Part 1 to Part 2
    if (currentStep.id === 'specialCredits') {
      // Save all completed courses to student data
      const completedCourses = allCompletedCourses
      updateStudentData({ completedCourses })

      // Determine unmet categories for Part 2
      const unmet = calculateUnmetCategories(studentData.degreeType || 'major', notYetSelections)
      setUnmetCategories(unmet)
    }

    goNext()
  }, [wizard, allCompletedCourses, updateStudentData, notYetSelections, studentData.degreeType, calculateUnmetCategories])

  // Handle start over
  const handleStartOver = useCallback(() => {
    resetStudentData()
    wizard.reset()
    setCategorySelections({
      intro: null,
      statistics: null,
      coding: null,
      mmAuthoring: null,
      dcElectives: [],
      daElectives: [],
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
      generalElectives: [],
    })
    setSkippedCategories(new Set())
  }, [resetStudentData, wizard])

  // Handle CSV import
  const handleImport = useCallback((data: Partial<StudentData>) => {
    const degreeType = data.degreeType || 'major'

    // Update student data with imported values
    updateStudentData({
      name: data.name || '',
      degreeType,
      expectedGraduation: data.expectedGraduation || null,
      completedCourses: data.completedCourses || [],
      scheduledCourses: data.scheduledCourses || [],
      specialCredits: data.specialCredits || [],
      courseCategories: data.courseCategories,
      generalElectives: data.generalElectives,
    })

    // Populate category selections and not-yet selections from imported data
    const newSelections: CategorySelections = {
      intro: null,
      statistics: null,
      coding: null,
      mmAuthoring: null,
      dcElectives: [],
      daElectives: [],
      generalElectives: data.generalElectives || [],
    }

    // Default: assume Not Yet for all, then mark false if found
    const newNotYet: NotYetSelections = {
      intro: true,
      statistics: true,
      coding: true,
      mmAuthoring: true,
      capstone: false, // Auto-handled
      dcElective: true,
      daElective: true,
      generalElectives: false,
    }

    if (data.completedCourses) {
      // Get courses for each required category
      const introCourses = getRequiredCategoryCourses('intro', degreeType)
      const statsCourses = getRequiredCategoryCourses('statistics', degreeType)
      const codingCourses = getRequiredCategoryCourses('coding', degreeType)
      const mmCourses = getRequiredCategoryCourses('mmAuthoring', degreeType)
      const dcCourses = getRequiredCategoryCourses('dcElective', degreeType)
      const daCourses = getRequiredCategoryCourses('daElective', degreeType)

      // Match completed courses to required categories
      for (const code of data.completedCourses) {
        if (introCourses.includes(code) && !newSelections.intro) {
          newSelections.intro = code
          newNotYet.intro = false
        } else if (statsCourses.includes(code) && !newSelections.statistics) {
          newSelections.statistics = code
          newNotYet.statistics = false
        } else if (codingCourses.includes(code) && !newSelections.coding) {
          newSelections.coding = code
          newNotYet.coding = false
        } else if (mmCourses.includes(code) && !newSelections.mmAuthoring) {
          newSelections.mmAuthoring = code
          newNotYet.mmAuthoring = false
        } else if (dcCourses.includes(code)) {
          newSelections.dcElectives.push(code)
          newNotYet.dcElective = false // At least one taken
        } else if (daCourses.includes(code)) {
          newSelections.daElectives.push(code)
          newNotYet.daElective = false // At least one taken
        }
      }
    }

    setCategorySelections(newSelections)
    setNotYetSelections(newNotYet)

    // Calculate Unmet Categories immediately
    const unmet = calculateUnmetCategories(degreeType, newNotYet)
    wizard.setUnmetCategories(unmet)

    // Decide where to send user:
    // If there are unmet requirements, send to Plan phase (Transition step)
    // Otherwise, send to Review (Completed)
    setPendingImportNav(unmet.length > 0 ? 'plan' : 'review')

  }, [updateStudentData, wizard, calculateUnmetCategories])

  // Effect to handle navigation after import (once wizard steps have updated)
  useEffect(() => {
    if (pendingImportNav) {
      if (pendingImportNav === 'plan') {
         // Wait for unmet categories to update before navigating
         if (wizard.unmetCategories.length > 0) {
            if (wizard.goToStepId) {
               wizard.goToStepId('transition')
               setTimeout(() => setPendingImportNav(null), 0)
            }
         }
      } else {
         // Review doesn't depend on unmet categories
         if (wizard.goToStepId) {
            wizard.goToStepId('review')
            setTimeout(() => setPendingImportNav(null), 0)
         }
      }
    }
  }, [pendingImportNav, wizard])

  // Render current step content
  const renderStep = () => {
    const { currentStep } = wizard

    switch (currentStep.id) {
      case 'welcome':
        return <WelcomeStep onImport={handleImport} onNext={handleNext} />

      case 'name':
        return (
          <NameStep
            value={studentData.name}
            degreeType={studentData.degreeType}
            onChange={(name) => updateStudentData({ name })}
            onDegreeTypeChange={(degreeType) => updateStudentData({ degreeType })}
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

      case 'dcElective': {
        // For DC electives, exclude courses from required categories and DA electives
        const excludeCourses = [
          categorySelections.intro,
          categorySelections.statistics,
          categorySelections.coding,
          categorySelections.mmAuthoring,
          ...categorySelections.daElectives,
          ...categorySelections.generalElectives,
        ].filter((c): c is string => c !== null)

        // If any core category is "Not Yet", exclude those courses from DC electives
        // (student needs them to fulfill core requirements later)
        const skippedCoreCourses = (['intro', 'statistics', 'coding', 'mmAuthoring'] as const)
          .filter(cat => notYetSelections[cat])
          .flatMap(cat => getRequiredCategoryCourses(cat, studentData.degreeType || 'major'))

        return (
          <CourseStep
            categoryId="dcElective"
            title="Which Digital Culture courses have you completed?"
            hint="Select all Digital Culture courses you've taken. The first fulfills your Digital Culture Elective requirement; additional courses count as General Electives."
            selectedCourse={null}
            selectedCourses={categorySelections.dcElectives}
            allSelectedCourses={[...excludeCourses, ...skippedCoreCourses]}
            completedRequiredCourses={completedRequiredCourses}
            multiSelect
            onSelectCourse={handleAddDCElective}
            onDeselectCourse={handleRemoveDCElective}
            onSelectNotYet={() => handleSelectNotYet('dcElective')}
            isNotYetSelected={notYetSelections.dcElective}
            degreeType={studentData.degreeType || 'major'}
          />
        )
      }

      case 'daElective': {
        // For DA electives, exclude courses from required categories and DC electives
        const excludeCourses = [
          categorySelections.intro,
          categorySelections.statistics,
          categorySelections.coding,
          categorySelections.mmAuthoring,
          ...categorySelections.dcElectives,
          ...categorySelections.generalElectives,
        ].filter((c): c is string => c !== null)

        // If any core category is "Not Yet", exclude those courses from DA electives
        // (student needs them to fulfill core requirements later)
        const skippedCoreCourses = (['intro', 'statistics', 'coding', 'mmAuthoring'] as const)
          .filter(cat => notYetSelections[cat])
          .flatMap(cat => getRequiredCategoryCourses(cat, studentData.degreeType || 'major'))

        return (
          <CourseStep
            categoryId="daElective"
            title="Which Data Analytics courses have you completed?"
            hint="Select all Data Analytics courses you've taken. The first fulfills your Data Analytics Elective requirement; additional courses count as General Electives."
            selectedCourse={null}
            selectedCourses={categorySelections.daElectives}
            allSelectedCourses={[...excludeCourses, ...skippedCoreCourses]}
            completedRequiredCourses={completedRequiredCourses}
            multiSelect
            onSelectCourse={handleAddDAElective}
            onDeselectCourse={handleRemoveDAElective}
            onSelectNotYet={() => handleSelectNotYet('daElective')}
            isNotYetSelected={notYetSelections.daElective}
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

      case 'transition': {
        // Split DC/DA electives: first one stays, rest go to general
        const primaryDCElective = categorySelections.dcElectives.slice(0, 1)
        const extraDCElectives = categorySelections.dcElectives.slice(1)
        
        const primaryDAElective = categorySelections.daElectives.slice(0, 1)
        const extraDAElectives = categorySelections.daElectives.slice(1)

        // Merge special credits and extra DC/DA electives into general electives for display
        const transitionSelections = {
          ...categorySelections,
          dcElectives: primaryDCElective,
          daElectives: primaryDAElective,
          generalElectives: [
            ...categorySelections.generalElectives,
            ...extraDCElectives,
            ...extraDAElectives,
            ...studentData.specialCredits.map(c => `${c.description} (${c.type})`)
          ]
        }

        return (
          <TransitionStep
            onNext={wizard.goNext}
            unmetCount={wizard.unmetCategories.length}
            selections={transitionSelections}
            includeSummer={studentData.includeSummer || false}
            onToggleSummer={(include) => updateStudentData({ includeSummer: include })}
          />
        )
      }

      case 'schedule':
        if (currentStep.categoryId) {
          // Special handling for generalElectives - multi-select
          if (currentStep.categoryId === 'generalElectives') {
            return (
              <ScheduleStep
                categoryId={currentStep.categoryId}
                selectedCourse={null}
                selectedCourses={scheduledSelections.generalElectives}
                multiSelect
                allSelectedCourses={allCompletedCourses}
                allScheduledCourses={allScheduledCourses}
                completedRequiredCourses={completedRequiredCourses}
                onSelectCourse={handleAddScheduledGeneralElective}
                onDeselectCourse={handleRemoveScheduledGeneralElective}
                onSkip={() => handleSkipCategory(currentStep.categoryId!)}
                isSkipped={skippedCategories.has(currentStep.categoryId)}
                degreeType={studentData.degreeType || 'major'}
              />
            )
          }
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
            updateStudentData={updateStudentData}
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
    <>
      <WizardShell
        totalSteps={wizard.totalSteps}
        currentStep={wizard.currentStepIndex}
        partLabel={wizard.partLabel}
        canGoBack={wizard.canGoBack}
        canGoNext={wizard.canGoNext}
        onBack={wizard.goBack}
        onNext={wizard.isLastStep ? handleStartOver : handleNext}
        onStepClick={wizard.goToStep}
        nextLabel={wizard.isLastStep ? 'Start Over' : 'Next'}
        nextDisabled={!canProceed}
        showBackButton={true}
        showNextButton={wizard.currentStep.id !== 'welcome'}
      >
        {renderStep()}
      </WizardShell>
      <InstallPrompt />
    </>
  )
}

export default App

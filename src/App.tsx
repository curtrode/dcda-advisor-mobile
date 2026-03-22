import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  ReviewSummaryStep,
  ReviewActionsStep,
  isValidTcuEmail,
} from '@/components/wizard'
import { InstallPrompt } from '@/components/InstallPrompt'
import { getRequiredCategoryCourses, getSummerOfferings, getSummerSemesterTerm, getNextSemesterTerm } from '@/services/courses'
import { buildAdaContext } from '@/lib/buildAdaContext'
import type { RequirementCategoryId } from '@/types'
import requirementsData from '../data/requirements.json'
import { trackWizardStart, trackStepVisit } from '@/services/analytics'

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

  // Anonymous analytics tracking (fire-and-forget, no PII stored)
  const hasTrackedStart = useRef(false)
  useEffect(() => {
    if (!hasTrackedStart.current) {
      hasTrackedStart.current = true
      trackWizardStart()
    }
  }, [])
  useEffect(() => {
    trackStepVisit(wizard.currentStep.id)
  }, [wizard.currentStep.id])

  // Build chat context from current wizard state
  const chatData = useMemo(
    () => buildAdaContext(studentData, wizard.currentStep.id),
    [studentData, wizard.currentStep.id]
  )

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

  // Track scheduled courses for Part 2 (fall term)
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

  // Track scheduled courses for summer term
  const [summerScheduledSelections, setSummerScheduledSelections] = useState<ScheduledSelections>({
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
  const [summerSkippedCategories, setSummerSkippedCategories] = useState<Set<RequirementCategoryId>>(new Set())

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

  // All scheduled courses (fall + summer)
  const allScheduledCourses = useMemo(() => {
    const courses: string[] = []
    for (const selections of [scheduledSelections, summerScheduledSelections]) {
      for (const [key, value] of Object.entries(selections)) {
        if (key === 'generalElectives' && Array.isArray(value)) {
          courses.push(...value)
        } else if (typeof value === 'string') {
          courses.push(value)
        }
      }
    }
    return courses
  }, [scheduledSelections, summerScheduledSelections])

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

  // Handle multi-select for general electives (minors)
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
  const handleScheduleCourse = useCallback((categoryId: RequirementCategoryId, courseCode: string, term: 'summer' | 'fall' = 'fall') => {
    const setter = term === 'summer' ? setSummerScheduledSelections : setScheduledSelections
    const skipSetter = term === 'summer' ? setSummerSkippedCategories : setSkippedCategories
    setter((prev) => ({
      ...prev,
      [categoryId]: courseCode,
    }))
    skipSetter((prev) => {
      const next = new Set(prev)
      next.delete(categoryId)
      return next
    })
  }, [])

  // Handle adding a scheduled general elective in Part 2
  const handleAddScheduledGeneralElective = useCallback((courseCode: string, term: 'summer' | 'fall' = 'fall') => {
    const setter = term === 'summer' ? setSummerScheduledSelections : setScheduledSelections
    const skipSetter = term === 'summer' ? setSummerSkippedCategories : setSkippedCategories
    setter((prev) => ({
      ...prev,
      generalElectives: [...prev.generalElectives, courseCode],
    }))
    skipSetter((prev) => {
      const next = new Set(prev)
      next.delete('generalElectives')
      return next
    })
  }, [])

  // Handle removing a scheduled general elective in Part 2
  const handleRemoveScheduledGeneralElective = useCallback((courseCode: string, term: 'summer' | 'fall' = 'fall') => {
    const setter = term === 'summer' ? setSummerScheduledSelections : setScheduledSelections
    setter((prev) => ({
      ...prev,
      generalElectives: prev.generalElectives.filter((c) => c !== courseCode),
    }))
  }, [])

  // Handle skipping a category in Part 2
  const handleSkipCategory = useCallback((categoryId: RequirementCategoryId, term: 'summer' | 'fall' = 'fall') => {
    const setter = term === 'summer' ? setSummerScheduledSelections : setScheduledSelections
    const skipSetter = term === 'summer' ? setSummerSkippedCategories : setSkippedCategories
    setter((prev) => ({
      ...prev,
      [categoryId]: categoryId === 'generalElectives' ? [] : null,
    }))
    skipSetter((prev) => new Set(prev).add(categoryId))
  }, [])

  // Determine if we can proceed to next step
  const canProceed = useMemo(() => {
    const { currentStep } = wizard

    switch (currentStep.id) {
      case 'welcome':
        return true // Can always proceed from welcome screen
      case 'name':
        return studentData.name.trim().length > 0 && studentData.degreeType !== null && (!studentData.email || isValidTcuEmail(studentData.email))
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
      case 'generalElectives':
        return categorySelections.generalElectives.length > 0 || notYetSelections.generalElectives
      case 'specialCredits':
        return true // Can proceed with no credits
      case 'schedule': {
        // Part 2: must select a course or skip
        const selections = currentStep.term === 'summer' ? summerScheduledSelections : scheduledSelections
        const skipped = currentStep.term === 'summer' ? summerSkippedCategories : skippedCategories
        if (currentStep.categoryId) {
          if (currentStep.categoryId === 'generalElectives') {
            return selections.generalElectives.length > 0 || skipped.has(currentStep.categoryId)
          }
          return selections[currentStep.categoryId] !== null || skipped.has(currentStep.categoryId)
        }
        return true
      }
      case 'reviewSummary':
      case 'reviewActions':
        return true
      default:
        return true
    }
  }, [wizard, studentData, categorySelections, notYetSelections, scheduledSelections, skippedCategories, summerScheduledSelections, summerSkippedCategories])

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
    
    const generalSpecialCredits = studentData.specialCredits
      .filter(c => c.countsAs === 'generalElectives').length

    const filledGeneralSlots =
      categorySelections.generalElectives.length +
      dcOverflow +
      daOverflow +
      generalSpecialCredits
      
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

      // Clear stale Part 2 state for categories that are now met
      // (handles backtracking: user goes back, completes a requirement, then advances again)
      const unmetSet = new Set(unmet)
      setScheduledSelections(prev => {
        const next = { ...prev }
        for (const key of Object.keys(next) as RequirementCategoryId[]) {
          if (key !== 'generalElectives' && !unmetSet.has(key)) {
            next[key] = null
          }
        }
        if (!unmetSet.has('generalElectives')) {
          next.generalElectives = []
        }
        return next
      })
      setSkippedCategories(prev => {
        const next = new Set(prev)
        for (const cat of next) {
          if (!unmetSet.has(cat)) next.delete(cat)
        }
        return next
      })
      // Also clear summer scheduled state for met categories
      setSummerScheduledSelections(prev => {
        const next = { ...prev }
        for (const key of Object.keys(next) as RequirementCategoryId[]) {
          if (key !== 'generalElectives' && !unmetSet.has(key)) {
            next[key] = null
          }
        }
        if (!unmetSet.has('generalElectives')) {
          next.generalElectives = []
        }
        return next
      })
      setSummerSkippedCategories(prev => {
        const next = new Set(prev)
        for (const cat of next) {
          if (!unmetSet.has(cat)) next.delete(cat)
        }
        return next
      })
    }

    // Persist scheduled courses when moving through Part 2 or to review
    if (currentStep.part === 'schedule' || currentStep.id === 'transition') {
      const collectCourses = (sel: ScheduledSelections) => [
        ...Object.entries(sel)
          .filter(([key, value]) => key !== 'generalElectives' && value !== null)
          .map(([, value]) => value as string),
        ...sel.generalElectives,
      ]
      const scheduledCourses = [
        ...collectCourses(summerScheduledSelections),
        ...collectCourses(scheduledSelections),
      ]
      updateStudentData({ scheduledCourses })
    }

    goNext()
  }, [wizard, allCompletedCourses, updateStudentData, notYetSelections, studentData.degreeType, calculateUnmetCategories, scheduledSelections, summerScheduledSelections])

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
    setSummerScheduledSelections({
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
    setSummerSkippedCategories(new Set())
  }, [resetStudentData, wizard])

  // Render current step content
  const renderStep = () => {
    const { currentStep } = wizard

    switch (currentStep.id) {
      case 'welcome':
        return <WelcomeStep />

      case 'name':
        return (
          <NameStep
            value={studentData.name}
            email={studentData.email}
            degreeType={studentData.degreeType}
            onChange={(name) => updateStudentData({ name })}
            onEmailChange={(email) => updateStudentData({ email })}
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

      case 'mmAuthoring':
        return (
          <CourseStep
            categoryId="mmAuthoring"
            title={currentStep.title}
            selectedCourse={categorySelections.mmAuthoring}
            selectedCourses={[]}
            allSelectedCourses={allCompletedCourses}
            completedRequiredCourses={completedRequiredCourses}
            onSelectCourse={(code) => handleSelectCourse('mmAuthoring', code)}
            onDeselectCourse={() => {}}
            onSelectNotYet={() => handleSelectNotYet('mmAuthoring')}
            isNotYetSelected={notYetSelections.mmAuthoring}
            degreeType={studentData.degreeType || 'major'}
            hint="Only one needed — extras count as general electives that you can enter in a later step."
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

      case 'generalElectives': {
        // For minors: show all DCDA courses except those already selected in required categories
        const excludeCourses = [
          categorySelections.statistics,
          categorySelections.coding,
          categorySelections.mmAuthoring,
        ].filter((c): c is string => c !== null)

        // If any core category is "Not Yet", exclude those courses
        // (student needs them to fulfill core requirements later)
        const skippedCoreCourses = (['statistics', 'coding', 'mmAuthoring'] as const)
          .filter(cat => notYetSelections[cat])
          .flatMap(cat => getRequiredCategoryCourses(cat, studentData.degreeType || 'minor'))

        return (
          <CourseStep
            categoryId="generalElectives"
            title="Which elective courses have you completed?"
            hint="Select any DCDA-approved courses you've taken beyond the core requirements. These count toward your General Electives."
            selectedCourse={null}
            selectedCourses={categorySelections.generalElectives}
            allSelectedCourses={[...excludeCourses, ...skippedCoreCourses]}
            completedRequiredCourses={completedRequiredCourses}
            multiSelect
            onSelectCourse={handleAddGeneralElective}
            onDeselectCourse={handleRemoveGeneralElective}
            onSelectNotYet={() => handleSelectNotYet('generalElectives')}
            isNotYetSelected={notYetSelections.generalElectives}
            degreeType={studentData.degreeType || 'minor'}
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
            summerAvailable={getSummerSemesterTerm() !== null}
          />
        )
      }

      case 'schedule': {
        if (!currentStep.categoryId) return null
        const term = currentStep.term ?? 'fall'
        const isSummer = term === 'summer'
        const selections = isSummer ? summerScheduledSelections : scheduledSelections
        const skipped = isSummer ? summerSkippedCategories : skippedCategories
        const termOfferings = isSummer ? (getSummerOfferings() ?? undefined) : undefined
        const termLabel = isSummer ? (getSummerSemesterTerm() ?? undefined) : getNextSemesterTerm()

        // Special handling for generalElectives - multi-select
        if (currentStep.categoryId === 'generalElectives') {
          return (
            <ScheduleStep
              categoryId={currentStep.categoryId}
              selectedCourse={null}
              selectedCourses={selections.generalElectives}
              multiSelect
              allSelectedCourses={allCompletedCourses}
              allScheduledCourses={allScheduledCourses}
              completedRequiredCourses={completedRequiredCourses}
              onSelectCourse={(code) => handleAddScheduledGeneralElective(code, term)}
              onDeselectCourse={(code) => handleRemoveScheduledGeneralElective(code, term)}
              onSkip={() => handleSkipCategory(currentStep.categoryId!, term)}
              isSkipped={skipped.has(currentStep.categoryId)}
              degreeType={studentData.degreeType || 'major'}
              termOfferings={termOfferings}
              termLabel={termLabel}
            />
          )
        }
        return (
          <ScheduleStep
            categoryId={currentStep.categoryId}
            selectedCourse={selections[currentStep.categoryId]}
            allSelectedCourses={allCompletedCourses}
            allScheduledCourses={allScheduledCourses}
            completedRequiredCourses={completedRequiredCourses}
            onSelectCourse={(code) => handleScheduleCourse(currentStep.categoryId!, code, term)}
            onSkip={() => handleSkipCategory(currentStep.categoryId!, term)}
            isSkipped={skipped.has(currentStep.categoryId)}
            degreeType={studentData.degreeType || 'major'}
            termOfferings={termOfferings}
            termLabel={termLabel}
          />
        )
      }

      case 'reviewSummary':
        return (
          <ReviewSummaryStep
            studentData={{
              ...studentData,
              completedCourses: allCompletedCourses,
              scheduledCourses: allScheduledCourses,
            }}
            generalElectives={categorySelections.generalElectives}
            scheduledSelections={scheduledSelections}
          />
        )

      case 'reviewActions':
        return (
          <ReviewActionsStep
            studentData={{
              ...studentData,
              completedCourses: allCompletedCourses,
              scheduledCourses: allScheduledCourses,
            }}
            generalElectives={categorySelections.generalElectives}
            scheduledSelections={scheduledSelections}
            updateStudentData={updateStudentData}
            onStartOver={handleStartOver}
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
        currentPart={wizard.part}
        currentStepInPart={wizard.currentStepInPart}
        phases={wizard.phases}
        stepKey={wizard.currentStep.id}
        onStartOver={handleStartOver}
        canGoBack={wizard.canGoBack}
        canGoNext={wizard.canGoNext}
        onBack={wizard.goBack}
        onNext={wizard.isLastStep ? handleStartOver : handleNext}
        nextLabel={wizard.isLastStep ? 'Start Over' : 'Next'}
        nextDisabled={!canProceed}
        showBackButton={true}
        showNextButton={wizard.currentStep.id !== 'reviewActions'}
        chatContext={chatData?.context ?? null}
        chatProgramName={chatData?.programName ?? null}
        chatProgramId={studentData.degreeType ?? null}
      >
        {renderStep()}
      </WizardShell>
      <InstallPrompt />
    </>
  )
}

export default App

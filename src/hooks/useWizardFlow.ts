import { useState, useCallback, useMemo } from 'react'
import type { WizardStep, WizardPart, RequirementCategoryId, StudentData } from '@/types'
import { getNextSemesterTerm } from '@/services/courses'

const PHASE_LABELS: Record<WizardPart, string> = {
  completed: 'History',
  transition: 'Transition',
  schedule: 'Schedule',
  review: 'Review',
  submit: 'Submit',
}

// Define all wizard steps - will be filtered based on degree type
const ALL_PART_1_STEPS: WizardStep[] = [
  { id: 'welcome', part: 'completed', title: 'Welcome to DCDA Advising' },
  { id: 'name', part: 'completed', title: "What's your name?" },
  { id: 'graduation', part: 'completed', title: 'When do you expect to graduate?' },
  { id: 'intro', part: 'completed', title: 'Have you completed the Intro/Req\'d English requirement?', categoryId: 'intro' },
  { id: 'statistics', part: 'completed', title: 'Have you completed the Statistics requirement?', categoryId: 'statistics' },
  { id: 'coding', part: 'completed', title: 'Have you completed the Coding requirement?', categoryId: 'coding' },
  { id: 'mmAuthoring', part: 'completed', title: 'Have you completed the Multimedia Authoring requirement?', categoryId: 'mmAuthoring' },
  // Capstone is auto-assigned based on graduation, no step needed
  { id: 'dcElective', part: 'completed', title: 'Have you completed a Digital Culture Elective?', categoryId: 'dcElective' },
  { id: 'daElective', part: 'completed', title: 'Have you completed a Data Analytics Elective?', categoryId: 'daElective' },
  // generalElectives step removed - Honors Seminars info is now on graduation screen
  { id: 'specialCredits', part: 'completed', title: 'Any special credits?' },
]

// Steps that only apply to majors (not minors)
const MAJOR_ONLY_STEPS: Set<string> = new Set(['intro', 'dcElective', 'daElective'])

const TRANSITION_STEP: WizardStep = { id: 'transition', part: 'transition', title: 'Planning Your Schedule' }
const REVIEW_SUMMARY_STEP: WizardStep = { id: 'reviewSummary', part: 'review', title: 'Review Your Plan' }
const REVIEW_ACTIONS_STEP: WizardStep = { id: 'reviewActions', part: 'submit', title: 'Save & Submit' }

export interface UseWizardFlowReturn {
  // Current state
  currentStep: WizardStep
  currentStepIndex: number
  totalSteps: number
  part: WizardPart
  partLabel: string

  // Phase-based progress
  phases: { key: WizardPart; label: string; stepCount: number }[]
  currentStepInPart: number

  // Navigation
  canGoBack: boolean
  canGoNext: boolean
  goNext: () => void
  goBack: () => void
  goToStep: (index: number) => void
  goToStepId: (id: string) => void

  // Categories tracking
  unmetCategories: RequirementCategoryId[]
  setUnmetCategories: (categories: RequirementCategoryId[]) => void
  currentScheduleCategory: RequirementCategoryId | null

  // Step info
  isLastStep: boolean
  isFirstStep: boolean
  progress: number // 0-100

  // Reset
  reset: () => void
}

const phaseLabels: Record<WizardPart, string> = {
  completed: 'History',
  transition: 'Transition',
  schedule: 'Schedule',
  review: 'Review',
  submit: 'Submit',
}

export function useWizardFlow(studentData: StudentData): UseWizardFlowReturn {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [unmetCategories, setUnmetCategories] = useState<RequirementCategoryId[]>([])

  const degreeType = studentData.degreeType

  // Build dynamic step list based on degree type and unmet categories
  const steps = useMemo(() => {
    // Filter Part 1 steps based on degree type
    const part1Steps = ALL_PART_1_STEPS.filter(step => {
      // Always include non-major-only steps
      if (!MAJOR_ONLY_STEPS.has(step.id)) return true
      // Only include major-only steps if pursuing a major
      return degreeType === 'major'
    })

    const allSteps = [...part1Steps]

    // Add Part 2 steps for each unmet category (excluding capstone which is auto-scheduled)
    const schedulableCategories = unmetCategories.filter(c => c !== 'capstone')
    
    // Add transition step if we have scheduling work to do
    if (schedulableCategories.length > 0) {
      allSteps.push(TRANSITION_STEP)
    }

    for (const categoryId of schedulableCategories) {
      const categoryNames: Record<RequirementCategoryId, string> = {
        intro: 'Intro/Req\'d English',
        statistics: 'Statistics',
        coding: 'Coding',
        mmAuthoring: 'Multimedia Authoring',
        capstone: 'Capstone',
        dcElective: 'Digital Culture Elective',
        daElective: 'Data Analytics Elective',
        generalElectives: 'General Electives',
      }

      allSteps.push({
        id: 'schedule',
        part: 'schedule',
        title: `Which ${categoryNames[categoryId]} course for ${getNextSemesterTerm()}?`,
        categoryId,
      })
    }

    // Add review and submit steps
    allSteps.push(REVIEW_SUMMARY_STEP)
    allSteps.push(REVIEW_ACTIONS_STEP)

    return allSteps
  }, [degreeType, unmetCategories])

  const currentStep = steps[currentStepIndex] || steps[0]
  const totalSteps = steps.length

  // Determine which part we're in
  const part = currentStep.part
  const partLabel = useMemo(() => {
    switch (part) {
      case 'completed': return 'Part 1: Completed Courses'
      case 'transition': return 'Phase 2'
      case 'schedule': return `Part 2: Schedule for ${getNextSemesterTerm()}`
      case 'review': return 'Part 3: Review Your Plan'
      case 'submit': return 'Part 4: Save & Submit'
    }
  }, [part])

  // Current schedule category (for Part 2)
  const currentScheduleCategory = part === 'schedule' ? (currentStep.categoryId || null) : null

  // Navigation
  const canGoBack = currentStepIndex > 0
  const canGoNext = currentStepIndex < totalSteps - 1
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === totalSteps - 1

  const goNext = useCallback(() => {
    if (canGoNext) {
      setCurrentStepIndex((prev) => prev + 1)
      // Scroll to top when advancing to next step
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [canGoNext])

  const goBack = useCallback(() => {
    if (canGoBack) {
      setCurrentStepIndex((prev) => prev - 1)
      // Scroll to top when going back
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [canGoBack])

  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < totalSteps) {
      setCurrentStepIndex(index)
      // Scroll to top when jumping to a step
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [totalSteps])

  const goToStepId = useCallback((id: string) => {
    const index = steps.findIndex(s => s.id === id)
    if (index !== -1) {
      setCurrentStepIndex(index)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [steps])

  const reset = useCallback(() => {
    setCurrentStepIndex(0)
    setUnmetCategories([])
  }, [])

  // Progress percentage
  const progress = totalSteps > 1 ? Math.round((currentStepIndex / (totalSteps - 1)) * 100) : 0

  // Phase-based progress info
  const phases = useMemo(() => {
    const phaseCounts: Record<WizardPart, number> = {
      completed: 0,
      transition: 0,
      schedule: 0,
      review: 0,
      submit: 0,
    }
    for (const step of steps) {
      phaseCounts[step.part]++
    }
    return (['completed', 'transition', 'schedule', 'review', 'submit'] as WizardPart[])
      .filter(key => phaseCounts[key] > 0)
      .map(key => ({
        key,
        label: PHASE_LABELS[key],
        stepCount: phaseCounts[key],
      }))
  }, [steps])

  // Calculate which step we are within the current phase (0-based)
  const currentStepInPart = useMemo(() => {
    let count = 0
    for (let i = 0; i < currentStepIndex; i++) {
      if (steps[i].part === part) {
        count++
      }
    }
    return count
  }, [steps, currentStepIndex, part])

  return {
    currentStep,
    currentStepIndex,
    totalSteps,
    part,
    partLabel,
    phases,
    currentStepInPart,
    canGoBack,
    canGoNext,
    goNext,
    goBack,
    goToStep,
    goToStepId,
    unmetCategories,
    setUnmetCategories,
    currentScheduleCategory,
    isLastStep,
    isFirstStep,
    progress,
    reset,
  }
}

import { useState, useCallback, useMemo } from 'react'
import type { WizardStep, WizardPart, RequirementCategoryId, StudentData } from '@/types'

// Define all wizard steps - will be filtered based on degree type
const ALL_PART_1_STEPS: WizardStep[] = [
  { id: 'welcome', part: 'completed', title: 'Welcome to DCDA Advising' },
  { id: 'name', part: 'completed', title: "What's your name?" },
  { id: 'graduation', part: 'completed', title: 'When do you expect to graduate?' },
  { id: 'intro', part: 'completed', title: 'Have you completed the Intro/Req\'d English requirement?', categoryId: 'intro' },
  { id: 'statistics', part: 'completed', title: 'Have you completed the Statistics requirement?', categoryId: 'statistics' },
  { id: 'coding', part: 'completed', title: 'Have you completed the Coding requirement?', categoryId: 'coding' },
  { id: 'mmAuthoring', part: 'completed', title: 'Have you completed the MM Authoring requirement?', categoryId: 'mmAuthoring' },
  // Capstone is auto-assigned based on graduation, no step needed
  { id: 'dcElective', part: 'completed', title: 'Have you completed a DC Elective?', categoryId: 'dcElective' },
  { id: 'daElective', part: 'completed', title: 'Have you completed a DA Elective?', categoryId: 'daElective' },
  { id: 'generalElectives', part: 'completed', title: 'Select any other completed DCDA courses', categoryId: 'generalElectives' },
  { id: 'specialCredits', part: 'completed', title: 'Any special credits?' },
]

// Steps that only apply to majors (not minors)
const MAJOR_ONLY_STEPS: Set<string> = new Set(['intro', 'dcElective', 'daElective'])

const REVIEW_STEP: WizardStep = { id: 'review', part: 'review', title: 'Review Your Plan' }

export interface UseWizardFlowReturn {
  // Current state
  currentStep: WizardStep
  currentStepIndex: number
  totalSteps: number
  part: WizardPart
  partLabel: string

  // Navigation
  canGoBack: boolean
  canGoNext: boolean
  goNext: () => void
  goBack: () => void
  goToStep: (index: number) => void

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
    for (const categoryId of schedulableCategories) {
      const categoryNames: Record<RequirementCategoryId, string> = {
        intro: 'Intro/Req\'d English',
        statistics: 'Statistics',
        coding: 'Coding',
        mmAuthoring: 'MM Authoring',
        capstone: 'Capstone',
        dcElective: 'DC Elective',
        daElective: 'DA Elective',
        generalElectives: 'General Electives',
      }

      allSteps.push({
        id: 'schedule',
        part: 'schedule',
        title: `Which ${categoryNames[categoryId]} course for Spring 2026?`,
        categoryId,
      })
    }

    // Add review step
    allSteps.push(REVIEW_STEP)

    return allSteps
  }, [degreeType, unmetCategories])

  const currentStep = steps[currentStepIndex] || steps[0]
  const totalSteps = steps.length

  // Determine which part we're in
  const part = currentStep.part
  const partLabel = useMemo(() => {
    switch (part) {
      case 'completed': return 'Part 1: Completed Courses'
      case 'schedule': return 'Part 2: Schedule for Spring 2026'
      case 'review': return 'Part 3: Review Your Plan'
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

  const reset = useCallback(() => {
    setCurrentStepIndex(0)
    setUnmetCategories([])
  }, [])

  // Progress percentage
  const progress = totalSteps > 1 ? Math.round((currentStepIndex / (totalSteps - 1)) * 100) : 0

  return {
    currentStep,
    currentStepIndex,
    totalSteps,
    part,
    partLabel,
    canGoBack,
    canGoNext,
    goNext,
    goBack,
    goToStep,
    unmetCategories,
    setUnmetCategories,
    currentScheduleCategory,
    isLastStep,
    isFirstStep,
    progress,
    reset,
  }
}

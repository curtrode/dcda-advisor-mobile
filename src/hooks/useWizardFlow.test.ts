import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWizardFlow } from './useWizardFlow'
import type { StudentData } from '@/types'

function createStudentData(overrides: Partial<StudentData> = {}): StudentData {
  return {
    name: 'Test Student',
    degreeType: 'major',
    expectedGraduation: 'Spring 2027',
    completedCourses: [],
    scheduledCourses: [],
    specialCredits: [],
    ...overrides,
  }
}

describe('useWizardFlow smoke tests', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'scrollTo', {
      value: vi.fn(),
      writable: true,
    })
  })

  it('advances through the major happy path to review actions', () => {
    const { result } = renderHook(() => useWizardFlow(createStudentData({ degreeType: 'major' })))

    expect(result.current.currentStep.id).toBe('welcome')

    for (let i = 0; i < 20 && result.current.canGoNext; i += 1) {
      act(() => {
        result.current.goNext()
      })
    }

    expect(result.current.currentStep.id).toBe('reviewActions')
    expect(result.current.isLastStep).toBe(true)
    expect(result.current.progress).toBe(100)
  })

  it('adds transition and schedule steps for unmet categories', () => {
    const { result } = renderHook(() => useWizardFlow(createStudentData({ degreeType: 'major' })))

    act(() => {
      result.current.setUnmetCategories(['statistics', 'dcElective'])
    })

    expect(result.current.phases.some((phase) => phase.key === 'transition')).toBe(true)
    expect(result.current.phases.some((phase) => phase.key === 'schedule')).toBe(true)

    act(() => {
      result.current.goToStepId('transition')
    })
    expect(result.current.currentStep.id).toBe('transition')

    act(() => {
      result.current.goNext()
    })
    expect(result.current.currentStep.id).toBe('schedule')
    expect(result.current.currentStep.categoryId).toBe('statistics')

    act(() => {
      result.current.goNext()
    })
    expect(result.current.currentStep.id).toBe('schedule')
    expect(result.current.currentStep.categoryId).toBe('dcElective')

    act(() => {
      result.current.goNext()
    })
    expect(result.current.currentStep.id).toBe('reviewSummary')

    act(() => {
      result.current.goNext()
    })
    expect(result.current.currentStep.id).toBe('reviewActions')
  })
})

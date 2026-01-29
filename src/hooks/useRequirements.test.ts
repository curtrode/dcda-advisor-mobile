import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRequirements } from './useRequirements'
import type { StudentData } from '@/types'

// Helper to create minimal student data
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

describe('useRequirements hook', () => {
  describe('degree progress calculation', () => {
    it('returns null progress when no degree type selected', () => {
      const studentData = createStudentData({ degreeType: null })
      const { result } = renderHook(() => useRequirements(studentData))
      
      expect(result.current.degreeProgress).toBeNull()
    })

    it('calculates zero progress for new student', () => {
      const studentData = createStudentData({ completedCourses: [] })
      const { result } = renderHook(() => useRequirements(studentData))
      
      expect(result.current.degreeProgress).not.toBeNull()
      expect(result.current.degreeProgress?.completedHours).toBe(0)
      expect(result.current.degreeProgress?.isComplete).toBe(false)
    })

    it('calculates progress for completed required courses', () => {
      const studentData = createStudentData({
        completedCourses: ['ENGL 20813', 'MATH 10043'], // Intro + Statistics
      })
      const { result } = renderHook(() => useRequirements(studentData))
      
      expect(result.current.degreeProgress?.completedHours).toBe(6) // 2 courses × 3 hours
    })

    it('marks category as complete when requirement satisfied', () => {
      const studentData = createStudentData({
        completedCourses: ['MATH 10043'], // Statistics requirement
      })
      const { result } = renderHook(() => useRequirements(studentData))
      
      const statsCategory = result.current.degreeProgress?.categories.find(c => c.id === 'statistics')
      expect(statsCategory?.isComplete).toBe(true)
      expect(statsCategory?.completed).toBe(1)
    })

    it('handles major total hours correctly', () => {
      const studentData = createStudentData({ degreeType: 'major' })
      const { result } = renderHook(() => useRequirements(studentData))
      
      expect(result.current.degreeProgress?.totalHours).toBe(33) // Major requires 33 hours
    })

    it('handles minor total hours correctly', () => {
      const studentData = createStudentData({ degreeType: 'minor' })
      const { result } = renderHook(() => useRequirements(studentData))
      
      expect(result.current.degreeProgress?.totalHours).toBe(21) // Minor requires 21 hours
    })
  })

  describe('overflow logic', () => {
    it('counts extra DC electives as general electives', () => {
      const studentData = createStudentData({
        completedCourses: [
          'ENGL 20813', // Intro
          'MATH 10043', // Statistics
          'COSC 10603', // Coding
          'WRIT 40163', // MM Authoring
          'ARST 10123', // DC Elective #1 (counts for requirement)
          'ARST 20503', // DC Elective #2 (overflow to general)
        ],
      })
      const { result } = renderHook(() => useRequirements(studentData))
      
      const dcCategory = result.current.degreeProgress?.categories.find(c => c.id === 'dcElective')
      const generalCategory = result.current.degreeProgress?.categories.find(c => c.id === 'generalElectives')
      
      // DC Elective should be complete with 1 course
      expect(dcCategory?.completed).toBe(1)
      expect(dcCategory?.isComplete).toBe(true)
      
      // General electives should include the overflow
      expect(generalCategory?.completedCourses).toContain('ARST 20503')
    })
  })

  describe('special credits', () => {
    it('counts special credits toward specified category', () => {
      const studentData = createStudentData({
        specialCredits: [
          {
            id: '1',
            type: 'transfer',
            description: 'Stats from other university',
            countsAs: 'statistics',
          },
        ],
      })
      const { result } = renderHook(() => useRequirements(studentData))
      
      const statsCategory = result.current.degreeProgress?.categories.find(c => c.id === 'statistics')
      expect(statsCategory?.completed).toBe(1)
      expect(statsCategory?.isComplete).toBe(true)
    })

    it('counts special credits toward general electives', () => {
      const studentData = createStudentData({
        specialCredits: [
          {
            id: '1',
            type: 'study-abroad',
            description: 'Digital Media in London',
            countsAs: 'generalElectives',
          },
        ],
      })
      const { result } = renderHook(() => useRequirements(studentData))
      
      const generalCategory = result.current.degreeProgress?.categories.find(c => c.id === 'generalElectives')
      expect(generalCategory?.completed).toBe(1)
    })
  })

  describe('minor requirements', () => {
    it('does not include intro category for minor', () => {
      const studentData = createStudentData({ degreeType: 'minor' })
      const { result } = renderHook(() => useRequirements(studentData))
      
      const introCategory = result.current.degreeProgress?.categories.find(c => c.id === 'intro')
      expect(introCategory).toBeUndefined()
    })

    it('does not include DC/DA elective categories for minor', () => {
      const studentData = createStudentData({ degreeType: 'minor' })
      const { result } = renderHook(() => useRequirements(studentData))
      
      const dcCategory = result.current.degreeProgress?.categories.find(c => c.id === 'dcElective')
      const daCategory = result.current.degreeProgress?.categories.find(c => c.id === 'daElective')
      
      expect(dcCategory).toBeUndefined()
      expect(daCategory).toBeUndefined()
    })

    it('requires fewer general electives for minor', () => {
      const studentData = createStudentData({ degreeType: 'minor' })
      const { result } = renderHook(() => useRequirements(studentData))
      
      const generalCategory = result.current.degreeProgress?.categories.find(c => c.id === 'generalElectives')
      expect(generalCategory?.required).toBe(3) // Minor needs 3, major needs 4
    })
  })

  describe('generalElectives handling', () => {
    it('uses fallback inference when explicitGeneralElectives is undefined', () => {
      const studentData = createStudentData({
        completedCourses: ['ENGL 20813', 'MATH 10043', 'COSC 10603', 'WRIT 40163'],
      })
      // Pass undefined for generalElectives
      const { result } = renderHook(() => useRequirements(studentData, undefined))
      
      const generalCategory = result.current.degreeProgress?.categories.find(c => c.id === 'generalElectives')
      expect(generalCategory).toBeDefined()
      // Should use fallback inference logic - general electives completed count should be 0
      // since all courses are assigned to required categories
      expect(generalCategory?.completed).toBe(0)
    })

    it('uses fallback inference when explicitGeneralElectives is empty array', () => {
      const studentData = createStudentData({
        completedCourses: ['ENGL 20813', 'MATH 10043', 'COSC 10603', 'WRIT 40163'],
      })
      // Pass empty array - should trigger fallback, not treat as "0 explicit electives"
      const { result } = renderHook(() => useRequirements(studentData, []))
      
      const generalCategory = result.current.degreeProgress?.categories.find(c => c.id === 'generalElectives')
      expect(generalCategory).toBeDefined()
      // Empty array should be treated same as undefined (fallback inference)
      expect(generalCategory?.completed).toBe(0)
    })

    it('uses explicit list when explicitGeneralElectives has entries', () => {
      const studentData = createStudentData({
        completedCourses: ['ENGL 20813', 'MATH 10043', 'COSC 10603', 'WRIT 40163', 'FILM 10103'],
      })
      // Pass explicit general electives
      const { result } = renderHook(() => useRequirements(studentData, ['FILM 10103']))
      
      const generalCategory = result.current.degreeProgress?.categories.find(c => c.id === 'generalElectives')
      expect(generalCategory?.completedCourses).toContain('FILM 10103')
      expect(generalCategory?.completed).toBe(1)
    })
  })
})

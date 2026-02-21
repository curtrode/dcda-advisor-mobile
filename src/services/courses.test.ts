import { describe, it, expect } from 'vitest'
import {
  isMutuallyExcluded,
  getCoursesForCategory,
  getOfferedCoursesForCategory,
  getCourseByCode,
  getRequiredCategoryCourses,
} from './courses'

describe('courses service', () => {
  describe('getCourseByCode', () => {
    it('returns course when found', () => {
      const course = getCourseByCode('MATH 10043')
      expect(course).toBeDefined()
      expect(course?.title).toBe('Elementary Statistics')
    })

    it('returns undefined for unknown course', () => {
      const course = getCourseByCode('FAKE 99999')
      expect(course).toBeUndefined()
    })
  })

  describe('getRequiredCategoryCourses', () => {
    it('returns statistics courses for major', () => {
      const courses = getRequiredCategoryCourses('statistics', 'major')
      expect(courses).toContain('MATH 10043')
      expect(courses).toContain('INSC 20153')
    })

    it('returns coding courses for minor', () => {
      const courses = getRequiredCategoryCourses('coding', 'minor')
      expect(courses).toContain('WRIT 20833')
      expect(courses).toContain('COSC 10603')
    })

    it('returns empty array for non-existent category', () => {
      const courses = getRequiredCategoryCourses('nonexistent' as never, 'major')
      expect(courses).toEqual([])
    })
  })

  describe('getCoursesForCategory', () => {
    it('returns intro courses for major', () => {
      const courses = getCoursesForCategory('intro', 'major')
      expect(courses.length).toBeGreaterThan(0)
      expect(courses.map(c => c.code)).toContain('ENGL 20813')
    })

    it('returns empty for intro category on minor (not applicable)', () => {
      // Minor doesn't have intro requirement, so it should return empty
      const courses = getCoursesForCategory('intro', 'minor')
      expect(courses).toEqual([])
    })

    it('excludes completed required courses from electives', () => {
      const completedRequired = ['WRIT 40163'] // MM Authoring course
      const courses = getCoursesForCategory('dcElective', 'major', completedRequired)
      // The completed course should not appear in electives
      expect(courses.map(c => c.code)).not.toContain('WRIT 40163')
    })
  })

  describe('getOfferedCoursesForCategory', () => {
    it('only returns courses offered next semester', () => {
      const offered = getOfferedCoursesForCategory('statistics', 'major')
      // Should return at least one of the statistics options
      expect(offered.length).toBeGreaterThan(0)
    })

    it('excludes specified courses', () => {
      const excluded = ['MATH 10043']
      const offered = getOfferedCoursesForCategory('statistics', 'major', excluded)
      expect(offered.map(c => c.code)).not.toContain('MATH 10043')
    })
  })

  describe('isMutuallyExcluded', () => {
    it('returns true when selecting course that conflicts with already selected', () => {
      // MATH 10043 and INSC 20153 are mutually exclusive
      const selectedCourses = ['MATH 10043']
      const result = isMutuallyExcluded('INSC 20153', selectedCourses)
      expect(result).toBe(true)
    })

    it('returns false when no conflict exists', () => {
      const selectedCourses = ['ENGL 20813']
      const result = isMutuallyExcluded('MATH 10043', selectedCourses)
      expect(result).toBe(false)
    })

    it('returns false when course not in any mutual exclusion rule', () => {
      const selectedCourses = ['ENGL 20813', 'WRIT 40163']
      const result = isMutuallyExcluded('COSC 10603', selectedCourses)
      expect(result).toBe(false)
    })

    it('handles DCDA/WRIT 20833 mutual exclusion', () => {
      const selectedCourses = ['WRIT 20833']
      const result = isMutuallyExcluded('DCDA 20833', selectedCourses)
      expect(result).toBe(true)
    })
  })
})

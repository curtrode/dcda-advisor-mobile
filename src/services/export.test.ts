import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parseCSVImport } from './export'

describe('CSV Export/Import', () => {
  describe('parseCSVImport', () => {
    it('parses scheduled courses from CSV', () => {
      const csv = `DCDA_MOBILE_EXPORT,v1
name,Test Student
degreeType,major
expectedGraduation,Spring 2027
completedCourses,ENGL 20813;MATH 10043
scheduledCourses,COSC 10603;WRIT 40163`

      const result = parseCSVImport(csv)

      expect(result).not.toBeNull()
      expect(result?.scheduledCourses).toEqual(['COSC 10603', 'WRIT 40163'])
    })

    it('handles empty scheduled courses', () => {
      const csv = `DCDA_MOBILE_EXPORT,v1
name,Test Student
degreeType,major
scheduledCourses,`

      const result = parseCSVImport(csv)

      expect(result).not.toBeNull()
      expect(result?.scheduledCourses).toEqual([])
    })

    it('parses legacy plannedCourses as scheduledCourses', () => {
      const csv = `DCDA_MOBILE_EXPORT,v1
name,Test Student
degreeType,major
plannedCourses,COSC 10603;WRIT 40163`

      const result = parseCSVImport(csv)

      expect(result).not.toBeNull()
      expect(result?.scheduledCourses).toEqual(['COSC 10603', 'WRIT 40163'])
    })

    it('returns null for invalid CSV format', () => {
      const csv = `Invalid CSV content`

      const result = parseCSVImport(csv)

      expect(result).toBeNull()
    })

    it('parses generalElectives from CSV', () => {
      const csv = `DCDA_MOBILE_EXPORT,v1
name,Test Student
degreeType,major
generalElectives,FILM 10103;ARST 10123`

      const result = parseCSVImport(csv)

      expect(result).not.toBeNull()
      expect(result?.generalElectives).toEqual(['FILM 10103', 'ARST 10123'])
    })

    it('parses all student data fields', () => {
      const csv = `DCDA_MOBILE_EXPORT,v1
name,Jane Doe
degreeType,minor
expectedGraduation,Fall 2026
completedCourses,MATH 10043;COSC 10603
scheduledCourses,WRIT 40163
notes,Test notes here`

      const result = parseCSVImport(csv)

      expect(result).not.toBeNull()
      expect(result?.name).toBe('Jane Doe')
      expect(result?.degreeType).toBe('minor')
      expect(result?.expectedGraduation).toBe('Fall 2026')
      expect(result?.completedCourses).toEqual(['MATH 10043', 'COSC 10603'])
      expect(result?.scheduledCourses).toEqual(['WRIT 40163'])
      expect(result?.notes).toBe('Test notes here')
    })

    it('handles special credits JSON', () => {
      const creditsData = JSON.stringify([
        { type: 'transfer', description: 'Stats from other uni', countsAs: 'statistics' }
      ])
      const csv = `DCDA_MOBILE_EXPORT,v1
name,Test Student
degreeType,major
specialCredits,${creditsData}`

      const result = parseCSVImport(csv)

      expect(result).not.toBeNull()
      expect(result?.specialCredits).toHaveLength(1)
      expect(result?.specialCredits?.[0].type).toBe('transfer')
      expect(result?.specialCredits?.[0].description).toBe('Stats from other uni')
      expect(result?.specialCredits?.[0].countsAs).toBe('statistics')
    })
  })
})

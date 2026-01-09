import { useMemo } from 'react'
import requirementsData from '../../data/requirements.json'
import coursesData from '../../data/courses.json'
import type { Requirements, Course, StudentData, FlexibleCourseCategory } from '@/types'
import { FLEXIBLE_COURSES } from '@/types'

const requirements = requirementsData as Requirements
const courses = coursesData as Course[]

// Helper to check if a course is a flexible course (can be assigned to multiple categories)
function isFlexibleCourse(code: string): boolean {
  return (FLEXIBLE_COURSES as readonly string[]).includes(code)
}

export interface CategoryProgress {
  id: string
  name: string
  required: number
  completed: number
  isComplete: boolean
  courses: string[]
  completedCourses: string[]
}

export interface DegreeProgress {
  totalHours: number
  completedHours: number
  categories: CategoryProgress[]
  isComplete: boolean
}

export function useRequirements(
  studentData: StudentData,
  explicitGeneralElectives?: string[]
) {
  const { degreeType, completedCourses, specialCredits, courseCategories = {} } = studentData

  // Count special credits by category
  const specialCreditsByCategory = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const credit of specialCredits) {
      counts[credit.countsAs] = (counts[credit.countsAs] || 0) + 1
    }
    return counts
  }, [specialCredits])

  const degreeProgress = useMemo((): DegreeProgress | null => {
    if (!degreeType) return null

    const degree = requirements[degreeType]
    const categories: CategoryProgress[] = []

    // Collect all courses that fulfill required categories (to exclude from electives)
    const requiredCategoryCourses = degree.required.categories.flatMap((c) => c.courses ?? [])

    // Track overflow courses from required categories AND electives
    const requiredOverflow: string[] = []

    // Process required categories
    for (const cat of degree.required.categories) {
      const completedInCategory = completedCourses.filter((c) =>
        cat.courses?.includes(c)
      )
      const specialCreditCount = specialCreditsByCategory[cat.id] || 0
      const totalCompleted = completedInCategory.length + specialCreditCount
      const requiredCount = cat.selectOne ? 1 : (cat.count ?? 1)

      // Courses beyond the required count overflow to general electives
      if (completedInCategory.length > requiredCount) {
        requiredOverflow.push(...completedInCategory.slice(requiredCount))
      }

      categories.push({
        id: cat.id,
        name: cat.name,
        required: requiredCount,
        completed: Math.min(totalCompleted, requiredCount),
        isComplete: totalCompleted >= requiredCount,
        courses: cat.courses ?? [],
        completedCourses: completedInCategory.slice(0, requiredCount),
      })
    }

    // Track overflow courses from electives
    const electiveOverflow: string[] = []

    // Process electives (major only)
    if (degree.electives) {
      for (const cat of degree.electives.categories) {
        // Get courses in this category, but EXCLUDE courses that fulfill required categories
        const categoryCourseCodes = courses
          .filter((c) => c.category === cat.category && !requiredCategoryCourses.includes(c.code))
          .map((c) => c.code)

        // Filter completed courses for this elective category
        const completedInCategory = completedCourses.filter((c) => {
          if (!categoryCourseCodes.includes(c)) return false

          // Exclude courses explicitly selected as general electives
          if (explicitGeneralElectives && explicitGeneralElectives.includes(c)) return false

          // For flexible courses, check if assigned to this specific category
          if (isFlexibleCourse(c)) {
            const assignedCategory = courseCategories[c as keyof typeof courseCategories] as FlexibleCourseCategory | undefined
            const expectedCategory = cat.id as FlexibleCourseCategory
            return assignedCategory === expectedCategory
          }
          return true
        })
        const specialCreditCount = specialCreditsByCategory[cat.id] || 0
        const totalCompleted = completedInCategory.length + specialCreditCount
        const requiredCount = cat.count ?? 1

        // Courses beyond the required count overflow to general electives
        if (completedInCategory.length > requiredCount) {
          electiveOverflow.push(...completedInCategory.slice(requiredCount))
        }

        categories.push({
          id: cat.id,
          name: cat.name,
          required: requiredCount,
          completed: Math.min(totalCompleted, requiredCount),
          isComplete: totalCompleted >= requiredCount,
          courses: categoryCourseCodes,
          completedCourses: completedInCategory.slice(0, requiredCount),
        })
      }
    }

    // Process general electives
    const allCourseCodes = courses.map((c) => c.code)

    let generalCompleted: string[]

    if (explicitGeneralElectives) {
      // Use explicitly provided general electives list (from Part 1 selections)
      generalCompleted = [
        ...explicitGeneralElectives,
        ...requiredOverflow,
        ...electiveOverflow,
      ]
    } else {
      // Fallback: infer general electives (for cases where explicit list not provided)
      const electiveCategoryCourses = degree.electives?.categories.flatMap((cat) =>
        courses.filter((c) => c.category === cat.category && !requiredCategoryCourses.includes(c.code)).map((c) => c.code)
      ) ?? []

      generalCompleted = [
        ...completedCourses.filter((c) => {
          if (!allCourseCodes.includes(c)) return false
          if (requiredCategoryCourses.includes(c)) return false

          // For flexible courses, check if assigned to generalElectives
          if (isFlexibleCourse(c)) {
            const assignedCategory = courseCategories[c as keyof typeof courseCategories] as FlexibleCourseCategory | undefined
            return assignedCategory === 'generalElectives'
          }

          // For non-flexible courses, exclude if they're in elective categories
          return !electiveCategoryCourses.includes(c)
        }),
        ...requiredOverflow,
        ...electiveOverflow,
      ]
    }
    const generalSpecialCreditCount = specialCreditsByCategory['generalElectives'] || 0
    const totalGeneralCompleted = generalCompleted.length + generalSpecialCreditCount

    categories.push({
      id: 'generalElectives',
      name: degree.generalElectives.name,
      required: degree.generalElectives.count,
      completed: Math.min(totalGeneralCompleted, degree.generalElectives.count),
      isComplete: totalGeneralCompleted >= degree.generalElectives.count,
      courses: allCourseCodes,
      completedCourses: generalCompleted.slice(0, degree.generalElectives.count),
    })

    const completedHours = categories.reduce(
      (sum, cat) => sum + cat.completed * 3,
      0
    )

    return {
      totalHours: degree.totalHours,
      completedHours: Math.min(completedHours, degree.totalHours),
      categories,
      isComplete: categories.every((c) => c.isComplete),
    }
  }, [degreeType, completedCourses, specialCreditsByCategory, courseCategories, explicitGeneralElectives])

  return {
    degreeProgress,
    requirements,
    courses,
  }
}

import type { Course, CourseSection, RequirementCategoryId } from '@/types'
import coursesData from '../../data/courses.json'
import offeringsData from '../../data/offerings-sp26.json'
import requirementsData from '../../data/requirements.json'

const courses = coursesData as Course[]
const offerings = offeringsData as { term: string; offeredCodes: string[]; sections: CourseSection[] }
const requirements = requirementsData as typeof requirementsData

// Get all courses for a specific requirement category
export function getCoursesForCategory(
  categoryId: RequirementCategoryId,
  degreeType: 'major' | 'minor' = 'major',
  completedRequiredCourses: string[] = []
): Course[] {
  const degree = requirements[degreeType]

  // Check required categories first
  const requiredCat = degree.required.categories.find((c) => c.id === categoryId)
  if (requiredCat?.courses) {
    return requiredCat.courses
      .map((code) => courses.find((c) => c.code === code))
      .filter((c): c is Course => c !== undefined)
  }

  // Check elective categories (major only)
  if (degreeType === 'major' && 'electives' in degree && degree.electives) {
    const electiveCat = degree.electives.categories.find((c: { id: string }) => c.id === categoryId)
    if (electiveCat?.category) {
      // Get all courses in this category
      // Only exclude courses that are ACTUALLY being used to fulfill required categories
      // (not just courses that COULD fulfill required categories)
      return courses.filter(
        (c) => c.category === electiveCat.category && !completedRequiredCourses.includes(c.code)
      )
    }
  }

  // General electives - return all courses
  if (categoryId === 'generalElectives') {
    return courses
  }

  return []
}

// Get courses offered next semester for a specific category
export function getOfferedCoursesForCategory(
  categoryId: RequirementCategoryId,
  degreeType: 'major' | 'minor' = 'major',
  excludeCourses: string[] = [],
  completedRequiredCourses: string[] = []
): Course[] {
  const categoryCourses = getCoursesForCategory(categoryId, degreeType, completedRequiredCourses)

  return categoryCourses.filter(
    (course) =>
      offerings.offeredCodes.includes(course.code) &&
      !excludeCourses.includes(course.code)
  )
}

// Get all courses not yet selected (for general electives multi-select)
export function getUnselectedCourses(selectedCourses: string[]): Course[] {
  return courses.filter((c) => !selectedCourses.includes(c.code))
}

// Get course codes for a required category (for exclusion logic)
export function getRequiredCategoryCourses(
  categoryId: RequirementCategoryId,
  degreeType: 'major' | 'minor' = 'major'
): string[] {
  const degree = requirements[degreeType]
  const requiredCat = degree.required.categories.find((c) => c.id === categoryId)
  return requiredCat?.courses ?? []
}

// Get section info for a course
export function getSectionsForCourse(courseCode: string): CourseSection[] {
  return offerings.sections.filter((s) => s.code === courseCode)
}

// Check if a course is offered next semester
export function isCourseOffered(courseCode: string): boolean {
  return offerings.offeredCodes.includes(courseCode)
}

// Get course by code
export function getCourseByCode(code: string): Course | undefined {
  return courses.find((c) => c.code === code)
}

// Get all courses
export function getAllCourses(): Course[] {
  return courses
}

// Get term info
export function getNextSemesterTerm(): string {
  return offerings.term
}

// Check enrollment warnings for a course
export function getEnrollmentWarning(courseCode: string): string | undefined {
  const prefix = courseCode.split(' ')[0]
  const warning = requirements.enrollmentWarnings[prefix as keyof typeof requirements.enrollmentWarnings]
  if (warning?.courses.includes(courseCode)) {
    return warning.message
  }
  return undefined
}

// Check if a course is blocked by a mutually exclusive rule
export function isMutuallyExcluded(courseCode: string, selectedCourses: string[]): boolean {
  for (const rule of requirements.mutuallyExclusive) {
    if (rule.courses.includes(courseCode)) {
      const otherCourse = rule.courses.find(c => c !== courseCode && selectedCourses.includes(c))
      if (otherCourse) {
        return true
      }
    }
  }
  return false
}

// Parse expected graduation to determine capstone semester
export function getCapstoneTargetSemester(expectedGraduation: string | null): string | null {
  if (!expectedGraduation) return null

  const match = expectedGraduation.match(/(Spring|Fall|Summer)\s+(\d{4})/)
  if (!match) return null

  const year = parseInt(match[2])
  // Capstone is only offered in Spring
  return `Spring ${year}`
}

// Check if capstone should be taken this semester (Spring 2026)
export function shouldTakeCapstoneNow(expectedGraduation: string | null): boolean {
  const target = getCapstoneTargetSemester(expectedGraduation)
  return target === 'Spring 2026'
}

// Category display names
export const categoryNames: Record<RequirementCategoryId, string> = {
  intro: 'Intro/Req\'d English',
  statistics: 'Statistics',
  coding: 'Coding',
  mmAuthoring: 'Multimedia Authoring',
  capstone: 'Capstone',
  dcElective: 'Digital Culture Elective',
  daElective: 'Data Analytics Elective',
  generalElectives: 'General Electives',
}

// Generate list of semesters from Spring 2026 to a target graduation semester
export function getSemestersUntilGraduation(expectedGraduation: string | null): string[] {
  const semesters: string[] = []
  
  if (!expectedGraduation) {
    // Default to 4 semesters if no graduation date
    return ['Spring 2026', 'Fall 2026', 'Spring 2027', 'Fall 2027']
  }
  
  const match = expectedGraduation.match(/(Spring|Fall|Summer)\s+(\d{4})/)
  if (!match) {
    return ['Spring 2026', 'Fall 2026', 'Spring 2027', 'Fall 2027']
  }
  
  const gradSeason = match[1]
  const gradYear = parseInt(match[2])
  
  // Start from Spring 2026 (next semester)
  let year = 2026
  let season: 'Spring' | 'Fall' = 'Spring'
  
  while (true) {
    const semesterName = `${season} ${year}`
    semesters.push(semesterName)
    
    // Check if we've reached graduation
    if (year === gradYear && season === gradSeason) break
    if (year > gradYear) break
    if (semesters.length > 10) break // Safety limit
    
    // Advance to next semester (skip summer for now)
    if (season === 'Spring') {
      season = 'Fall'
    } else {
      season = 'Spring'
      year++
    }
  }
  
  return semesters
}

// Distribution plan type
export interface SemesterPlan {
  semester: string
  courses: { code: string; category: string }[]
}

// Build a semester distribution plan for remaining courses
export function buildSemesterPlan(
  scheduledCourses: string[],
  scheduledCategories: Record<string, string>, // course code -> category name
  neededCategories: { category: string; name: string; remaining: number }[],
  expectedGraduation: string | null
): SemesterPlan[] {
  const semesters = getSemestersUntilGraduation(expectedGraduation)
  const plan: SemesterPlan[] = semesters.map(s => ({ semester: s, courses: [] }))
  
  if (plan.length === 0) return plan
  
  // First semester gets all scheduled courses
  for (const code of scheduledCourses) {
    const category = scheduledCategories[code] || 'Elective'
    plan[0].courses.push({ code, category })
  }
  
  // Build list of all remaining needed "slots" (courses to plan)
  const neededSlots: { category: string; name: string }[] = []
  for (const { category, name, remaining } of neededCategories) {
    for (let i = 0; i < remaining; i++) {
      neededSlots.push({ category, name })
    }
  }
  
  // Find capstone and schedule it in the capstone semester
  const capstoneTarget = getCapstoneTargetSemester(expectedGraduation)
  const capstoneIndex = neededSlots.findIndex(s => s.category === 'capstone')
  
  if (capstoneIndex !== -1 && capstoneTarget) {
    const capstoneSemesterIdx = semesters.findIndex(s => s === capstoneTarget)
    if (capstoneSemesterIdx !== -1) {
      plan[capstoneSemesterIdx].courses.push({ code: '—', category: neededSlots[capstoneIndex].name })
      neededSlots.splice(capstoneIndex, 1)
    }
  }
  
  // Distribute remaining slots evenly across semesters (starting from 2nd if 1st has scheduled)
  const startIdx = plan[0].courses.length > 0 ? 1 : 0
  const availableSemesters = semesters.length - startIdx
  
  if (availableSemesters > 0 && neededSlots.length > 0) {
    const perSemester = Math.ceil(neededSlots.length / availableSemesters)
    let slotIdx = 0
    
    for (let semIdx = startIdx; semIdx < semesters.length && slotIdx < neededSlots.length; semIdx++) {
      // Skip if this semester is the capstone semester (to avoid overloading it)
      const isCapstone = semesters[semIdx] === capstoneTarget
      const maxThisSem = isCapstone ? Math.min(perSemester, 2) : perSemester
      
      for (let i = 0; i < maxThisSem && slotIdx < neededSlots.length; i++) {
        plan[semIdx].courses.push({ code: '—', category: neededSlots[slotIdx].name })
        slotIdx++
      }
    }
    
    // If there are still remaining slots (due to capstone limit), add them to other semesters
    while (slotIdx < neededSlots.length) {
      for (let semIdx = startIdx; semIdx < semesters.length && slotIdx < neededSlots.length; semIdx++) {
        if (semesters[semIdx] !== capstoneTarget) {
          plan[semIdx].courses.push({ code: '—', category: neededSlots[slotIdx].name })
          slotIdx++
        }
      }
    }
  }
  
  // Filter out empty semesters (unless it's the first one with scheduled)
  return plan.filter((p, idx) => p.courses.length > 0 || (idx === 0 && scheduledCourses.length === 0))
}

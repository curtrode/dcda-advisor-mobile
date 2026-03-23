import type { Course, CourseSection, CourseOfferings, RequirementCategoryId } from '@/types'
import coursesData from '../../data/courses.json'
import offeringsData from '../../data/offerings-fa26.json'
import summerOfferingsData from '../../data/offerings-su26.json'
import requirementsData from '../../data/requirements.json'

// Deduplicate courses by code (keep first occurrence)
const coursesRaw = coursesData as Course[]
const courses = coursesRaw.filter((course, index, self) =>
  index === self.findIndex((c) => c.code === course.code)
)

let offerings = offeringsData as CourseOfferings
let summerOfferings = summerOfferingsData as CourseOfferings
const requirements = requirementsData as typeof requirementsData

/** Called by DCDADataProvider to update live offerings from Firestore */
export function updateOfferings(data: CourseOfferings): void {
  offerings = data
}

/** Called by DCDADataProvider to update live summer offerings from Firestore */
export function updateSummerOfferings(data: CourseOfferings): void {
  summerOfferings = data
}

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

// Get courses offered for a specific category in the given semester
export function getOfferedCoursesForCategory(
  categoryId: RequirementCategoryId,
  degreeType: 'major' | 'minor' = 'major',
  excludeCourses: string[] = [],
  completedRequiredCourses: string[] = [],
  semester: 'fall' | 'summer' = 'fall'
): Course[] {
  const categoryCourses = getCoursesForCategory(categoryId, degreeType, completedRequiredCourses)

  // Specific exclusions for General Electives
  const filteredCourses = categoryId === 'generalElectives'
    ? categoryCourses.filter(c => c.code !== 'DCDA 40833')
    : categoryCourses

  const source = semester === 'summer' ? summerOfferings : offerings
  return filteredCourses.filter(
    (course) =>
      source.offeredCodes.includes(course.code) &&
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
export function getSectionsForCourse(courseCode: string, semester: 'fall' | 'summer' = 'fall'): CourseSection[] {
  const source = semester === 'summer' ? summerOfferings : offerings
  return source.sections.filter((s) => s.code === courseCode)
}

// Check if a course is offered in the given semester
export function isCourseOffered(courseCode: string): boolean {
  return offerings.offeredCodes.includes(courseCode)
}

// Get the summer term label (e.g. "Summer 2026")
export function getSummerTerm(): string {
  return summerOfferings.term
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

// Check if capstone should be taken this semester
export function shouldTakeCapstoneNow(expectedGraduation: string | null): boolean {
  const target = getCapstoneTargetSemester(expectedGraduation)
  return target === getNextSemesterTerm()
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

// Generate list of semesters from the current term to a target graduation semester
export function getSemestersUntilGraduation(expectedGraduation: string | null, includeSummer: boolean = false): string[] {
  const semesters: string[] = []

  const termMatch = getNextSemesterTerm().match(/^(Spring|Summer|Fall)\s+(\d{4})/)
  const startSeason: 'Spring' | 'Summer' | 'Fall' = termMatch ? (termMatch[1] as 'Spring' | 'Summer' | 'Fall') : 'Fall'
  const startYear = termMatch ? parseInt(termMatch[2]) : 2026

  // If including summer and the next term is Fall, prepend the preceding summer
  if (includeSummer && startSeason === 'Fall') {
    semesters.push(`Summer ${startYear}`)
  }

  if (!expectedGraduation) {
    // Default to 4 non-summer (or 6 with summer) semesters from the current term
    let s = startSeason
    let y = startYear
    const target = includeSummer ? 6 : 4
    let iterations = 0
    while (semesters.length < target && iterations < 20) {
      if (s !== 'Summer' || includeSummer) semesters.push(`${s} ${y}`)
      if (s === 'Spring') { s = 'Summer' }
      else if (s === 'Summer') { s = 'Fall' }
      else { s = 'Spring'; y++ }
      iterations++
    }
    return semesters
  }

  const match = expectedGraduation.match(/(Spring|Fall|Summer)\s+(\d{4})/)
  if (!match) {
    return [`${startSeason} ${startYear}`, `Fall ${startYear}`, `Spring ${startYear + 1}`, `Fall ${startYear + 1}`]
  }

  const gradSeason = match[1]
  const gradYear = parseInt(match[2])

  // Start from current term
  let year = startYear
  let season: 'Spring' | 'Summer' | 'Fall' = startSeason
  
  while (true) {
    const isSummer = season === 'Summer'
    
    // Check if we should include this semester
    // We always include the target graduation semester, even if it's summer and includeSummer is false
    // (User explicitly said they are graduating then)
    const isGradSemester = year === gradYear && season === gradSeason
    
    if (!isSummer || includeSummer || isGradSemester) {
      const semesterName = `${season} ${year}`
      semesters.push(semesterName)
    }
    
    // Check if we've reached graduation
    if (year === gradYear && season === gradSeason) break
    if (year > gradYear) break
    if (semesters.length > 15) break // Safety limit
    
    // Advance to next semester
    if (season === 'Spring') {
      season = 'Summer'
    } else if (season === 'Summer') {
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
  expectedGraduation: string | null,
  includeSummer: boolean = false,
  summerCourses: string[] = []
): SemesterPlan[] {
  const semesters = getSemestersUntilGraduation(expectedGraduation, includeSummer)
  const plan: SemesterPlan[] = semesters.map(s => ({ semester: s, courses: [] }))

  if (plan.length === 0) return plan

  // Place summer-scheduled courses into the summer semester slot
  const summerTermLabel = summerOfferings.term
  const summerIdx = semesters.findIndex(s => s === summerTermLabel)
  if (summerIdx !== -1) {
    for (const code of summerCourses) {
      const category = scheduledCategories[code] || 'Elective'
      plan[summerIdx].courses.push({ code, category })
    }
  }

  // Fall-scheduled courses go into the fall semester (first non-summer slot)
  const fallCourses = scheduledCourses.filter(c => !summerCourses.includes(c))
  const fallTermLabel = offerings.term
  const fallIdx = semesters.findIndex(s => s === fallTermLabel)
  const targetIdx = fallIdx !== -1 ? fallIdx : 0
  for (const code of fallCourses) {
    const category = scheduledCategories[code] || 'Elective'
    plan[targetIdx].courses.push({ code, category })
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
  
  // Determine which semesters are available for distributing needed placeholder slots
  // Skip semesters that already have scheduled courses, and always skip summer semesters
  // (students opt into specific summer courses; placeholder slots belong in fall/spring)
  const distributionIndices: number[] = []
  for (let i = 0; i < semesters.length; i++) {
    const isSummer = semesters[i].startsWith('Summer')
    if (isSummer) continue
    if (plan[i].courses.length > 0) continue
    distributionIndices.push(i)
  }

  if (distributionIndices.length > 0 && neededSlots.length > 0) {
    const perSemester = Math.ceil(neededSlots.length / distributionIndices.length)
    let slotIdx = 0

    for (const semIdx of distributionIndices) {
      if (slotIdx >= neededSlots.length) break
      const isCapstone = semesters[semIdx] === capstoneTarget
      const maxThisSem = isCapstone ? Math.min(perSemester, 2) : perSemester

      for (let i = 0; i < maxThisSem && slotIdx < neededSlots.length; i++) {
        plan[semIdx].courses.push({ code: '—', category: neededSlots[slotIdx].name })
        slotIdx++
      }
    }

    // If there are still remaining slots (due to capstone limit), add them to other semesters
    while (slotIdx < neededSlots.length) {
      for (const semIdx of distributionIndices) {
        if (slotIdx >= neededSlots.length) break
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

import type { StudentData, WizardStepId } from '@/types'
import { getCourseByCode, categoryNames, isCourseOffered, getNextSemesterTerm } from '@/services/courses'
import requirementsData from '../../data/requirements.json'

const STEP_LABELS: Record<WizardStepId, string> = {
  welcome: 'Welcome',
  name: 'Entering Name & Degree',
  graduation: 'Setting Graduation Date',
  intro: 'Selecting Intro Course',
  statistics: 'Selecting Statistics Course',
  coding: 'Selecting Coding Course',
  mmAuthoring: 'Selecting Multimedia Authoring Course',
  dcElective: 'Selecting DC Elective',
  daElective: 'Selecting DA Elective',
  generalElectives: 'Selecting General Electives',
  specialCredits: 'Adding Special Credits',
  transition: 'Reviewing Progress',
  schedule: 'Scheduling Next Semester',
  reviewSummary: 'Reviewing Degree Summary',
  reviewActions: 'Saving & Submitting Plan',
}

function formatCourseList(codes: string[]): string {
  return codes.map(code => {
    const course = getCourseByCode(code)
    return course ? `${code} (${course.title})` : code
  }).join(', ')
}

export interface ChatContext {
  context: string
  programName: string
}

export function buildAdaContext(
  studentData: StudentData,
  currentStepId: WizardStepId
): ChatContext | null {
  if (!studentData.degreeType) return null

  type Cat = { id: string; name: string; hours: number; courses?: string[] }
  const reqs = requirementsData[studentData.degreeType] as { name: string; totalHours: number; required: { categories: Cat[] }; electives?: { categories: Cat[] }; generalElectives: { hours: number; count: number } }
  const lines: string[] = []

  lines.push('Wizard: TCU DCDA Advising Wizard')
  lines.push(`Degree: ${reqs.name} (${reqs.totalHours} hours required)`)
  lines.push(`Current step: ${STEP_LABELS[currentStepId]}`)

  if (studentData.expectedGraduation) {
    lines.push(`Expected graduation: ${studentData.expectedGraduation}`)
  }

  // Completed courses
  if (studentData.completedCourses.length > 0) {
    lines.push(`Completed courses: ${formatCourseList(studentData.completedCourses)}`)
  }

  // Scheduled courses
  if (studentData.scheduledCourses.length > 0) {
    lines.push(`Planned for next semester: ${formatCourseList(studentData.scheduledCourses)}`)
  }

  // Special credits
  if (studentData.specialCredits.length > 0) {
    const creditsSummary = studentData.specialCredits
      .map(c => `${c.description} (${c.type}, counts as ${categoryNames[c.countsAs]})`)
      .join('; ')
    lines.push(`Special credits: ${creditsSummary}`)
  }

  // Remaining categories
  const allCourses = [...studentData.completedCourses, ...studentData.scheduledCourses]
  const allCategories = [
    ...reqs.required.categories,
    ...(reqs.electives?.categories ?? []),
  ]

  const term = getNextSemesterTerm()
  const remaining = allCategories
    .filter(cat => {
      if (!cat.courses) return false
      const filled = cat.courses.some(c => allCourses.includes(c))
      const specialFilled = studentData.specialCredits.some(sc => sc.countsAs === cat.id)
      return !filled && !specialFilled
    })
    .map(cat => {
      const offered = cat.courses?.filter(c => isCourseOffered(c)) ?? []
      const notOffered = cat.courses?.filter(c => !isCourseOffered(c)) ?? []
      let desc = `${cat.name} (${cat.hours} hrs)`
      if (offered.length > 0) {
        desc += ` — offered ${term}: ${offered.join(', ')}`
      }
      if (notOffered.length > 0) {
        desc += ` — NOT offered ${term}: ${notOffered.join(', ')}`
      }
      return desc
    })

  if (remaining.length > 0) {
    lines.push(`Still needed: ${remaining.join('; ')}`)
  }

  // Progress summary
  const completedHours = studentData.completedCourses.length * 3
  const totalWithPlanned = allCourses.length * 3
  const specialHours = studentData.specialCredits.length * 3
  lines.push(`Progress: ~${completedHours + specialHours} of ${reqs.totalHours} hours completed`)
  if (studentData.scheduledCourses.length > 0) {
    lines.push(`Projected with planned: ~${totalWithPlanned + specialHours} of ${reqs.totalHours} hours`)
  }

  return { context: lines.join('\n'), programName: reqs.name }
}

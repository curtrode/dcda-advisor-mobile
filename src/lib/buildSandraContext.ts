import type { StudentData, WizardStepId } from '@/types'
import { getCourseByCode, categoryNames } from '@/services/courses'
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

export interface SandraContext {
  context: string
  programName: string
}

export function buildSandraContext(
  studentData: StudentData,
  currentStepId: WizardStepId
): SandraContext | null {
  if (!studentData.degreeType) return null

  const reqs = requirementsData[studentData.degreeType] as { name: string; totalHours: number; required: { categories: { id: string; name: string; hours: number }[] }; electives?: { categories: { id: string; name: string; hours: number }[] }; generalElectives: { hours: number; count: number } }
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

  const remaining = allCategories
    .filter(cat => {
      const catCourses = cat.courses as string[] | undefined
      if (!catCourses) return false
      const filled = catCourses.some(c => allCourses.includes(c))
      const specialFilled = studentData.specialCredits.some(sc => sc.countsAs === cat.id)
      return !filled && !specialFilled
    })
    .map(cat => `${cat.name} (${cat.hours} hrs)`)

  if (remaining.length > 0) {
    lines.push(`Still needed: ${remaining.join(', ')}`)
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

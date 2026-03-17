import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CourseStep } from './CourseStep'
import { isValidTcuEmail } from './NameStep'
import { getCoursesForCategory, isMutuallyExcluded } from '@/services/courses'

vi.mock('@/services/courses', () => ({
  getCoursesForCategory: vi.fn(),
  isMutuallyExcluded: vi.fn(),
}))

describe('course and input validation smoke tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('filters out mutually excluded courses from options', () => {
    vi.mocked(getCoursesForCategory).mockReturnValue([
      {
        code: 'MATH 10043',
        title: 'Elementary Statistics',
        category: 'Data Analytics',
        college: 'AddRan',
      },
      {
        code: 'INSC 20153',
        title: 'Introduction to Statistics',
        category: 'Data Analytics',
        college: 'AddRan',
      },
    ])

    vi.mocked(isMutuallyExcluded).mockImplementation((courseCode) => courseCode === 'INSC 20153')

    render(
      <CourseStep
        categoryId="statistics"
        title="Have you completed Statistics?"
        selectedCourse={null}
        selectedCourses={[]}
        allSelectedCourses={[]}
        onSelectCourse={vi.fn()}
        onDeselectCourse={vi.fn()}
        onSelectNotYet={vi.fn()}
        isNotYetSelected={false}
        degreeType="major"
      />
    )

    expect(screen.getByText('MATH 10043')).toBeInTheDocument()
    expect(screen.queryByText('INSC 20153')).not.toBeInTheDocument()
  })

  it('validates TCU email format', () => {
    expect(isValidTcuEmail('student@tcu.edu')).toBe(true)
    expect(isValidTcuEmail('student@TCU.edu')).toBe(true)
    expect(isValidTcuEmail('student@gmail.com')).toBe(false)
    expect(isValidTcuEmail('student@tcu.edu ')).toBe(false)
  })
})

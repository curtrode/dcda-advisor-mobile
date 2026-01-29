import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ScheduleStep } from './ScheduleStep'

// Mock the courses service
vi.mock('@/services/courses', () => ({
  getOfferedCoursesForCategory: vi.fn(),
  getCourseByCode: vi.fn(),
  getSectionsForCourse: vi.fn(() => []),
  getEnrollmentWarning: vi.fn(() => undefined),
  isMutuallyExcluded: vi.fn(() => false),
  categoryNames: {
    intro: 'Intro/Req\'d English',
    statistics: 'Statistics',
    coding: 'Coding',
    mmAuthoring: 'Multimedia Authoring',
    capstone: 'Capstone',
    dcElective: 'Digital Culture Elective',
    daElective: 'Data Analytics Elective',
    generalElectives: 'General Electives',
  },
  getNextSemesterTerm: vi.fn(() => 'Spring 2026'),
}))

import { getOfferedCoursesForCategory } from '@/services/courses'

describe('ScheduleStep', () => {
  const defaultProps = {
    categoryId: 'statistics' as const,
    selectedCourse: null,
    allSelectedCourses: [],
    allScheduledCourses: [],
    completedRequiredCourses: [],
    onSelectCourse: vi.fn(),
    onSkip: vi.fn(),
    isSkipped: false,
    degreeType: 'major' as const,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('auto-skips when no courses are available', async () => {
    const onSkip = vi.fn()
    vi.mocked(getOfferedCoursesForCategory).mockReturnValue([])

    render(<ScheduleStep {...defaultProps} onSkip={onSkip} />)

    // Should call onSkip automatically via useEffect
    await waitFor(() => {
      expect(onSkip).toHaveBeenCalled()
    })
  })

  it('shows auto-skip message when no courses available', () => {
    vi.mocked(getOfferedCoursesForCategory).mockReturnValue([])

    render(<ScheduleStep {...defaultProps} isSkipped={true} />)

    expect(screen.getByText(/no courses for this category are offered/i)).toBeInTheDocument()
    expect(screen.getByText(/automatically skipped/i)).toBeInTheDocument()
  })

  it('shows skip button when courses are available', () => {
    vi.mocked(getOfferedCoursesForCategory).mockReturnValue([
      { code: 'MATH 10043', title: 'Elementary Statistics', category: 'Data Analytics', college: 'AddRan' },
    ])

    render(<ScheduleStep {...defaultProps} />)

    expect(screen.getByText(/skip for now/i)).toBeInTheDocument()
  })

  it('renders course options when available', () => {
    vi.mocked(getOfferedCoursesForCategory).mockReturnValue([
      { code: 'MATH 10043', title: 'Elementary Statistics', category: 'Data Analytics', college: 'AddRan' },
      { code: 'INSC 20153', title: 'Introduction to Statistics', category: 'Data Analytics', college: 'AddRan' },
    ])

    render(<ScheduleStep {...defaultProps} />)

    expect(screen.getByText('MATH 10043')).toBeInTheDocument()
    expect(screen.getByText('INSC 20153')).toBeInTheDocument()
  })

  it('does not auto-skip when already skipped', () => {
    const onSkip = vi.fn()
    vi.mocked(getOfferedCoursesForCategory).mockReturnValue([])

    render(<ScheduleStep {...defaultProps} onSkip={onSkip} isSkipped={true} />)

    // Should NOT call onSkip again since already skipped
    expect(onSkip).not.toHaveBeenCalled()
  })
})

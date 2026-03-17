import { describe, it, expect, vi, afterEach } from 'vitest'
import { generatePdfBlob } from './export'
import type { StudentData } from '@/types'

vi.mock('jspdf', () => {
  class MockJsPdf {
    internal = {
      pageSize: {
        getWidth: () => 210,
        getHeight: () => 297,
      },
    }

    setFillColor() {}
    rect() {}
    setTextColor() {}
    setFontSize() {}
    setFont() {}
    text() {}
    setDrawColor() {}
    line() {}
    addPage() {}
    splitTextToSize(text: string) {
      return [text]
    }
    output(type: string) {
      if (type === 'blob') return new Blob(['mock-pdf'], { type: 'application/pdf' })
      return 'mock-output'
    }
  }

  return { jsPDF: MockJsPdf }
})

function createStudentData(overrides: Partial<StudentData> = {}): StudentData {
  return {
    name: 'Test Student',
    degreeType: 'major',
    expectedGraduation: 'Spring 2027',
    completedCourses: ['ENGL 20813'],
    scheduledCourses: [],
    specialCredits: [],
    ...overrides,
  }
}

describe('export smoke tests', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('generates a blob URL and filename for PDF export', () => {
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-dcda')

    const { blobUrl, filename } = generatePdfBlob({
      studentData: createStudentData(),
      generalElectives: [],
    })

    expect(blobUrl).toBe('blob:mock-dcda')
    expect(filename).toMatch(/^DCDA_Plan_Test_Student_/)
    expect(filename.endsWith('.pdf')).toBe(true)
    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1)
  })
})

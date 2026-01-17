import { jsPDF } from 'jspdf'
import type { StudentData, Course, SpecialCredit, RequirementCategoryId, FlexibleCourseCategory } from '@/types'
import { FLEXIBLE_COURSES } from '@/types'
import { getCapstoneTargetSemester, buildSemesterPlan } from './courses'
import coursesData from '../../data/courses.json'
import requirementsData from '../../data/requirements.json'

const courses = coursesData as Course[]

// Helper to check if a course is flexible
function isFlexibleCourse(code: string): boolean {
  return (FLEXIBLE_COURSES as readonly string[]).includes(code)
}

// Note type labels for display
const creditTypeLabels: Record<string, string> = {
  'transfer': 'Transfer',
  'study-abroad': 'Study Abroad',
  'one-time-approval': 'Approval',
}

// CSV Export - saves student data for later import
export function exportToCSV(studentData: StudentData): void {
  const lines: string[] = []

  // Header with version for future compatibility
  lines.push('DCDA_MOBILE_EXPORT,v1')

  // Student info
  lines.push(`name,${escapeCSV(studentData.name)}`)
  lines.push(`degreeType,${studentData.degreeType || ''}`)
  lines.push(`expectedGraduation,${studentData.expectedGraduation || ''}`)

  // Completed courses
  lines.push(`completedCourses,${studentData.completedCourses.join(';')}`)

  // Scheduled courses
  lines.push(`scheduledCourses,${studentData.scheduledCourses.join(';')}`)

  // Special credits (JSON encoded for complex data)
  if (studentData.specialCredits.length > 0) {
    const creditsData = studentData.specialCredits.map(c => ({
      type: c.type,
      description: c.description,
      countsAs: c.countsAs,
    }))
    lines.push(`specialCredits,${escapeCSV(JSON.stringify(creditsData))}`)
  }

  // Course categories for flexible courses
  if (studentData.courseCategories && Object.keys(studentData.courseCategories).length > 0) {
    lines.push(`courseCategories,${escapeCSV(JSON.stringify(studentData.courseCategories))}`)
  }

  const csvContent = lines.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const today = new Date().toISOString().split('T')[0]
  const filename = `DCDA_Plan_${studentData.name?.replace(/\s+/g, '_') || 'Student'}_${today}.csv`

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// CSV Import - restores student data from a previously exported file
export function parseCSVImport(csvContent: string): Partial<StudentData> | null {
  try {
    const lines = csvContent.trim().split('\n')

    // Verify header
    if (!lines[0]?.startsWith('DCDA_')) {
      console.error('Invalid CSV format: missing header')
      return null
    }

    const data: Partial<StudentData> = {
      completedCourses: [],
      scheduledCourses: [],
      specialCredits: [],
    }

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      const commaIndex = line.indexOf(',')
      if (commaIndex === -1) continue

      const key = line.substring(0, commaIndex)
      const value = unescapeCSV(line.substring(commaIndex + 1))

      switch (key) {
        case 'name':
          data.name = value
          break
        case 'degreeType':
          if (value === 'major' || value === 'minor') {
            data.degreeType = value
          }
          break
        case 'expectedGraduation':
          data.expectedGraduation = value || null
          break
        case 'completedCourses':
          data.completedCourses = value ? value.split(';').filter(Boolean) : []
          break
        case 'scheduledCourses':
          data.scheduledCourses = value ? value.split(';').filter(Boolean) : []
          break
        case 'plannedCourses': // Backwards compatibility with chat version
          data.scheduledCourses = value ? value.split(';').filter(Boolean) : []
          break
        case 'specialCredits':
        case 'specialNotes': // Backwards compatibility
          if (value) {
            try {
              const creditsData = JSON.parse(value) as { type: SpecialCredit['type']; description: string; countsAs: RequirementCategoryId }[]
              data.specialCredits = creditsData.map(c => ({
                id: crypto.randomUUID(),
                type: c.type,
                description: c.description,
                countsAs: c.countsAs,
              }))
            } catch {
              console.error('Failed to parse special credits')
            }
          }
          break
        case 'courseCategories':
          if (value) {
            try {
              data.courseCategories = JSON.parse(value)
            } catch {
              console.error('Failed to parse course categories')
            }
          }
          break
      }
    }

    return data
  } catch (error) {
    console.error('CSV parse error:', error)
    return null
  }
}

// Helper to escape CSV values
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

// Helper to unescape CSV values
function unescapeCSV(value: string): string {
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/""/g, '"')
  }
  return value
}

interface ExportOptions {
  studentData: StudentData
  generalElectives?: string[]
}

// Generate PDF and return blob URL for preview
export function generatePdfBlob({ studentData, generalElectives }: ExportOptions): { blobUrl: string; filename: string } {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 15
  let y = 20

  const capstoneTarget = getCapstoneTargetSemester(studentData.expectedGraduation)
  const CAPSTONE_CODE = 'DCDA 40833'
  const capstoneCompleted = studentData.completedCourses.includes(CAPSTONE_CODE)
  const capstoneScheduled = studentData.scheduledCourses.includes(CAPSTONE_CODE)
  const capstoneAutoScheduled = !capstoneCompleted && !capstoneScheduled && !!capstoneTarget

  // Helper to check page break
  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > 270) {
      doc.addPage()
      y = 20
    }
  }

  // Header
  doc.setFillColor(77, 28, 141) // TCU Purple
  doc.rect(0, 0, pageWidth, 30, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('DCDA Advising Plan', margin, 18)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Digital Culture & Data Analytics Program', margin, 26)

  // Reset text color
  doc.setTextColor(0, 0, 0)
  y = 40

  // Student Info Row
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(`${studentData.name || 'Student'}`, margin, y)
  doc.setFont('helvetica', 'normal')
  const degreeText = `DCDA ${studentData.degreeType === 'major' ? 'Major' : 'Minor'}`
  const gradText = studentData.expectedGraduation ? ` • Expected: ${studentData.expectedGraduation}` : ''
  const capstoneText = capstoneTarget ? ` • Capstone: ${capstoneTarget}` : ''
  doc.text(`${degreeText}${gradText}${capstoneText}`, margin + doc.getTextWidth(studentData.name || 'Student') + 5, y)
  y += 10

  // Get degree requirements
  const degree = studentData.degreeType ? requirementsData[studentData.degreeType] : null
  if (!degree) {
    doc.text('No degree type selected.', margin, y)
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    const filename = `DCDA_Plan_${studentData.name?.replace(/\s+/g, '_') || 'Student'}_${today.replace(/\s+/g, '_')}.pdf`
    const pdfBlob = doc.output('blob')
    const blobUrl = URL.createObjectURL(pdfBlob)
    return { blobUrl, filename }
  }

  // Count special credits by category
  const specialCreditsByCategory = studentData.specialCredits.reduce((acc, credit) => {
    if (!acc[credit.countsAs]) acc[credit.countsAs] = []
    acc[credit.countsAs].push(credit)
    return acc
  }, {} as Record<string, SpecialCredit[]>)

  // Build scheduled courses by category
  const requiredCategoryCourses = degree.required.categories.flatMap((c: { courses?: string[] }) => c.courses ?? [])
  const scheduledByCategory: Record<string, string[]> = {}

  // Process required categories for scheduled courses
  for (const cat of degree.required.categories) {
    const scheduledInCat = studentData.scheduledCourses.filter((code: string) => cat.courses?.includes(code))
    if (scheduledInCat.length > 0) {
      scheduledByCategory[cat.id] = scheduledInCat
    }
  }

  // Process elective categories for scheduled courses (major only)
  const degreeWithElectives = degree as typeof degree & { electives?: { categories: Array<{ id: string; name: string; category: string; count?: number }> } }
  if (degreeWithElectives.electives) {
    for (const cat of degreeWithElectives.electives.categories) {
      const categoryCourseCodes = courses
        .filter((c) => c.category === cat.category && !requiredCategoryCourses.includes(c.code))
        .map((c) => c.code)

      const scheduledInCat = studentData.scheduledCourses.filter((code: string) => {
        if (!categoryCourseCodes.includes(code)) return false
        if (isFlexibleCourse(code)) {
          const assignedCategory = studentData.courseCategories?.[code as keyof typeof studentData.courseCategories] as FlexibleCourseCategory | undefined
          return assignedCategory === cat.id
        }
        return true
      })
      if (scheduledInCat.length > 0) {
        scheduledByCategory[cat.id] = scheduledInCat
      }
    }
  }

  // Table configuration
  const colWidths = { requirement: 55, completed: 55, scheduled: 55 }
  const tableWidth = colWidths.requirement + colWidths.completed + colWidths.scheduled
  const startX = margin

  // Table Header
  checkPageBreak(15)
  doc.setFillColor(240, 240, 240)
  doc.rect(startX, y - 4, tableWidth, 8, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Requirement', startX + 2, y)
  doc.text('Completed', startX + colWidths.requirement + 2, y)
  doc.text('Spring 2026', startX + colWidths.requirement + colWidths.completed + 2, y)
  y += 8

  // Draw header border
  doc.setDrawColor(200)
  doc.line(startX, y - 4, startX + tableWidth, y - 4)

  // Helper to draw a row
  const drawRow = (
    reqName: string,
    reqStatus: string,
    completedItems: string[],
    scheduledItems: string[],
    credits: SpecialCredit[],
    isFuture = false
  ) => {
    const maxItems = Math.max(completedItems.length, scheduledItems.length, credits.length, 1)
    const rowHeight = Math.max(maxItems * 5 + 4, 10)

    checkPageBreak(rowHeight + 5)

    // Requirement column
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(reqName, startX + 2, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(100)
    doc.text(reqStatus, startX + 2, y + 4)
    doc.setTextColor(0)

    // Completed column
    doc.setFontSize(7)
    let itemY = y
    for (const code of completedItems) {
      doc.text(`✓ ${code}`, startX + colWidths.requirement + 2, itemY)
      itemY += 4
    }
    // Show credits that count toward this category
    for (const credit of credits) {
      doc.setTextColor(77, 28, 141) // Purple for credits
      const creditText = `[${creditTypeLabels[credit.type]}] ${credit.description.substring(0, 20)}${credit.description.length > 20 ? '...' : ''}`
      doc.text(creditText, startX + colWidths.requirement + 2, itemY)
      doc.setTextColor(0)
      itemY += 4
    }

    // Scheduled column
    itemY = y
    if (isFuture) {
      doc.setTextColor(0, 100, 180) // Blue for future
    }
    for (const code of scheduledItems) {
      doc.text(code, startX + colWidths.requirement + colWidths.completed + 2, itemY)
      itemY += 4
    }
    doc.setTextColor(0)

    y += rowHeight

    // Draw row border
    doc.setDrawColor(230)
    doc.line(startX, y - 2, startX + tableWidth, y - 2)
  }

  // Process each requirement category
  for (const cat of degree.required.categories) {
    const completedInCat = studentData.completedCourses.filter((c: string) => cat.courses?.includes(c))
    const scheduledInCat = scheduledByCategory[cat.id] || []
    const credits = specialCreditsByCategory[cat.id] || []
    const specialCreditCount = credits.length
    const requiredCount = cat.selectOne ? 1 : ((cat as { count?: number }).count ?? 1)
    const totalCompleted = completedInCat.length + specialCreditCount
    const totalWithScheduled = totalCompleted + scheduledInCat.length

    let status = ''
    if (totalCompleted >= requiredCount) {
      status = '✓ Complete'
    } else if (totalWithScheduled >= requiredCount) {
      status = 'Scheduled'
    } else {
      status = `${totalCompleted}/${requiredCount}`
    }

    // Handle capstone auto-scheduling
    let displayScheduled = scheduledInCat
    if (cat.id === 'capstone' && capstoneAutoScheduled) {
      displayScheduled = [`→ ${capstoneTarget}`]
    }

    drawRow(cat.name, status, completedInCat, displayScheduled, credits, cat.id === 'capstone' && capstoneAutoScheduled)
  }

  // Process elective categories (major only)
  if (degreeWithElectives.electives) {
    for (const cat of degreeWithElectives.electives.categories) {
      const categoryCourseCodes = courses
        .filter((c) => c.category === cat.category && !requiredCategoryCourses.includes(c.code))
        .map((c) => c.code)
      const completedInCat = studentData.completedCourses.filter((c: string) => {
        if (!categoryCourseCodes.includes(c)) return false

        // Exclude courses explicitly selected as general electives
        if (generalElectives && generalElectives.includes(c)) return false

        if (isFlexibleCourse(c)) {
          const assignedCategory = studentData.courseCategories?.[c as keyof typeof studentData.courseCategories] as FlexibleCourseCategory | undefined
          return assignedCategory === cat.id
        }
        return true
      })
      const scheduledInCat = scheduledByCategory[cat.id] || []
      const credits = specialCreditsByCategory[cat.id] || []
      const specialCreditCount = credits.length
      const requiredCount = cat.count ?? 1
      const totalCompleted = Math.min(completedInCat.length + specialCreditCount, requiredCount)
      const totalWithScheduled = totalCompleted + Math.min(scheduledInCat.length, requiredCount - totalCompleted)

      let status = ''
      if (totalCompleted >= requiredCount) {
        status = '✓ Complete'
      } else if (totalWithScheduled >= requiredCount) {
        status = 'Scheduled'
      } else {
        status = `${totalCompleted}/${requiredCount}`
      }

      drawRow(cat.name, status, completedInCat.slice(0, requiredCount), scheduledInCat, credits)
    }
  }

  // General Electives
  let generalCompleted: string[]

  if (generalElectives) {
    // Use explicitly provided general electives
    generalCompleted = generalElectives
  } else {
    // Fallback: infer general electives
    const electiveCats = degreeWithElectives.electives?.categories.flatMap((cat: { category: string }) =>
      courses.filter((c) => c.category === cat.category && !requiredCategoryCourses.includes(c.code)).map((c) => c.code)
    ) ?? []
    generalCompleted = studentData.completedCourses.filter((c: string) => {
      if (requiredCategoryCourses.includes(c)) return false
      if (isFlexibleCourse(c)) {
        const assignedCategory = studentData.courseCategories?.[c as keyof typeof studentData.courseCategories] as FlexibleCourseCategory | undefined
        return assignedCategory === 'generalElectives'
      }
      return !electiveCats.includes(c)
    })
  }
  const generalScheduled = scheduledByCategory['generalElectives'] || []
  const generalCredits = specialCreditsByCategory['generalElectives'] || []
  const generalRequired = degree.generalElectives.count
  const totalGeneral = generalCompleted.length + generalCredits.length

  let generalStatus = ''
  if (totalGeneral >= generalRequired) {
    generalStatus = '✓ Complete'
  } else if (totalGeneral + generalScheduled.length >= generalRequired) {
    generalStatus = 'Scheduled'
  } else {
    generalStatus = `${totalGeneral}/${generalRequired}`
  }

  drawRow(degree.generalElectives.name, generalStatus, generalCompleted.slice(0, generalRequired), generalScheduled, generalCredits)

  // Draw table borders
  doc.setDrawColor(180)
  doc.line(startX, 44, startX, y - 2)
  doc.line(startX + colWidths.requirement, 44, startX + colWidths.requirement, y - 2)
  doc.line(startX + colWidths.requirement + colWidths.completed, 44, startX + colWidths.requirement + colWidths.completed, y - 2)
  doc.line(startX + tableWidth, 44, startX + tableWidth, y - 2)

  // Build semester plan
  y += 10
  checkPageBreak(50)

  // Calculate needed categories for semester plan
  const scheduledCourseCategories: Record<string, string> = {}
  const neededCategoriesForPlan: { category: string; name: string; remaining: number }[] = []
  
  // Process required categories
  for (const cat of degree.required.categories) {
    const completedInCat = studentData.completedCourses.filter((c: string) => cat.courses?.includes(c))
    const scheduledInCat = scheduledByCategory[cat.id] || []
    const credits = specialCreditsByCategory[cat.id] || []
    const specialCreditCount = credits.length
    const requiredCount = cat.selectOne ? 1 : ((cat as { count?: number }).count ?? 1)
    const totalCompleted = completedInCat.length + specialCreditCount
    const totalWithScheduled = totalCompleted + scheduledInCat.length
    
    // Track scheduled course categories
    scheduledInCat.forEach((code: string) => {
      scheduledCourseCategories[code] = cat.name
    })
    
    if (totalWithScheduled < requiredCount) {
      neededCategoriesForPlan.push({
        category: cat.id,
        name: cat.name,
        remaining: requiredCount - totalWithScheduled
      })
    }
  }
  
  // Process elective categories (major only)
  if (degreeWithElectives.electives) {
    for (const cat of degreeWithElectives.electives.categories) {
      const categoryCourseCodes = courses
        .filter((c) => c.category === cat.category && !requiredCategoryCourses.includes(c.code))
        .map((c) => c.code)
      const completedInCat = studentData.completedCourses.filter((c: string) => {
        if (!categoryCourseCodes.includes(c)) return false
        if (generalElectives && generalElectives.includes(c)) return false
        if (isFlexibleCourse(c)) {
          const assignedCategory = studentData.courseCategories?.[c as keyof typeof studentData.courseCategories] as FlexibleCourseCategory | undefined
          return assignedCategory === cat.id
        }
        return true
      })
      const scheduledInCat = scheduledByCategory[cat.id] || []
      const credits = specialCreditsByCategory[cat.id] || []
      const specialCreditCount = credits.length
      const requiredCount = cat.count ?? 1
      const totalCompleted = Math.min(completedInCat.length + specialCreditCount, requiredCount)
      const totalWithScheduled = totalCompleted + Math.min(scheduledInCat.length, requiredCount - totalCompleted)
      
      scheduledInCat.forEach((code: string) => {
        scheduledCourseCategories[code] = cat.name
      })
      
      if (totalWithScheduled < requiredCount) {
        neededCategoriesForPlan.push({
          category: cat.id,
          name: cat.name,
          remaining: requiredCount - totalWithScheduled
        })
      }
    }
  }
  
  // General electives needed
  if (totalGeneral + generalScheduled.length < generalRequired) {
    neededCategoriesForPlan.push({
      category: 'generalElectives',
      name: degree.generalElectives.name,
      remaining: generalRequired - totalGeneral - generalScheduled.length
    })
  }
  generalScheduled.forEach((code: string) => {
    scheduledCourseCategories[code] = degree.generalElectives.name
  })
  
  // Build and draw semester plan
  const semesterPlan = buildSemesterPlan(
    studentData.scheduledCourses,
    scheduledCourseCategories,
    neededCategoriesForPlan,
    studentData.expectedGraduation
  )
  
  if (semesterPlan.length > 0) {
    // Section header
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Suggested Semester Plan', margin, y)
    y += 6
    
    // Calculate column widths based on number of semesters
    const semesterColWidth = Math.min(40, (tableWidth - 5) / semesterPlan.length)
    
    // Draw header row
    doc.setFillColor(240, 240, 240)
    doc.rect(startX, y - 4, semesterPlan.length * semesterColWidth, 8, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    
    semesterPlan.forEach((sem, idx) => {
      doc.text(sem.semester, startX + idx * semesterColWidth + 2, y)
    })
    y += 6
    
    // Find max courses in any semester
    const maxRows = Math.max(...semesterPlan.map(s => s.courses.length), 1)
    
    // Draw course rows
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)
    
    for (let row = 0; row < maxRows; row++) {
      checkPageBreak(10)
      
      semesterPlan.forEach((sem, idx) => {
        const course = sem.courses[row]
        if (course) {
          const xPos = startX + idx * semesterColWidth + 2
          if (course.code === '—') {
            doc.setTextColor(120)
          } else {
            doc.setTextColor(0, 100, 180) // Blue for scheduled
          }
          doc.text(course.code, xPos, y)
          doc.setTextColor(100)
          // Truncate category name to fit
          const catText = course.category.length > 10 ? course.category.substring(0, 9) + '…' : course.category
          doc.text(catText, xPos, y + 3)
          doc.setTextColor(0)
        }
      })
      y += 8
    }
    
    // Draw border around plan
    doc.setDrawColor(200)
    const planHeight = 6 + maxRows * 8 + 2
    doc.rect(startX, y - planHeight - 4, semesterPlan.length * semesterColWidth, planHeight, 'S')
    
    // Disclaimer
    y += 2
    doc.setFontSize(6)
    doc.setTextColor(120)
    doc.text('— indicates course to be determined. Plan is a suggestion only.', margin, y)
    doc.setTextColor(0)
  }

  // Footer
  const footerY = 275
  doc.setFontSize(8)
  doc.setTextColor(120)
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  doc.text(`Generated: ${today}`, margin, footerY)
  doc.setFontSize(7)
  doc.text('Disclaimer: For planning purposes only. Use Stellic for official degree auditing.', margin, footerY + 4)

  // Generate PDF as blob
  const filename = `DCDA_Plan_${studentData.name?.replace(/\s+/g, '_') || 'Student'}_${today.replace(/\s+/g, '_')}.pdf`
  const pdfBlob = doc.output('blob')
  const blobUrl = URL.createObjectURL(pdfBlob)

  return { blobUrl, filename }
}

// Download a PDF from blob URL
export function downloadPdf(blobUrl: string, filename: string): void {
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = filename

  // Check if download attribute is supported (not on iOS Safari)
  if ('download' in link && !/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } else {
    // Fallback for iOS and other mobile browsers - open in new tab
    window.open(blobUrl, '_blank')
  }
}

// Print PDF
export function printPdf(blobUrl: string): void {
  const printWindow = window.open(blobUrl, '_blank')
  if (printWindow) {
    printWindow.addEventListener('load', () => {
      printWindow.print()
    })
  }
}

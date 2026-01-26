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

// Advisor CSV Export - simple format for Power Automate
export function exportAdvisorCSV(studentData: StudentData, progressData: { progressHours: number, totalHours: number, progressPercent: number }): string {
  const timestamp = new Date().toISOString()
  const sanitize = (text: string) => text.replace(/"/g, '""').replace(/[\r\n]+/g, ' | ')

  // CSV with headers matching Excel columns
  const headers = ['Timestamp', 'Name', 'DegreeType', 'ExpectedGraduation', 'ProgressHours', 'TotalHours', 'ProgressPercent', 'CompletedCourses', 'ScheduledCourses', 'SpecialCredits', 'Notes']

  const specialCreditsStr = studentData.specialCredits.length > 0
    ? studentData.specialCredits.map(c => `${c.type}: ${c.description} (${c.countsAs})`).join('; ')
    : ''

  const row = [
    timestamp,
    sanitize(studentData.name || ''),
    studentData.degreeType || '',
    studentData.expectedGraduation || '',
    progressData.progressHours.toString(),
    progressData.totalHours.toString(),
    progressData.progressPercent.toString(),
    studentData.completedCourses.join('; '),
    studentData.scheduledCourses.join('; '),
    sanitize(specialCreditsStr),
    sanitize(studentData.notes || ''),
  ]

  const csvContent = headers.join(',') + '\n' + row.map(v => `"${v}"`).join(',')
  return csvContent
}

export function downloadAdvisorCSV(studentData: StudentData, progressData: { progressHours: number, totalHours: number, progressPercent: number }): string {
  const csvContent = exportAdvisorCSV(studentData, progressData)
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const today = new Date().toISOString().split('T')[0]
  const filename = `DCDA_Record_${studentData.name?.replace(/\s+/g, '_') || 'Student'}_${today}.csv`

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  return filename
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

  // General electives (explicit selections to preserve categorization on re-import)
  if (studentData.generalElectives && studentData.generalElectives.length > 0) {
    lines.push(`generalElectives,${studentData.generalElectives.join(';')}`)
  }
  
  // Notes
  if (studentData.notes) {
    lines.push(`notes,${escapeCSV(studentData.notes)}`)
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
        case 'generalElectives':
          data.generalElectives = value ? value.split(';').filter(Boolean) : []
          break
        case 'notes':
          data.notes = value
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
  doc.rect(0, 0, pageWidth, 40, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('DCDA Advising Plan', margin, 20)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Digital Culture & Data Analytics Program', margin, 27)
  
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  doc.setFontSize(8)
  doc.text(`Generated: ${today}`, margin, 34)

  // Reset text color
  doc.setTextColor(0, 0, 0)
  y = 50

  // Student Info Row
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(77, 28, 141)
  doc.text(`${studentData.name || 'Student Name'}`, margin, y)
  
  y += 6
  doc.setFontSize(10)
  doc.setTextColor(80)
  doc.setFont('helvetica', 'normal')
  
  const degreeText = `DCDA ${studentData.degreeType === 'major' ? 'Major' : 'Minor'}`
  const gradText = studentData.expectedGraduation ? `  |  Expected Graduation: ${studentData.expectedGraduation}` : ''
  const capstoneText = capstoneTarget ? `  |  Capstone Target: ${capstoneTarget}` : ''
  
  doc.text(`${degreeText}${gradText}${capstoneText}`, margin, y)
  
  doc.setTextColor(0)
  y += 15

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

  // Build scheduled courses by category (matching ReviewStep logic)
  const requiredCategoryCourses = degree.required.categories.flatMap((c: { courses?: string[] }) => c.courses ?? [])
  const scheduledByCategory: Record<string, string[]> = {}
  const assignedScheduledCourses = new Set<string>() // Track courses already assigned to avoid double-counting

  // Type for degree with electives
  const degreeWithElectives = degree as typeof degree & { electives?: { categories: Array<{ id: string; name: string; category: string; count?: number }> } }

  // Build a combined list of all categories with their metadata
  type CategoryInfo = {
    id: string
    name: string
    courses: string[]
    required: number
    isElective: boolean
    isGeneralElective: boolean
  }
  const allCategories: CategoryInfo[] = []

  // Add required categories
  for (const cat of degree.required.categories) {
    allCategories.push({
      id: cat.id,
      name: cat.name,
      courses: cat.courses ?? [],
      required: cat.selectOne ? 1 : ((cat as { count?: number }).count ?? 1),
      isElective: false,
      isGeneralElective: false,
    })
  }

  // Add elective categories (major only)
  if (degreeWithElectives.electives) {
    for (const cat of degreeWithElectives.electives.categories) {
      const categoryCourseCodes = courses
        .filter((c) => c.category === cat.category && !requiredCategoryCourses.includes(c.code))
        .map((c) => c.code)
      allCategories.push({
        id: cat.id,
        name: cat.name,
        courses: categoryCourseCodes,
        required: cat.count ?? 1,
        isElective: true,
        isGeneralElective: false,
      })
    }
  }

  // Sort categories: required first, then electives, then general electives (matching ReviewStep)
  allCategories.sort((a, b) => {
    if (a.isGeneralElective) return 1
    if (b.isGeneralElective) return -1
    if (a.isElective && !b.isElective) return 1
    if (!a.isElective && b.isElective) return -1
    return 0
  })

  // Process scheduled courses with double-counting prevention
  for (const cat of allCategories) {
    // Check completion status first
    const completedInCat = studentData.completedCourses.filter((c: string) => {
      if (!cat.courses.includes(c)) return false
      if (generalElectives && generalElectives.includes(c)) return false
      if (isFlexibleCourse(c)) {
        const assignedCategory = studentData.courseCategories?.[c as keyof typeof studentData.courseCategories] as FlexibleCourseCategory | undefined
        return assignedCategory === cat.id
      }
      return true
    })
    const credits = specialCreditsByCategory[cat.id] || []
    const specialCreditCount = credits.length
    const totalCompleted = completedInCat.length + specialCreditCount

    // Only assign scheduled courses if category is not yet satisfied
    const isAlreadySatisfied = totalCompleted >= cat.required
    if (!isAlreadySatisfied) {
      const scheduledInCat = studentData.scheduledCourses.filter((code: string) => {
        if (assignedScheduledCourses.has(code)) return false // Skip already assigned
        if (!cat.courses.includes(code)) return false
        if (isFlexibleCourse(code)) {
          const assignedCategory = studentData.courseCategories?.[code as keyof typeof studentData.courseCategories] as FlexibleCourseCategory | undefined
          return assignedCategory === cat.id
        }
        return true
      })
      if (scheduledInCat.length > 0) {
        scheduledByCategory[cat.id] = scheduledInCat
        // Mark as assigned to prevent double-counting
        scheduledInCat.forEach((code: string) => assignedScheduledCourses.add(code))
      }
    }
  }

  // Table configuration
  const colWidths = { requirement: 55, completed: 55, scheduled: 55 }
  const tableWidth = colWidths.requirement + colWidths.completed + colWidths.scheduled
  const startX = margin

  // Section Title
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(77, 28, 141)
  doc.text('Degree Requirements Checklist', startX, y)
  y += 6

  // Table Header
  checkPageBreak(15)
  doc.setFillColor(245, 245, 245)
  doc.setDrawColor(200)
  doc.rect(startX, y - 5, tableWidth, 9, 'FD')
  
  doc.setTextColor(0)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Requirement', startX + 2, y + 1)
  doc.text('Completed / Credits', startX + colWidths.requirement + 2, y + 1)
  doc.text('Spring 2026 / Future', startX + colWidths.requirement + colWidths.completed + 2, y + 1)
  
  y += 8

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
    const rowHeight = Math.max(maxItems * 6 + 6, 14)

    checkPageBreak(rowHeight + 5)

    // Requirement column
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(77, 28, 141)
    doc.text(reqName, startX + 2, y + 1)
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(120)
    doc.text(reqStatus, startX + 4, y + 6)
    doc.setTextColor(0)

    // Completed column
    doc.setFontSize(8)
    let itemY = y + 1
    for (const code of completedItems) {
      doc.text(`✓ ${code}`, startX + colWidths.requirement + 2, itemY)
      itemY += 5
    }
    // Show credits that count toward this category
    for (const credit of credits) {
      doc.setTextColor(77, 28, 141) // Purple for credits
      const creditText = `[${creditTypeLabels[credit.type]}] ${credit.description.substring(0, 20)}${credit.description.length > 20 ? '...' : ''}`
      doc.text(creditText, startX + colWidths.requirement + 2, itemY)
      doc.setTextColor(0)
      itemY += 5
    }

    // Scheduled column
    itemY = y + 1
    if (isFuture) {
      doc.setTextColor(0, 100, 180) // Blue for future
    }
    for (const code of scheduledItems) {
      doc.text(code, startX + colWidths.requirement + colWidths.completed + 2, itemY)
      itemY += 5
    }
    doc.setTextColor(0)

    y += rowHeight

    // Draw row border
    doc.setDrawColor(230)
    doc.line(startX, y - 3, startX + tableWidth, y - 3)
  }

  // Track overflow courses to add to general electives logic
  const requiredOverflow: string[] = []
  const electiveOverflow: string[] = []

  // Process each requirement category
  for (const cat of degree.required.categories) {
    const completedInCat = studentData.completedCourses.filter((c: string) => cat.courses?.includes(c))
    const credits = specialCreditsByCategory[cat.id] || []
    const scheduledInCat = scheduledByCategory[cat.id] || []
    const specialCreditCount = credits.length
    const requiredCount = cat.selectOne ? 1 : ((cat as { count?: number }).count ?? 1)
    
    // Capture overflow
    if (completedInCat.length > requiredCount) {
      requiredOverflow.push(...completedInCat.slice(requiredCount))
    }

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

    drawRow(cat.name, status, completedInCat.slice(0, requiredCount), displayScheduled, credits, cat.id === 'capstone' && capstoneAutoScheduled)
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
      
      const requiredCount = cat.count ?? 1
      
      // Capture overflow
      if (completedInCat.length > requiredCount) {
        electiveOverflow.push(...completedInCat.slice(requiredCount))
      }

      const scheduledInCat = scheduledByCategory[cat.id] || []
      const credits = specialCreditsByCategory[cat.id] || []
      const specialCreditCount = credits.length
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
    // Use explicitly provided general electives + overflow
    generalCompleted = [...generalElectives, ...requiredOverflow, ...electiveOverflow]
  } else {
    // Fallback: infer general electives
    const electiveCats = degreeWithElectives.electives?.categories.flatMap((cat: { category: string }) =>
      courses.filter((c) => c.category === cat.category && !requiredCategoryCourses.includes(c.code)).map((c) => c.code)
    ) ?? []
    
    const fallbackGeneral = studentData.completedCourses.filter((c: string) => {
      if (requiredCategoryCourses.includes(c)) return false
      if (isFlexibleCourse(c)) {
        const assignedCategory = studentData.courseCategories?.[c as keyof typeof studentData.courseCategories] as FlexibleCourseCategory | undefined
        return assignedCategory === 'generalElectives'
      }
      return !electiveCats.includes(c)
    })
    
    generalCompleted = [...fallbackGeneral, ...requiredOverflow, ...electiveOverflow]
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

  // Build scheduledCourseCategories and neededCategoriesForPlan using allCategories data
  const scheduledCourseCategories: Record<string, string> = {}
  const neededCategoriesForPlan: { category: string; name: string; remaining: number }[] = []

  // Process all categories (already sorted in priority order)
  for (const cat of allCategories) {
    const completedInCat = studentData.completedCourses.filter((c: string) => {
      if (!cat.courses.includes(c)) return false
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
    const totalCompleted = completedInCat.length + specialCreditCount
    const totalWithScheduled = totalCompleted + scheduledInCat.length

    // Track scheduled course categories
    scheduledInCat.forEach((code: string) => {
      scheduledCourseCategories[code] = cat.name
    })

    if (totalWithScheduled < cat.required) {
      neededCategoriesForPlan.push({
        category: cat.id,
        name: cat.name,
        remaining: cat.required - totalWithScheduled
      })
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
    studentData.expectedGraduation,
    studentData.includeSummer || false
  )
  
  if (semesterPlan.length > 0) {
    // Section header
    y += 6
    checkPageBreak(30)
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(77, 28, 141)
    doc.text('Suggested Semester Plan', margin, y)
    y += 6
    
    // Calculate column widths based on number of semesters
    const semesterColWidth = Math.min(45, (tableWidth - 2) / semesterPlan.length)
    
    // Draw header row
    doc.setFillColor(245, 245, 250)
    doc.setDrawColor(200)
    doc.rect(startX, y - 5, semesterPlan.length * semesterColWidth, 9, 'FD')
    doc.setTextColor(0)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    
    semesterPlan.forEach((sem, idx) => {
      doc.text(sem.semester, startX + idx * semesterColWidth + 2, y + 1)
    })
    y += 8
    
    // Find max courses in any semester
    const maxRows = Math.max(...semesterPlan.map(s => s.courses.length), 1)
    
    // Draw course rows
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    
    for (let row = 0; row < maxRows; row++) {
      checkPageBreak(12)
      
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
          doc.setFontSize(6)
          // Truncate category name to fit
          const catText = course.category.length > 15 ? course.category.substring(0, 14) + '…' : course.category
          doc.text(catText, xPos, y + 3)
          doc.setFontSize(7)
          doc.setTextColor(0)
        }
      })
      y += 9
    }
    
    // Draw border around plan
    doc.setDrawColor(200)
    const planHeight = 9 + maxRows * 9 // Header 9 + Rows * 9
    doc.rect(startX, y - planHeight + 5, semesterPlan.length * semesterColWidth, planHeight, 'S')
    
    // Disclaimer
    y += 2
    doc.setFontSize(6)
    doc.setTextColor(120)
    doc.text('— indicates course to be determined. Plan is a suggestion only.', margin, y)
    doc.setTextColor(0)
    y += 7
  }

  // Add Notes section if present
  if (studentData.notes) {
    checkPageBreak(40)
    y += 10
    
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(77, 28, 141)
    doc.text('Notes & Questions', margin, y)
    y += 8
    
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    
    const splitNotes = doc.splitTextToSize(studentData.notes, pageWidth - (margin * 2))
    doc.text(splitNotes, margin, y)
    y += (splitNotes.length * 5)
  }

  // Footer
  const footerY = 275
  doc.setFontSize(8)
  doc.setTextColor(120)
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

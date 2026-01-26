// Course from courses.json
export interface Course {
  code: string
  title: string
  category: 'Digital Culture' | 'Data Analytics' | 'Honors Seminars & Capstone' | 'Multimedia Authoring'
  college: string
  description?: string
}

// Section from offerings-sp26.json
export interface CourseSection {
  code: string
  section: string
  title: string
  schedule: string
  modality: string
  enrollment: string
  status: string
}

export interface CourseOfferings {
  term: string
  updated: string
  offeredCodes: string[]
  sections: CourseSection[]
}

// Requirements from requirements.json
export interface RequirementCategory {
  id: string
  name: string
  hours: number
  courses?: string[]
  selectOne?: boolean
  category?: string
  count?: number
  prerequisites?: string[]
}

export interface RequiredSection {
  name: string
  hours: number
  categories: RequirementCategory[]
}

export interface ElectivesSection {
  name: string
  hours: number
  categories: RequirementCategory[]
}

export interface GeneralElectivesSection {
  name: string
  hours: number
  count: number
  note: string
}

export interface DegreeRequirements {
  name: string
  totalHours: number
  required: RequiredSection
  electives?: ElectivesSection
  generalElectives: GeneralElectivesSection
}

export interface EnrollmentWarning {
  courses: string[]
  contact: string
  email?: string
  message: string
}

export interface PrerequisiteInfo {
  requires: string[]
  message: string
}

export interface MutuallyExclusiveRule {
  courses: string[]
  message: string
}

export interface Requirements {
  major: DegreeRequirements
  minor: DegreeRequirements
  enrollmentWarnings: Record<string, EnrollmentWarning>
  prerequisites: Record<string, PrerequisiteInfo>
  mutuallyExclusive: MutuallyExclusiveRule[]
}

// Requirement categories that special courses can count toward
export type RequirementCategoryId =
  | 'intro'
  | 'statistics'
  | 'coding'
  | 'mmAuthoring'
  | 'capstone'
  | 'dcElective'
  | 'daElective'
  | 'generalElectives'

// Special credits (transfer, study abroad, one-time approvals)
export interface SpecialCredit {
  id: string
  type: 'transfer' | 'study-abroad' | 'one-time-approval'
  description: string
  countsAs: RequirementCategoryId
}

// Category choices for flexible courses (DCDA 40273, DCDA 30970)
export type FlexibleCourseCategory = 'dcElective' | 'daElective' | 'generalElectives'

// Courses that can count toward multiple categories (majors only)
export const FLEXIBLE_COURSES = ['DCDA 40273', 'DCDA 30970'] as const
export type FlexibleCourseCode = typeof FLEXIBLE_COURSES[number]

// Student data (stored in localStorage)
export interface StudentData {
  name: string
  email?: string
  degreeType: 'major' | 'minor' | null
  expectedGraduation: string | null
  completedCourses: string[]
  scheduledCourses: string[] // Courses scheduled for next semester
  specialCredits: SpecialCredit[]
  // Category assignments for flexible courses (DCDA 40273, DCDA 30970) - majors only
  courseCategories?: Partial<Record<FlexibleCourseCode, FlexibleCourseCategory>>
  // Explicit general electives selection (to preserve categorization on CSV re-import)
  generalElectives?: string[]
  // Planning preferences
  includeSummer?: boolean
  notes?: string
}

// Wizard step types
export type WizardPart = 'completed' | 'transition' | 'schedule' | 'review' | 'submit'

export type WizardStepId =
  | 'welcome'
  | 'name'
  | 'graduation'
  | 'intro'
  | 'statistics'
  | 'coding'
  | 'mmAuthoring'
  | 'dcElective'
  | 'daElective'
  | 'generalElectives'
  | 'specialCredits'
  | 'transition'
  | 'schedule'
  | 'reviewSummary'
  | 'reviewActions'

export interface WizardStep {
  id: WizardStepId
  part: WizardPart
  title: string
  categoryId?: RequirementCategoryId // For course selection steps
}

// Wizard state
export interface WizardState {
  currentStepIndex: number
  completedSteps: WizardStepId[]
  // Track which categories user selected "Not yet" for
  unmetCategories: RequirementCategoryId[]
  // Track current scheduling category in Part 2
  scheduleIndex: number
}

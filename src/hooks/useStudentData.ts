import { useState, useEffect, useCallback } from 'react'
import type { StudentData, SpecialCredit, RequirementCategoryId, FlexibleCourseCode, FlexibleCourseCategory } from '@/types'

const STORAGE_KEY = 'dcda-mobile-student-data'

const defaultStudentData: StudentData = {
  name: '',
  degreeType: 'major', // Default to major for mobile wizard
  expectedGraduation: null,
  completedCourses: [],
  scheduledCourses: [],
  specialCredits: [],
  courseCategories: {},
  includeSummer: false,
}

export function useStudentData() {
  const [studentData, setStudentData] = useState<StudentData>(defaultStudentData)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as StudentData
        setStudentData(parsed)
      }
    } catch (error) {
      console.error('Failed to load student data:', error)
    }
    setIsLoaded(true)
  }, [])

  // Save to localStorage whenever data changes
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(studentData))
      } catch (error) {
        console.error('Failed to save student data:', error)
      }
    }
  }, [studentData, isLoaded])

  const updateStudentData = useCallback((updates: Partial<StudentData>) => {
    setStudentData((prev) => ({ ...prev, ...updates }))
  }, [])

  const setCompletedCourse = useCallback((courseCode: string) => {
    setStudentData((prev) => ({
      ...prev,
      completedCourses: prev.completedCourses.includes(courseCode)
        ? prev.completedCourses
        : [...prev.completedCourses, courseCode],
    }))
  }, [])

  const removeCompletedCourse = useCallback((courseCode: string) => {
    setStudentData((prev) => ({
      ...prev,
      completedCourses: prev.completedCourses.filter((c) => c !== courseCode),
    }))
  }, [])

  const setCompletedCourses = useCallback((courses: string[]) => {
    setStudentData((prev) => ({
      ...prev,
      completedCourses: courses,
    }))
  }, [])

  const addScheduledCourse = useCallback((courseCode: string) => {
    setStudentData((prev) => ({
      ...prev,
      scheduledCourses: prev.scheduledCourses.includes(courseCode)
        ? prev.scheduledCourses
        : [...prev.scheduledCourses, courseCode],
    }))
  }, [])

  const removeScheduledCourse = useCallback((courseCode: string) => {
    setStudentData((prev) => ({
      ...prev,
      scheduledCourses: prev.scheduledCourses.filter((c) => c !== courseCode),
    }))
  }, [])

  const addSpecialCredit = useCallback((type: SpecialCredit['type'], description: string, countsAs: RequirementCategoryId) => {
    const credit: SpecialCredit = {
      id: crypto.randomUUID(),
      type,
      description,
      countsAs,
    }
    setStudentData((prev) => ({
      ...prev,
      specialCredits: [...prev.specialCredits, credit],
    }))
  }, [])

  const removeSpecialCredit = useCallback((creditId: string) => {
    setStudentData((prev) => ({
      ...prev,
      specialCredits: prev.specialCredits.filter((c) => c.id !== creditId),
    }))
  }, [])

  const setCourseCategory = useCallback((courseCode: FlexibleCourseCode, category: FlexibleCourseCategory) => {
    setStudentData((prev) => ({
      ...prev,
      courseCategories: {
        ...prev.courseCategories,
        [courseCode]: category,
      },
    }))
  }, [])

  const resetStudentData = useCallback(() => {
    setStudentData(defaultStudentData)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const importStudentData = useCallback((importedData: Partial<StudentData>) => {
    setStudentData((prev) => ({
      ...prev,
      ...importedData,
      completedCourses: importedData.completedCourses ?? prev.completedCourses,
      scheduledCourses: importedData.scheduledCourses ?? prev.scheduledCourses,
      specialCredits: importedData.specialCredits ?? prev.specialCredits,
      courseCategories: importedData.courseCategories ?? prev.courseCategories,
    }))
  }, [])

  return {
    studentData,
    isLoaded,
    updateStudentData,
    setCompletedCourse,
    removeCompletedCourse,
    setCompletedCourses,
    addScheduledCourse,
    removeScheduledCourse,
    addSpecialCredit,
    removeSpecialCredit,
    setCourseCategory,
    resetStudentData,
    importStudentData,
  }
}

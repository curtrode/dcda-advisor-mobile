import {
  doc,
  setDoc,
  increment,
  arrayUnion,
  collection,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/services/firebase'
import type { StudentData } from '@/types'

// All tracking is anonymous — no student names, emails, or IDs are stored.
// This ensures FERPA compliance while enabling aggregate analytics.
// Skip all analytics on localhost to keep production data clean.
const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

function getTodayId(): string {
  return new Date().toISOString().slice(0, 10) // "2026-02-24"
}

// Stable anonymous session ID — survives within a tab session but not across tabs/refreshes.
// Used to count unique sessions per day without any PII.
function getSessionId(): string {
  let id = sessionStorage.getItem('dcda_session_id')
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem('dcda_session_id', id)
  }
  return id
}

function getNextTerm(): string {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const yy = (y: number) => y.toString().slice(-2)
  if (month >= 8) return `sp${yy(year + 1)}`
  return `fa${yy(year)}`
}

async function generateSessionHash(): Promise<string> {
  const sessionId = crypto.randomUUID()
  const encoder = new TextEncoder()
  const data = encoder.encode(sessionId)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function trackWizardStart(): Promise<void> {
  if (isLocal) return
  try {
    const dayRef = doc(db, 'dcda_analytics', 'daily', 'stats', getTodayId())
    const hour = new Date().getHours().toString()
    await setDoc(
      dayRef,
      {
        wizardStarts: increment(1),
        hourlyStarts: { [hour]: increment(1) },
        sessions: arrayUnion(getSessionId()),
      },
      { merge: true }
    )
  } catch {
    // Analytics failures are silent — never block the student experience
  }
}

export async function trackStepVisit(stepId: string, degreeType?: string): Promise<void> {
  if (isLocal) return
  try {
    const dayRef = doc(db, 'dcda_analytics', 'daily', 'stats', getTodayId())
    await setDoc(
      dayRef,
      {
        stepVisits: { [stepId]: increment(1) },
        ...(degreeType && { [`stepVisits_${degreeType}`]: { [stepId]: increment(1) } }),
      },
      { merge: true }
    )
  } catch {
    // Silent failure
  }
}

// Track export actions (PDF, CSV, print) — anonymous counters only.
// Debounced per session: each method only counts once per page load.
const trackedExports = new Set<string>()

export async function trackExport(
  method: 'pdf' | 'csv' | 'print' | 'email'
): Promise<void> {
  if (isLocal) return
  if (trackedExports.has(method)) return
  trackedExports.add(method)
  try {
    const dayRef = doc(db, 'dcda_analytics', 'daily', 'stats', getTodayId())
    await setDoc(
      dayRef,
      { exports: { [method]: increment(1) } },
      { merge: true }
    )
  } catch {
    // Silent failure
  }
}

// Records an anonymous submission — NO PII is included.
// Only course codes (public catalog data), degree type, and graduation term.
export async function recordAnonymousSubmission(
  studentData: StudentData,
  degreeProgressPct: number
): Promise<void> {
  if (isLocal) return
  try {
    const sessionHash = await generateSessionHash()

    // Write anonymous submission record
    await addDoc(collection(db, 'dcda_submissions'), {
      submittedAt: serverTimestamp(),
      degreeType: studentData.degreeType,
      expectedGraduation: studentData.expectedGraduation,
      completedCourseCodes: studentData.completedCourses,
      scheduledCourseCodes: studentData.scheduledCourses,
      completedCourseCount: studentData.completedCourses.length,
      scheduledCourseCount: studentData.scheduledCourses.length,
      specialCreditCount: studentData.specialCredits.length,
      includeSummer: studentData.includeSummer ?? false,
      hasNotes: !!(studentData.notes && studentData.notes.trim()),
      degreeProgressPct,
      sessionHash,
    })

    // Increment daily completion counter
    const dayRef = doc(db, 'dcda_analytics', 'daily', 'stats', getTodayId())
    await setDoc(dayRef, { wizardCompletions: increment(1) }, { merge: true })

    // Increment course demand counters
    const termId = getNextTerm()
    const demandRef = doc(
      db,
      'dcda_analytics',
      'course_demand',
      'terms',
      termId
    )

    // Build nested maps — setDoc() treats dot-notation keys literally,
    // so we pass actual nested objects for useAnalytics.ts to read correctly.
    const scheduledMap: Record<string, ReturnType<typeof increment>> = {}
    for (const code of studentData.scheduledCourses) {
      scheduledMap[code] = increment(1)
    }
    const completedMap: Record<string, ReturnType<typeof increment>> = {}
    for (const code of studentData.completedCourses) {
      completedMap[code] = increment(1)
    }
    const demandPayload: Record<string, unknown> = {}
    if (Object.keys(scheduledMap).length > 0) demandPayload.scheduled = scheduledMap
    if (Object.keys(completedMap).length > 0) demandPayload.completed = completedMap
    if (Object.keys(demandPayload).length > 0) {
      await setDoc(demandRef, demandPayload, { merge: true })
    }
  } catch {
    // Silent failure — never block the student experience
  }
}

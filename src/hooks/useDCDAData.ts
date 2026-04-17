import { useState, useEffect, createContext, useContext } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/services/firebase'
import { currentTermId } from '@/services/terms'
import type { CourseOfferings } from '@/types'

export interface DCDAData {
  offerings: CourseOfferings | null
  summerOfferings: CourseOfferings | null
  loading: boolean
}

const defaultData: DCDAData = { offerings: null, summerOfferings: null, loading: true }

export const DCDADataContext = createContext<DCDAData>(defaultData)

export function useDCDAData(): DCDAData {
  return useContext(DCDADataContext)
}

/** Subscribes to Firestore offerings docs and returns live data with static fallback */
export function useDCDADataLoader(): DCDAData {
  const [fallOfferings, setFallOfferings] = useState<CourseOfferings | null>(null)
  const [summerOfferings, setSummerOfferings] = useState<CourseOfferings | null>(null)
  const [fallLoaded, setFallLoaded] = useState(false)
  const [summerLoaded, setSummerLoaded] = useState(false)

  useEffect(() => {
    // Resolve the current fall/summer term IDs at mount so the hook keeps
    // working past the Aug 20 / May 10 academic-year rollovers. Falls back
    // silently if the target Firestore doc hasn't been created yet — the
    // admin UI is where terms get provisioned.
    const fallId = currentTermId('fa')
    const summerId = currentTermId('su')

    const unsubFall = onSnapshot(
      doc(db, 'dcda_config', fallId),
      (snap) => {
        setFallOfferings(snap.exists() ? (snap.data() as CourseOfferings) : null)
        setFallLoaded(true)
      },
      () => setFallLoaded(true)
    )

    const unsubSummer = onSnapshot(
      doc(db, 'dcda_config', summerId),
      (snap) => {
        setSummerOfferings(snap.exists() ? (snap.data() as CourseOfferings) : null)
        setSummerLoaded(true)
      },
      () => setSummerLoaded(true)
    )

    return () => { unsubFall(); unsubSummer() }
  }, [])

  return {
    offerings: fallOfferings,
    summerOfferings,
    loading: !fallLoaded || !summerLoaded,
  }
}

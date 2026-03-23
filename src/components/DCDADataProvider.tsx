import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { DCDADataContext, useDCDADataLoader } from '@/hooks/useDCDAData'
import { updateOfferings, updateSummerOfferings } from '@/services/courses'

interface DCDADataProviderProps {
  children: ReactNode
}

export function DCDADataProvider({ children }: DCDADataProviderProps) {
  const data = useDCDADataLoader()

  // Sync Firestore offerings to the module-level course service
  useEffect(() => {
    if (!data.loading && data.offerings) {
      updateOfferings(data.offerings)
    }
  }, [data.loading, data.offerings])

  useEffect(() => {
    if (!data.loading && data.summerOfferings) {
      updateSummerOfferings(data.summerOfferings)
    }
  }, [data.loading, data.summerOfferings])

  return (
    <DCDADataContext.Provider value={data}>
      {children}
    </DCDADataContext.Provider>
  )
}

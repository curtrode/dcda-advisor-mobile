import { useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'
import { parseCSVImport } from '@/services/export'
import type { StudentData } from '@/types'

interface NameStepProps {
  value: string
  onChange: (name: string) => void
  onNext?: () => void
  onImport?: (data: Partial<StudentData>) => void
}

export function NameStep({ value, onChange, onNext, onImport }: NameStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [importMessage, setImportMessage] = useState<string>('')

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Trigger next on Enter or Tab (if name is not empty)
    if ((e.key === 'Enter' || e.key === 'Tab') && value.trim() && onNext) {
      e.preventDefault()
      onNext()
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const importedData = parseCSVImport(text)

      if (importedData && onImport) {
        onImport(importedData)
        setImportStatus('success')
        setImportMessage(`Successfully imported data for ${importedData.name || 'student'}`)
        setTimeout(() => {
          setImportStatus('idle')
          setImportMessage('')
        }, 3000)
      } else {
        setImportStatus('error')
        setImportMessage('Invalid CSV file format')
        setTimeout(() => {
          setImportStatus('idle')
          setImportMessage('')
        }, 3000)
      }
    } catch (error) {
      setImportStatus('error')
      setImportMessage('Failed to read CSV file')
      setTimeout(() => {
        setImportStatus('idle')
        setImportMessage('')
      }, 3000)
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">What's your name?</h2>
        <p className="text-sm text-muted-foreground">
          This is used for your advising plan export only.
        </p>
      </div>

      <Input
        type="text"
        placeholder="Enter your name"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
      />

      <div className="pt-4 border-t">
        <p className="text-sm text-muted-foreground mb-3">
          Have a previously saved plan? Import it here.
        </p>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start gap-3"
          onClick={handleImportClick}
        >
          <Upload className="size-4" />
          Import from CSV
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
        />
        {importStatus !== 'idle' && (
          <p className={`text-sm mt-2 ${importStatus === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {importMessage}
          </p>
        )}
      </div>
    </div>
  )
}

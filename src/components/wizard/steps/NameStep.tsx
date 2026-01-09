import { Input } from '@/components/ui/input'

interface NameStepProps {
  value: string
  onChange: (name: string) => void
  onNext?: () => void
}

export function NameStep({ value, onChange, onNext }: NameStepProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Trigger next on Enter or Tab (if name is not empty)
    if ((e.key === 'Enter' || e.key === 'Tab') && value.trim() && onNext) {
      e.preventDefault()
      onNext()
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
    </div>
  )
}

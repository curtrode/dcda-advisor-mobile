import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { GraduationCap, BookOpen } from 'lucide-react'

interface NameStepProps {
  value: string
  degreeType: 'major' | 'minor' | null
  onChange: (name: string) => void
  onDegreeTypeChange: (type: 'major' | 'minor') => void
  onNext?: () => void
}

export function NameStep({ value, degreeType, onChange, onDegreeTypeChange, onNext }: NameStepProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Trigger next on Enter or Tab (if name is not empty and degree type selected)
    if ((e.key === 'Enter' || e.key === 'Tab') && value.trim() && degreeType && onNext) {
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

      <div>
        <h3 className="text-lg font-medium mb-3">Are you pursuing a major or minor?</h3>
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant={degreeType === 'major' ? 'default' : 'outline'}
            className={`h-20 flex-col gap-2 ${degreeType === 'major' ? 'ring-2 ring-primary ring-offset-2' : ''}`}
            onClick={() => onDegreeTypeChange('major')}
          >
            <GraduationCap className="h-6 w-6" />
            <span className="font-medium">Major</span>
          </Button>
          <Button
            type="button"
            variant={degreeType === 'minor' ? 'default' : 'outline'}
            className={`h-20 flex-col gap-2 ${degreeType === 'minor' ? 'ring-2 ring-primary ring-offset-2' : ''}`}
            onClick={() => onDegreeTypeChange('minor')}
          >
            <BookOpen className="h-6 w-6" />
            <span className="font-medium">Minor</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

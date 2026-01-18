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

      {/* Requirements Comparison Table */}
      <div className="border rounded-lg overflow-hidden text-sm">
        <table className="w-full">
          <thead>
            <tr className="bg-muted">
              <th className="px-3 py-2 text-left font-medium">Requirement</th>
              <th className="px-3 py-2 text-center font-medium">Major</th>
              <th className="px-3 py-2 text-center font-medium">Minor</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr>
              <td className="px-3 py-2 text-muted-foreground">Total Hours</td>
              <td className="px-3 py-2 text-center font-medium">33</td>
              <td className="px-3 py-2 text-center font-medium">21</td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-muted-foreground">Intro/English</td>
              <td className="px-3 py-2 text-center">1</td>
              <td className="px-3 py-2 text-center">—</td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-muted-foreground">Statistics</td>
              <td className="px-3 py-2 text-center">1</td>
              <td className="px-3 py-2 text-center">1</td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-muted-foreground">Coding</td>
              <td className="px-3 py-2 text-center">1</td>
              <td className="px-3 py-2 text-center">1</td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-muted-foreground">Multimedia Authoring</td>
              <td className="px-3 py-2 text-center">1</td>
              <td className="px-3 py-2 text-center">1</td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-muted-foreground">Capstone</td>
              <td className="px-3 py-2 text-center">1</td>
              <td className="px-3 py-2 text-center">1</td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-muted-foreground">Digital Culture Elective</td>
              <td className="px-3 py-2 text-center">1</td>
              <td className="px-3 py-2 text-center">—</td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-muted-foreground">Data Analytics Elective</td>
              <td className="px-3 py-2 text-center">1</td>
              <td className="px-3 py-2 text-center">—</td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-muted-foreground">Gen Electives</td>
              <td className="px-3 py-2 text-center">4</td>
              <td className="px-3 py-2 text-center">3</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

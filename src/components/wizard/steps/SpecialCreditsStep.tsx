import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, X } from 'lucide-react'
import type { SpecialCredit, RequirementCategoryId } from '@/types'
import { categoryNames } from '@/services/courses'

interface SpecialCreditsStepProps {
  credits: SpecialCredit[]
  onAddCredit: (type: SpecialCredit['type'], description: string, countsAs: RequirementCategoryId) => void
  onRemoveCredit: (creditId: string) => void
}

const creditTypeLabels: Record<SpecialCredit['type'], string> = {
  'transfer': 'Transfer Credit',
  'study-abroad': 'Study Abroad',
  'one-time-approval': 'One-Time Approval',
}

export function SpecialCreditsStep({ credits, onAddCredit, onRemoveCredit }: SpecialCreditsStepProps) {
  const [showForm, setShowForm] = useState(false)
  const [type, setType] = useState<SpecialCredit['type']>('transfer')
  const [description, setDescription] = useState('')
  // Previously we allowed selecting a category, but now we default to generalElectives for simplicity
  const countsAs: RequirementCategoryId = 'generalElectives'

  const handleAdd = () => {
    if (description.trim()) {
      onAddCredit(type, description.trim(), countsAs)
      setDescription('')
      setShowForm(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Any special credits?</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Add transfer credits, study abroad courses, or one-time approvals.
        </p>
        <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground border border-neutral-200 dark:border-neutral-800">
           <p className="mb-2"><span className="font-semibold text-primary">Note:</span> For simplicity, all special credits are added as <strong>General Electives</strong> in this tool.</p>
           <p>If you believe a credit should count toward a specific requirement (like Statistics or Coding), please <strong>consult your advisor</strong> to verify and update your official degree plan.</p>
        </div>
      </div>

      {/* Existing Credits */}
      {credits.length > 0 && (
        <div className="space-y-2">
          {credits.map((credit) => (
            <div
              key={credit.id}
              className="flex items-center gap-3 p-3 bg-card border rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{credit.description}</div>
                <div className="text-xs text-muted-foreground">
                  {creditTypeLabels[credit.type]} → {categoryNames[credit.countsAs]}
                </div>
              </div>
              <button
                onClick={() => onRemoveCredit(credit.id)}
                className="p-1 text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Form */}
      {showForm ? (
        <div className="space-y-4 p-4 bg-muted rounded-xl">
          <div>
            <label className="text-sm font-medium mb-2 block">Credit Type</label>
            <Select value={type} onValueChange={(v) => setType(v as SpecialCredit['type'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transfer">Transfer Credit</SelectItem>
                <SelectItem value="study-abroad">Study Abroad</SelectItem>
                <SelectItem value="one-time-approval">One-Time Approval</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Course/Description</label>
            <Input
              placeholder="e.g., COMM 101 from Other University"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowForm(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!description.trim()} className="flex-1">
              Add
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() => setShowForm(true)}
          className="w-full border-dashed"
        >
          <Plus className="size-4 mr-2" />
          Add Special Credit
        </Button>
      )}

      {credits.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground text-center py-2">
          No special credits added. You can skip this step if none apply.
        </p>
      )}
    </div>
  )
}

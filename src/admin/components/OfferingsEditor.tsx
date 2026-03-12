import { useState, useMemo } from 'react'
import { useFirestoreDoc } from '../hooks/useFirestoreData'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Search, Upload, Download } from 'lucide-react'
import type { Course, CourseSection, CourseOfferings } from '@/types'

export function OfferingsEditor() {
  const [termId, setTermId] = useState('offerings_fa26')
  const [showNewTerm, setShowNewTerm] = useState(false)
  const { data, loading, error, save } = useFirestoreDoc<CourseOfferings>(
    'dcda_config',
    termId
  )
  const coursesDoc = useFirestoreDoc<{ courses: Course[] }>('dcda_config', 'courses')
  const allCourses = useMemo(() => coursesDoc.data?.courses ?? [], [coursesDoc.data])

  const [search, setSearch] = useState('')
  const [editingSection, setEditingSection] = useState<CourseSection | null>(null)
  const [isNewSection, setIsNewSection] = useState(false)

  const offerings = data ?? { term: '', updated: '', offeredCodes: [], sections: [] }

  const filteredCourses = useMemo(() => {
    if (!search) return allCourses
    const q = search.toLowerCase()
    return allCourses.filter(
      (c) => c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q)
    )
  }, [allCourses, search])

  const toggleOffered = async (code: string) => {
    const newCodes = offerings.offeredCodes.includes(code)
      ? offerings.offeredCodes.filter((c) => c !== code)
      : [...offerings.offeredCodes, code].sort()
    await save({
      ...offerings,
      offeredCodes: newCodes,
      updated: new Date().toISOString().slice(0, 10),
    })
  }

  const handleSaveSection = async (section: CourseSection) => {
    const newSections = isNewSection
      ? [...offerings.sections, section]
      : offerings.sections.map((s) =>
          s.code === section.code && s.section === section.section ? section : s
        )
    await save({
      ...offerings,
      sections: newSections,
      updated: new Date().toISOString().slice(0, 10),
    })
    setEditingSection(null)
    setIsNewSection(false)
  }

  const handleDeleteSection = async (code: string, sectionNum: string) => {
    const newSections = offerings.sections.filter(
      (s) => !(s.code === code && s.section === sectionNum)
    )
    await save({
      ...offerings,
      sections: newSections,
      updated: new Date().toISOString().slice(0, 10),
    })
  }

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(offerings, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${termId}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const imported = JSON.parse(text) as CourseOfferings
        if (!imported.term || !Array.isArray(imported.offeredCodes)) {
          alert('Invalid offerings JSON format')
          return
        }
        await save(imported)
      } catch {
        alert('Failed to parse JSON file')
      }
    }
    input.click()
  }

  const handleCreateTerm = async (newTermId: string, termLabel: string) => {
    setTermId(newTermId)
    setShowNewTerm(false)
    // Will create an empty document on first save
    await save({
      term: termLabel,
      updated: new Date().toISOString().slice(0, 10),
      offeredCodes: [],
      sections: [],
    })
  }

  if (loading || coursesDoc.loading) {
    return <div className="text-muted-foreground py-12 text-center">Loading offerings...</div>
  }

  if (error) {
    return <div className="text-destructive py-12 text-center">{error}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Offerings</h2>
          <select
            value={termId}
            onChange={(e) => setTermId(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm bg-card"
          >
            <option value="offerings_sp26">Spring 2026</option>
            <option value="offerings_su26">Summer 2026</option>
            <option value="offerings_fa26">Fall 2026</option>
          </select>
          <Button variant="outline" size="sm" onClick={() => setShowNewTerm(true)}>
            <Plus className="size-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1">
            <Download className="size-4" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={handleImport} className="gap-1">
            <Upload className="size-4" />
            Import
          </Button>
        </div>
      </div>

      {offerings.term && (
        <p className="text-sm text-muted-foreground">
          {offerings.term} — Last updated: {offerings.updated} — {offerings.offeredCodes.length} courses offered
        </p>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search courses to toggle..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-10 text-sm"
        />
      </div>

      {/* Course Toggle Grid */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="w-12 px-4 py-2">Offered</th>
              <th className="text-left px-4 py-2 font-medium">Code</th>
              <th className="text-left px-4 py-2 font-medium">Title</th>
              <th className="text-left px-4 py-2 font-medium hidden md:table-cell">Sections</th>
            </tr>
          </thead>
          <tbody>
            {filteredCourses.map((course) => {
              const isOffered = offerings.offeredCodes.includes(course.code)
              const sectionCount = offerings.sections.filter(
                (s) => s.code === course.code
              ).length
              return (
                <tr
                  key={course.code}
                  className={`border-t hover:bg-muted/30 ${isOffered ? 'bg-primary/5' : ''}`}
                >
                  <td className="px-4 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={isOffered}
                      onChange={() => toggleOffered(course.code)}
                      className="size-4"
                    />
                  </td>
                  <td className="px-4 py-2 font-mono">{course.code}</td>
                  <td className="px-4 py-2">{course.title}</td>
                  <td className="px-4 py-2 hidden md:table-cell text-muted-foreground">
                    {isOffered && (
                      <span>
                        {sectionCount} section{sectionCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Sections for Offered Courses */}
      {offerings.offeredCodes.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Section Details</h3>
            <Button
              size="sm"
              className="gap-1"
              onClick={() => {
                setEditingSection({
                  code: offerings.offeredCodes[0],
                  section: '',
                  title: '',
                  schedule: '',
                  modality: '',
                  enrollment: '',
                })
                setIsNewSection(true)
              }}
            >
              <Plus className="size-4" />
              Add Section
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Course</th>
                  <th className="text-left px-4 py-2 font-medium">Title</th>
                  <th className="text-left px-4 py-2 font-medium">Section</th>
                  <th className="text-left px-4 py-2 font-medium hidden md:table-cell">Schedule</th>
                  <th className="text-left px-4 py-2 font-medium hidden md:table-cell">Modality</th>
                  <th className="w-20 px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {offerings.sections.map((s) => (
                  <tr key={`${s.code}-${s.section}`} className="border-t">
                    <td className="px-4 py-2 font-mono">{s.code}</td>
                    <td className="px-4 py-2">{s.title}</td>
                    <td className="px-4 py-2">{s.section}</td>
                    <td className="px-4 py-2 hidden md:table-cell">{s.schedule}</td>
                    <td className="px-4 py-2 hidden md:table-cell">{s.modality}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1 justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSection({ ...s })
                            setIsNewSection(false)
                          }}
                          className="p-1.5 rounded hover:bg-muted"
                        >
                          <Pencil className="size-3.5 text-muted-foreground" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSection(s.code, s.section)}
                          className="p-1.5 rounded hover:bg-destructive/10"
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {offerings.sections.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      No sections added yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Section Edit Dialog */}
      {editingSection && (
        <SectionEditDialog
          section={editingSection}
          isNew={isNewSection}
          offeredCodes={offerings.offeredCodes}
          onSave={handleSaveSection}
          onClose={() => {
            setEditingSection(null)
            setIsNewSection(false)
          }}
        />
      )}

      {/* New Term Dialog */}
      <Dialog open={showNewTerm} onOpenChange={setShowNewTerm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create New Term</DialogTitle>
          </DialogHeader>
          <NewTermForm
            onSubmit={handleCreateTerm}
            onCancel={() => setShowNewTerm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SectionEditDialog({
  section,
  isNew,
  offeredCodes,
  onSave,
  onClose,
}: {
  section: CourseSection
  isNew: boolean
  offeredCodes: string[]
  onSave: (section: CourseSection) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState<CourseSection>({ ...section })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!form.code || !form.section) return
    setSaving(true)
    try {
      await onSave(form)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Add Section' : 'Edit Section'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Course</label>
            <select
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              disabled={!isNew}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-card"
            >
              {offeredCodes.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Section #</label>
            <Input
              value={form.section}
              onChange={(e) => setForm({ ...form, section: e.target.value })}
              placeholder="001"
              className="h-10 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Title</label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="h-10 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Schedule</label>
            <Input
              value={form.schedule}
              onChange={(e) => setForm({ ...form, schedule: e.target.value })}
              placeholder="MWF 9:30-10:20"
              className="h-10 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">Modality</label>
              <select
                value={form.modality}
                onChange={(e) => setForm({ ...form, modality: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-card"
              >
                <option value="">Select...</option>
                <option value="Face to Face">Face to Face</option>
                <option value="Online">Online</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Enrollment</label>
              <Input
                value={form.enrollment}
                onChange={(e) => setForm({ ...form, enrollment: e.target.value })}
                placeholder="12/25"
                className="h-10 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={saving || !form.code || !form.section}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function NewTermForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (termId: string, label: string) => void
  onCancel: () => void
}) {
  const [season, setSeason] = useState('fa')
  const [year, setYear] = useState('26')

  const termId = `offerings_${season}${year}`
  const label = `${season === 'sp' ? 'Spring' : season === 'su' ? 'Summer' : 'Fall'} 20${year}`

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium block mb-1">Season</label>
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm bg-card"
          >
            <option value="sp">Spring</option>
            <option value="su">Summer</option>
            <option value="fa">Fall</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">Year (2-digit)</label>
          <Input
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="26"
            maxLength={2}
            className="h-10 text-sm"
          />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Will create: <strong>{label}</strong> ({termId})
      </p>
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button className="flex-1" onClick={() => onSubmit(termId, label)}>
          Create Term
        </Button>
      </div>
    </div>
  )
}

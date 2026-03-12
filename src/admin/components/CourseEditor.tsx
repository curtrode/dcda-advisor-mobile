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
import type { Course } from '@/types'

const CATEGORIES: Course['category'][] = [
  'Digital Culture',
  'Data Analytics',
  'Honors Seminars & Capstone',
  'Multimedia Authoring',
]

interface CoursesDoc {
  courses: Course[]
}

export function CourseEditor() {
  const { data, loading, error, save } = useFirestoreDoc<CoursesDoc>(
    'dcda_config',
    'courses'
  )
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  const courses = useMemo(() => data?.courses ?? [], [data])

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      const matchesSearch =
        !search ||
        c.code.toLowerCase().includes(search.toLowerCase()) ||
        c.title.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [courses, search, categoryFilter])

  const handleSaveCourse = async (course: Course) => {
    const updated = isNew
      ? [...courses, course]
      : courses.map((c) => (c.code === course.code ? course : c))
    await save({ courses: updated })
    setEditingCourse(null)
    setIsNew(false)
  }

  const handleDelete = async (code: string) => {
    const updated = courses.filter((c) => c.code !== code)
    await save({ courses: updated })
    setShowDeleteConfirm(null)
  }

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(courses, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'courses.json'
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
        const imported = JSON.parse(text) as Course[]
        if (!Array.isArray(imported) || !imported[0]?.code) {
          alert('Invalid courses JSON format')
          return
        }
        await save({ courses: imported })
      } catch {
        alert('Failed to parse JSON file')
      }
    }
    input.click()
  }

  if (loading) {
    return <div className="text-muted-foreground py-12 text-center">Loading courses...</div>
  }

  if (error) {
    return <div className="text-destructive py-12 text-center">{error}</div>
  }

  if (courses.length === 0) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-muted-foreground">
          No courses in Firestore yet. Import your existing courses.json to get started.
        </p>
        <Button onClick={handleImport} className="gap-2">
          <Upload className="size-4" />
          Import courses.json
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Courses ({courses.length})</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1">
            <Download className="size-4" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={handleImport} className="gap-1">
            <Upload className="size-4" />
            Import
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingCourse({ code: '', title: '', category: 'Digital Culture', college: '' })
              setIsNew(true)
            }}
            className="gap-1"
          >
            <Plus className="size-4" />
            Add
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 text-sm"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm bg-card"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Course Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Code</th>
              <th className="text-left px-4 py-2 font-medium">Title</th>
              <th className="text-left px-4 py-2 font-medium hidden md:table-cell">Category</th>
              <th className="text-left px-4 py-2 font-medium hidden md:table-cell">College</th>
              <th className="w-24 px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((course) => (
              <tr key={course.code} className="border-t hover:bg-muted/30">
                <td className="px-4 py-2 font-mono">{course.code}</td>
                <td className="px-4 py-2">{course.title}</td>
                <td className="px-4 py-2 hidden md:table-cell text-muted-foreground">
                  {course.category}
                </td>
                <td className="px-4 py-2 hidden md:table-cell text-muted-foreground">
                  {course.college}
                </td>
                <td className="px-4 py-2">
                  <div className="flex gap-1 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCourse({ ...course })
                        setIsNew(false)
                      }}
                      className="p-1.5 rounded hover:bg-muted transition-colors"
                    >
                      <Pencil className="size-3.5 text-muted-foreground" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(course.code)}
                      className="p-1.5 rounded hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No courses match your search.
          </div>
        )}
      </div>

      {/* Edit/Add Dialog */}
      {editingCourse && (
        <CourseEditDialog
          course={editingCourse}
          isNew={isNew}
          existingCodes={courses.map((c) => c.code)}
          onSave={handleSaveCourse}
          onClose={() => {
            setEditingCourse(null)
            setIsNew(false)
          }}
        />
      )}

      {/* Delete Confirmation */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Course?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Remove <strong>{showDeleteConfirm}</strong> from the catalog? This cannot be undone.
          </p>
          <div className="flex gap-2 mt-4">
            <Button variant="secondary" className="flex-1" onClick={() => setShowDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CourseEditDialog({
  course,
  isNew,
  existingCodes,
  onSave,
  onClose,
}: {
  course: Course
  isNew: boolean
  existingCodes: string[]
  onSave: (course: Course) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState<Course>({ ...course })
  const [saving, setSaving] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!form.code.trim() || !form.title.trim()) return
    if (isNew && existingCodes.includes(form.code)) {
      setCodeError('A course with this code already exists')
      return
    }
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
          <DialogTitle>{isNew ? 'Add Course' : `Edit ${course.code}`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Course Code</label>
            <Input
              value={form.code}
              onChange={(e) => {
                setForm({ ...form, code: e.target.value.toUpperCase() })
                setCodeError(null)
              }}
              placeholder="DEPT NNNNN"
              disabled={!isNew}
              className="h-10 text-sm font-mono"
            />
            {codeError && <p className="text-xs text-destructive mt-1">{codeError}</p>}
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Title</label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Course title"
              className="h-10 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value as Course['category'] })
              }
              className="w-full border rounded-lg px-3 py-2 text-sm bg-card"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">College</label>
            <Input
              value={form.college}
              onChange={(e) => setForm({ ...form, college: e.target.value })}
              placeholder="e.g., ADRN, Fine Arts"
              className="h-10 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Description (optional)</label>
            <textarea
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value || undefined })}
              placeholder="Course description..."
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-card resize-none"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={saving || !form.code.trim() || !form.title.trim()}
            >
              {saving ? 'Saving...' : isNew ? 'Add Course' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

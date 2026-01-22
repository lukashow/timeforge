import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, Download, Upload, Loader2, Search, Filter } from 'lucide-react'
import { teachers as teachersApi, subjects as subjectsApi, excel as excelApi } from '@/lib/api'
import type { Teacher, Subject } from '@/lib/api'
import { WEEKDAYS } from '@/constants/weekdays'
import { PERIODS } from '@/constants/periods'
import * as XLSX from 'xlsx'

export function TeachersPage() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  
  // Filter states
  const [teacherFilter, setTeacherFilter] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([])
  
  // Dialog states
  const [showDialog, setShowDialog] = useState(false)
  const [showUnavailableDialog, setShowUnavailableDialog] = useState(false)
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)
  const [newTeacher, setNewTeacher] = useState({ name: '', subject: '', weeklyLoad: 25 })
  
  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importResult, setImportResult] = useState<{ show: boolean; success: number; errors: string[] } | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [teachersData, subjectsData] = await Promise.all([
        teachersApi.getAll(),
        subjectsApi.getAll(),
      ])
      setTeachers(teachersData)
      setSubjects(subjectsData)
    } catch (err) {
      setError(t('resources.error_load'))
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = () => {
    const url = excelApi.downloadTeachersTemplate()
    const a = document.createElement('a')
    a.href = url
    a.download = 'teachers_template.xlsx'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleExcelImport = async (file: File) => {
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })
      
      const result = await excelApi.importTeachers(rows as string[][])
      if (result.success.length > 0) {
        const refreshed = await teachersApi.getAll()
        setTeachers(refreshed)
      }
      
      setImportResult({
        show: true,
        success: result.success.length,
        errors: result.errors.map(e => `行 ${e.row}: ${e.error}`)
      })
    } catch (err) {
      console.error('Import failed:', err)
      setImportResult({ show: true, success: 0, errors: ['文件解析失败'] })
    }
  }

  const addTeacher = async () => {
    if (newTeacher.name && newTeacher.subject) {
      try {
        const created = await teachersApi.create({
          name: newTeacher.name,
          subject: newTeacher.subject,
          weeklyLoad: newTeacher.weeklyLoad,
          unavailable: [],
        })
        setTeachers([...teachers, created])
        setNewTeacher({ name: '', subject: '', weeklyLoad: 25 })
        setShowDialog(false)
      } catch (err) {
        console.error('Failed to create teacher:', err)
      }
    }
  }

  const removeTeacher = async (id: string) => {
    try {
      await teachersApi.delete(id)
      setTeachers(teachers.filter(t => t.id !== id))
    } catch (err) {
      console.error('Failed to delete teacher:', err)
    }
  }

  const updateTeacherLoad = async (id: string, load: number) => {
    try {
      const updated = await teachersApi.update(id, { weeklyLoad: load })
      setTeachers(teachers.map(t => t.id === id ? updated : t))
    } catch (err) {
      console.error('Failed to update teacher:', err)
    }
  }

  const toggleTeacherSelection = (id: string) => {
    setSelectedTeachers(prev =>
      prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
    )
  }

  const getSubjectById = (id: string) => subjects.find(s => s.id === id)

  const filteredTeachers = teachers.filter(t => {
    const matchesName = t.name.toLowerCase().includes(teacherFilter.toLowerCase())
    const matchesSubject = subjectFilter === 'all' || t.subject === subjectFilter
    return matchesName && matchesSubject
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{t('resources.loading')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={loadData}>{t('common.retry')}</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('pages.teachers', '教师管理')}</h1>
          <p className="text-muted-foreground mt-1">{t('pages.teachers_desc', '管理所有教师信息')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="w-4 h-4 mr-2" />
            {t('resources.download_template')}
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            {t('resources.import_excel')}
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleExcelImport(e.target.files[0])}
          />
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => setShowDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t('resources.add_teacher')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('resources.add_new_teacher')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>{t('resources.name')}</Label>
                  <Input
                    placeholder={t('resources.teacher_placeholder')}
                    value={newTeacher.name}
                    onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>{t('resources.subject')}</Label>
                  <Select value={newTeacher.subject} onValueChange={(value) => setNewTeacher({ ...newTeacher, subject: value })}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder={t('common.select_subject')} />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('resources.weekly_load')}</Label>
                  <Input
                    type="number"
                    min="10"
                    max="35"
                    value={newTeacher.weeklyLoad}
                    onChange={(e) => setNewTeacher({ ...newTeacher, weeklyLoad: parseInt(e.target.value) })}
                    className="mt-2"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowDialog(false)}>{t('common.cancel')}</Button>
                <Button onClick={addTeacher}>{t('common.add')}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold text-foreground">{teachers.length}</div>
          <div className="text-sm text-muted-foreground">{t('dashboard.stat_teachers')}</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-foreground">{subjects.length}</div>
          <div className="text-sm text-muted-foreground">{t('pages.teaching_subjects', '任教科目')}</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-foreground">
            {Math.round(teachers.reduce((acc, t) => acc + t.weeklyLoad, 0) / (teachers.length || 1))}
          </div>
          <div className="text-sm text-muted-foreground">{t('pages.avg_load', '平均周课时')}</div>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('resources.search_teacher')}
              value={teacherFilter}
              onChange={(e) => setTeacherFilter(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('resources.all_subjects')}</SelectItem>
              {subjects.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Teacher Table */}
      <Card className="p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedTeachers.length === filteredTeachers.length && filteredTeachers.length > 0}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedTeachers(filteredTeachers.map(t => t.id))
                    } else {
                      setSelectedTeachers([])
                    }
                  }}
                />
              </TableHead>
              <TableHead>{t('resources.name')}</TableHead>
              <TableHead>{t('resources.subject')}</TableHead>
              <TableHead>{t('resources.weekly_load')}</TableHead>
              <TableHead>{t('resources.unavailable_time')}</TableHead>
              <TableHead className="text-right">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTeachers.map((teacher) => {
              const subject = teacher.expand?.subject || getSubjectById(teacher.subject)
              return (
                <TableRow key={teacher.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedTeachers.includes(teacher.id)}
                      onCheckedChange={() => toggleTeacherSelection(teacher.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{teacher.name}</TableCell>
                  <TableCell>
                    {subject && (
                      <Badge style={{ backgroundColor: subject.color + '20', color: subject.color, borderColor: subject.color }}>
                        {subject.name}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="10"
                      max="35"
                      value={teacher.weeklyLoad}
                      onChange={(e) => updateTeacherLoad(teacher.id, parseInt(e.target.value))}
                      className="w-20"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedTeacher(teacher)
                        setShowUnavailableDialog(true)
                      }}
                    >
                      {teacher.unavailable.length > 0 ? t('resources.count_slots', { count: teacher.unavailable.length }) : t('common.setup')}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeTeacher(teacher.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Unavailable Time Dialog */}
      <Dialog open={showUnavailableDialog} onOpenChange={setShowUnavailableDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('resources.setup_unavailable', { name: selectedTeacher?.name })}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">{t('resources.unavailable_hint')}</p>
            <div className="border rounded-lg overflow-hidden">
              <div className="flex bg-muted border-b">
                <div className="w-20 p-2 text-center text-sm font-medium">{t('resources.period_index')}</div>
                {WEEKDAYS.slice(0, 5).map((day) => (
                  <div key={day} className="flex-1 p-2 text-center text-sm font-medium border-l">{day}</div>
                ))}
              </div>
              {PERIODS.map((period) => (
                <div key={period} className="flex border-b last:border-b-0">
                  <div className="w-20 p-2 text-center text-sm bg-muted">{t('time_grid.period_label', { period })}</div>
                  {WEEKDAYS.slice(0, 5).map((_, dayIndex) => {
                    const isUnavailable = selectedTeacher?.unavailable?.some(
                      (slot: number[]) => slot[0] === dayIndex && slot[1] === period
                    ) ?? false
                    return (
                      <button
                        key={`${dayIndex}-${period}`}
                        className={`flex-1 p-4 border-l transition-colors ${
                          isUnavailable ? 'bg-destructive hover:bg-destructive/80' : 'bg-background hover:bg-accent/10'
                        }`}
                        onClick={() => {
                          if (!selectedTeacher) return
                          const currentUnavailable = selectedTeacher.unavailable || []
                          const slotIndex = currentUnavailable.findIndex(
                            (slot: number[]) => slot[0] === dayIndex && slot[1] === period
                          )
                          let newUnavailable: number[][]
                          if (slotIndex >= 0) {
                            newUnavailable = currentUnavailable.filter((_, i) => i !== slotIndex)
                          } else {
                            newUnavailable = [...currentUnavailable, [dayIndex, period]]
                          }
                          setSelectedTeacher({ ...selectedTeacher, unavailable: newUnavailable })
                        }}
                      >
                        {isUnavailable && <span className="text-white text-xs">✕</span>}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowUnavailableDialog(false)}>{t('common.cancel')}</Button>
            <Button 
              onClick={async () => {
                if (selectedTeacher) {
                  try {
                    await teachersApi.update(selectedTeacher.id, { unavailable: selectedTeacher.unavailable })
                    setTeachers(teachers.map(t => 
                      t.id === selectedTeacher.id ? { ...t, unavailable: selectedTeacher.unavailable } : t
                    ))
                    setShowUnavailableDialog(false)
                  } catch (err) {
                    console.error('Failed to save unavailable times:', err)
                  }
                }
              }}
            >
              {t('common.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Result */}
      <Dialog open={importResult?.show} onOpenChange={(open) => !open && setImportResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('resources.import_result')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Badge className="bg-green-100 text-green-700">{t('resources.import_success', { count: importResult?.success || 0 })}</Badge>
            {importResult?.errors && importResult.errors.length > 0 && (
              <div className="mt-4 max-h-40 overflow-y-auto bg-destructive/10 p-3 rounded">
                {importResult.errors.map((err, i) => (
                  <p key={i} className="text-sm text-destructive">{err}</p>
                ))}
              </div>
            )}
          </div>
          <Button onClick={() => setImportResult(null)} className="w-full">{t('common.confirm')}</Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}

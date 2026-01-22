import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Edit2, Trash2, Download, Upload, Loader2 } from 'lucide-react'
import { subjects as subjectsApi, excel as excelApi } from '@/lib/api'
import type { Subject } from '@/lib/api'
import * as XLSX from 'xlsx'

export function SubjectsPage() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  
  // Dialog states
  const [showDialog, setShowDialog] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [newSubject, setNewSubject] = useState({ name: '', shortName: '', color: '#8B5CF6', requiresLab: false })
  const [deleteConfirm, setDeleteConfirm] = useState<Subject | null>(null)
  
  // File input ref for Excel import
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importResult, setImportResult] = useState<{ show: boolean; success: number; errors: string[] } | null>(null)

  // Load data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await subjectsApi.getAll()
      setSubjects(data)
    } catch (err) {
      setError(t('resources.error_load'))
      console.error('Failed to load subjects:', err)
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = () => {
    const url = excelApi.downloadSubjectsTemplate()
    const a = document.createElement('a')
    a.href = url
    a.download = 'subjects_template.xlsx'
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
      
      const result = await excelApi.importSubjects(rows as string[][])
      if (result.success.length > 0) {
        const refreshed = await subjectsApi.getAll()
        setSubjects(refreshed)
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

  const addSubject = async () => {
    if (newSubject.name && newSubject.shortName) {
      try {
        const created = await subjectsApi.create(newSubject)
        setSubjects([...subjects, created])
        resetForm()
      } catch (err) {
        console.error('Failed to create subject:', err)
      }
    }
  }

  const updateSubject = async () => {
    if (editingSubject && newSubject.name && newSubject.shortName) {
      try {
        const updated = await subjectsApi.update(editingSubject.id, newSubject)
        setSubjects(subjects.map(s => s.id === editingSubject.id ? updated : s))
        resetForm()
      } catch (err) {
        console.error('Failed to update subject:', err)
      }
    }
  }

  const deleteSubject = async (subject: Subject) => {
    try {
      await subjectsApi.delete(subject.id)
      setSubjects(subjects.filter(s => s.id !== subject.id))
      setDeleteConfirm(null)
    } catch (err) {
      console.error('Failed to delete subject:', err)
    }
  }

  const openEdit = (subject: Subject) => {
    setEditingSubject(subject)
    setNewSubject({ 
      name: subject.name, 
      shortName: subject.shortName, 
      color: subject.color, 
      requiresLab: subject.requiresLab 
    })
    setShowDialog(true)
  }

  const resetForm = () => {
    setNewSubject({ name: '', shortName: '', color: '#8B5CF6', requiresLab: false })
    setShowDialog(false)
    setEditingSubject(null)
  }

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
          <h1 className="text-2xl font-bold text-foreground">{t('pages.subjects', '科目管理')}</h1>
          <p className="text-muted-foreground mt-1">{t('pages.subjects_desc', '管理所有科目信息')}</p>
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
          <Dialog open={showDialog} onOpenChange={(open) => !open && resetForm()}>
            <DialogTrigger asChild>
              <Button onClick={() => setShowDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t('resources.add_subject')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingSubject ? t('resources.edit_subject') : t('resources.add_subject_new')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>{t('resources.label_subject_name')}</Label>
                  <Input
                    placeholder={t('resources.placeholder_subject_example')}
                    value={newSubject.name}
                    onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>{t('resources.label_short_name')}</Label>
                  <Input
                    placeholder={t('resources.placeholder_short_example')}
                    value={newSubject.shortName}
                    onChange={(e) => setNewSubject({ ...newSubject, shortName: e.target.value })}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label>{t('resources.label_color')}</Label>
                  <Input
                    type="color"
                    value={newSubject.color}
                    onChange={(e) => setNewSubject({ ...newSubject, color: e.target.value })}
                    className="mt-2 h-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="requiresLab"
                    checked={newSubject.requiresLab}
                    onCheckedChange={(checked) => setNewSubject({ ...newSubject, requiresLab: !!checked })}
                  />
                  <Label htmlFor="requiresLab" className="cursor-pointer">{t('resources.requires_lab')}</Label>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={resetForm}>{t('common.cancel')}</Button>
                <Button onClick={editingSubject ? updateSubject : addSubject}>
                  {editingSubject ? t('common.save') : t('common.add')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold text-foreground">{subjects.length}</div>
          <div className="text-sm text-muted-foreground">{t('dashboard.stat_subjects')}</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-foreground">{subjects.filter(s => s.requiresLab).length}</div>
          <div className="text-sm text-muted-foreground">{t('resources.requires_lab')}</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-foreground">{subjects.filter(s => !s.requiresLab).length}</div>
          <div className="text-sm text-muted-foreground">{t('pages.regular_subjects', '普通科目')}</div>
        </Card>
      </div>

      {/* Subject List */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">{t('resources.subject_list')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {subjects.length > 0 ? subjects.map((subject) => (
            <Card key={subject.id} className="p-4 border-2 hover:border-primary transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-white text-sm"
                    style={{ backgroundColor: subject.color }}
                  >
                    {subject.shortName}
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{subject.name}</h4>
                    <p className="text-xs text-muted-foreground">{subject.shortName}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(subject)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => setDeleteConfirm(subject)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {subject.requiresLab && (
                <Badge variant="secondary" className="bg-blue-50 text-blue-700">{t('resources.requires_lab')}</Badge>
              )}
            </Card>
          )) : (
            <p className="text-muted-foreground col-span-4">{t('resources.no_subjects')}</p>
          )}
        </div>
      </Card>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('resources.confirm_delete_subject')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">{t('resources.delete_subject_msg', { name: deleteConfirm?.name })}</p>
            <p className="text-sm text-destructive mt-2">{t('resources.delete_subject_warning')}</p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteSubject(deleteConfirm)}>
              {t('common.confirm_delete')}
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

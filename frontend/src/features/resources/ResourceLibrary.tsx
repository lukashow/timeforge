import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, Download, Plus, User, BookOpen, Building2, Edit2, Trash2, Search, Filter, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { StepProps } from '@/types/common'
import { WEEKDAYS } from '@/constants/weekdays'
import { PERIODS } from '@/constants/periods'
import { subjects as subjectsApi, teachers as teachersApi, rooms as roomsApi, excel as excelApi } from '@/lib/api'
import type { Subject, Teacher, Room } from '@/lib/api'
import * as XLSX from 'xlsx'

export function ResourceLibrary({ onNext, onBack }: StepProps) {
  // Loading states
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Data states
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [rooms, setRooms] = useState<Room[]>([])

  // Subject dialog states
  const [showSubjectDialog, setShowSubjectDialog] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [newSubject, setNewSubject] = useState({ name: '', shortName: '', color: '#8B5CF6', requiresLab: false })
  const [deleteConfirmSubject, setDeleteConfirmSubject] = useState<Subject | null>(null)

  // Teacher states
  const [showTeacherDialog, setShowTeacherDialog] = useState(false)
  const [showUnavailableDialog, setShowUnavailableDialog] = useState(false)
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)
  const [newTeacher, setNewTeacher] = useState({ name: '', subject: '', weeklyLoad: 25 })
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([])
  const [teacherFilter, setTeacherFilter] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('all')

  // Room states
  const [bulkPrefix, setBulkPrefix] = useState('')
  const [bulkStart, setBulkStart] = useState(1)
  const [bulkEnd, setBulkEnd] = useState(10)

  // File input refs for Excel import
  const subjectsFileInputRef = useRef<HTMLInputElement>(null)
  const teachersFileInputRef = useRef<HTMLInputElement>(null)
  const roomsFileInputRef = useRef<HTMLInputElement>(null)
  
  // Import result state
  const [importResult, setImportResult] = useState<{ show: boolean; type: string; success: number; errors: string[] } | null>(null)

  // Excel download handlers
  const downloadTemplate = (type: 'subjects' | 'teachers' | 'rooms') => {
    const url = type === 'subjects' 
      ? excelApi.downloadSubjectsTemplate() 
      : type === 'teachers' 
        ? excelApi.downloadTeachersTemplate() 
        : excelApi.downloadRoomsTemplate()
    
    // Create anchor element and trigger download
    const a = document.createElement('a')
    a.href = url
    a.download = `${type}_template.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // Excel import handler
  const handleExcelImport = async (type: 'subjects' | 'teachers' | 'rooms', file: File) => {
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })
      
      let result: { success: { id?: string }[]; errors: { row: number; error: string }[] }
      
      if (type === 'subjects') {
        result = await excelApi.importSubjects(rows as string[][])
        if (result.success.length > 0) {
          const refreshed = await subjectsApi.getAll()
          setSubjects(refreshed)
        }
      } else if (type === 'teachers') {
        result = await excelApi.importTeachers(rows as string[][])
        if (result.success.length > 0) {
          const refreshed = await teachersApi.getAll()
          setTeachers(refreshed)
        }
      } else {
        result = await excelApi.importRooms(rows as string[][])
        if (result.success.length > 0) {
          const refreshed = await roomsApi.getAll()
          setRooms(refreshed)
        }
      }
      
      setImportResult({
        show: true,
        type,
        success: result.success.length,
        errors: result.errors.map(e => `行 ${e.row}: ${e.error}`)
      })
    } catch (err) {
      console.error('Import failed:', err)
      setImportResult({
        show: true,
        type,
        success: 0,
        errors: ['文件解析失败，请检查文件格式']
      })
    }
  }

  // Load data from API on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        const [subjectsData, teachersData, roomsData] = await Promise.all([
          subjectsApi.getAll(),
          teachersApi.getAll(),
          roomsApi.getAll(),
        ])
        setSubjects(subjectsData)
        setTeachers(teachersData)
        setRooms(roomsData)
      } catch (err) {
        setError('Failed to load resources. Please check backend connection.')
        console.error('Failed to load resources:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const addSubject = async () => {
    if (newSubject.name && newSubject.shortName) {
      try {
        const created = await subjectsApi.create(newSubject)
        setSubjects([...subjects, created])
        setNewSubject({ name: '', shortName: '', color: '#8B5CF6', requiresLab: false })
        setShowSubjectDialog(false)
        setEditingSubject(null)
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
        setNewSubject({ name: '', shortName: '', color: '#8B5CF6', requiresLab: false })
        setShowSubjectDialog(false)
        setEditingSubject(null)
      } catch (err) {
        console.error('Failed to update subject:', err)
      }
    }
  }

  const deleteSubject = async (subject: Subject) => {
    try {
      await subjectsApi.delete(subject.id)
      setSubjects(subjects.filter(s => s.id !== subject.id))
      setDeleteConfirmSubject(null)
    } catch (err) {
      console.error('Failed to delete subject:', err)
    }
  }

  const openEditSubject = (subject: Subject) => {
    setEditingSubject(subject)
    setNewSubject({
      name: subject.name,
      shortName: subject.shortName,
      color: subject.color,
      requiresLab: subject.requiresLab,
    })
    setShowSubjectDialog(true)
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
        setShowTeacherDialog(false)
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

  const bulkUpdateLoad = (load: number) => {
    selectedTeachers.forEach(id => updateTeacherLoad(id, load))
    setSelectedTeachers([])
  }

  const toggleTeacherSelection = (id: string) => {
    setSelectedTeachers(prev =>
      prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
    )
  }

  const getSubjectById = (id: string) => subjects.find(s => s.id === id)
  
  // For teachers with expanded subject, get from expand
  const getTeacherSubject = (teacher: Teacher) => {
    if (teacher.expand?.subject) return teacher.expand.subject
    return subjects.find(s => s.id === teacher.subject)
  }

  const filteredTeachers = teachers.filter(t => {
    const matchesName = t.name.toLowerCase().includes(teacherFilter.toLowerCase())
    const matchesSubject = subjectFilter === 'all' || t.subject === subjectFilter
    return matchesName && matchesSubject
  })

  const bulkCreateRooms = async () => {
    if (bulkPrefix && bulkStart <= bulkEnd) {
      try {
        const created = await roomsApi.createBulk(bulkPrefix, bulkStart, bulkEnd)
        setRooms([...rooms, ...created])
        setBulkPrefix('')
        setBulkStart(1)
        setBulkEnd(10)
      } catch (err) {
        console.error('Failed to bulk create rooms:', err)
      }
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading resources...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">第二步：录入教学资源</h1>
        <p className="text-gray-600">先创建科目，再添加教师和教室信息</p>
      </div>

      {/* Import Result Dialog */}
      <Dialog open={importResult?.show} onOpenChange={(open) => !open && setImportResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {importResult?.type === 'subjects' ? '科目' : importResult?.type === 'teachers' ? '教师' : '教室'}导入结果
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-2 text-green-600 mb-4">
              <Badge className="bg-green-100 text-green-700">成功导入 {importResult?.success || 0} 条</Badge>
            </div>
            {importResult?.errors && importResult.errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-red-600 font-medium">错误信息:</p>
                <div className="max-h-40 overflow-y-auto bg-red-50 p-3 rounded">
                  {importResult.errors.map((err, i) => (
                    <p key={i} className="text-sm text-red-600">{err}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Button onClick={() => setImportResult(null)} className="w-full">确定</Button>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="subjects" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="subjects" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            科目
          </TabsTrigger>
          <TabsTrigger value="teachers" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            老师
          </TabsTrigger>
          <TabsTrigger value="rooms" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            教室
          </TabsTrigger>
        </TabsList>

        {/* Subjects Tab */}
        <TabsContent value="subjects" className="space-y-6">
          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">科目列表</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-primary border-primary hover:bg-purple-50" onClick={() => downloadTemplate('subjects')}>
                  <Download className="w-4 h-4 mr-2" />
                  下载模板
                </Button>
                <Button size="sm" variant="outline" className="text-primary border-primary hover:bg-purple-50" onClick={() => subjectsFileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  导入 Excel
                </Button>
                <input
                  type="file"
                  ref={subjectsFileInputRef}
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleExcelImport('subjects', e.target.files[0])}
                />
                <Dialog open={showSubjectDialog} onOpenChange={setShowSubjectDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-primary hover:bg-purple-700">
                      <Plus className="w-4 h-4 mr-2" />
                      添加科目
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingSubject ? '编辑科目' : '添加新科目'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>科目名称</Label>
                        <Input
                          placeholder="如：数学"
                          value={newSubject.name}
                          onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label>简称</Label>
                        <Input
                          placeholder="如：MAT"
                          value={newSubject.shortName}
                          onChange={(e) => setNewSubject({ ...newSubject, shortName: e.target.value })}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label>颜色</Label>
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
                        <Label htmlFor="requiresLab" className="cursor-pointer">需要实验班</Label>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => {
                        setShowSubjectDialog(false)
                        setEditingSubject(null)
                        setNewSubject({ name: '', shortName: '', color: '#8B5CF6', requiresLab: false })
                      }}>取消</Button>
                      <Button 
                        onClick={editingSubject ? updateSubject : addSubject} 
                        className="bg-primary hover:bg-purple-700"
                      >
                        {editingSubject ? '保存' : '添加'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {subjects.length > 0 ? subjects.map((subject) => (
                <Card key={subject.id} className="p-4 bg-white border-2 hover:border-primary transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-white text-sm"
                        style={{ backgroundColor: subject.color }}
                      >
                        {subject.shortName}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{subject.name}</h4>
                        <p className="text-xs text-gray-500">{subject.shortName}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-gray-400 hover:text-primary"
                        onClick={() => openEditSubject(subject)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                        onClick={() => setDeleteConfirmSubject(subject)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {subject.requiresLab && (
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                      需要实验班
                    </Badge>
                  )}
                </Card>
              )) : (
                <p className="text-gray-600">没有科目，点击添加科目按钮添加</p>
              )}
            </div>
          </Card>

          {/* Delete Subject Confirmation Dialog */}
          <Dialog open={!!deleteConfirmSubject} onOpenChange={(open) => !open && setDeleteConfirmSubject(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>确认删除科目</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="text-gray-600">
                  确定要删除科目 "<strong>{deleteConfirmSubject?.name}</strong>" 吗？
                </p>
                <p className="text-sm text-red-600 mt-2">
                  删除后，与该科目相关的教师分配数据也将被删除，此操作无法撤销。
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDeleteConfirmSubject(null)}>取消</Button>
                <Button 
                  variant="destructive" 
                  onClick={() => deleteConfirmSubject && deleteSubject(deleteConfirmSubject)}
                >
                  确认删除
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Teachers Tab */}
        <TabsContent value="teachers" className="space-y-6">
          <Card className="p-4 bg-white border border-gray-200">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="搜索教师姓名..."
                    value={teacherFilter}
                    onChange={(e) => setTeacherFilter(e.target.value)}
                    className="pl-10 bg-[#F9FAFB]"
                  />
                </div>
                <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                  <SelectTrigger className="w-40 bg-[#F9FAFB]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有科目</SelectItem>
                    {subjects.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="text-primary border-primary hover:bg-purple-50" onClick={() => downloadTemplate('teachers')}>
                  <Download className="w-4 h-4 mr-2" />
                  下载模板
                </Button>
                <Button size="sm" variant="outline" className="text-primary border-primary hover:bg-purple-50" onClick={() => teachersFileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  导入 Excel
                </Button>
                <input
                  type="file"
                  ref={teachersFileInputRef}
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleExcelImport('teachers', e.target.files[0])}
                />
                <Dialog open={showTeacherDialog} onOpenChange={setShowTeacherDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-primary hover:bg-purple-700">
                      <Plus className="w-4 h-4 mr-2" />
                      添加老师
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>添加新老师</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>姓名</Label>
                        <Input
                          placeholder="如：张老师"
                          value={newTeacher.name}
                          onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label>科目</Label>
                        <Select value={newTeacher.subject} onValueChange={(value) => setNewTeacher({ ...newTeacher, subject: value })}>
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="选择科目" />
                          </SelectTrigger>
                          <SelectContent>
                            {subjects.map(s => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>周负荷（节）</Label>
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
                      <Button variant="outline" onClick={() => setShowTeacherDialog(false)}>取消</Button>
                      <Button onClick={addTeacher} className="bg-primary hover:bg-purple-700">添加</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white border border-gray-200">
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
                  <TableHead>姓名</TableHead>
                  <TableHead>科目</TableHead>
                  <TableHead>周负荷（节）</TableHead>
                  <TableHead>不可用时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
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
                          {teacher.unavailable.length > 0 ? `${teacher.unavailable.length} 时段` : '设置'}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeTeacher(teacher.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
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
                <DialogTitle>设置不可用时间 - {selectedTeacher?.name}</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-gray-600 mb-4">点击时间格标记为不可用（红色），再次点击取消标记</p>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="flex bg-gray-50 border-b border-gray-200">
                    <div className="w-20 p-2 text-center text-sm font-medium text-gray-700">节次</div>
                    {WEEKDAYS.slice(0, 5).map((day) => (
                      <div key={day} className="flex-1 p-2 text-center text-sm font-medium text-gray-700 border-l border-gray-200">
                        {day}
                      </div>
                    ))}
                  </div>
                  {PERIODS.map((period) => (
                    <div key={period} className="flex border-b border-gray-200 last:border-b-0">
                      <div className="w-20 p-2 text-center text-sm text-gray-600 bg-gray-50">第{period}节</div>
                      {WEEKDAYS.slice(0, 5).map((_, dayIndex) => {
                        const isUnavailable = selectedTeacher?.unavailable?.some(
                          (slot: number[]) => slot[0] === dayIndex && slot[1] === period
                        ) ?? false
                        return (
                          <button
                            key={`${dayIndex}-${period}`}
                            className={`flex-1 p-4 border-l border-gray-200 transition-colors ${
                              isUnavailable 
                                ? 'bg-red-500 hover:bg-red-400' 
                                : 'bg-white hover:bg-purple-50'
                            }`}
                            onClick={() => {
                              if (!selectedTeacher) return
                              const currentUnavailable = selectedTeacher.unavailable || []
                              const slotIndex = currentUnavailable.findIndex(
                                (slot: number[]) => slot[0] === dayIndex && slot[1] === period
                              )
                              let newUnavailable: number[][]
                              if (slotIndex >= 0) {
                                // Remove slot
                                newUnavailable = currentUnavailable.filter((_, i) => i !== slotIndex)
                              } else {
                                // Add slot
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
                <Button variant="outline" onClick={() => setShowUnavailableDialog(false)}>取消</Button>
                <Button 
                  className="bg-primary hover:bg-purple-700"
                  onClick={async () => {
                    if (selectedTeacher) {
                      try {
                        await teachersApi.update(selectedTeacher.id, { 
                          unavailable: selectedTeacher.unavailable 
                        })
                        setTeachers(teachers.map(t => 
                          t.id === selectedTeacher.id 
                            ? { ...t, unavailable: selectedTeacher.unavailable }
                            : t
                        ))
                        setShowUnavailableDialog(false)
                      } catch (err) {
                        console.error('Failed to save unavailable times:', err)
                      }
                    }
                  }}
                >
                  保存
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Rooms Tab */}
        <TabsContent value="rooms" className="space-y-6">
          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">批量生成教室</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-primary border-primary hover:bg-purple-50" onClick={() => downloadTemplate('rooms')}>
                  <Download className="w-4 h-4 mr-2" />
                  下载模板
                </Button>
                <Button size="sm" variant="outline" className="text-primary border-primary hover:bg-purple-50" onClick={() => roomsFileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  导入 Excel
                </Button>
                <input
                  type="file"
                  ref={roomsFileInputRef}
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleExcelImport('rooms', e.target.files[0])}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <Label className="text-sm text-gray-700 mb-2 block">前缀</Label>
                <Input
                  placeholder="如：教室、Lab-"
                  value={bulkPrefix}
                  onChange={(e) => setBulkPrefix(e.target.value)}
                  className="bg-[#F9FAFB]"
                />
              </div>
              <div>
                <Label className="text-sm text-gray-700 mb-2 block">从编号</Label>
                <Input
                  type="number"
                  min="1"
                  value={bulkStart}
                  onChange={(e) => setBulkStart(parseInt(e.target.value))}
                  className="bg-[#F9FAFB]"
                />
              </div>
              <div>
                <Label className="text-sm text-gray-700 mb-2 block">到编号</Label>
                <Input
                  type="number"
                  min="1"
                  value={bulkEnd}
                  onChange={(e) => setBulkEnd(parseInt(e.target.value))}
                  className="bg-[#F9FAFB]"
                />
              </div>
            </div>

            <Button onClick={bulkCreateRooms} className="bg-primary hover:bg-purple-700 w-full">
              <Plus className="w-4 h-4 mr-2" />
              生成 {bulkEnd - bulkStart + 1} 个教室
            </Button>
          </Card>

          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">教室列表</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {rooms.map((room) => (
                <Card key={room.id} className="p-4 bg-gray-50 border border-gray-200 hover:border-primary transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    <h4 className="font-medium text-gray-900">{room.name}</h4>
                  </div>
                  {room.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {room.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bottom Navigation */}
      <div className="mt-8 flex justify-between items-center">
        <Button variant="outline" onClick={onBack}>
          上一步
        </Button>
        <Button className="bg-primary hover:bg-purple-700" onClick={onNext}>
          确认无误，下一步
        </Button>
      </div>
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Trash2, Download, Upload, Loader2, Building2 } from 'lucide-react'
import { rooms as roomsApi, excel as excelApi } from '@/lib/api'
import type { Room } from '@/lib/api'
import * as XLSX from 'xlsx'

export function ClassroomsPage() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  
  // Bulk create states
  const [bulkPrefix, setBulkPrefix] = useState('')
  const [bulkStart, setBulkStart] = useState(1)
  const [bulkEnd, setBulkEnd] = useState(10)
  
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
      const data = await roomsApi.getAll()
      setRooms(data)
    } catch (err) {
      setError(t('resources.error_load'))
      console.error('Failed to load rooms:', err)
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = () => {
    const url = excelApi.downloadRoomsTemplate()
    const a = document.createElement('a')
    a.href = url
    a.download = 'rooms_template.xlsx'
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
      
      const result = await excelApi.importRooms(rows as string[][])
      if (result.success.length > 0) {
        const refreshed = await roomsApi.getAll()
        setRooms(refreshed)
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

  const removeRoom = async (id: string) => {
    try {
      await roomsApi.delete(id)
      setRooms(rooms.filter(r => r.id !== id))
    } catch (err) {
      console.error('Failed to delete room:', err)
    }
  }

  // Group rooms by prefix (e.g., "1-101", "1-102" -> grouped under "1号楼")
  const groupedRooms = rooms.reduce((acc, room) => {
    const prefix = room.name.split('-')[0] || t('pages.other', '其他')
    if (!acc[prefix]) acc[prefix] = []
    acc[prefix].push(room)
    return acc
  }, {} as Record<string, Room[]>)

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
          <h1 className="text-2xl font-bold text-foreground">{t('pages.classrooms', '教室管理')}</h1>
          <p className="text-muted-foreground mt-1">{t('pages.classrooms_desc', '管理所有教室信息')}</p>
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
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold text-foreground">{rooms.length}</div>
          <div className="text-sm text-muted-foreground">{t('pages.total_rooms', '教室总数')}</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-foreground">{Object.keys(groupedRooms).length}</div>
          <div className="text-sm text-muted-foreground">{t('pages.buildings', '教学楼')}</div>
        </Card>
      </div>

      {/* Bulk Create */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">{t('resources.bulk_create_rooms')}</h3>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <Label className="mb-2 block">{t('resources.prefix')}</Label>
            <Input
              placeholder={t('resources.prefix_placeholder')}
              value={bulkPrefix}
              onChange={(e) => setBulkPrefix(e.target.value)}
            />
          </div>
          <div>
            <Label className="mb-2 block">{t('resources.start_num')}</Label>
            <Input
              type="number"
              min="1"
              value={bulkStart}
              onChange={(e) => setBulkStart(parseInt(e.target.value))}
            />
          </div>
          <div>
            <Label className="mb-2 block">{t('resources.end_num')}</Label>
            <Input
              type="number"
              min="1"
              value={bulkEnd}
              onChange={(e) => setBulkEnd(parseInt(e.target.value))}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={bulkCreateRooms} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              {t('resources.create')}
            </Button>
          </div>
        </div>
        {bulkPrefix && (
          <p className="text-sm text-muted-foreground mt-3">
            {t('resources.preview')}: {bulkPrefix}-{bulkStart}, {bulkPrefix}-{String(bulkStart + 1)}, ... {bulkPrefix}-{bulkEnd}
          </p>
        )}
      </Card>

      {/* Room List by Building */}
      {Object.entries(groupedRooms).map(([prefix, buildingRooms]) => (
        <Card key={prefix} className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">{prefix}{t('pages.building_suffix', '号楼')}</h3>
              <p className="text-sm text-muted-foreground">{buildingRooms.length} {t('pages.rooms_count', '间教室')}</p>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('pages.room_name', '教室名称')}</TableHead>
                <TableHead>{t('pages.tags', '标签')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buildingRooms.map((room) => (
                <TableRow key={room.id}>
                  <TableCell className="font-medium">{room.name}</TableCell>
                  <TableCell>
                    {room.tags?.length > 0 ? (
                      room.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="mr-1">{tag}</Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeRoom(room.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ))}

      {rooms.length === 0 && (
        <Card className="p-12 text-center">
          <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{t('resources.no_rooms', '暂无教室数据')}</p>
        </Card>
      )}

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

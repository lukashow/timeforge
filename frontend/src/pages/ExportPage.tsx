import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Icon } from '@iconify/react'
import { Loader2 } from 'lucide-react'
import { timetable as timetableApi, classes as classesApi } from '@/lib/api'
import * as XLSX from 'xlsx'

export function ExportPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [latestData, setLatestData] = useState<any>(null)
  const [allClasses, setAllClasses] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [latest, classes] = await Promise.all([
        timetableApi.getLatest(),
        classesApi.getAll(),
      ])
      setLatestData(latest)
      setAllClasses(classes)
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }



  const hasTimetables = latestData?.entries && latestData.entries.length > 0
  const classesWithTimetables = new Set(latestData?.entries?.map((e: any) => e.classId) || [])

  const handleExportAll = async () => {
    try {
      setExporting(true)
      
      // Create workbook with all timetables
      const workbook = XLSX.utils.book_new()
      
      for (const cls of allClasses) {
        if (!classesWithTimetables.has(cls.id)) continue
        
        const entries = latestData.entries.filter((e: any) => e.classId === cls.id)
        const data: any[][] = [
          ['', '周一', '周二', '周三', '周四', '周五'],
        ]
        
        for (let period = 1; period <= (latestData.maxPeriods || 8); period++) {
          const row = [`第${period}节`]
          for (let day = 0; day < 5; day++) {
            const entry = entries.find((e: any) => e.day === day && e.period === period)
            const subject = latestData.subjects?.find((s: any) => s.id === entry?.subjectId)
            row.push(subject?.name || '')
          }
          data.push(row)
        }
        
        const sheet = XLSX.utils.aoa_to_sheet(data)
        XLSX.utils.book_append_sheet(workbook, sheet, cls.name.substring(0, 31))
      }
      
      // Generate and download
      const timestamp = new Date().toISOString().split('T')[0]
      XLSX.writeFile(workbook, `timetables_${timestamp}.xlsx`)
      
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('pages.export', '导出课表')}</h1>
        <p className="text-muted-foreground mt-1">{t('pages.export_desc', '将课表导出为Excel或PDF格式')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Icon icon="tabler:table" className="w-7 h-7 text-primary" />
            </div>
            <div>
              <div className="text-3xl font-bold text-foreground">{classesWithTimetables.size}</div>
              <div className="text-sm text-muted-foreground">{t('pages.timetables_to_export', '可导出课表')}</div>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center">
              <Icon icon="tabler:building" className="w-7 h-7 text-accent" />
            </div>
            <div>
              <div className="text-3xl font-bold text-foreground">{allClasses.length}</div>
              <div className="text-sm text-muted-foreground">{t('pages.classes_covered', '班级')}</div>
            </div>
          </div>
        </Card>
      </div>

      {hasTimetables ? (
        <>
          {/* Export Options */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">{t('pages.export_options', '导出选项')}</h3>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Excel Export */}
              <div className="border rounded-xl p-4 hover:border-primary transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <Icon icon="tabler:file-spreadsheet" className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">Excel</h4>
                    <p className="text-xs text-muted-foreground">.xlsx</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('pages.excel_desc', '导出为Excel文件，每个班级一个工作表')}
                </p>
                <Button 
                  className="w-full" 
                  onClick={handleExportAll}
                  disabled={exporting}
                >
                  {exporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {t('pages.exporting', '导出中...')}
                    </>
                  ) : (
                    <>
                      <Icon icon="tabler:download" className="w-4 h-4 mr-2" />
                      {t('pages.export_all', '导出全部')}
                    </>
                  )}
                </Button>
              </div>

              {/* PDF Export - Link to Wizard */}
              <div className="border rounded-xl p-4 hover:border-primary transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                    <Icon icon="tabler:file-type-pdf" className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">PDF</h4>
                    <p className="text-xs text-muted-foreground">.pdf</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('pages.pdf_desc', '单个班级导出为PDF，适合打印')}
                </p>
                <Button 
                  variant="outline"
                  className="w-full" 
                  onClick={() => navigate('/wizard')}
                >
                  <Icon icon="tabler:wand" className="w-4 h-4 mr-2" />
                  {t('pages.use_wizard', '使用向导导出')}
                </Button>
              </div>
            </div>
          </Card>

          {/* Preview List */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">{t('pages.timetable_list', '课表列表')}</h3>
            <div className="space-y-2">
              {allClasses.filter(c => classesWithTimetables.has(c.id)).slice(0, 10).map((cls) => {
                const entryCount = latestData.entries?.filter((e: any) => e.classId === cls.id).length || 0
                return (
                  <div key={cls.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Icon icon="tabler:table" className="w-5 h-5 text-primary" />
                      <span className="font-medium">{cls.name}</span>
                      <Badge variant="secondary">
                        {entryCount} {t('pages.entries', '条目')}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/timetables')}>
                      <Icon icon="tabler:eye" className="w-4 h-4" />
                    </Button>
                  </div>
                )
              })}
              {classesWithTimetables.size > 10 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  {t('pages.and_more', '还有 {{count}} 个...', { count: classesWithTimetables.size - 10 })}
                </p>
              )}
            </div>
          </Card>
        </>
      ) : (
        <Card className="p-12 text-center">
          <Icon icon="tabler:file-off" className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">{t('pages.no_export_data', '暂无可导出的课表')}</h3>
          <p className="text-muted-foreground mb-6">{t('pages.generate_first', '请先生成课表，然后再进行导出')}</p>
          <Button onClick={() => navigate('/generation')}>
            <Icon icon="tabler:cpu" className="w-4 h-4 mr-2" />
            {t('pages.go_to_generation', '前往生成')}
          </Button>
        </Card>
      )}
    </div>
  )
}

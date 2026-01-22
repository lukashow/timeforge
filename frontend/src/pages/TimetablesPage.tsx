import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Icon } from '@iconify/react'
import { Loader2 } from 'lucide-react'
import { timetable as timetableApi, classes as classesApi } from '@/lib/api'
import { WEEKDAYS } from '@/constants/weekdays'

export function TimetablesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [latestData, setLatestData] = useState<any>(null)
  const [allClasses, setAllClasses] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')

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
      if (classes.length > 0) {
        setSelectedClass(classes[0].id)
      }
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  const getClassName = (classId: string) => {
    const cls = allClasses.find(c => c.id === classId)
    return cls?.name || classId
  }

  const getEntriesForClass = (classId: string) => {
    if (!latestData?.entries) return []
    return latestData.entries.filter((e: any) => e.classId === classId)
  }

  const currentEntries = selectedClass ? getEntriesForClass(selectedClass) : []
  const hasTimetables = latestData?.entries && latestData.entries.length > 0

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('pages.timetables', '查看课表')}</h1>
          <p className="text-muted-foreground mt-1">{t('pages.timetables_desc', '查看和导出已生成的课表')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/export')}>
            <Icon icon="tabler:download" className="w-4 h-4 mr-2" />
            {t('pages.export', '导出')}
          </Button>
          <Button onClick={() => navigate('/generation')}>
            <Icon icon="tabler:refresh" className="w-4 h-4 mr-2" />
            {t('pages.regenerate', '重新生成')}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon icon="tabler:table" className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{latestData?.entries?.length || 0}</div>
              <div className="text-sm text-muted-foreground">{t('pages.total_entries', '课程条目')}</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Icon icon="tabler:building" className="w-5 h-5 text-accent" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{allClasses.length}</div>
              <div className="text-sm text-muted-foreground">{t('pages.total_classes', '班级总数')}</div>
            </div>
          </div>
        </Card>
      </div>

      {hasTimetables ? (
        <>
          {/* Class Selector */}
          <Card className="p-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-foreground">{t('pages.select_class', '选择班级')}:</span>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Timetable Grid */}
          <Card className="p-6 overflow-x-auto">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              {getClassName(selectedClass)} {t('pages.class_timetable', '课表')}
            </h3>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border p-2 bg-muted text-sm font-medium">{t('pages.period', '节次')}</th>
                  {WEEKDAYS.slice(0, 5).map((day, i) => (
                    <th key={i} className="border p-2 bg-muted text-sm font-medium">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: latestData?.maxPeriods || 8 }, (_, periodIdx) => (
                  <tr key={periodIdx}>
                    <td className="border p-2 text-center text-sm font-medium bg-muted/50">
                      {t('time_grid.period_label', { period: periodIdx + 1 })}
                    </td>
                    {WEEKDAYS.slice(0, 5).map((_, dayIdx) => {
                      const entry = currentEntries.find(
                        (e: any) => e.day === dayIdx && e.period === periodIdx + 1
                      )
                      const subject = latestData?.subjects?.find((s: any) => s.id === entry?.subjectId)
                      const displayName = entry?.subjectId 
                        ? subject?.name || entry.subjectId 
                        : ''
                      return (
                        <td 
                          key={dayIdx} 
                          className="border p-2 text-center text-sm min-w-[100px]"
                          style={subject?.color ? { backgroundColor: subject.color + '20' } : {}}
                        >
                          {displayName || '-'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      ) : (
        <Card className="p-12 text-center">
          <Icon icon="tabler:table-off" className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">{t('pages.no_timetables', '暂无课表')}</h3>
          <p className="text-muted-foreground mb-6">{t('pages.no_timetables_hint', '请先生成课表，然后在此处查看')}</p>
          <Button onClick={() => navigate('/generation')}>
            <Icon icon="tabler:cpu" className="w-4 h-4 mr-2" />
            {t('pages.go_to_generation', '前往生成')}
          </Button>
        </Card>
      )}
    </div>
  )
}

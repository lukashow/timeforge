import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { 
  classes as classesApi, 
  teachers as teachersApi, 
  subjects as subjectsApi,
  timetable as timetableApi,
  type TimetableEntryData
} from '@/lib/api'
import { WEEKDAYS } from '@/constants/weekdays'

interface ClassInfo {
  id: string
  name: string
}

interface SubjectInfo {
  id: string
  name: string
  color: string
}

export function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  
  // Stats
  const [loading, setLoading] = useState(true)
  const [classesCount, setClassesCount] = useState(0)
  const [teachersCount, setTeachersCount] = useState(0)
  const [subjectsCount, setSubjectsCount] = useState(0)
  const [timetablesCount, setTimetablesCount] = useState(0)
  
  // Getting started banner
  const [showBanner, setShowBanner] = useState(() => {
    return localStorage.getItem('hideDashboardBanner') !== 'true'
  })
  
  // Today's timetable
  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date().getDay()
    // Convert: Sunday=0 -> 0, Monday=1 -> 1, etc
    // But we want: Monday=1, Tuesday=2, ... Sunday=7
    return today === 0 ? 5 : today // If Sunday, default to Friday
  })
  const [entries, setEntries] = useState<TimetableEntryData[]>([])
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [subjects, setSubjects] = useState<SubjectInfo[]>([])
  const [maxPeriods, setMaxPeriods] = useState(8)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load stats
      const [classesData, teachersData, subjectsData, timetableData] = await Promise.all([
        classesApi.getAll(),
        teachersApi.getAll(),
        subjectsApi.getAll(),
        timetableApi.getLatest(),
      ])
      
      setClassesCount(classesData.length)
      setTeachersCount(teachersData.length)
      setSubjectsCount(subjectsData.length)
      setTimetablesCount(timetableData.entries?.length || 0)
      
      // Store timetable data for today view
      setEntries(timetableData.entries || [])
      setClasses(timetableData.classes || [])
      setSubjects(timetableData.subjects || [])
      setMaxPeriods(timetableData.maxPeriods || 8)
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleNeverAskAgain = () => {
    localStorage.setItem('hideDashboardBanner', 'true')
    setShowBanner(false)
  }

  // Build lookup maps
  const subjectColorMap = useMemo(() => {
    const map: Record<string, string> = {}
    subjects.forEach(s => { map[s.id] = s.color })
    return map
  }, [subjects])

  const subjectNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    subjects.forEach(s => { map[s.id] = s.name })
    return map
  }, [subjects])

  // Group entries by class
  const entriesByClass = useMemo(() => {
    const map: Record<string, TimetableEntryData[]> = {}
    entries.forEach(e => {
      if (!map[e.class_id]) map[e.class_id] = []
      map[e.class_id].push(e)
    })
    return map
  }, [entries])

  // Get cell for class view
  const getClassCell = (classId: string, period: number) => {
    const classEntries = entriesByClass[classId] || []
    return classEntries.find(e => e.day === selectedDay && e.period === period)
  }

  const dayOptions = [
    { value: '1', label: WEEKDAYS[0] },
    { value: '2', label: WEEKDAYS[1] },
    { value: '3', label: WEEKDAYS[2] },
    { value: '4', label: WEEKDAYS[3] },
    { value: '5', label: WEEKDAYS[4] },
  ]

  const stats = [
    { label: t('dashboard.stat_classes', '班级'), value: classesCount, icon: 'tabler:building', color: 'bg-blue-100 text-blue-600' },
    { label: t('dashboard.stat_teachers', '教师'), value: teachersCount, icon: 'tabler:users', color: 'bg-green-100 text-green-600' },
    { label: t('dashboard.stat_subjects', '科目'), value: subjectsCount, icon: 'tabler:book', color: 'bg-purple-100 text-purple-600' },
    { label: t('dashboard.stat_timetables', '课表条目'), value: timetablesCount, icon: 'tabler:table', color: 'bg-amber-100 text-amber-600' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">{t('common.loading', '加载中...')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header / Greeter */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {t('dashboard.title', '仪表盘')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('dashboard.subtitle', '欢迎使用 TimeForge 智能排课系统')}
        </p>
      </div>

      {/* Getting Started Banner */}
      {showBanner && (
        <div className="bg-accent rounded-2xl p-6 text-white relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-2">{t('dashboard.getting_started', 'Getting Started')}</h2>
            <p className="text-white/90 max-w-xl">
              {t('dashboard.getting_started_desc', 'If this is your first time, we recommend using the setup wizard to complete basic configuration.')}
            </p>
            
            <div className="flex items-center gap-4 mt-6 justify-end">
              <button 
                onClick={handleNeverAskAgain}
                className="text-white/80 hover:text-white text-sm transition-colors"
              >
                {t('dashboard.never_ask_again', 'Never ask me again')}
              </button>
              <Button 
                onClick={() => navigate('/wizard')}
                className="bg-white text-accent hover:bg-white/90 font-medium"
              >
                {t('dashboard.take_me_there', 'Take me there')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${stat.color.split(' ')[0]} flex items-center justify-center`}>
                <Icon icon={stat.icon} className={`w-6 h-6 ${stat.color.split(' ')[1]}`} />
              </div>
              <div>
                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Today's Timetable Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{t('dashboard.today_timetable', "Today's Timetable")}</h3>
            <p className="text-sm text-muted-foreground">{t('dashboard.today_timetable_desc', 'Quick view of all classes')}</p>
          </div>
          <Select value={String(selectedDay)} onValueChange={(v) => setSelectedDay(parseInt(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dayOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {entries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="p-2 text-left font-medium text-gray-700 bg-gray-50 border border-gray-200 w-24">
                    {t('common.class', '班级')}
                  </th>
                  {Array.from({ length: maxPeriods }, (_, i) => (
                    <th key={i} className="p-2 text-center font-medium text-gray-700 bg-gray-50 border border-gray-200 min-w-[80px]">
                      {t('time_grid.period_label', { period: i + 1 })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {classes.slice(0, 8).map((cls) => (
                  <tr key={cls.id}>
                    <td className="p-2 font-medium text-gray-900 bg-gray-50 border border-gray-200 whitespace-nowrap">
                      {cls.name}
                    </td>
                    {Array.from({ length: maxPeriods }, (_, periodIndex) => {
                      const entry = getClassCell(cls.id, periodIndex + 1)
                      const isStatic = entry?.static_name && !entry?.subject_id
                      const color = isStatic ? '#374151' : (entry?.subject_id ? subjectColorMap[entry.subject_id] : '#E5E7EB')
                      const displayName = isStatic 
                        ? entry.static_name 
                        : (entry?.subject_id ? subjectNameMap[entry.subject_id] : '')
                      
                      return (
                        <td key={periodIndex} className="p-1 border border-gray-200">
                          {displayName ? (
                            <div
                              className="p-2 rounded text-center text-xs font-medium"
                              style={{ 
                                backgroundColor: isStatic ? color : color + '20',
                                color: isStatic ? '#fff' : color 
                              }}
                              title={displayName}
                            >
                              {displayName.length > 4 ? displayName.substring(0, 4) + '...' : displayName}
                            </div>
                          ) : (
                            <div className="p-2 rounded text-center text-xs text-gray-300">-</div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            
            {classes.length > 8 && (
              <div className="text-center mt-4">
                <Button variant="ghost" size="sm" onClick={() => navigate('/timetables')}>
                  {t('dashboard.view_all_classes', 'View all {{count}} classes', { count: classes.length })}
                  <Icon icon="tabler:arrow-right" className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <Icon icon="tabler:calendar-off" className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">{t('dashboard.no_timetable_yet', 'No timetable generated yet')}</p>
            <Button variant="outline" onClick={() => navigate('/generation')}>
              <Icon icon="tabler:cpu" className="w-4 h-4 mr-2" />
              {t('dashboard.generate_now', 'Generate Now')}
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}

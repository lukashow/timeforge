import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Icon } from '@iconify/react'
import { Loader2 } from 'lucide-react'
import { timetable as timetableApi, classes as classesApi } from '@/lib/api'

export function GenerationPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [classCount, setClassCount] = useState(0)
  const [hasTimetables, setHasTimetables] = useState(false)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const [latestData, classes] = await Promise.all([
        timetableApi.getLatest(),
        classesApi.getAll(),
      ])
      setClassCount(classes.length)
      setHasTimetables(latestData.entries && latestData.entries.length > 0)
    } catch (err) {
      console.error('Failed to load stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    try {
      setGenerating(true)
      await timetableApi.generate([]) // Empty rules array
      await loadStats()
    } catch (err) {
      console.error('Generation failed:', err)
    } finally {
      setGenerating(false)
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
        <h1 className="text-2xl font-bold text-foreground">{t('pages.generation', '课表生成')}</h1>
        <p className="text-muted-foreground mt-1">{t('pages.generation_desc', '配置规则并生成智能课表')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon icon="tabler:building" className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{classCount}</div>
              <div className="text-sm text-muted-foreground">{t('pages.classes', '班级')}</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Icon icon="tabler:table" className="w-5 h-5 text-accent" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{hasTimetables ? '✓' : '-'}</div>
              <div className="text-sm text-muted-foreground">{t('pages.status', '状态')}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Generation Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Icon icon="tabler:cpu" className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">{t('pages.generate_new', '生成新课表')}</h3>
              <p className="text-sm text-muted-foreground">{t('pages.generate_hint', '基于当前配置生成所有班级的课表')}</p>
            </div>
          </div>
          <Button 
            size="lg" 
            onClick={handleGenerate} 
            disabled={generating || classCount === 0}
            className="min-w-[120px]"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {t('pages.generating', '生成中...')}
              </>
            ) : (
              <>
                <Icon icon="tabler:sparkles" className="w-4 h-4 mr-2" />
                {t('pages.generate', '开始生成')}
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Status */}
      {hasTimetables ? (
        <Card className="p-6 border-green-200 bg-green-50">
          <div className="flex items-center gap-4">
            <Icon icon="tabler:circle-check" className="w-8 h-8 text-green-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-800">{t('pages.timetables_ready', '课表已就绪')}</h3>
              <p className="text-sm text-green-600">{t('pages.timetables_ready_desc', '您可以查看或导出已生成的课表')}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/timetables')}>
                <Icon icon="tabler:eye" className="w-4 h-4 mr-2" />
                {t('pages.view', '查看')}
              </Button>
              <Button variant="outline" onClick={() => navigate('/export')}>
                <Icon icon="tabler:download" className="w-4 h-4 mr-2" />
                {t('pages.export', '导出')}
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-6 border-amber-200 bg-amber-50">
          <div className="flex items-center gap-4">
            <Icon icon="tabler:alert-triangle" className="w-8 h-8 text-amber-600" />
            <div>
              <h3 className="font-semibold text-amber-800">{t('pages.no_timetables', '暂无课表')}</h3>
              <p className="text-sm text-amber-600">{t('pages.no_timetables_desc', '请先完成设置向导，然后生成课表')}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Wizard Link */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon icon="tabler:wand" className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">{t('pages.need_setup', '需要配置？使用设置向导完成全部设置')}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/wizard')}>
            {t('pages.go_to_wizard', '前往设置向导')}
            <Icon icon="tabler:arrow-right" className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </Card>
    </div>
  )
}

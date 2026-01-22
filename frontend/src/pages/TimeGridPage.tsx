import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Icon } from '@iconify/react'

export function TimeGridPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('pages.time_grid', '作息时间')}</h1>
        <p className="text-muted-foreground mt-1">{t('pages.time_grid_desc', '设置学校作息时间和课程安排')}</p>
      </div>

      {/* Info Card */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Icon icon="tabler:clock" className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">
              {t('pages.use_wizard', '使用设置向导')}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('pages.time_grid_wizard_hint', '作息时间设置已集成在设置向导的第1步中。您可以在那里设置工作日、每日课时、课间休息等。')}
            </p>
            <Button onClick={() => navigate('/wizard')}>
              <Icon icon="tabler:wand" className="w-4 h-4" />
              {t('pages.go_to_wizard', '前往设置向导')}
            </Button>
          </div>
        </div>
      </Card>

      {/* Quick Info */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <Icon icon="tabler:calendar-week" className="w-8 h-8 text-primary mx-auto mb-2" />
          <div className="text-sm text-muted-foreground">{t('pages.work_days', '工作日设置')}</div>
        </Card>
        <Card className="p-4 text-center">
          <Icon icon="tabler:clock-hour-4" className="w-8 h-8 text-primary mx-auto mb-2" />
          <div className="text-sm text-muted-foreground">{t('pages.periods', '课时安排')}</div>
        </Card>
        <Card className="p-4 text-center">
          <Icon icon="tabler:coffee" className="w-8 h-8 text-primary mx-auto mb-2" />
          <div className="text-sm text-muted-foreground">{t('pages.breaks', '课间休息')}</div>
        </Card>
      </div>
    </div>
  )
}

import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

export function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const quickActions = [
    {
      icon: 'tabler:wand',
      title: t('dashboard.quick_setup', '快速设置向导'),
      description: t('dashboard.quick_setup_desc', '使用向导逐步完成课表配置'),
      action: () => navigate('/wizard'),
      color: 'text-primary',
    },
    {
      icon: 'tabler:table',
      title: t('dashboard.view_timetables', '查看课表'),
      description: t('dashboard.view_timetables_desc', '查看已生成的课表'),
      action: () => navigate('/timetables'),
      color: 'text-accent',
    },
    {
      icon: 'tabler:download',
      title: t('dashboard.export', '导出'),
      description: t('dashboard.export_desc', '导出课表为Excel或PDF'),
      action: () => navigate('/export'),
      color: 'text-green-500',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {t('dashboard.title', '仪表盘')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('dashboard.subtitle', '欢迎使用 TimeForge 智能排课系统')}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {quickActions.map((action, index) => (
          <Card
            key={index}
            className="p-6 hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={action.action}
          >
            <div className={`w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <Icon icon={action.icon} className={`w-6 h-6 ${action.color}`} />
            </div>
            <h3 className="font-semibold text-foreground mb-1">{action.title}</h3>
            <p className="text-sm text-muted-foreground">{action.description}</p>
          </Card>
        ))}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('dashboard.stat_classes', '班级'), value: '-', icon: 'tabler:building' },
          { label: t('dashboard.stat_teachers', '教师'), value: '-', icon: 'tabler:users' },
          { label: t('dashboard.stat_subjects', '科目'), value: '-', icon: 'tabler:book' },
          { label: t('dashboard.stat_timetables', '课表'), value: '-', icon: 'tabler:table' },
        ].map((stat, index) => (
          <Card key={index} className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Icon icon={stat.icon} className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Getting Started */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
            <Icon icon="tabler:rocket" className="w-6 h-6 text-accent" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">
              {t('dashboard.getting_started', '开始使用')}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('dashboard.getting_started_desc', '如果您是第一次使用，建议先使用设置向导完成基础配置。')}
            </p>
            <Button onClick={() => navigate('/wizard')}>
              <Icon icon="tabler:wand" className="w-4 h-4" />
              {t('dashboard.start_wizard', '启动设置向导')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

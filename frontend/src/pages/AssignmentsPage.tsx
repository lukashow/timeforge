import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Icon } from '@iconify/react'

export function AssignmentsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('pages.assignments', '任课分配')}</h1>
        <p className="text-muted-foreground mt-1">{t('pages.assignments_desc', '管理班级的任课教师分配')}</p>
      </div>

      {/* Info Card */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
            <Icon icon="tabler:clipboard-list" className="w-6 h-6 text-accent" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">
              {t('pages.use_wizard', '使用设置向导')}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {t('pages.assignments_wizard_hint', '任课分配功能已集成在设置向导的第5步中。您可以在那里为每个班级分配任课教师。')}
            </p>
            <Button onClick={() => navigate('/wizard')}>
              <Icon icon="tabler:wand" className="w-4 h-4" />
              {t('pages.go_to_wizard', '前往设置向导')}
            </Button>
          </div>
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <Icon icon="tabler:users" className="w-8 h-8 text-primary mx-auto mb-2" />
          <div className="text-sm text-muted-foreground">{t('pages.step5_title', '教师分配')}</div>
        </Card>
        <Card className="p-4 text-center">
          <Icon icon="tabler:building" className="w-8 h-8 text-primary mx-auto mb-2" />
          <div className="text-sm text-muted-foreground">{t('pages.class_teacher', '班主任')}</div>
        </Card>
        <Card className="p-4 text-center">
          <Icon icon="tabler:book" className="w-8 h-8 text-primary mx-auto mb-2" />
          <div className="text-sm text-muted-foreground">{t('pages.subject_teacher', '科任教师')}</div>
        </Card>
      </div>
    </div>
  )
}

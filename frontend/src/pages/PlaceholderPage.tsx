import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { Icon } from '@iconify/react'

interface PlaceholderPageProps {
  titleKey: string
  defaultTitle: string
  icon: string
  descriptionKey?: string
  defaultDescription?: string
}

export function PlaceholderPage({
  titleKey,
  defaultTitle,
  icon,
  descriptionKey,
  defaultDescription,
}: PlaceholderPageProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {t(titleKey, defaultTitle)}
        </h1>
        {descriptionKey && defaultDescription && (
          <p className="text-muted-foreground mt-1">
            {t(descriptionKey, defaultDescription)}
          </p>
        )}
      </div>

      <Card className="p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Icon icon={icon} className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {t('common.coming_soon', '即将推出')}
        </h3>
        <p className="text-sm text-muted-foreground max-w-md">
          {t('common.page_in_development', '此页面正在开发中，敬请期待。')}
        </p>
      </Card>
    </div>
  )
}

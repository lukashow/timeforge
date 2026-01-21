import type { ReactNode } from 'react'
import { Icon } from '@iconify/react'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

import '@/i18n'
import { useTranslation } from 'react-i18next'

interface LayoutProps {
  children: ReactNode
  currentStep?: number
}

interface MenuItem {
  icon: string
  labelKey: string
  path: string
  submenu?: { labelKey: string; path: string }[]
}

const menuItems: MenuItem[] = [
  { icon: 'tabler:home', labelKey: 'menu.home', path: '/' },
  { icon: 'tabler:users', labelKey: 'menu.students', path: '/students' },
  { icon: 'tabler:users', labelKey: 'menu.teachers', path: '/teachers', submenu: [
    { labelKey: 'menu.teachers_all', path: '/teachers/all' },
    { labelKey: 'menu.teachers_details', path: '/teachers/details' }
  ]},
  { icon: 'tabler:books', labelKey: 'menu.library', path: '/library' },
  { icon: 'tabler:user', labelKey: 'menu.account', path: '/account' },
  { icon: 'tabler:calendar', labelKey: 'menu.class', path: '/class' },
  { icon: 'tabler:book', labelKey: 'menu.subject', path: '/subject' },
  { icon: 'tabler:calendar-time', labelKey: 'menu.routine', path: '/routine' },
  { icon: 'tabler:clipboard-check', labelKey: 'menu.attendance', path: '/attendance' },
  { icon: 'tabler:file-text', labelKey: 'menu.exam', path: '/exam' },
  { icon: 'tabler:bell', labelKey: 'menu.notice', path: '/notice' },
  { icon: 'tabler:bus', labelKey: 'menu.transport', path: '/transport' },
  { icon: 'tabler:building-skyscraper', labelKey: 'menu.hostel', path: '/hostel' },
]

export function AppLayout({ children }: LayoutProps) {
  const { t, i18n } = useTranslation()

  const toggleLanguage = () => {
    const next = i18n.language === 'zh' ? 'en' : 'zh'
    i18n.changeLanguage(next)
  }

  // TODO: Add router logic for active state. For now, defaulting to first item as visual demo if explicit routing is missing.
  const activePath = '/' 

  return (
    <div className="flex h-screen bg-background font-sans text-foreground">
      {/* Sidebar */}
      <aside className="w-[250px] bg-card border-r border-border flex flex-col shadow-none z-20">
        {/* Logo */}
        <div className="h-20 flex items-center px-8 border-b border-border">
          <div className="flex items-center gap-3">
			<Icon icon="tabler:clock" className="w-8 h-8 text-primary" />
            <span className="font-bold text-2xl text-primary tracking-tight">TimeForge</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {menuItems.map((item, index) => {
            const isActive = item.path === activePath
            
            return (
              <div key={index}>
                <button
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative
                    ${isActive 
                      ? 'bg-[#F3F0FF] text-accent font-semibold' 
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                >
                  {/* Left Active Indicator (Optional based on "solid left border" description, but using soft background style) */}
                  {isActive && (
                     <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-accent rounded-r-full opacity-0" />
                  )}

                  <Icon icon={item.icon} className={`w-5 h-5 ${isActive ? 'text-accent' : 'text-muted-foreground group-hover:text-foreground'}`} />
                  <span className="text-sm">{t(item.labelKey)}</span>
                  
                  {item.submenu && (
                    <Icon icon="tabler:chevron-down" className="w-4 h-4 ml-auto opacity-50" />
                  )}
                </button>
              </div>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background relative">
         {/* Top Navigation */}
        <header className="h-20 bg-background/80 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-10">
          {/* Header Title / Breadcrumbs (Placeholder) */}
          <h2 className="text-xl font-semibold text-foreground hidden md:block">
            {t('menu.home')}
          </h2>

          <div className="flex items-center gap-6 ml-auto">
            {/* Search */}
             <div className="relative w-80 hidden md:block">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary">
                <Icon icon="tabler:search" className="w-5 h-5" />
              </div>
              <Input
                type="text"
                placeholder={t('search.placeholder')}
                className="pl-12 pr-4 h-12 bg-input border-none rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-primary/50 placeholder:text-muted-foreground"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
               <button onClick={toggleLanguage} className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-white shadow-sm hover:shadow-md transition-all border border-transparent hover:border-gray-100">
                  <span className="font-bold text-xs">{i18n.language === 'zh' ? 'EN' : 'ZH'}</span>
               </button>
               
               <button className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-white shadow-sm hover:shadow-md transition-all relative border border-transparent hover:border-gray-100">
                  <Icon icon="tabler:bell" className="w-5 h-5" />
                  <span className="absolute top-2.5 right-3 w-2 h-2 bg-destructive rounded-full border-2 border-white"></span>
               </button>

               <div className="flex items-center gap-3 ml-2 pl-4 border-l border-gray-200">
                 <div className="text-right hidden sm:block">
                    <div className="text-sm font-bold text-foreground">Priscilla Lily</div>
                    <div className="text-xs text-muted-foreground text-right">{t('user.role_admin')}</div>
                 </div>
                 <Avatar className="w-10 h-10 border-2 border-white shadow-sm cursor-pointer">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-primary text-white font-bold">PL</AvatarFallback>
                 </Avatar>
               </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto px-8 py-6">
          <div className="max-w-7xl mx-auto pb-12">
             {children}
          </div>
        </main>
      </div>
    </div>
  )
}

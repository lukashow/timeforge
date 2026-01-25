import { Icon } from '@iconify/react'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Outlet, Link, useLocation, useMatches } from 'react-router-dom'
import { useEffect } from 'react'

import '@/i18n'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'



// Menu item types
interface MenuItem {
  icon: string
  labelKey: string
  path: string
}

interface MenuSection {
  titleKey?: string
  items: MenuItem[]
}

// Menu structure organized by workflow
const menuSections: MenuSection[] = [
  {
    // Quick Start section (no title)
    items: [
      { icon: 'tabler:wand', labelKey: 'menu.wizard', path: '/wizard' },
      { icon: 'tabler:layout-dashboard', labelKey: 'menu.dashboard', path: '/' },
    ],
  },
  {
    titleKey: 'menu.section_resources',
    items: [
      { icon: 'tabler:book', labelKey: 'menu.subjects', path: '/subjects' },
      { icon: 'tabler:users', labelKey: 'menu.teachers', path: '/teachers' },
      { icon: 'tabler:building', labelKey: 'menu.classrooms', path: '/classrooms' },
    ],
  },
  {
    titleKey: 'menu.section_curriculum',
    items: [
      { icon: 'tabler:category', labelKey: 'menu.disciplines', path: '/disciplines' },
      { icon: 'tabler:clipboard-list', labelKey: 'menu.assignments', path: '/assignments' },
    ],
  },
  {
    titleKey: 'menu.section_scheduling',
    items: [
      { icon: 'tabler:clock', labelKey: 'menu.timetable_structure', path: '/timetable-structure' },
      { icon: 'tabler:cpu', labelKey: 'menu.generation', path: '/generation' },
      { icon: 'tabler:table', labelKey: 'menu.timetables', path: '/timetables' },
      { icon: 'tabler:download', labelKey: 'menu.export', path: '/export' },
    ],
  },
]

export function AppLayout() {
  const { t, i18n } = useTranslation()
  const { user, logout } = useAuth()
  const location = useLocation()
  const matches = useMatches()

  const toggleLanguage = () => {
    const next = i18n.language === 'zh' ? 'en' : 'zh'
    i18n.changeLanguage(next)
  }

  // Get current page title based on active route handle
  const currentHandle = matches.find((match) => (match.handle as any)?.titleKey) as any
  const pageTitleKey = currentHandle?.handle?.titleKey || 'menu.dashboard'
  const pageTitle = t(pageTitleKey)

  // Update document title
  useEffect(() => {
    document.title = `${pageTitle} - TimeForge`
  }, [pageTitle])

  return (
    <div className="flex h-screen bg-background font-sans text-foreground">
      {/* Sidebar */}
      <aside className="w-[250px] bg-card border-r border-border flex flex-col shadow-none z-20">
        {/* Logo */}
        <div className="h-20 flex items-center px-8 border-b border-border">
          <Link to="/" className="flex items-center gap-3">
            <img 
              src="/timeforge_logo.svg" 
              alt={t('common.brand')} 
              className="h-18 w-auto"
            />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-4">
          {menuSections.map((section, sectionIndex) => (
            <div key={sectionIndex} className={sectionIndex > 0 ? 'mt-4 pt-4 border-t border-border' : ''}>
              {/* Section Title */}
              {section.titleKey && (
                <div className="px-4 mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t(section.titleKey)}
                  </span>
                </div>
              )}
              
              {/* Section Items */}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = location.pathname === item.path
                  
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group relative
                        ${isActive 
                          ? 'bg-accent/10 text-accent font-semibold' 
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                    >
                      <Icon 
                        icon={item.icon} 
                        className={`w-5 h-5 ${isActive ? 'text-accent' : 'text-muted-foreground group-hover:text-foreground'}`} 
                      />
                      <span className="text-sm">{t(item.labelKey)}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background relative">
         {/* Top Navigation */}
        <header className="h-20 bg-background/80 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-10">
          {/* Header Title */}
          <h2 className="text-xl font-semibold text-foreground hidden md:block">
            {pageTitle}
          </h2>

          <div className="flex items-center gap-6 ml-auto">

            {/* Actions */}
            <div className="flex items-center gap-3">
               <button onClick={toggleLanguage} className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-white shadow-sm hover:shadow-md transition-all border border-transparent hover:border-gray-100">
                  <span className="font-bold text-xs">{i18n.language === 'zh' ? 'EN' : 'ZH'}</span>
               </button>

               {/* User Dropdown */}
               <div className="relative group">
                 <button className="flex items-center gap-3 ml-2 pl-4 border-l border-gray-200 cursor-pointer">
                   <div className="text-right hidden sm:block">
                      <div className="text-sm font-bold text-foreground">{user?.name || t('user.default_name')}</div>
                      <div className="text-xs text-muted-foreground text-right">{user?.email || ''}</div>
                   </div>
                   <Avatar className="w-10 h-10 border-2 border-white shadow-sm">
                      <AvatarImage src={user?.avatar} />
                      <AvatarFallback className="bg-primary text-white font-bold">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                   </Avatar>
                 </button>
                 
                 {/* Dropdown Menu */}
                 <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                   <div className="p-2">
                     <button
                       onClick={logout}
                       className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                     >
                       <Icon icon="tabler:logout" className="w-4 h-4" />
                       {t('auth.logout', '退出登录')}
                     </button>
                   </div>
                 </div>
               </div>
            </div>
          </div>
        </header>

        {/* Page Content - Outlet for router */}
        <main className="flex-1 overflow-auto px-8 py-6">
          <div className="max-w-7xl mx-auto pb-12">
             <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

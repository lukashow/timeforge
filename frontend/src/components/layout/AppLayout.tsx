import type { ReactNode } from 'react'
import { Home, Users, BookOpen, Library, User, Calendar, ClipboardCheck, FileText, Bell, Bus, Building } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

import '@/i18n'
import { useTranslation } from 'react-i18next'

interface LayoutProps {
  children: ReactNode
  currentStep?: number
}

interface MenuItem {
  icon: typeof Home
  labelKey: string
  path: string
  submenu?: { labelKey: string; path: string }[]
}

const menuItems: MenuItem[] = [
  { icon: Home, labelKey: 'menu.home', path: '/' },
  { icon: Users, labelKey: 'menu.students', path: '/students' },
  { icon: Users, labelKey: 'menu.teachers', path: '/teachers', submenu: [
    { labelKey: 'menu.teachers_all', path: '/teachers/all' },
    { labelKey: 'menu.teachers_details', path: '/teachers/details' }
  ]},
  { icon: Library, labelKey: 'menu.library', path: '/library' },
  { icon: User, labelKey: 'menu.account', path: '/account' },
  { icon: Calendar, labelKey: 'menu.class', path: '/class' },
  { icon: BookOpen, labelKey: 'menu.subject', path: '/subject' },
  { icon: Calendar, labelKey: 'menu.routine', path: '/routine' },
  { icon: ClipboardCheck, labelKey: 'menu.attendance', path: '/attendance' },
  { icon: FileText, labelKey: 'menu.exam', path: '/exam' },
  { icon: Bell, labelKey: 'menu.notice', path: '/notice' },
  { icon: Bus, labelKey: 'menu.transport', path: '/transport' },
  { icon: Building, labelKey: 'menu.hostel', path: '/hostel' },
]

export function AppLayout({ children }: LayoutProps) {
  const { t, i18n } = useTranslation()

  const toggleLanguage = () => {
    const next = i18n.language === 'zh' ? 'en' : 'zh'
    i18n.changeLanguage(next)
  }

  return (
    <div className="flex h-screen bg-[#F5F5F7]">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg text-gray-900">SDIK</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {menuItems.map((item, index) => {
            const Icon = item.icon
            
            return (
              <div key={index}>
                <button
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors text-gray-600 hover:bg-gray-50"
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm">{t(item.labelKey)}</span>
                  {item.submenu && (
                    <svg
                      className="w-4 h-4 ml-auto transition-transform"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>
              </div>
            )
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Search */}
            <div className="relative w-96">
              <Input
                type="text"
                placeholder={t('search.placeholder')}
                className="pl-4 pr-10 bg-[#F9FAFB] border-0"
              />
              <svg
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* User Section */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleLanguage}
                  className="px-2 py-1 rounded-md border border-gray-200 text-sm hover:bg-gray-50"
                >
                  {i18n.language === 'zh' ? t('lang.en') : t('lang.zh')}
                </button>
              </div>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </button>
              <div className="flex items-center gap-3">
                <Avatar className="w-9 h-9">
                  <AvatarImage src="" alt="Priscilla Lily" />
                  <AvatarFallback className="bg-primary text-white">PL</AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <div className="font-medium text-gray-900">Priscilla Lily</div>
                  <div className="text-xs text-gray-500">{t('user.role_admin')}</div>
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

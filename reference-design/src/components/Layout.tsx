import React from 'react';
import { Home, Users, BookOpen, Library, User, Calendar, ClipboardCheck, FileText, Bell, Bus, Building } from 'lucide-react';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

interface LayoutProps {
  children: React.ReactNode;
  currentStep?: number;
}

const menuItems = [
  { icon: Home, label: '首页', path: '/' },
  { icon: Users, label: '学生', path: '/students' },
  { icon: Users, label: '教师', path: '/teachers', submenu: [
    { label: '所有教师', path: '/teachers/all' },
    { label: '教师详情', path: '/teachers/details' }
  ]},
  { icon: Library, label: '图书馆', path: '/library' },
  { icon: User, label: '账户', path: '/account' },
  { icon: Calendar, label: '班级', path: '/class' },
  { icon: BookOpen, label: '学科', path: '/subject' },
  { icon: Calendar, label: '课表', path: '/routine' },
  { icon: ClipboardCheck, label: '考勤', path: '/attendance' },
  { icon: FileText, label: '考试', path: '/exam' },
  { icon: Bell, label: '通知', path: '/notice' },
  { icon: Bus, label: '交通', path: '/transport' },
  { icon: Building, label: '宿舍', path: '/hostel' },
];

export function Layout({ children, currentStep }: LayoutProps) {
  const [activeMenu, setActiveMenu] = React.useState('/teachers/all');

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
            const Icon = item.icon;
            const isActive = activeMenu === item.path || (item.submenu && item.submenu.some(sub => sub.path === activeMenu));
            
            return (
              <div key={index}>
                <button
                  onClick={() => setActiveMenu(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                    isActive
                      ? 'text-primary bg-purple-50'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm">{item.label}</span>
                  {item.submenu && (
                    <svg
                      className={`w-4 h-4 ml-auto transition-transform ${isActive ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>
                
                {item.submenu && isActive && (
                  <div className="ml-6 mb-2">
                    {item.submenu.map((subItem, subIndex) => (
                      <button
                        key={subIndex}
                        onClick={() => setActiveMenu(subItem.path)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          activeMenu === subItem.path
                            ? 'text-primary bg-purple-50'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {subItem.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
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
                placeholder="你想找什么？"
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
                  <div className="text-xs text-gray-500">Admin</div>
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
  );
}

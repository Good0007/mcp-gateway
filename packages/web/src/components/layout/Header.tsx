import React from 'react';
import {
  ShoppingBag,
  Settings,
  FileText,
  Database,
  Terminal,
  Moon,
  Sun,
  Bell,
  LogOut,
  Network,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/Logo';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStatus, useLogout } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useI18n';
import { toast } from '@/lib/toast';

interface HeaderProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { id: 'market', label: 'nav.market', icon: ShoppingBag },
  { id: 'services', label: 'nav.services', icon: Settings },
  { id: 'xiaozhi', label: 'nav.connection', icon: Network },
  { id: 'environment', label: 'nav.environment', icon: Terminal },
  { id: 'config', label: 'nav.config', icon: Database },
  { id: 'logs', label: 'nav.logs', icon: FileText },
];

export function Header({ currentPage, onNavigate }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const { data: authStatus } = useAuthStatus();
  const logoutMutation = useLogout();
  const { t, language, setLanguage } = useTranslation();

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      toast.error(t('common.logout_fail'));
      console.error('Logout error:', error);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
      <div className="flex h-16 items-center px-4 sm:px-8">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-8">
          <div className="w-8 h-8 rounded-lg overflow-hidden shadow-md shadow-cyan-500/20">
            <Logo size={32} />
          </div>
          <span className="font-bold text-lg text-gray-900 dark:text-white hidden md:inline-block">
            Mcp Gateway
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex items-center space-x-1 flex-1 overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap cursor-pointer',
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800'
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{t(item.label)}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 ml-4">
          {/* Notifications */}
          <button className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors relative cursor-pointer">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />
          </button>

          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
            className="p-2 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors w-9 h-9 flex items-center justify-center cursor-pointer"
            title={language === 'zh' ? 'Switch to English' : '切换到中文'}
          >
            {language === 'zh' ? 'EN' : '中'}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={cn(
              'p-2 rounded-lg transition-colors cursor-pointer',
              isDark
                ? 'text-amber-400 hover:bg-slate-800'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            )}
            title={isDark ? t('common.theme.light') : t('common.theme.dark')}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Logout */}
          {authStatus?.enabled && authStatus?.authenticated && (
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={t('common.logout')}
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

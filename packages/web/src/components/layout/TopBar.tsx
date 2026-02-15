import { useState, useEffect } from 'react';
import { Moon, Sun, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export function TopBar({ title, subtitle }: TopBarProps) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    const hasDark = document.documentElement.classList.contains('dark');
    if (hasDark !== isDark) setIsDark(hasDark);
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', newDark ? 'dark' : 'light');
  };

  return (
    <header className="h-14 flex items-center justify-between px-8 border-b border-gray-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
      {/* Left: Page title */}
      <div className="min-w-0">
        <h1 className="text-base font-semibold text-gray-900 dark:text-white leading-tight truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{subtitle}</p>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">

        {/* Notifications */}
        <button className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-accent-500 rounded-full" />
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-gray-200 dark:bg-slate-700 mx-1.5" />

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className={cn(
            'p-2 rounded-lg transition-colors',
            isDark
              ? 'text-amber-400 hover:bg-slate-800'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
          )}
          title={isDark ? '切换到亮色模式' : '切换到暗色模式'}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}

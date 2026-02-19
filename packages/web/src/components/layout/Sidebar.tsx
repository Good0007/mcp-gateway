import React from 'react';
import {
  ShoppingBag,
  Globe,
  Settings,
  FileText,
  Database,
  Terminal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAgentStatus } from '@/hooks/useAgent';
import { Logo } from '@/components/Logo';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { id: 'market', label: '插件市场', icon: ShoppingBag },
  { id: 'xiaozhi', label: '小智管理', icon: Globe },
  { id: 'services', label: '服务管理', icon: Settings },
  { id: 'environment', label: '环境检测', icon: Terminal },
  { id: 'config', label: '配置管理', icon: Database },
  { id: 'logs', label: '日志查看', icon: FileText },
];

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { data: status } = useAgentStatus();
  
  const isRunning = status?.running ?? false;
  const isConnected = status?.connected ?? false;
  
  return (
    <aside className="w-56 h-screen flex flex-col bg-white dark:bg-slate-900 border-r border-gray-200/60 dark:border-slate-800">
      {/* Logo */}
      <div className="px-4 py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg overflow-hidden shadow-md shadow-cyan-500/20">
            <Logo size={32} />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-sm text-gray-900 dark:text-white leading-tight tracking-tight">
              MCP Agent
            </h1>
            <p className="text-[10px] text-gray-400 dark:text-slate-500 font-medium">
              v1.0.0
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2.5 py-1 space-y-0.5 overflow-y-auto">
        <div className="px-2 pb-2 pt-1">
          <span className="text-[10px] font-semibold text-gray-400 dark:text-slate-600 uppercase tracking-wider">菜单</span>
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-150',
                isActive
                  ? 'bg-primary-500/10 dark:bg-primary-600/20 text-primary-600 dark:text-primary-300 border border-primary-500/20'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 border border-transparent'
              )}
            >
              <Icon className={cn(
                'w-4 h-4 flex-shrink-0',
                isActive
                  ? 'text-primary-500 dark:text-primary-400'
                  : 'text-gray-400 dark:text-slate-500 group-hover:text-gray-600 dark:group-hover:text-slate-300'
              )} />
              <span className="truncate">{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500 dark:bg-primary-400 shadow-sm shadow-primary-400/50" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer - Status */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full shadow-sm",
            isRunning && isConnected
              ? "bg-emerald-400 shadow-emerald-400/50 animate-pulse"
              : isRunning
              ? "bg-amber-400 shadow-amber-400/50"
              : "bg-gray-300 dark:bg-slate-600"
          )} />
          <span className="text-[11px] text-gray-500 dark:text-slate-500">
            {isRunning && isConnected
              ? "已连接"
              : isRunning
              ? "运行中"
              : "未运行"}
          </span>
          {status?.services && (
            <span className="ml-auto text-[11px] text-gray-400 dark:text-slate-600">
              {status.services.running}/{status.services.total}
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}

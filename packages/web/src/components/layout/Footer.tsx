import { cn } from '@/lib/utils';
import { useAgentStatus } from '@/hooks/useAgent';
import { useTranslation } from '@/hooks/useI18n';

export function Footer() {
  const { t } = useTranslation();
  const { data: status } = useAgentStatus();
  
  const isRunning = status?.running ?? false;
  const isConnected = status?.connected ?? false;

  return (
    <footer className="border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 px-8">
      <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 text-sm">
        <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400">
          <span>© 2026 Mcp Gateway</span>
          <span className="text-gray-300 dark:text-slate-700">|</span>
          <span>v1.0.0</span>
        </div>

        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isRunning && isConnected
              ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
              : isRunning
                ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
          )} />
          <span className={cn(
            "font-medium",
            isRunning && isConnected
              ? "text-emerald-600 dark:text-emerald-400"
              : isRunning
                ? "text-amber-600 dark:text-amber-400"
                : "text-rose-600 dark:text-rose-400"
          )}>
            {isRunning && isConnected ? t('footer.running') : 
             isRunning ? t('footer.disconnected') : 
             t('footer.stopped')}
          </span>
        </div>
      </div>
    </footer>
  );
}

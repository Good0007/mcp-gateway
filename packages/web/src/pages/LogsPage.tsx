import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { Download, Filter, Search, FileText, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { useLogs, useClearLogs } from '@/hooks/useAgent';
import { toast } from '@/lib/toast';

type LogLevel = 'all' | 'error' | 'warn' | 'info' | 'debug';

function LogLevelBadge({ level }: { level: LogLevel }) {
  if (level === 'all') return null;

  const variants = {
    error: 'bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/20',
    warn: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/20',
    info: 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/20',
    debug: 'bg-gray-500/10 dark:bg-slate-500/20 text-gray-600 dark:text-slate-400 border-gray-500/20',
  };

  return (
    <Badge className={`text-[9px] px-1.5 py-0 font-medium border ${variants[level]}`}>
      {level.toUpperCase()}
    </Badge>
  );
}

export function LogsPage() {
  const [logLevel, setLogLevel] = useState<LogLevel>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch logs with filters
  const { data, isLoading, error, refetch } = useLogs(
    {
      level: logLevel === 'all' ? undefined : logLevel,
      search: searchQuery || undefined,
      limit: 500,
    },
    autoRefresh ? 3000 : undefined // Refresh every 3 seconds if auto-refresh is enabled
  );

  // Clear logs mutation
  const clearLogsMutation = useClearLogs();

  const logs = data?.logs || [];
  const bufferSize = data?.bufferSize || 0;

  const handleExportLogs = () => {
    // Export logs as JSON file
    const dataStr = JSON.stringify(logs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mcp-agent-logs-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('日志已导出');
  };

  const handleClearLogs = async () => {
    try {
      await clearLogsMutation.mutateAsync();
      toast.success('日志已清空');
    } catch (error: any) {
      toast.error(error.message || '清空日志失败');
    }
  };

  return (
    <div className="space-y-3">
      {/* 控制栏 */}
      <Card className="dark:bg-slate-900 dark:border-slate-800">
        <CardContent className="p-3">
          <div className="flex flex-col gap-2">
            {/* 第一行：搜索和筛选 */}
            <div className="flex flex-col md:flex-row gap-2">
              {/* 搜索 */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-600" />
                <input
                  type="text"
                  placeholder="搜索日志内容、服务名称..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-10 pr-3.5 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/40 transition-all placeholder:text-gray-400 dark:placeholder:text-slate-600"
                />
              </div>

              {/* 日志级别筛选 */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400 dark:text-slate-600" />
                <select
                  value={logLevel}
                  onChange={(e) => setLogLevel(e.target.value as LogLevel)}
                  className="h-9 px-3 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/40 transition-all"
                >
                  <option value="all">所有级别</option>
                  <option value="error">错误</option>
                  <option value="warn">警告</option>
                  <option value="info">信息</option>
                  <option value="debug">调试</option>
                </select>
              </div>
            </div>

            {/* 第二行：操作按钮 */}
            <div className="flex items-center gap-1.5">
              {/* 自动刷新开关 */}
              <Button
                variant={autoRefresh ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className="gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
                {autoRefresh ? '自动刷新' : '手动模式'}
              </Button>

              {/* 手动刷新按钮 */}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => refetch()}
                className="gap-2"
                disabled={isLoading}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                刷新
              </Button>

              <div className="flex-1" />

              {/* 清空日志 */}
              <Button
                variant="secondary"
                size="sm"
                onClick={handleClearLogs}
                disabled={clearLogsMutation.isPending || logs.length === 0}
                className="gap-2"
              >
                {clearLogsMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                清空
              </Button>

              {/* 导出按钮 */}
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportLogs}
                disabled={logs.length === 0}
                className="gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                导出
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 日志列表 */}
      <Card className="dark:bg-slate-900 dark:border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-3.5 h-3.5" />
            系统日志
            <span className="text-[10px] font-normal text-gray-500 dark:text-slate-500">
              （共 {logs.length} 条 / 缓存 {bufferSize} 条）
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && logs.length === 0 ? (
            <div className="flex items-center justify-center h-48">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                <p className="text-sm text-gray-500 dark:text-slate-500">加载日志...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-48">
              <div className="text-center space-y-2">
                <p className="text-sm text-red-500">加载日志失败</p>
                <p className="text-xs text-gray-500 dark:text-slate-500">
                  {error instanceof Error ? error.message : '未知错误'}
                </p>
                <Button variant="secondary" size="sm" onClick={() => refetch()} className="mt-2">
                  重试
                </Button>
              </div>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-xs text-gray-500 dark:text-slate-500">
                {searchQuery || logLevel !== 'all' ? '未找到匹配的日志' : '暂无日志记录'}
              </p>
            </div>
          ) : (
            <div className="space-y-0.5 max-h-[600px] overflow-y-auto">
              {logs.map((log, index) => {
                // 只显示时间部分，不显示日期
                const timeOnly = log.timestamp.split(' ')[1] || log.timestamp.substring(11, 19);
                return (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors font-mono text-[11px]"
                  >
                    {/* 时间戳（仅时间） */}
                    <span className="text-gray-400 dark:text-slate-600 flex-shrink-0 w-[60px]">
                      {timeOnly}
                    </span>

                    {/* 日志级别 */}
                    <div className="flex-shrink-0 w-[48px]">
                      <LogLevelBadge level={log.level} />
                    </div>

                    {/* 服务名 */}
                    {log.service && (
                      <span className="text-primary-600 dark:text-primary-400 flex-shrink-0 max-w-[80px] truncate">
                        {log.service}
                      </span>
                    )}

                    {/* 日志内容 */}
                    <span className="text-gray-700 dark:text-slate-300 flex-1 truncate">
                      {log.message}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

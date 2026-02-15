import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Download, Loader } from 'lucide-react';
import { usePlugins } from '@/hooks/useAgent';
import { useState } from 'react';

export function MarketPage() {
  const { data, isLoading, error } = usePlugins();
  const [searchQuery, setSearchQuery] = useState('');

  const plugins = data?.plugins || [];
  const filteredPlugins = plugins.filter(plugin => 
    plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    plugin.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader className="w-8 h-8 animate-spin text-primary-500" />
          <p className="text-sm text-gray-500 dark:text-slate-500">加载插件列表中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <p className="text-sm text-red-500">加载插件失败</p>
          <p className="text-xs text-gray-500 dark:text-slate-500">
            {error instanceof Error ? error.message : '未知错误'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 搜索和筛选 */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="搜索插件名称、功能..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 h-9 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/40 transition-all placeholder:text-gray-400 dark:placeholder:text-slate-600"
        />
        <Button variant="primary" size="sm" disabled>搜索</Button>
      </div>

      {/* 插件列表 */}
      {filteredPlugins.length === 0 ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-sm text-gray-500 dark:text-slate-500">
            {searchQuery ? '未找到匹配的插件' : '暂无可用插件'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlugins.map((plugin) => (
            <Card key={plugin.id} className="group hover:shadow-md dark:hover:shadow-primary-500/5 transition-all duration-200 hover:-translate-y-0.5 dark:bg-slate-900 dark:border-slate-800">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">{plugin.name}</CardTitle>
                  {plugin.official && (
                    <Badge variant="info" className="text-[10px]">官方</Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-500 line-clamp-2 mt-1">
                  {plugin.description}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-slate-600">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="font-medium text-gray-600 dark:text-slate-400">{plugin.rating}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      <span>{plugin.downloads}</span>
                    </span>
                  </div>
                  <span>v{plugin.version}</span>
                </div>
                <Button variant="primary" className="w-full" size="sm" disabled>
                  安装插件
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

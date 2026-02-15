import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Download } from 'lucide-react';

const plugins = [
  {
    id: 'calculator',
    name: 'Calculator',
    description: '提供基础数学计算功能',
    version: '1.0.0',
    downloads: '1.2k',
    rating: 4.8,
    official: true,
  },
  {
    id: 'filesystem',
    name: 'Filesystem',
    description: '文件系统操作工具集',
    version: '2.1.0',
    downloads: '3.5k',
    rating: 4.9,
    official: true,
  },
  {
    id: 'brave-search',
    name: 'Brave Search',
    description: '集成 Brave 搜索引擎',
    version: '1.5.2',
    downloads: '890',
    rating: 4.6,
    official: true,
  },
];

export function MarketPage() {
  return (
    <div className="space-y-5">
      {/* 搜索和筛选 */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="搜索插件名称、功能..."
          className="flex-1 h-9 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/40 transition-all placeholder:text-gray-400 dark:placeholder:text-slate-600"
        />
        <Button variant="primary" size="sm">搜索</Button>
      </div>

      {/* 插件列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plugins.map((plugin) => (
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
              <Button variant="primary" className="w-full" size="sm">
                安装插件
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Code, Loader, Package, Search, Star, ExternalLink, Info, Github, Download, CheckCircle, Trash2 } from 'lucide-react';
import { usePlugins, useServices, usePluginDetail, useAddService, useDeleteService } from '@/hooks/useAgent';
import { useState, useMemo, useEffect } from 'react';
import { extractMCPConfigsFromDetail, convertToServiceConfig } from '@/utils/mcp-config-parser';
import type { ExtractedMCPConfig } from '@/utils/mcp-config-parser';

// MCP World API 数据结构
interface MCPServer {
  id: string;
  serverName: string;
  description: string;
  serverIcon: string;
  serverUrl: string;
  labels: string[];
  creator: string;
  updateTime: string;
  star: number;
  favoritesNumber: number;
  level: string;
}

interface CategoryTag {
  key: string;
  name: string;
  value: string;
  total: number;
  darkIcon?: string;
  lightIcon?: string;
}

interface APICategory {
  name?: string;
  tags: CategoryTag[];
}

interface MCPWorldData {
  category: APICategory[];
  count: number;
  mcpList: Array<{
    query: string;
    total: number;
    servers: MCPServer[];
  }>;
}

export function MarketPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);

  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const pageSize = 30;

  // 简单的通知状态
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 重置页码当搜索词变化时
  useEffect(() => {
    setCurrentPage(0);
  }, [debouncedSearchQuery]);

  // 构建查询参数
  const queryParams = useMemo(() => {
    // 如果有搜索词，优先使用搜索模式
    if (debouncedSearchQuery) {
      return {
        wd: debouncedSearchQuery,
        type: 'normal',
        pn: currentPage,
        lg: 'zh',
        pl: pageSize,
      };
    }
    // 否则使用分类浏览模式
    return {
      wd: selectedCategory,
      type: 'tag',
      pn: currentPage,
      lg: 'zh',
      pl: pageSize,
    };
  }, [debouncedSearchQuery, selectedCategory, currentPage, pageSize]);

  // 根据分类和页码获取数据
  const { data, isLoading, error } = usePlugins(queryParams);
  const { data: servicesData } = useServices();
  
  // 获取详情
  const { data: detailData, isLoading: isDetailLoading } = usePluginDetail(selectedServerId);
  
  // 添加服务
  const addServiceMutation = useAddService();
  const deleteServiceMutation = useDeleteService();

  // 环境变量状态：Key 是 serverKey (config ID), Value 是 env 对象
  const [envValues, setEnvValues] = useState<Record<string, Record<string, string>>>({});
  // Args 参数状态：Key 是 serverKey
  const [argsValues, setArgsValues] = useState<Record<string, string>>({});
  // 显示原始 JSON 状态：Key 是 serverKey, Value 是 true/false
  const [showRawJson, setShowRawJson] = useState<Record<string, boolean>>({});

  // 当详情数据加载完成后，初始化环境变量状态
  useEffect(() => {
    if (detailData?.detail) {
      const configs = extractMCPConfigsFromDetail(detailData.detail.abstract);
      const initialEnvs: Record<string, Record<string, string>> = {};
      const initialArgs: Record<string, string> = {};
      
      configs.forEach(config => {
        if (config.config.env) {
          initialEnvs[config.serverKey] = { ...config.config.env };
        }
        // 将 args 数组转换为字符串
        initialArgs[config.serverKey] = config.config.args.join(' ');
      });
      
      setEnvValues(initialEnvs);
      setArgsValues(initialArgs);
      setShowRawJson({}); // 重置显示的 JSON 状态
    }
  }, [detailData]);

  // 处理环境变量变更
  const handleEnvChange = (serverKey: string, envKey: string, value: string) => {
    setEnvValues(prev => ({
      ...prev,
      [serverKey]: {
        ...prev[serverKey],
        [envKey]: value
      }
    }));
  };

  // 处理 Args 变更
  const handleArgsChange = (serverKey: string, value: string) => {
    setArgsValues(prev => ({
      ...prev,
      [serverKey]: value
    }));
  };

  // 切换显示原始 JSON
  // const toggleRawJson = (serverKey: string) => {
  //   setShowRawJson(prev => ({
  //     ...prev,
  //     [serverKey]: !prev[serverKey]
  //   }));
  // };

  const mcpData = data as MCPWorldData | undefined;
  const installedServices = servicesData?.services || [];

  // 提取分类列表（功能分类）
  const categories = useMemo(() => {
    if (!mcpData?.category) return [];
    // 查找"功能分类"组
    const funcCategory = mcpData.category.find(cat => cat.name === '功能分类');
    return funcCategory?.tags || [];
  }, [mcpData]);

  // 提取服务列表和总数
  const { servers, totalServers } = useMemo(() => {
    if (!mcpData?.mcpList || mcpData.mcpList.length === 0) return { servers: [], totalServers: 0 };
    
    // 不同模式下数据结构可能略有差异，但通常核心都在 mcpList[0].servers
    const serverList = mcpData.mcpList[0]?.servers || [];
    const total = mcpData.mcpList[0]?.total || 0;
    
    return { servers: serverList, totalServers: total };
  }, [mcpData]);

  // 前端过滤已不再需要，因为现在是后端搜索
  // 但为了保持渲染逻辑不变，我们保留 filteredServers 变量名，直接指向 servers
  const filteredServers = servers;

  // 统计和分页
  const stats = useMemo(() => {
    // 这里的 total 取自接口返回的 totalServers
    const total = totalServers;
    const totalPages = Math.ceil(total / pageSize);
    
    return {
      totalCategories: categories.length || 0,
      totalServers: mcpData?.count || 0,
      currentPageServers: servers.length,
      filteredCount: total, // 显示总结果数
      totalPages,
      currentPage: currentPage + 1,
    };
  }, [categories, mcpData, totalServers, servers, currentPage, pageSize]);

  // 切换分类时重置页码
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(0);
  };

  // 翻页
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 检查服务是否已安装
  const isServiceInstalled = (serverId: string) => {
    return installedServices.some((s: any) => s.id === serverId);
  };

  // 打开详情对话框
  const handleOpenDetail = (serverId: string) => {
    setSelectedServerId(serverId);
    setIsDetailDialogOpen(true);
  };

  // 关闭详情对话框
  const handleCloseDetail = () => {
    setIsDetailDialogOpen(false);
    // 立即清除选中的服务 ID，避免关闭后继续请求
    setSelectedServerId(null);
  };

  // 提取配置并安装
  const handleInstallFromDetail = (config: ExtractedMCPConfig) => {
    if (!detailData?.detail) return;

    // 优先使用用户输入的环境变量
    const userEnv = envValues[config.serverKey] || config.config.env;
    
    // 校验环境变量
    const hasUnsetPlaceholders = userEnv 
      ? Object.values(userEnv).some(val => val.trim().startsWith('<') && val.trim().endsWith('>'))
      : false;
      
    if (hasUnsetPlaceholders) {
      setNotification({
        message: '请填写必要的环境变量，替换 <...> 占位符',
        type: 'error'
      });
      return;
    }
    
    // 处理 args：如果用户修改了，则使用修改后的值，否则使用默认值
    let userArgs = config.config.args;
    if (argsValues[config.serverKey] !== undefined) {
      // 简单的按空格分割，支持基本的参数解析
      // TODO: 更复杂的参数解析（如带引号的参数）可能需要专门的库
      userArgs = argsValues[config.serverKey].trim().split(/\s+/).filter(arg => arg.length > 0);
    }

    const serviceConfig = convertToServiceConfig(
      detailData.detail.serverName,
      {
        ...config,
        config: {
          ...config.config,
          args: userArgs,
          env: userEnv
        }
      },
      {
        description: detailData.detail.description,
        icon: detailData.detail.serverIcon,
        url: detailData.detail.serverUrl,
      }
    );

    addServiceMutation.mutate(serviceConfig as any, {
      onSuccess: () => {
        // 安装成功后关闭对话框
        handleCloseDetail();
        // 提示用户启动服务
        setNotification({
          message: `服务 ${config.serverKey} 已安装，请前往服务管理页面启动它。`,
          type: 'success'
        });
      },
      onError: (error) => {
        console.error('Failed to install service:', error);
        setNotification({
          message: `安装失败: ${error instanceof Error ? error.message : '未知错误'}`,
          type: 'error'
        });
      },
    });
  };

  // 处理删除服务
  const handleRemoveService = (serviceId: string) => {
    if (confirm('确定要移除该服务吗？这将不仅从配置中移除，还会停止相关进程。')) {
      deleteServiceMutation.mutate(serviceId, {
        onSuccess: () => {
          setNotification({
            message: `服务 ${serviceId} 已移除`,
            type: 'success'
          });
        },
        onError: (error) => {
          console.error('Failed to remove service:', error);
          setNotification({
            message: `移除失败: ${error instanceof Error ? error.message : '未知错误'}`,
            type: 'error'
          });
        }
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader className="w-8 h-8 animate-spin text-primary-500" />
          <p className="text-sm text-gray-500 dark:text-slate-500">加载插件市场中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <p className="text-sm text-red-500">加载插件市场失败</p>
          <p className="text-xs text-gray-500 dark:text-slate-500">
            {error instanceof Error ? error.message : '未知错误'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed bottom-8 right-8 z-50 px-4 py-3 rounded-md shadow-lg border flex items-center gap-2 transition-all duration-300 transform translate-y-0 ${
          notification.type === 'error' 
            ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400' 
            : 'bg-green-50 border-green-200 text-green-600 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
        }`}>
          {notification.type === 'error' ? <Info className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* 头部统计 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-primary-500" />
            <span className="text-sm text-gray-600 dark:text-slate-400">
              {stats.totalCategories} 个分类
            </span>
          </div>
          <div className="text-sm text-gray-400 dark:text-slate-600">·</div>
          <span className="text-sm text-gray-600 dark:text-slate-400">
            {stats.totalServers.toLocaleString()} 个服务
          </span>
          {searchQuery || selectedCategory !== 'all' ? (
            <>
              <div className="text-sm text-gray-400 dark:text-slate-600">·</div>
              <span className="text-sm text-primary-600 dark:text-primary-400">
                显示 {stats.filteredCount} 个结果
              </span>
            </>
          ) : null}
        </div>
      </div>

      {/* 搜索和分类筛选 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-600" />
          <input
            type="text"
            placeholder="搜索插件名称、功能、作者..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3.5 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/40 transition-all placeholder:text-gray-400 dark:placeholder:text-slate-600"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Button
            variant={selectedCategory === 'all' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => handleCategoryChange('all')}
          >
            全部
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.key}
              variant={selectedCategory === cat.key ? 'primary' : 'outline'}
              size="sm"
              onClick={() => handleCategoryChange(cat.key)}
            >
              {cat.name} {cat.total > 0 && `(${cat.total})`}
            </Button>
          ))}
        </div>
      </div>

      {/* 服务列表 */}
      {filteredServers.length === 0 ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-sm text-gray-500 dark:text-slate-500">
            {searchQuery || selectedCategory !== 'all' ? '未找到匹配的服务' : '暂无可用服务'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServers.map((server) => {
            const installed = isServiceInstalled(server.id);
            return (
              <Card
                key={server.id}
                className="group hover:shadow-md dark:hover:shadow-primary-500/5 transition-all duration-200 hover:-translate-y-0.5 dark:bg-slate-900 dark:border-slate-800"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    {/* 图标 */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-slate-800">
                      {server.serverIcon ? (
                        <img
                          src={server.serverIcon}
                          alt={server.serverName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48"%3E%3Crect fill="%23ddd" width="48" height="48"/%3E%3C/svg%3E';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <Package className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">
                          {server.serverName}
                        </CardTitle>
                        {server.level && (
                          <Badge
                            variant={server.level === 'A' ? 'success' : 'info'}
                            className="text-[10px] flex-shrink-0"
                          >
                            {server.level}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-slate-500 mt-0.5">
                        by {server.creator}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-slate-400 line-clamp-2 mt-2 leading-relaxed">
                    {server.description}
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {/* 标签 */}
                  {server.labels && server.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {server.labels.slice(0, 3).map((label, idx) => (
                        <Badge key={idx} variant="default" className="text-[10px] px-1.5 py-0.5">
                          {label}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* 统计信息 */}
                  <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-slate-600">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="font-medium text-gray-600 dark:text-slate-400">
                          {server.star > 1000 ? `${(server.star / 1000).toFixed(1)}k` : server.star}
                        </span>
                      </span>
                      <span className="flex items-center gap-1">
                        ❤️ {server.favoritesNumber}
                      </span>
                    </div>
                    <span className="text-[10px]">{server.updateTime}</span>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-2">
                    {installed && (
                      <Badge variant="success" className="text-[10px] px-2 py-1 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        已添加
                      </Badge>
                    )}
                    <div className="flex-1 flex gap-2">
                      {/* 详情图标按钮 */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-9 h-9 p-0"
                        onClick={() => handleOpenDetail(server.id)}
                        title="查看详情和配置"
                      >
                        <Info className="w-4 h-4" />
                      </Button>
                      
                      {/* GitHub 按钮 */}
                      {server.serverUrl && (
                        <Button
                          variant="outline"
                          className="flex-1"
                          size="sm"
                          onClick={() => window.open(server.serverUrl, '_blank')}
                        >
                          <Github className="w-3 h-3 mr-1.5" />
                          GitHub
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 详情对话框 */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {isDetailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-primary-500" />
            </div>
          ) : detailData?.detail ? (
            <>
              <DialogHeader>
                <div className="flex items-start gap-4">
                  {detailData.detail.serverIcon && (
                    <img
                      src={detailData.detail.serverIcon}
                      alt={detailData.detail.serverName}
                      className="w-16 h-16 rounded-lg object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect fill="%23ddd" width="64" height="64"/%3E%3C/svg%3E';
                      }}
                    />
                  )}
                  <div className="flex-1">
                    <DialogTitle className="text-xl">{detailData.detail.serverName}</DialogTitle>
                    <DialogDescription className="mt-2">
                      {detailData.detail.description}
                    </DialogDescription>
                    <div className="flex items-center gap-3 mt-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        {detailData.detail.star.toLocaleString()}
                      </span>
                      <span>by {detailData.detail.creator}</span>
                      {detailData.detail.level && (
                        <Badge variant={detailData.detail.level === 'A' ? 'success' : 'info'}>
                          {detailData.detail.level}
                        </Badge>
                      )}
                    </div>
                    {/* GitHub Link for Title Area */}
                    {detailData.detail.serverUrl && (
                      <a 
                        href={detailData.detail.serverUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-primary-500 dark:hover:text-primary-400 mt-2 w-fit transition-colors"
                      >
                        <Github className="w-3.5 h-3.5" />
                        <span>查看源码仓库</span>
                        <ExternalLink className="w-3 h-3 text-gray-300 dark:text-gray-600" />
                      </a>
                    )}
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* 提取的配置 */}
                {(() => {
                  const configs = extractMCPConfigsFromDetail(detailData.detail.abstract);
                  const supportedConfigs = configs.filter((c) => c.supported);
                  const unsupportedConfigs = configs.filter((c) => !c.supported);

                  if (configs.length === 0) {
                    return (
                      <div className="text-center py-8 space-y-3">
                        <p className="text-sm text-gray-500 dark:text-slate-500">
                          未找到可用的配置信息
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(detailData.detail.serverUrl, '_blank')}
                        >
                          <ExternalLink className="w-3 h-3 mr-1.5" />
                          访问 GitHub 查看详细配置
                        </Button>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {/* 支持的配置 */}
                      {supportedConfigs.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            可安装配置
                          </h3>
                          {supportedConfigs.map((config, idx) => {
                            const isInstalled = isServiceInstalled(config.serverKey);
                            // 检查当前配置的环境变量是否都已填好
                            // 优先从 state 获取，如果没有（尚未初始化），则使用默认配置
                            const currentEnvs = envValues[config.serverKey] || config.config.env || {};
                            
                            // 检查是否所有值都有效（不含 <...> 占位符且不为空）
                            // 注意：有些配置可能没有 env，此时 config.config.env 为 undefined/null，认为有效
                            const hasValidEnv = !config.config.env || Object.entries(currentEnvs).every(([_, val]) => val && val.trim() !== '' && !val.includes('<'));
                            const isShowingRaw = showRawJson[config.serverKey];

                            return (
                            <Card key={idx} className="bg-gray-50 dark:bg-slate-800 transition-all duration-200">
                              <CardContent className="p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <code className="text-xs bg-white dark:bg-slate-900 px-2 py-1 rounded border border-gray-100 dark:border-slate-700">
                                      {config.serverKey}
                                    </code>
                                    {isInstalled && (
                                      <Badge variant="success" className="text-[10px] px-2 py-0.5">
                                        已安装
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-3">
                                    <div className="flex border rounded overflow-hidden bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 h-6">
                                      <button
                                        className={`px-2 text-[10px] transition-colors ${
                                          !isShowingRaw 
                                            ? 'bg-gray-100 dark:bg-slate-800 font-medium text-gray-900 dark:text-gray-100' 
                                            : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800/50'
                                        }`}
                                        onClick={() => setShowRawJson(prev => ({...prev, [config.serverKey]: false}))}
                                      >
                                        配置
                                      </button>
                                      <div className="w-[1px] bg-gray-200 dark:bg-slate-700" />
                                      <button
                                        className={`px-2 text-[10px] transition-colors flex items-center gap-1 ${
                                          isShowingRaw 
                                            ? 'bg-gray-100 dark:bg-slate-800 font-medium text-gray-900 dark:text-gray-100' 
                                            : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800/50'
                                        }`}
                                        onClick={() => setShowRawJson(prev => ({...prev, [config.serverKey]: true}))}
                                      >
                                        <Code className="w-3 h-3" />
                                        JSON
                                      </button>
                                    </div>

                                    {isInstalled ? (
                                    <Button
                                      variant="danger"
                                      size="sm"
                                      onClick={() => handleRemoveService(config.serverKey)}
                                      disabled={deleteServiceMutation.isPending}
                                      className="h-8"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                      {deleteServiceMutation.isPending ? '移除中...' : '移除服务'}
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      onClick={() => handleInstallFromDetail(config)}
                                      disabled={addServiceMutation.isPending || !hasValidEnv}
                                      className="h-8"
                                      title={!hasValidEnv ? '请配置必填环境变量' : '点击安装'}
                                    >
                                      <Download className="w-3.5 h-3.5 mr-1.5" />
                                      {addServiceMutation.isPending ? '安装中...' : '安装服务'}
                                    </Button>
                                  )}
                                  </div>
                                </div>
                                
                                {isShowingRaw ? (
                                  <div className="relative">
                                    <pre className="text-[10px] bg-gray-900 text-gray-100 p-3 rounded-md overflow-x-auto font-mono scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                                      {/* 如果有提取的 source 且是 JSON 格式，则显示 source，或者重新生成 JSON */}
                                      {config.rawJson ? config.rawJson : JSON.stringify({
                                        mcpServers: {
                                          [config.serverKey]: {
                                            command: config.config.command,
                                            args: config.config.args,
                                            env: config.config.env
                                          }
                                        }
                                      }, null, 2)}
                                    </pre>
                                    <div className="text-[10px] text-gray-500 text-right mt-1">
                                      * 可复制到 claude_desktop_config.json 使用
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-xs space-y-2">
                                    <div className="flex gap-2 items-center">
                                      <span className="text-gray-500 dark:text-slate-500 w-20 flex-shrink-0">Command:</span>
                                      <code className="flex-1 bg-white dark:bg-slate-900 px-2 py-1.5 rounded border border-gray-100 dark:border-slate-700 font-mono text-gray-600 dark:text-slate-300">
                                        {config.config.command}
                                      </code>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                      <span className="text-gray-500 dark:text-slate-500 w-20 flex-shrink-0">Args:</span>
                                      {isInstalled ? (
                                        <code className="flex-1 bg-white dark:bg-slate-900 px-2 py-1.5 rounded border border-gray-100 dark:border-slate-700 font-mono text-gray-600 dark:text-slate-300 overflow-x-auto whitespace-nowrap scrollbar-hide">
                                          {config.config.args.join(' ')}
                                        </code>
                                      ) : (
                                        <input
                                          type="text"
                                          value={argsValues[config.serverKey] ?? config.config.args.join(' ')}
                                          onChange={(e) => handleArgsChange(config.serverKey, e.target.value)}
                                          className="flex-1 h-8 px-2 text-xs font-mono rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors"
                                          placeholder="输入参数，以空格分隔"
                                        />
                                      )}
                                    </div>
                                    {/* 环境变量配置区域 */}
                                    {config.config.env && Object.keys(config.config.env).length > 0 && (
                                      <div className="flex gap-2 items-start mt-2 pt-2 border-t border-gray-100 dark:border-slate-700/50">
                                        <span className="text-gray-500 dark:text-slate-500 w-20 flex-shrink-0 pt-2 font-medium">Env:</span>
                                        <div className="flex-1 space-y-2">
                                          {Object.keys(config.config.env).map((envKey) => {
                                            const val = currentEnvs[envKey] || '';
                                            const isPlaceholder = val.includes('<') && val.includes('>');
                                            
                                            return (
                                              <div key={envKey} className="space-y-1">
                                                <label className="text-[10px] text-gray-500 font-mono block mb-0.5">
                                                  {envKey}
                                                  {isPlaceholder && <span className="text-red-500 ml-1">*</span>}
                                                </label>
                                                {isInstalled ? (
                                                  <code className="block bg-white dark:bg-slate-900 px-2 py-1.5 rounded border border-gray-100 dark:border-slate-700 font-mono text-gray-600">
                                                    {config.config.env![envKey]} (已固定)
                                                  </code>
                                                ) : (
                                                  <div className="relative">
                                                    <input
                                                      type="text"
                                                      value={val}
                                                      onChange={(e) => handleEnvChange(config.serverKey, envKey, e.target.value)}
                                                      className={`w-full h-8 px-2 text-xs font-mono rounded border bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors ${
                                                        isPlaceholder 
                                                          ? 'border-red-300 focus:border-red-500 bg-red-50/30' 
                                                          : 'border-gray-200 dark:border-slate-700 focus:border-primary-500'
                                                      }`}
                                                      placeholder={`请输入 ${envKey}`}
                                                    />
                                                    {isPlaceholder && (
                                                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-red-500 font-medium bg-white px-1">
                                                        需配置
                                                      </span>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                          {!isInstalled && !hasValidEnv && (
                                            <p className="text-[10px] text-red-500 mt-1 flex items-center gap-1">
                                              <Info className="w-3 h-3" />
                                              请替换所有带红色标记的环境变量值（如 &lt;YOUR_API_KEY&gt;）以继续安装
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          )})}
                        </div>
                      )}

                      {/* 不支持的配置 */}
                      {unsupportedConfigs.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            其他配置方式
                          </h3>
                          {unsupportedConfigs.map((config, idx) => (
                            <Card key={idx} className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                              <CardContent className="p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <code className="text-xs bg-white dark:bg-slate-900 px-2 py-1 rounded">
                                    {config.serverKey}
                                  </code>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(detailData.detail.serverUrl, '_blank')}
                                  >
                                    <ExternalLink className="w-3 h-3 mr-1.5" />
                                    访问 GitHub
                                  </Button>
                                </div>
                                <div className="text-xs space-y-1">
                                  <div className="flex gap-2">
                                    <span className="text-gray-500 dark:text-slate-500 w-20">Command:</span>
                                    <code className="flex-1 bg-white dark:bg-slate-900 px-2 py-0.5 rounded">
                                      {config.config.command}
                                    </code>
                                  </div>
                                  <div className="flex gap-2">
                                    <span className="text-gray-500 dark:text-slate-500 w-20">Args:</span>
                                    <code className="flex-1 bg-white dark:bg-slate-900 px-2 py-0.5 rounded">
                                      {config.config.args.join(' ')}
                                    </code>
                                  </div>
                                  {config.config.env && Object.keys(config.config.env).length > 0 && (
                                    <div className="flex gap-2">
                                      <span className="text-gray-500 dark:text-slate-500 w-20">Env:</span>
                                      <div className="flex-1 space-y-0.5">
                                        {Object.entries(config.config.env).map(([key, value]) => (
                                          <code key={key} className="block bg-white dark:bg-slate-900 px-2 py-0.5 rounded">
                                            {key}={value}
                                          </code>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-3 py-2 rounded">
                                  <span className="mt-0.5">⚠️</span>
                                  <p>
                                    此配置需要 {config.config.command === 'python' ? 'Python' : config.config.command === 'docker' ? 'Docker' : config.config.command.toUpperCase()} 环境，
                                    当前仅支持 npx 和 uvx 安装方式。请访问 GitHub 查看详细安装说明。
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 质量指标 */}
                {detailData.detail.levelDetail && detailData.detail.levelDetail.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      质量指标
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {detailData.detail.levelDetail.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-xs p-2 rounded bg-gray-50 dark:bg-slate-800"
                        >
                          <Badge
                            variant={
                              item.status === 'PASSED'
                                ? 'success'
                                : item.status === 'FAILED'
                                ? 'error'
                                : 'default'
                            }
                            className="text-[10px]"
                          >
                            {item.status}
                          </Badge>
                          <span className="text-gray-700 dark:text-slate-300">{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500">加载失败</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 分页 */}
      {stats.totalPages > 1 && !searchQuery && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 0}
          >
            上一页
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(stats.totalPages, 7) }, (_, i) => {
              let pageNum: number;
              if (stats.totalPages <= 7) {
                // 总页数 <= 7，显示所有页码
                pageNum = i;
              } else if (currentPage < 3) {
                // 当前页靠前
                pageNum = i;
              } else if (currentPage > stats.totalPages - 4) {
                // 当前页靠后
                pageNum = stats.totalPages - 7 + i;
              } else {
                // 当前页居中
                pageNum = currentPage - 3 + i;
              }

              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => handlePageChange(pageNum)}
                  className="min-w-[2rem]"
                >
                  {pageNum + 1}
                </Button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= stats.totalPages - 1}
          >
            下一页
          </Button>
          <span className="text-xs text-gray-500 dark:text-slate-500 ml-2">
            第 {stats.currentPage} / {stats.totalPages} 页
          </span>
        </div>
      )}
    </div>
  );
}

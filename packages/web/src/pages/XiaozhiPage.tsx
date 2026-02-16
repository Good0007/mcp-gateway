import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAgentStatus, useTools, useServices } from '@/hooks/useAgent';
import { useEndpoints, useAddEndpoint, useRemoveEndpoint, useSelectEndpoint } from '@/hooks/useWebConfig';
import { Loader, CheckCircle2, XCircle, RefreshCw, Zap, Wrench, Settings, Loader2, Plus, Trash2, ExternalLink, ChevronDown, Play, Square, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/lib/toast';
import type { Tool } from '@mcp-agent/shared';

export function XiaozhiPage() {
  const { data: status, isLoading, error, refetch } = useAgentStatus();
  const { data: tools } = useTools();
  const { data: servicesData, isLoading: servicesLoading } = useServices();

  // 使用新的端点管理 hooks
  const { data: endpointsData, isLoading: endpointsLoading } = useEndpoints();
  const addEndpointMutation = useAddEndpoint();
  const removeEndpointMutation = useRemoveEndpoint();
  const selectEndpointMutation = useSelectEndpoint();

  // UI 状态
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  
  // 表单状态
  const [newEndpointName, setNewEndpointName] = useState('');
  const [newEndpointUrl, setNewEndpointUrl] = useState('');

  const endpoints = endpointsData?.endpoints || [];
  const selectedEndpointId = endpointsData?.currentEndpointId || '';

  // 添加新端点
  const handleAddEndpoint = async () => {
    if (!newEndpointName.trim() || !newEndpointUrl.trim()) {
      toast.error('请填写完整的端点信息');
      return;
    }

    try {
      await addEndpointMutation.mutateAsync({
        name: newEndpointName.trim(),
        url: newEndpointUrl.trim(),
        isDefault: endpoints.length === 0, // 第一个端点设为默认
      });
      
      // 清空表单
      setNewEndpointName('');
      setNewEndpointUrl('');
      
      toast.success('端点添加成功');
    } catch (error: any) {
      toast.error(error.message || '添加端点失败');
    }
  };

  // 删除端点
  const handleDeleteEndpoint = async (id: string) => {
    try {
      await removeEndpointMutation.mutateAsync(id);
      toast.success('端点删除成功');
    } catch (error: any) {
      toast.error(error.message || '删除端点失败');
    }
  };

  // 切换端点连接
  const handleSwitchEndpoint = async (id: string) => {
    setIsDropdownOpen(false);
    
    try {
      await selectEndpointMutation.mutateAsync(id);
      toast.success('端点切换成功');
      
      // 刷新连接状态
      refetch();
    } catch (error: any) {
      toast.error(error.message || '切换端点失败');
    }
  };

  const handleReconnect = async () => {
    console.log('重连 Xiaozhi 服务');
    refetch();
  };

  // 综合加载状态
  if (isLoading || endpointsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader className="w-8 h-8 animate-spin text-primary-500" />
          <p className="text-sm text-gray-500 dark:text-slate-500">加载连接状态...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <XCircle className="w-10 h-10 text-red-500 mx-auto" />
          <p className="text-sm text-red-500">加载状态失败</p>
          <p className="text-xs text-gray-500 dark:text-slate-500">
            {error instanceof Error ? error.message : '未知错误'}
          </p>
        </div>
      </div>
    );
  }

  const xiaozhi = status?.xiaozhi;
  const isConnected = xiaozhi?.connected ?? false;
  const selectedEndpoint = endpoints.find(ep => ep.id === selectedEndpointId);
  const services = servicesData?.services || [];
  const runningServices = services.filter(s => s.status === 'running');
  
  // 按服务分组工具
  const toolsByService = (tools?.tools || []).reduce((acc, tool) => {
    const serviceId = tool.serviceId || 'unknown';
    if (!acc[serviceId]) {
      acc[serviceId] = [];
    }
    acc[serviceId].push(tool);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-6">
      {/* Tabs 容器 */}
      <Tabs defaultValue="connection" className="w-full">
        <TabsList>
          <TabsTrigger value="connection" className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            连接状态
          </TabsTrigger>
          <TabsTrigger value="endpoints" className="gap-2">
            <Settings className="w-4 h-4" />
            端点管理
          </TabsTrigger>
        </TabsList>

        {/* 连接状态标签页 */}
        <TabsContent value="connection">
          <div className="space-y-6">
            {/* 连接状态卡片 */}
            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardContent className="space-y-4 pt-6">
                {/* 连接状态 */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    {isConnected ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-gray-400 dark:text-slate-600" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        连接状态
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-500">
                        {isConnected ? '已连接到 Xiaozhi 服务' : '未连接'}
                      </p>
                    </div>
                  </div>
                  <Badge
                    className={`text-[10px] font-medium border ${
                      isConnected
                        ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                        : 'bg-gray-500/10 dark:bg-slate-500/20 text-gray-600 dark:text-slate-400 border-gray-500/20'
                    }`}
                  >
                    {isConnected ? '已连接' : '未连接'}
                  </Badge>
                </div>

                {/* 端点选择器 */}
                {endpoints.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700 dark:text-slate-300">
                      选择端点
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <button
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          className="w-full flex items-center justify-between h-10 px-3.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-primary-500/50 dark:hover:border-primary-500/50 transition-colors text-left"
                        >
                          <span className="text-sm text-gray-900 dark:text-white flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5 text-primary-500" />
                            {selectedEndpoint?.name || '选择端点'}
                          </span>
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {isDropdownOpen && (
                          <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden">
                            {endpoints.map((endpoint) => (
                              <button
                                key={endpoint.id}
                                onClick={() => handleSwitchEndpoint(endpoint.id)}
                                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors border-b border-gray-100 dark:border-slate-800 last:border-0 ${
                                  selectedEndpointId === endpoint.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                                }`}
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {endpoint.name}
                                  </p>
                                </div>
                                {selectedEndpointId === endpoint.id && (
                                  <CheckCircle2 className="w-4 h-4 text-primary-500 ml-2 flex-shrink-0" />
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleReconnect}
                        disabled={selectEndpointMutation.isPending}
                        className="gap-2 flex-shrink-0"
                      >
                        {selectEndpointMutation.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        切换并重连
                      </Button>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-slate-500">
                      选择端点后点击按钮切换连接
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 运行中的服务及其工具 */}
            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                      运行中的服务
                    </CardTitle>
                    <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                      显示当前运行的服务及其提供的工具
                    </p>
                  </div>
                  <Badge variant="default" className="text-xs">
                    {runningServices.length} 个服务
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {servicesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                      <p className="text-sm text-gray-500 dark:text-slate-500">加载服务列表...</p>
                    </div>
                  </div>
                ) : runningServices.length > 0 ? (
                  <div className="space-y-3">
                    {runningServices.map((service) => {
                      const serviceTools = toolsByService[service.id] || [];
                      return (
                        <div
                          key={service.id}
                          className="p-4 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-primary-500/30 dark:hover:border-primary-500/30 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center mt-0.5">
                              <Play className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {service.name}
                                </h4>
                                <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                  运行中
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-600 dark:text-slate-400 mb-3">
                                {service.description || '无描述'}
                              </p>
                              {/* 工具标签 */}
                              <ServiceToolsList 
                                tools={serviceTools} 
                                onToolClick={(tool) => setSelectedTool(tool)}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Square className="w-10 h-10 text-gray-300 dark:text-slate-700 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      暂无运行中的服务
                    </p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                      请在"服务配置"页面启动服务
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 使用说明 */}
            <Card className="dark:bg-slate-900 dark:border-slate-800 border-blue-200/50 dark:border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <h4 className="text-xs font-semibold text-gray-900 dark:text-white">
                      关于 Xiaozhi 服务
                    </h4>
                    <p className="text-[11px] text-gray-600 dark:text-slate-400 leading-relaxed">
                      Xiaozhi 是 MCP Agent 的 AI 对话服务，负责处理用户交互和智能决策。
                      您可以在"端点管理"标签页中添加多个端点，并在此处快速切换。
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 端点管理标签页 */}
        <TabsContent value="endpoints">
          <div className="space-y-6">
            {/* 添加端点表单 */}
            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                  添加新端点
                </CardTitle>
                <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                  添加 Xiaozhi 服务的访问端点
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="端点名称"
                    placeholder="例如：本地开发环境"
                    value={newEndpointName}
                    onChange={(e) => setNewEndpointName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddEndpoint();
                      }
                    }}
                  />
                  <Input
                    label="端点 URL"
                    placeholder="例如：http://localhost:3000"
                    value={newEndpointUrl}
                    onChange={(e) => setNewEndpointUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddEndpoint();
                      }
                    }}
                  />
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAddEndpoint}
                  disabled={!newEndpointName.trim() || !newEndpointUrl.trim() || addEndpointMutation.isPending}
                  className="w-full gap-2"
                >
                  {addEndpointMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {addEndpointMutation.isPending ? '添加中...' : '添加端点'}
                </Button>
              </CardContent>
            </Card>

            {/* 端点列表 */}
            <Card className="dark:bg-slate-900 dark:border-slate-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                      已保存的端点
                    </CardTitle>
                    <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                      管理您保存的 Xiaozhi 服务端点
                    </p>
                  </div>
                  <Badge variant="default" className="text-xs">
                    {endpoints.length} 个端点
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {endpoints.length > 0 ? (
                  <div className="space-y-2">
                    {endpoints.map((endpoint) => (
                      <div
                        key={endpoint.id}
                        className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                          selectedEndpointId === endpoint.id
                            ? 'border-primary-500/50 bg-primary-500/5 dark:bg-primary-500/10'
                            : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="flex-1 min-w-0 mr-3">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                              {endpoint.name}
                            </h4>
                            {selectedEndpointId === endpoint.id && (
                              <Badge className="text-[10px] bg-primary-500/10 text-primary-600 dark:text-primary-400 border-primary-500/20">
                                当前使用
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 dark:text-slate-400 mt-1 font-mono truncate">
                            {endpoint.url}
                          </p>
                          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
                            添加于 {new Date(endpoint.createdAt).toLocaleDateString('zh-CN')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={endpoint.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                            title="在新窗口打开"
                          >
                            <ExternalLink className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                          </a>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleDeleteEndpoint(endpoint.id)}
                            disabled={removeEndpointMutation.isPending}
                            className="gap-1.5"
                          >
                            {removeEndpointMutation.isPending ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                            删除
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Settings className="w-10 h-10 text-gray-300 dark:text-slate-700 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      暂无已保存的端点
                    </p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                      请在上方表单中添加 Xiaozhi 服务端点
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 使用提示 */}
            <Card className="dark:bg-slate-900 dark:border-slate-800 border-amber-200/50 dark:border-amber-500/20">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center">
                      <Settings className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <h4 className="text-xs font-semibold text-gray-900 dark:text-white">
                      端点管理说明
                    </h4>
                    <p className="text-[11px] text-gray-600 dark:text-slate-400 leading-relaxed">
                      您可以添加多个 Xiaozhi 服务端点（例如本地开发、测试环境、生产环境），
                      并在"连接状态"标签页中快速切换。端点信息由系统统一管理，支持配置导出备份。
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* 工具详情弹窗 */}
      {selectedTool && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedTool(null);
          }}
        >
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* 标题栏 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedTool.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTool(null)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-slate-400" />
              </button>
            </div>

            {/* 内容区 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* 描述 */}
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-slate-300 mb-1 block">描述</label>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  {selectedTool.description || '无描述'}
                </p>
              </div>

              {/* 参数列表 */}
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-slate-300 mb-2 block">
                  参数 ({Object.keys(selectedTool.parameters || {}).length})
                </label>
                {Object.keys(selectedTool.parameters || {}).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(selectedTool.parameters).map(([key, param]) => (
                      <div
                        key={key}
                        className="p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-mono font-semibold text-gray-900 dark:text-white">
                            {key}
                          </span>
                          {param.required && (
                            <Badge className="text-[9px] bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
                              必填
                            </Badge>
                          )}
                          <Badge className="text-[9px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                            {param.type}
                          </Badge>
                        </div>
                        {param.description && (
                          <p className="text-xs text-gray-600 dark:text-slate-400 mb-2">
                            {param.description}
                          </p>
                        )}
                        {param.enum && (
                          <div className="text-xs text-gray-500 dark:text-slate-500">
                            <span className="font-medium">可选值:</span>{' '}
                            <span className="font-mono">{JSON.stringify(param.enum)}</span>
                          </div>
                        )}
                        {param.default !== undefined && (
                          <div className="text-xs text-gray-500 dark:text-slate-500">
                            <span className="font-medium">默认值:</span>{' '}
                            <span className="font-mono">{JSON.stringify(param.default)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-slate-500 italic">无参数</p>
                )}
              </div>

              {/* JSON Schema */}
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-slate-300 mb-2 block">
                  完整定义 (JSON)
                </label>
                <pre className="text-xs bg-gray-900 dark:bg-black text-gray-100 p-3 rounded-lg overflow-x-auto">
                  <code>{JSON.stringify(selectedTool, null, 2)}</code>
                </pre>
              </div>
            </div>

            {/* 底部 */}
            <div className="p-4 border-t border-gray-200 dark:border-slate-800 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setSelectedTool(null)}>
                关闭
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 服务工具列表组件（带展开/折叠）
function ServiceToolsList({ tools, onToolClick }: { tools: any[]; onToolClick: (tool: Tool) => void }) {
  const [expanded, setExpanded] = useState(false);

  if (tools.length === 0) {
    return (
      <p className="text-[11px] text-gray-400 dark:text-slate-500 italic">
        暂无工具
      </p>
    );
  }

  const displayTools = expanded ? tools : tools.slice(0, 10);

  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="text-[11px] text-gray-500 dark:text-slate-500 mr-1">
        工具:
      </span>
      {displayTools.map((tool, idx) => (
        <button
          key={`${tool.serviceId}-${tool.name}-${idx}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToolClick(tool);
          }}
          className="text-[10px] px-2 py-0.5 bg-primary-500/5 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 border border-primary-500/20 hover:bg-primary-500/15 dark:hover:bg-primary-500/25 transition-colors cursor-pointer rounded-md inline-flex items-center gap-1"
          title={tool.description || tool.name}
        >
          <Wrench className="w-2.5 h-2.5" />
          {tool.name}
        </button>
      ))}
      {tools.length > 10 && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="text-[10px] px-2 py-0.5 bg-gray-500/5 dark:bg-slate-500/10 text-gray-600 dark:text-slate-400 border border-gray-500/20 hover:bg-gray-500/10 dark:hover:bg-slate-500/20 transition-colors cursor-pointer rounded-md inline-flex items-center gap-1"
          title={expanded ? '收起' : '展开全部'}
        >
          {expanded ? '收起' : `+${tools.length - 10} 更多`}
        </button>
      )}
    </div>
  );
}

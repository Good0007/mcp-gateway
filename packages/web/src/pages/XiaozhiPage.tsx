import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAgentStatus, useTools, useServices } from '@/hooks/useAgent';
import { useEndpoints, useAddEndpoint, useRemoveEndpoint, useSelectEndpoint } from '@/hooks/useWebConfig';
import { useTranslation } from '@/hooks/useI18n';
import { Loader, CheckCircle2, XCircle, RefreshCw, Zap, Wrench, Settings, Loader2, Plus, Trash2, ExternalLink, ChevronDown, Play, Square, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/lib/toast';
import type { Tool } from '@mcp-gateway/shared';

interface ToolWithService extends Tool {
  serviceId?: string;
}

export function XiaozhiPage() {
  const { t, language } = useTranslation();
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
      toast.error(t('xiaozhi.toast.fill_endpoint_info'));
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
      
      toast.success(t('xiaozhi.toast.endpoint_added'));
    } catch (error) {
      toast.error((error instanceof Error ? error.message : String(error)) || t('xiaozhi.toast.add_failed'));
    }
  };

  // 删除端点
  const handleDeleteEndpoint = async (id: string) => {
    try {
      await removeEndpointMutation.mutateAsync(id);
      toast.success(t('xiaozhi.toast.endpoint_deleted'));
    } catch (error) {
      toast.error((error instanceof Error ? error.message : String(error)) || t('xiaozhi.toast.delete_failed'));
    }
  };

  // 切换端点连接
  const handleSwitchEndpoint = async (id: string) => {
    setIsDropdownOpen(false);
    
    try {
      await selectEndpointMutation.mutateAsync(id);
      toast.success(t('xiaozhi.toast.endpoint_switched'));
      
      // 刷新连接状态
      refetch();
    } catch (error) {
      toast.error((error instanceof Error ? error.message : String(error)) || t('xiaozhi.toast.switch_failed'));
    }
  };

  const handleReconnect = async () => {
    console.log('Reconnecting Xiaozhi service');
    refetch();
  };

  // 综合加载状态
  if (isLoading || endpointsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader className="w-8 h-8 animate-spin text-primary-500" />
          <p className="text-sm text-gray-500 dark:text-slate-500">{t('xiaozhi.loading.connection')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <XCircle className="w-10 h-10 text-red-500 mx-auto" />
          <p className="text-sm text-red-500">{t('xiaozhi.error.load_status')}</p>
          <p className="text-xs text-gray-500 dark:text-slate-500">
            {error instanceof Error ? error.message : t('xiaozhi.error.unknown')}
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
  const toolsByService = ((tools?.tools || []) as ToolWithService[]).reduce((acc, tool) => {
    const serviceId = tool.serviceId || 'unknown';
    if (!acc[serviceId]) {
      acc[serviceId] = [];
    }
    acc[serviceId].push(tool);
    return acc;
  }, {} as Record<string, ToolWithService[]>);

  return (
    <div className="space-y-6">
      {/* Tabs 容器 */}
      <Tabs defaultValue="connection" className="w-full">
        <TabsList>
          <TabsTrigger value="connection" className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {t('xiaozhi.tab.connection')}
          </TabsTrigger>
          <TabsTrigger value="endpoints" className="gap-2">
            <Settings className="w-4 h-4" />
            {t('xiaozhi.tab.endpoints')}
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
                        {t('xiaozhi.connection.status')}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-500">
                        {isConnected ? t('xiaozhi.connection.connected') : t('xiaozhi.connection.disconnected')}
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
                    {isConnected ? t('xiaozhi.connection.connected_short') : t('xiaozhi.connection.disconnected_short')}
                  </Badge>
                </div>

                {/* 端点选择器 */}
                {endpoints.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700 dark:text-slate-300">
                      {t('xiaozhi.endpoint.select')}
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <button
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          className="w-full flex items-center justify-between h-10 px-3.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-primary-500/50 dark:hover:border-primary-500/50 transition-colors text-left cursor-pointer"
                        >
                          <span className="text-sm text-gray-900 dark:text-white flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5 text-primary-500" />
                            {selectedEndpoint?.name || t('xiaozhi.endpoint.select_placeholder')}
                          </span>
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {isDropdownOpen && (
                          <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden">
                            {endpoints.map((endpoint) => (
                              <button
                                key={endpoint.id}
                                onClick={() => handleSwitchEndpoint(endpoint.id)}
                                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors border-b border-gray-100 dark:border-slate-800 last:border-0 cursor-pointer ${
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
                        {t('xiaozhi.endpoint.switch_reconnect')}
                      </Button>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-slate-500">
                      {t('xiaozhi.endpoint.switch_hint')}
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
                      {t('xiaozhi.services.running')}
                    </CardTitle>
                    <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                      {t('xiaozhi.services.running_desc')}
                    </p>
                  </div>
                  <Badge variant="default" className="text-xs">
                    {t('xiaozhi.services.count', { count: runningServices.length })}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {servicesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                      <p className="text-sm text-gray-500 dark:text-slate-500">{t('xiaozhi.services.loading')}</p>
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
                                  {t('xiaozhi.services.status.running')}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-600 dark:text-slate-400 mb-3">
                                {service.description || t('xiaozhi.services.no_desc')}
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
                      {t('xiaozhi.services.empty')}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                      {t('xiaozhi.services.empty_hint')}
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
                      {t('xiaozhi.about.title')}
                    </h4>
                    <p className="text-[11px] text-gray-600 dark:text-slate-400 leading-relaxed">
                      {t('xiaozhi.about.desc')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 端点管理标签页 */}
        <TabsContent value="endpoints">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左侧：添加端点 */}
            <div className="space-y-6">
              <Card className="dark:bg-slate-900 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5 text-primary-500" />
                    {t('xiaozhi.endpoint.add.title')}
                  </CardTitle>
                  <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                    {t('xiaozhi.endpoint.add.desc')}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-slate-300">{t('xiaozhi.endpoint.add.name_label')}</label>
                    <Input
                      id="name"
                      placeholder={t('xiaozhi.endpoint.add.name_placeholder')}
                      value={newEndpointName}
                      onChange={(e) => setNewEndpointName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="url" className="text-sm font-medium text-gray-700 dark:text-slate-300">{t('xiaozhi.endpoint.add.url_label')}</label>
                    <Input
                      id="url"
                      placeholder={t('xiaozhi.endpoint.add.url_placeholder')}
                      value={newEndpointUrl}
                      onChange={(e) => setNewEndpointUrl(e.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full gap-2"
                    onClick={handleAddEndpoint}
                    disabled={addEndpointMutation.isPending}
                  >
                    {addEndpointMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    {addEndpointMutation.isPending ? t('xiaozhi.endpoint.add.button_loading') : t('xiaozhi.endpoint.add.button')}
                  </Button>
                </CardContent>
              </Card>

              {/* 说明卡片 */}
              <Card className="bg-primary-50/50 dark:bg-primary-900/10 border-primary-100 dark:border-primary-900/30">
                <CardContent className="pt-6">
                  <div className="flex gap-3">
                    <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 h-fit">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                        {t('xiaozhi.endpoint.manage_desc.title')}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
                        {t('xiaozhi.endpoint.manage_desc.text')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 右侧：端点列表 */}
            <Card className="h-full dark:bg-slate-900 dark:border-slate-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5 text-primary-500" />
                      {t('xiaozhi.endpoint.list.title')}
                    </CardTitle>
                    <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                      {t('xiaozhi.endpoint.list.desc')}
                    </p>
                  </div>
                  <Badge variant="default" className="border border-gray-200 dark:border-slate-700 bg-transparent text-gray-900 dark:text-white">
                    {t('xiaozhi.endpoint.list.count', { count: endpoints.length })}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {endpoints.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-lg">
                      <Settings className="w-10 h-10 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                        {t('xiaozhi.endpoint.list.empty')}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-500">
                        {t('xiaozhi.endpoint.list.empty_hint')}
                      </p>
                    </div>
                  ) : (
                    endpoints.map((endpoint) => (
                      <div
                        key={endpoint.id}
                        className={`group relative flex items-start justify-between p-4 rounded-lg border transition-all duration-200 ${
                          endpoint.id === selectedEndpointId
                            ? 'bg-primary-50/50 dark:bg-primary-900/10 border-primary-200 dark:border-primary-900/30 shadow-sm'
                            : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 hover:border-gray-200 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                            endpoint.id === selectedEndpointId
                              ? 'bg-primary-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                              : 'bg-gray-300 dark:bg-slate-600'
                          }`} />
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                {endpoint.name}
                              </h4>
                              {endpoint.id === selectedEndpointId && (
                                <Badge variant="default" className="text-[10px] h-4 px-1.5 bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                                  {t('xiaozhi.endpoint.list.current')}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-500 font-mono bg-gray-50 dark:bg-slate-800 px-1.5 py-0.5 rounded w-fit">
                              {endpoint.url}
                            </div>
                            <p className="text-[10px] text-gray-400 dark:text-slate-600 pt-1">
                              {t('xiaozhi.endpoint.list.added_at', { date: new Date(endpoint.createdAt).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US') })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20"
                            onClick={() => window.open(endpoint.url, '_blank')}
                            title={t('xiaozhi.endpoint.list.open_new_window')}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => handleDeleteEndpoint(endpoint.id)}
                            disabled={removeEndpointMutation.isPending}
                            title={t('xiaozhi.endpoint.list.delete')}
                          >
                            {removeEndpointMutation.isPending ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
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
                <label className="text-xs font-medium text-gray-700 dark:text-slate-300 mb-1 block">{t('xiaozhi.tool.modal.desc')}</label>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  {selectedTool.description || t('xiaozhi.services.no_desc')}
                </p>
              </div>

              {/* 参数列表 */}
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-slate-300 mb-2 block">
                  {t('xiaozhi.tool.modal.params', { count: Object.keys(selectedTool.parameters || {}).length })}
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
                            <Badge variant="default" className="text-[9px] bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
                              {t('xiaozhi.tool.modal.required')}
                            </Badge>
                          )}
                          <Badge variant="default" className="text-[9px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
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
                            <span className="font-medium">{t('xiaozhi.tool.modal.optional_values')}</span>{' '}
                            <span className="font-mono">{JSON.stringify(param.enum)}</span>
                          </div>
                        )}
                        {param.default !== undefined && (
                          <div className="text-xs text-gray-500 dark:text-slate-500">
                            <span className="font-medium">{t('xiaozhi.tool.modal.default_value')}</span>{' '}
                            <span className="font-mono">{JSON.stringify(param.default)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-slate-500 italic">{t('xiaozhi.tool.modal.no_params')}</p>
                )}
              </div>

              {/* JSON Schema */}
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-slate-300 mb-2 block">
                  {t('xiaozhi.tool.modal.full_def')}
                </label>
                <pre className="text-xs bg-gray-900 dark:bg-black text-gray-100 p-3 rounded-lg overflow-x-auto">
                  <code>{JSON.stringify(selectedTool, null, 2)}</code>
                </pre>
              </div>
            </div>

            {/* 底部 */}
            <div className="p-4 border-t border-gray-200 dark:border-slate-800 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setSelectedTool(null)}>
                {t('xiaozhi.tool.modal.close')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 服务工具列表组件（带展开/折叠）
function ServiceToolsList({ tools, onToolClick }: { tools: ToolWithService[]; onToolClick: (tool: Tool) => void }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  if (tools.length === 0) {
    return (
      <p className="text-[11px] text-gray-400 dark:text-slate-500 italic">
        {t('xiaozhi.tool.list.empty')}
      </p>
    );
  }

  const displayTools = expanded ? tools : tools.slice(0, 10);

  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="text-[11px] text-gray-500 dark:text-slate-500 mr-1">
        {t('xiaozhi.tool.list.label')}
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
          title={expanded ? t('xiaozhi.tool.list.collapse') : t('xiaozhi.tool.list.expand')}
        >
          {expanded ? t('xiaozhi.tool.list.collapse') : t('xiaozhi.tool.list.more', { count: tools.length - 10 })}
        </button>
      )}
    </div>
  );
}

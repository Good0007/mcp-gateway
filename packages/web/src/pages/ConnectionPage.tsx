import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAgentStatus } from '@/hooks/useAgent';
import { 
  useEndpoints, 
  useAddEndpoint, 
  useRemoveEndpoint, 
  useSelectEndpoint,
  useMcpProxy, 
  useUpdateMcpProxy, 
  useGenerateProxyToken 
} from '@/hooks/useWebConfig';
import { 
  Loader, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Zap, 
  Settings, 
  Loader2, 
  Plus, 
  Trash2, 
  ChevronDown, 
  Network, 
  Server, 
  Activity, 
  Shield, 
  Copy, 
  Power, 
  Info,
  Plug,
  Code,
  Eye,
  EyeOff
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from '@/lib/toast';
import { useTranslation } from '@/hooks/useI18n';
import type { McpProxyStatusResponse } from '@mcp-agent/shared';

export function ConnectionPage() {
  const { t } = useTranslation();
  // ==================== Client (Xiaozhi) Hooks ====================
  const { data: status, isLoading, refetch } = useAgentStatus();
  const { data: endpointsData, isLoading: endpointsLoading } = useEndpoints();
  const addEndpointMutation = useAddEndpoint();
  const removeEndpointMutation = useRemoveEndpoint();
  const selectEndpointMutation = useSelectEndpoint();

  // ==================== Server (Proxy) Hooks ====================
  const { data: mcpProxyData, isLoading: mcpProxyLoading } = useMcpProxy();
  const updateMcpProxy = useUpdateMcpProxy();
  const generateToken = useGenerateProxyToken();
  const proxyConfig = mcpProxyData?.mcpProxy;

  // ==================== UI States ====================
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [newEndpointName, setNewEndpointName] = useState('');
  const [newEndpointUrl, setNewEndpointUrl] = useState('');
  
  const [proxyStatus, setProxyStatus] = useState<McpProxyStatusResponse | null>(null);
  const [proxyLoading, setProxyLoading] = useState(false);
  const [showToken, setShowToken] = useState(false);

  // ==================== Client Logic ====================
  const endpoints = endpointsData?.endpoints || [];
  const selectedEndpointId = endpointsData?.currentEndpointId || '';
  const xiaozhi = status?.xiaozhi;
  const isConnected = xiaozhi?.connected ?? false;
  const selectedEndpoint = endpoints.find(ep => ep.id === selectedEndpointId);

  const handleAddEndpoint = async () => {
    if (!newEndpointName.trim() || !newEndpointUrl.trim()) {
      toast.error(t('connection.toast.fill_all'));
      return;
    }

    try {
      await addEndpointMutation.mutateAsync({
        name: newEndpointName.trim(),
        url: newEndpointUrl.trim(),
        isDefault: endpoints.length === 0,
      });
      setNewEndpointName('');
      setNewEndpointUrl('');
      toast.success(t('connection.toast.add_success'));
    } catch (error) {
      toast.error((error instanceof Error ? error.message : String(error)) || t('connection.toast.add_fail'));
    }
  };

  const handleDeleteEndpoint = async (id: string) => {
    try {
      await removeEndpointMutation.mutateAsync(id);
      toast.success(t('connection.toast.delete_success'));
    } catch (error) {
      toast.error((error instanceof Error ? error.message : String(error)) || t('connection.toast.delete_fail'));
    }
  };

  const handleSwitchEndpoint = async (id: string) => {
    setIsDropdownOpen(false);
    try {
      await selectEndpointMutation.mutateAsync(id);
      toast.success(t('connection.toast.switch_success'));
      refetch();
    } catch (error) {
      toast.error((error instanceof Error ? error.message : String(error)) || t('connection.toast.switch_fail'));
    }
  };

  // ==================== Server Logic ====================
  const fetchProxyStatus = async () => {
    setProxyLoading(true);
    try {
      const response = await fetch('/mcp/status');
      if (response.ok) {
        const data = await response.json();
        setProxyStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch proxy status:', error);
    } finally {
      setProxyLoading(false);
    }
  };

  useEffect(() => {
    fetchProxyStatus();
  }, []);

  // ==================== Render ====================
  if (isLoading || endpointsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader className="w-8 h-8 animate-spin text-primary-500" />
          <p className="text-sm text-gray-500 dark:text-slate-500">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{t('connection.title')}</h1>
        <p className="text-gray-500 dark:text-slate-400">{t('connection.subtitle')}</p>
      </div>

      <Tabs defaultValue="client" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="client" className="gap-2">
            <Network className="w-4 h-4" />
            {t('connection.client')}
          </TabsTrigger>
          <TabsTrigger value="server" className="gap-2">
            <Server className="w-4 h-4" />
            {t('connection.server')}
          </TabsTrigger>
        </TabsList>

        {/* ==================== Client Tab (Xiaozhi) ==================== */}
        <TabsContent value="client" className="space-y-6">
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="w-5 h-5 text-primary-500" />
                {t('connection.agent.status')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                      {t('connection.status.label')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-500">
                      {isConnected ? t('connection.status.connected_msg') : t('connection.status.disconnected')}
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
                  {isConnected ? t('connection.status.connected') : t('connection.status.disconnected')}
                </Badge>
              </div>

              {/* 端点选择器 */}
              {endpoints.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700 dark:text-slate-300">
                    {t('connection.endpoint.select')}
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="w-full flex items-center justify-between h-10 px-3.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-primary-500/50 dark:hover:border-primary-500/50 transition-colors text-left cursor-pointer"
                      >
                        <span className="text-sm text-gray-900 dark:text-white flex items-center gap-2">
                          <Zap className="w-3.5 h-3.5 text-primary-500" />
                          {selectedEndpoint?.name || t('connection.endpoint.select')}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      
                      {isDropdownOpen && (
                        <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden">
                          {endpoints.map((ep) => (
                            <button
                              key={ep.id}
                              onClick={() => handleSwitchEndpoint(ep.id)}
                              className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                                ep.id === selectedEndpointId
                                  ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                                  : 'text-gray-700 dark:text-slate-300'
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <Zap className={`w-3.5 h-3.5 ${ep.id === selectedEndpointId ? 'text-primary-500' : 'text-gray-400'}`} />
                                {ep.name}
                              </span>
                              {ep.id === selectedEndpointId && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-primary-500" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <Button
                      variant="secondary"
                      onClick={() => refetch()}
                      disabled={isLoading}
                      className="gap-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                      {t('connection.endpoint.switch')}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 端点管理 */}
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="w-5 h-5 text-gray-500" />
                {t('connection.endpoint.config')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 添加新端点 */}
              <div className="space-y-4 p-4 rounded-lg bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary-500" />
                  {t('connection.endpoint.add')}
                </h4>
                
                <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 p-3 border border-blue-100 dark:border-blue-800/30">
                  <div className="flex gap-2">
                    <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                    <div className="text-xs text-blue-700 dark:text-blue-300">
                      <span className="font-semibold block mb-1">{t('connection.endpoint.instruction.title')}</span>
                      {t('connection.endpoint.instruction.content')}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 dark:text-slate-400">{t('connection.endpoint.name')}</label>
                    <Input
                      placeholder="e.g. Xiaozhi Production"
                      value={newEndpointName}
                      onChange={(e) => setNewEndpointName(e.target.value)}
                      className="bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 dark:text-slate-400">{t('connection.endpoint.url')}</label>
                    <Input
                      placeholder="ws://localhost:8080"
                      value={newEndpointUrl}
                      onChange={(e) => setNewEndpointUrl(e.target.value)}
                      className="bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button 
                    onClick={handleAddEndpoint}
                    disabled={addEndpointMutation.isPending}
                    className="gap-2"
                    size="sm"
                  >
                    {addEndpointMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    {t('connection.endpoint.add_btn')}
                  </Button>
                </div>
              </div>

              {/* 端点列表 */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  {t('connection.endpoint.saved')}
                </h4>
                {endpoints.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-slate-500 text-sm bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-gray-200 dark:border-slate-700">
                    {t('connection.endpoint.empty')}
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {endpoints.map((ep) => (
                      <div
                        key={ep.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            ep.id === selectedEndpointId
                              ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                              : 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            <Zap className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {ep.name}
                              </span>
                              {ep.id === selectedEndpointId && (
                                <Badge className="text-[10px] h-5 px-1.5 bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700">
                                  {t('connection.endpoint.current')}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 max-w-[300px] sm:max-w-[400px]">
                              <p className="text-xs text-gray-500 dark:text-slate-500 font-mono mt-0.5 truncate" title={ep.url}>
                                {ep.url}
                              </p>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                onClick={() => {
                                  navigator.clipboard.writeText(ep.url);
                                  toast.success(t('connection.toast.copy_success'));
                                }}
                                title={t('connection.endpoint.copy')}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {ep.id !== selectedEndpointId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSwitchEndpoint(ep.id)}
                              disabled={selectEndpointMutation.isPending}
                              className="text-gray-500 hover:text-primary-600"
                            >
                              {t('connection.endpoint.switch_btn')}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteEndpoint(ep.id)}
                            disabled={removeEndpointMutation.isPending || endpoints.length <= 1}
                            className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title={t('connection.endpoint.delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== Server Tab (Proxy) ==================== */}
        <TabsContent value="server" className="space-y-6">
          {/* 代理状态概览 */}
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Server className="w-5 h-5 text-primary-500" />
                  {t('connection.proxy.title')}
                </CardTitle>
                <Button
                  variant={proxyConfig?.enabled !== false ? 'primary' : 'outline'}
                  size="sm"
                  className="gap-2"
                  disabled={mcpProxyLoading || updateMcpProxy.isPending}
                  onClick={() => updateMcpProxy.mutate({ enabled: proxyConfig?.enabled === false ? true : false })}
                >
                  <Power className="w-4 h-4" />
                  {proxyConfig?.enabled !== false ? t('connection.proxy.enabled') : t('connection.proxy.disabled')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {proxyLoading || mcpProxyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                </div>
              ) : proxyStatus ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className={`p-4 rounded-lg border ${proxyConfig?.enabled !== false ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-500/20' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-500/20'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-medium ${proxyConfig?.enabled !== false ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                          {t('connection.proxy.status')}
                        </span>
                        <Activity className={`w-4 h-4 ${proxyConfig?.enabled !== false ? 'text-emerald-500' : 'text-red-500'}`} />
                      </div>
                      <Badge className={proxyConfig?.enabled !== false ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}>
                        {proxyConfig?.enabled !== false ? t('connection.proxy.running') : t('connection.proxy.disabled')}
                      </Badge>
                    </div>

                    <div className="p-4 rounded-lg bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
                          {t('connection.proxy.auth')}
                        </span>
                        <Shield className="w-4 h-4 text-gray-400 dark:text-slate-600" />
                      </div>
                      <Badge className={proxyConfig?.token ? 'bg-blue-500 text-white' : 'bg-gray-400 text-white'}>
                        {proxyConfig?.token ? t('connection.proxy.auth.set') : t('connection.proxy.auth.unset')}
                      </Badge>
                    </div>

                    <div className="p-4 rounded-lg bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
                          {t('connection.proxy.active')}
                        </span>
                        <Server className="w-4 h-4 text-gray-400 dark:text-slate-600" />
                      </div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {proxyStatus?.stats?.activeSessions || 0}
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
                          {t('connection.proxy.tools')}
                        </span>
                        <Plug className="w-4 h-4 text-gray-400 dark:text-slate-600" />
                      </div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {proxyStatus?.stats?.totalTools || 0}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                        {t('connection.proxy.protocol')}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-blue-600/70 dark:text-blue-400/70">{t('connection.proxy.protocol.ver')}</span>
                        <span className="text-blue-700 dark:text-blue-300 font-mono ml-1">
                          {proxyStatus?.protocol}
                        </span>
                      </div>
                      <div>
                        <span className="text-blue-600/70 dark:text-blue-400/70">{t('connection.proxy.protocol.transport')}</span>
                        <span className="text-blue-700 dark:text-blue-300 font-mono ml-1">
                          {proxyStatus?.transports?.join(', ').toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-slate-500">
                  {t('connection.proxy.error')}
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <Button
                  variant="secondary"
                  onClick={fetchProxyStatus}
                  disabled={proxyLoading}
                  className="gap-2"
                >
                  {proxyLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Activity className="w-4 h-4" />
                  )}
                  {t('connection.proxy.refresh')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Token 认证管理 */}
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="w-5 h-5 text-amber-500" />
                {t('connection.token.title')}
              </CardTitle>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                {t('connection.token.desc')}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <input
                    type={showToken ? 'text' : 'password'}
                    readOnly
                    value={proxyConfig?.token || ''}
                    placeholder={t('connection.token.placeholder')}
                    className="w-full px-3 py-2 pr-10 text-sm font-mono bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg"
                  />
                  {proxyConfig?.token && (
                    <button
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 cursor-pointer"
                    >
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  className="gap-2"
                  disabled={generateToken.isPending}
                  onClick={() => {
                    generateToken.mutate(undefined, {
                      onSuccess: () => {
                        toast.success(t('connection.token.generate_success'));
                        setShowToken(true);
                      },
                    });
                  }}
                >
                  <RefreshCw className={`w-4 h-4 ${generateToken.isPending ? 'animate-spin' : ''}`} />
                  {t('connection.token.generate')}
                </Button>
                {proxyConfig?.token && (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-2"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(proxyConfig?.token!);
                          toast.success(t('connection.token.copy_success'));
                        } catch {
                          toast.error(t('connection.token.copy_fail'));
                        }
                      }}
                    >
                      <Copy className="w-4 h-4" />
                      {t('connection.token.copy')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                      onClick={() => {
                        updateMcpProxy.mutate({ token: '' }, {
                          onSuccess: () => {
                            toast.success(t('connection.token.clear_success'));
                            setShowToken(false);
                          },
                        });
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                      {t('connection.token.clear')}
                    </Button>
                  </>
                )}
              </div>
              {proxyConfig?.token && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/20">
                  <div className="flex gap-2">
                    <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      {t('connection.token.warning')}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* VS Code 配置 */}
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Code className="w-5 h-5 text-blue-500" />
                {t('connection.vscode.title')}
              </CardTitle>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                {t('connection.vscode.desc')}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <pre className="text-xs bg-gray-900 dark:bg-black text-gray-100 p-4 rounded-lg overflow-x-auto">
                  <code>{JSON.stringify({
                    servers: {
                      "mcp-agent": {
                        type: "sse",
                        url: `${window.location.origin}/mcp/sse`,
                        ...(proxyConfig?.token ? { headers: { Authorization: `Bearer ${proxyConfig?.token}` } } : {}),
                      },
                    },
                  }, null, 2)}</code>
                </pre>
                <button
                  onClick={async () => {
                    try {
                      const config = {
                        servers: {
                          "mcp-agent": {
                            type: "sse",
                            url: `${window.location.origin}/mcp/sse`,
                            ...(proxyConfig?.token ? { headers: { Authorization: `Bearer ${proxyConfig?.token}` } } : {}),
                          },
                        },
                      };
                      await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
                      toast.success(t('connection.vscode.copy_success'));
                    } catch {
                      toast.error(t('connection.vscode.copy_fail'));
                    }
                  }}
                  className="absolute top-3 right-3 p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  <Copy className="w-4 h-4 text-gray-300" />
                </button>
              </div>

              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/20">
                <div className="flex gap-2">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                      {t('connection.vscode.steps')}
                    </p>
                    <ol className="text-xs text-blue-700 dark:text-blue-300 space-y-1 ml-4 list-decimal">
                      <li>{t('connection.vscode.step1')}</li>
                      <li>{t('connection.vscode.step2')}</li>
                      <li>{t('connection.vscode.step3')}</li>
                      <li>{t('connection.vscode.step4')}</li>
                    </ol>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Claude Desktop 配置 */}
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Code className="w-5 h-5 text-purple-500" />
                {t('connection.claude.title')}
              </CardTitle>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                {t('connection.claude.desc')}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <pre className="text-xs bg-gray-900 dark:bg-black text-gray-100 p-4 rounded-lg overflow-x-auto">
                  <code>{JSON.stringify({
                    mcpServers: {
                      "mcp-agent": {
                        url: `${window.location.origin}/mcp/sse`,
                        ...(proxyConfig?.token ? { headers: { Authorization: `Bearer ${proxyConfig?.token}` } } : {}),
                      },
                    },
                  }, null, 2)}</code>
                </pre>
                <button
                  onClick={async () => {
                    try {
                      const config = {
                        mcpServers: {
                          "mcp-agent": {
                            url: `${window.location.origin}/mcp/sse`,
                            ...(proxyConfig?.token ? { headers: { Authorization: `Bearer ${proxyConfig?.token}` } } : {}),
                          },
                        },
                      };
                      await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
                      toast.success(t('connection.vscode.copy_success'));
                    } catch {
                      toast.error(t('connection.vscode.copy_fail'));
                    }
                  }}
                  className="absolute top-3 right-3 p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  <Copy className="w-4 h-4 text-gray-300" />
                </button>
              </div>

              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-500/20">
                <div className="flex gap-2">
                  <Info className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-purple-700 dark:text-purple-300">
                      {t('connection.claude.path')}
                    </p>
                    <ul className="text-xs text-purple-700 dark:text-purple-300 space-y-1 ml-4 list-disc">
                      <li>macOS: ~/Library/Application Support/Claude/claude_desktop_config.json</li>
                      <li>Windows: %APPDATA%\Claude\claude_desktop_config.json</li>
                      <li>Linux: ~/.config/Claude/claude_desktop_config.json</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
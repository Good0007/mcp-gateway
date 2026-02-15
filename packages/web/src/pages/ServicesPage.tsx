import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useServices, useStartService, useStopService, useDeleteService, useAddService, useUpdateService, useService } from '@/hooks/useAgent';
import { Loader, Play, Square, AlertCircle, Settings, Plus, Trash2, PlayCircle, StopCircle, X, Edit, Upload, CheckCircle2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { MCPServiceStatus } from '@mcp-agent/shared';
import { parseMCPConfig } from '@/utils/mcpConfigParser';
import { toast } from 'sonner';

function StatusBadge({ status }: { status: MCPServiceStatus }) {
  const variants: Record<MCPServiceStatus, { label: string; color: string }> = {
    running: { label: '运行中', color: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
    stopped: { label: '已停止', color: 'bg-gray-500/10 dark:bg-slate-500/20 text-gray-600 dark:text-slate-400 border-gray-500/20' },
    starting: { label: '启动中', color: 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/20' },
    error: { label: '错误', color: 'bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/20' },
  };

  const variant = variants[status] || variants.stopped;
  return (
    <Badge className={`text-[10px] font-medium border ${variant.color}`}>
      {variant.label}
    </Badge>
  );
}

export function ServicesPage() {
  const { data: servicesData, isLoading, error } = useServices();
  const services = servicesData?.services || [];
  const startService = useStartService();
  const stopService = useStopService();
  const deleteService = useDeleteService();
  const addService = useAddService();
  const updateService = useUpdateService();

  // 添加/编辑服务弹窗状态
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceForm, setServiceForm] = useState({
    id: '',
    type: 'stdio' as 'stdio' | 'sse' | 'http' | 'embedded',
    name: '',
    description: '',
    command: '',
    args: '',
    cwd: '',
    env: '',
    url: '',
    baseUrl: '',
    headers: '',
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // 导入配置弹窗状态
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importStatus, setImportStatus] = useState<{
    type: 'idle' | 'parsing' | 'importing' | 'success' | 'error';
    message?: string;
    preview?: any[];
    result?: { success: number; failed: number; errors: string[] };
  }>({ type: 'idle' });

  // 获取单个服务详情（用于编辑）
  const { data: serviceDetail } = useService(
    editingServiceId || '',
  );

  // 当服务详情加载完成后，填充表单
  useEffect(() => {
    if (serviceDetail && editingServiceId) {
      const config = serviceDetail.config;
      setServiceForm({
        id: config.id,
        type: config.type,
        name: config.name,
        description: config.description || '',
        command: config.type === 'stdio' ? config.command || '' : '',
        args: config.type === 'stdio' && config.args ? config.args.join(' ') : '',
        cwd: config.type === 'stdio' ? config.cwd || '' : '',
        env: config.type === 'stdio' && config.env 
          ? JSON.stringify(config.env, null, 2) 
          : '',
        url: config.type === 'sse' ? config.url || '' : '',
        baseUrl: config.type === 'http' ? config.baseUrl || '' : '',
        headers: (config.type === 'sse' || config.type === 'http') && config.headers 
          ? JSON.stringify(config.headers, null, 2) 
          : '',
      });
    }
  }, [serviceDetail, editingServiceId]);

  const handleStart = async (serviceId: string) => {
    try {
      await startService.mutateAsync(serviceId);
      toast.success('服务启动成功');
    } catch (err: any) {
      console.error('启动服务失败:', err);
      // 显示友好的错误信息给用户
      const errorMsg = err?.response?.data?.error || err?.message || '启动服务失败，请检查服务配置';
      toast.error('启动失败', {
        description: errorMsg,
        duration: 6000,
      });
    }
  };

  const handleStop = async (serviceId: string) => {
    try {
      await stopService.mutateAsync(serviceId);
      toast.success('服务已停止');
    } catch (err: any) {
      console.error('停止服务失败:', err);
      // 显示友好的错误信息给用户
      const errorMsg = err?.response?.data?.error || err?.message || '停止服务失败';
      toast.error('停止失败', {
        description: errorMsg,
      });
    }
  };

  const handleEdit = (serviceId: string) => {
    // 设置编辑 ID 并打开弹窗
    setEditingServiceId(serviceId);
    setShowServiceModal(true);
    // useEffect 会处理数据加载和表单填充
  };

  const handleAddService = async () => {
    try {
      // 构建服务配置对象
      const serviceConfig: any = {
        id: serviceForm.id.trim(),
        type: serviceForm.type,
        name: serviceForm.name.trim(),
        description: serviceForm.description.trim(),
        enabled: false,
      };

      // 根据类型添加特定配置
      if (serviceForm.type === 'stdio') {
        serviceConfig.command = serviceForm.command.trim();
        // 将空格分隔的参数字符串转换为数组
        if (serviceForm.args.trim()) {
          serviceConfig.args = serviceForm.args.trim().split(/\s+/);
        }
        if (serviceForm.cwd.trim()) {
          serviceConfig.cwd = serviceForm.cwd.trim();
        }
        // 解析 env JSON
        if (serviceForm.env.trim()) {
          try {
            serviceConfig.env = JSON.parse(serviceForm.env);
          } catch (e) {
            toast.error('格式错误', {
              description: '环境变量格式错误，请输入有效的 JSON 格式',
            });
            return;
          }
        }
      } else if (serviceForm.type === 'sse') {
        serviceConfig.url = serviceForm.url.trim();
        // 解析 headers JSON
        if (serviceForm.headers.trim()) {
          try {
            serviceConfig.headers = JSON.parse(serviceForm.headers);
          } catch (e) {
            toast.error('格式错误', {
              description: 'Headers 格式错误，请输入有效的 JSON 格式',
            });
            return;
          }
        }
      } else if (serviceForm.type === 'http') {
        serviceConfig.baseUrl = serviceForm.baseUrl.trim();
        // 解析 headers JSON
        if (serviceForm.headers.trim()) {
          try {
            serviceConfig.headers = JSON.parse(serviceForm.headers);
          } catch (e) {
            toast.error('格式错误', {
              description: 'Headers 格式错误，请输入有效的 JSON 格式',
            });
            return;
          }
        }
      }

      if (editingServiceId) {
        // 编辑模式
        await updateService.mutateAsync({ id: editingServiceId, updates: serviceConfig });
        toast.success('服务更新成功');
      } else {
        // 添加模式
        await addService.mutateAsync(serviceConfig);
        toast.success('服务添加成功');
      }
      
      setShowServiceModal(false);
      resetForm();
    } catch (err: any) {
      console.error('保存服务失败:', err);
      // 显示友好的错误信息
      const errorMsg = err.message || '保存服务失败，请检查配置';
      toast.error('保存失败', {
        description: errorMsg,
      });
    }
  };

  const resetForm = () => {
    setEditingServiceId(null);
    setServiceForm({
      id: '',
      type: 'stdio',
      name: '',
      description: '',
      command: '',
      args: '',
      cwd: '',
      env: '',
      url: '',
      baseUrl: '',
      headers: '',
    });
  };

  const handleDeleteService = (serviceId: string) => {
    setShowDeleteConfirm(serviceId);
  };

  const confirmDelete = async () => {
    if (showDeleteConfirm) {
      try {
        await deleteService.mutateAsync(showDeleteConfirm);
        toast.success('服务删除成功');
        setShowDeleteConfirm(null);
      } catch (err) {
        console.error('删除服务失败:', err);
        // 显示友好的错误消息
        const errorMsg = err instanceof Error ? err.message : '删除服务失败';
        toast.error('删除失败', {
          description: errorMsg,
        });
        setShowDeleteConfirm(null);
      }
    }
  };

  // 解析导入的配置
  const handleParseImport = () => {
    if (!importJson.trim()) {
      setImportStatus({ type: 'error', message: '请粘贴 MCP 配置 JSON' });
      return;
    }

    setImportStatus({ type: 'parsing' });

    try {
      const result = parseMCPConfig(importJson);
      
      if (!result.success) {
        setImportStatus({ type: 'error', message: result.error });
        return;
      }

      setImportStatus({ 
        type: 'success', 
        message: `解析成功！找到 ${result.services?.length} 个服务`,
        preview: result.services 
      });
    } catch (error) {
      setImportStatus({ 
        type: 'error', 
        message: error instanceof Error ? error.message : '解析失败' 
      });
    }
  };

  // 执行导入
  const handleConfirmImport = async () => {
    if (!importStatus.preview) return;

    setImportStatus({ ...importStatus, type: 'importing' });

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const service of importStatus.preview) {
      try {
        await addService.mutateAsync(service);
        success++;
      } catch (error) {
        failed++;
        errors.push(`${service.id}: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    }

    setImportStatus({ 
      type: 'success',
      message: `导入完成：${success} 个成功, ${failed} 个失败`,
      result: { success, failed, errors }
    });

    // 3秒后关闭弹窗
    if (failed === 0) {
      setTimeout(() => {
        setShowImportModal(false);
        setImportJson('');
        setImportStatus({ type: 'idle' });
      }, 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader className="w-8 h-8 animate-spin text-primary-500" />
          <p className="text-sm text-gray-500 dark:text-slate-500">加载服务列表中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <p className="text-sm text-red-500">加载服务失败</p>
          <p className="text-xs text-gray-500 dark:text-slate-500">
            {error instanceof Error ? error.message : '未知错误'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-3 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-slate-600"></div>
            <span className="text-xs text-gray-600 dark:text-slate-400">
              总数: <span className="font-semibold text-gray-900 dark:text-white">{services.length}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs text-gray-600 dark:text-slate-400">
              运行: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{services.filter(s => s.status === 'running').length}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-slate-600"></div>
            <span className="text-xs text-gray-600 dark:text-slate-400">
              停止: <span className="font-semibold text-gray-600 dark:text-slate-400">{services.filter(s => s.status === 'stopped').length}</span>
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowImportModal(true)}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            导入配置
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              resetForm();
              setShowServiceModal(true);
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            添加服务
          </Button>
        </div>
      </div>

      {/* 空状态提示 */}
      {services.length === 0 && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-2">
            <Settings className="w-10 h-10 text-gray-400 dark:text-slate-600 mx-auto" />
            <p className="text-sm text-gray-500 dark:text-slate-500">暂无配置的服务</p>
            <p className="text-xs text-gray-400 dark:text-slate-600">
              点击上方按钮添加服务或在配置文件中配置
            </p>
          </div>
        </div>
      )}

      {/* 服务列表 */}
      {services.length > 0 && (
        <div className="space-y-3">
          {services.map((service) => (
            <Card 
              key={service.id} 
              className={`dark:bg-slate-900 dark:border-slate-800 hover:shadow-md transition-all ${
                service.status === 'running' ? 'border-l-4 border-l-emerald-500' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  {/* 左侧：服务信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {service.status === 'running' ? (
                        <PlayCircle className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <StopCircle className="w-4 h-4 text-gray-400 dark:text-slate-600" />
                      )}
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {service.name}
                      </h3>
                      <StatusBadge status={service.status} />
                    </div>
                    
                    <p className="text-xs text-gray-500 dark:text-slate-500 mb-2 line-clamp-2">
                      {service.description || '无描述'}
                    </p>

                    <div className="flex items-center gap-4 text-[11px] text-gray-400 dark:text-slate-600">
                      {service.serverInfo?.version && (
                        <span>版本: {service.serverInfo.version}</span>
                      )}
                      {service.toolCount !== undefined && (
                        <span>工具数: {service.toolCount}</span>
                      )}
                    </div>

                    {service.error && (
                      <div className="mt-2 flex items-start gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">
                            启动错误
                          </p>
                          <p className="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap break-words">
                            {service.error}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 右侧：操作按钮 */}
                  <div className="flex items-center gap-2">
                    {service.status === 'running' ? (
                      <button
                        onClick={() => handleStop(service.id)}
                        disabled={stopService.isPending}
                        className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-red-500/50 dark:hover:border-red-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="停止服务"
                      >
                        {stopService.isPending ? (
                          <Loader className="w-4 h-4 animate-spin text-gray-500" />
                        ) : (
                          <Square className="w-4 h-4 text-red-600 dark:text-red-400" />
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStart(service.id)}
                        disabled={startService.isPending || service.status === 'starting'}
                        className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="启动服务"
                      >
                        {startService.isPending || service.status === 'starting' ? (
                          <Loader className="w-4 h-4 animate-spin text-gray-500" />
                        ) : (
                          <Play className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(service.id)}
                      className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-colors"
                      title="编辑服务"
                    >
                      <Edit className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                    </button>
                    <button
                      onClick={() => handleDeleteService(service.id)}
                      className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-500/50 dark:hover:border-red-500/50 transition-colors"
                      title="删除服务"
                    >
                      <Trash2 className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 添加/编辑服务弹窗 Modal */}
      {showServiceModal && (
        <>
          {/* 背景遮罩 */}
          <div 
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            onClick={() => {
              setShowServiceModal(false);
              resetForm();
            }}
          />
          
          {/* 弹窗内容 */}
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <Card className="dark:bg-slate-900 dark:border-slate-800 border-primary-500/30 shadow-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                  {editingServiceId ? '编辑服务' : '添加新服务'}
                </CardTitle>
                <button
                  onClick={() => {
                    setShowServiceModal(false);
                    resetForm();
                  }}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                </button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="服务 ID"
                    placeholder="例如：calculator"
                    value={serviceForm.id}
                    onChange={(e) => setServiceForm({ ...serviceForm, id: e.target.value })}
                    disabled={!!editingServiceId}
                  />
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700 dark:text-slate-300">
                      服务类型
                    </label>
                    <select
                      value={serviceForm.type}
                      onChange={(e) => setServiceForm({ ...serviceForm, type: e.target.value as any })}
                      className="w-full h-10 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-sm text-gray-900 dark:text-white"
                    >
                      <option value="stdio">Stdio (命令行)</option>
                      <option value="sse">SSE (Server-Sent Events)</option>
                      <option value="http">HTTP (REST API)</option>
                      <option value="embedded">Embedded (内嵌模块)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="服务名称"
                    placeholder="例如：Calculator Service"
                    value={serviceForm.name}
                    onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                  />
                  <Input
                    label="服务描述"
                    placeholder="例如：基础算术运算"
                    value={serviceForm.description}
                    onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                  />
                </div>

                {/* Stdio 类型配置 */}
                {serviceForm.type === 'stdio' && (
                  <div className="space-y-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-500/20">
                    <h4 className="text-xs font-semibold text-gray-900 dark:text-white">Stdio 配置</h4>
                    <div className="grid grid-cols-1 gap-4">
                      <Input
                        label="启动命令"
                        placeholder="例如：npx"
                        value={serviceForm.command}
                        onChange={(e) => setServiceForm({ ...serviceForm, command: e.target.value })}
                      />
                      <Input
                        label="命令参数（用空格分隔）"
                        placeholder="例如：-y @modelcontextprotocol/server-calculator"
                        value={serviceForm.args}
                        onChange={(e) => setServiceForm({ ...serviceForm, args: e.target.value })}
                      />
                      <Input
                        label="工作目录（可选）"
                        placeholder="例如：/Users/username"
                        value={serviceForm.cwd}
                        onChange={(e) => setServiceForm({ ...serviceForm, cwd: e.target.value })}
                      />
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-700 dark:text-slate-300">
                          环境变量（可选，JSON 格式）
                        </label>
                        <textarea
                          value={serviceForm.env}
                          onChange={(e) => setServiceForm({ ...serviceForm, env: e.target.value })}
                          placeholder='{"REDIS_HOST": "localhost", "REDIS_PORT": "6379"}'
                          className="w-full min-h-[100px] rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 font-mono resize-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* SSE 类型配置 */}
                {serviceForm.type === 'sse' && (
                  <div className="space-y-4 p-4 rounded-lg bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-500/20">
                    <h4 className="text-xs font-semibold text-gray-900 dark:text-white">SSE 配置</h4>
                    <Input
                      label="端点 URL"
                      placeholder="例如：http://localhost:8931/sse"
                      value={serviceForm.url}
                      onChange={(e) => setServiceForm({ ...serviceForm, url: e.target.value })}
                    />
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-700 dark:text-slate-300">
                        请求头 Headers（可选，JSON 格式）
                      </label>
                      <textarea
                        value={serviceForm.headers}
                        onChange={(e) => setServiceForm({ ...serviceForm, headers: e.target.value })}
                        placeholder='例如：{"Authorization": "Bearer token"}'
                        className="w-full min-h-[80px] rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 font-mono resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* HTTP 类型配置 */}
                {serviceForm.type === 'http' && (
                  <div className="space-y-4 p-4 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-500/20">
                    <h4 className="text-xs font-semibold text-gray-900 dark:text-white">HTTP 配置</h4>
                    <Input
                      label="Base URL"
                      placeholder="例如：http://localhost:4000/mcp"
                      value={serviceForm.baseUrl}
                      onChange={(e) => setServiceForm({ ...serviceForm, baseUrl: e.target.value })}
                    />
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-700 dark:text-slate-300">
                        请求头 Headers（可选，JSON 格式）
                      </label>
                      <textarea
                        value={serviceForm.headers}
                        onChange={(e) => setServiceForm({ ...serviceForm, headers: e.target.value })}
                        placeholder='例如：{"Authorization": "Bearer token"}'
                        className="w-full min-h-[80px] rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 font-mono resize-none"
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAddService}
                    disabled={!serviceForm.id.trim() || !serviceForm.name.trim() || addService.isPending || updateService.isPending}
                    className="flex-1 gap-2"
                  >
                    {(addService.isPending || updateService.isPending) ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        {editingServiceId ? '保存中...' : '添加中...'}
                      </>
                    ) : (
                      editingServiceId ? '保存更改' : '添加服务'
                    )}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setShowServiceModal(false);
                      resetForm();
                    }}
                    disabled={addService.isPending || updateService.isPending}
                    className="flex-1"
                  >
                    取消
                  </Button>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-slate-500 text-center">
                  💡 {editingServiceId ? '保存后如果服务正在运行将自动重启' : '添加后服务不会自动启动，需要手动启动'}
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* 删除确认弹窗 Modal */}
      {showDeleteConfirm && (
        <>
          {/* 背景遮罩 */}
          <div 
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(null)}
          />
          
          {/* 弹窗内容 */}
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md">
            <Card className="dark:bg-slate-900 dark:border-slate-800 border-red-500/50 shadow-2xl">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                      确认删除服务
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
                      确定要删除服务 <span className="font-semibold text-red-600 dark:text-red-400">{services.find(s => s.id === showDeleteConfirm)?.name}</span> 吗？此操作无法撤销。
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={confirmDelete}
                        className="bg-red-600 hover:bg-red-700 text-white border-red-600 flex-1"
                      >
                        确认删除
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowDeleteConfirm(null)}
                        className="flex-1"
                      >
                        取消
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* 导入配置弹窗 Modal */}
      {showImportModal && (
        <>
          {/* 背景遮罩 */}
          <div 
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            onClick={() => {
              if (importStatus.type !== 'importing') {
                setShowImportModal(false);
                setImportJson('');
                setImportStatus({ type: 'idle' });
              }
            }}
          />
          
          {/* 弹窗内容 */}
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <Card className="dark:bg-slate-900 dark:border-slate-800 border-primary-500/30 shadow-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                    导入 MCP 服务配置
                  </CardTitle>
                  <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                    支持 Claude Desktop 和 VS Code 的 MCP 配置格式
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (importStatus.type !== 'importing') {
                      setShowImportModal(false);
                      setImportJson('');
                      setImportStatus({ type: 'idle' });
                    }
                  }}
                  disabled={importStatus.type === 'importing'}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                </button>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* JSON 输入区 */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-700 dark:text-slate-300">
                    粘贴配置 JSON
                  </label>
                  <textarea
                    value={importJson}
                    onChange={(e) => {
                      setImportJson(e.target.value);
                      setImportStatus({ type: 'idle' });
                    }}
                    disabled={importStatus.type === 'importing'}
                    placeholder={`{
  "mcpServers": {
    "redis": {
      "command": "uvx",
      "args": ["--from", "redis-mcp-server@latest", "redis-mcp-server"],
      "env": {
        "REDIS_HOST": "localhost",
        "REDIS_PORT": "6379"
      }
    }
  }
}`}
                    className="w-full min-h-[250px] rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 font-mono resize-none"
                  />
                </div>

                {/* 状态消息 */}
                {importStatus.message && (
                  <div className={`p-3 rounded-lg border ${
                    importStatus.type === 'error' 
                      ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-500/20' 
                      : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-500/20'
                  }`}>
                    <div className="flex items-start gap-2">
                      {importStatus.type === 'error' ? (
                        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      )}
                      <p className={`text-sm ${
                        importStatus.type === 'error'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-blue-600 dark:text-blue-400'
                      }`}>
                        {importStatus.message}
                      </p>
                    </div>
                  </div>
                )}

                {/* 预览列表 */}
                {importStatus.preview && importStatus.preview.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700 dark:text-slate-300">
                      将导入以下服务：
                    </label>
                    <div className="max-h-[200px] overflow-y-auto space-y-2 border border-gray-200 dark:border-slate-700 rounded-lg p-3">
                      {importStatus.preview.map((service, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs p-2 rounded bg-gray-50 dark:bg-slate-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 dark:text-white">{service.name}</div>
                            <div className="text-gray-500 dark:text-slate-500 truncate">
                              {service.type === 'stdio' ? `${service.command} ${service.args?.join(' ') || ''}` : service.url}
                            </div>
                          </div>
                          <Badge className="text-[9px] bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            {service.type.toUpperCase()}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 导入结果 */}
                {importStatus.result && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-500/20">
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                          {importStatus.result.success}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-slate-400">导入成功</div>
                      </div>
                      <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-500/20">
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                          {importStatus.result.failed}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-slate-400">导入失败</div>
                      </div>
                    </div>
                    {importStatus.result.errors.length > 0 && (
                      <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-500/20">
                        <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2">错误详情：</div>
                        <div className="space-y-1 max-h-[100px] overflow-y-auto">
                          {importStatus.result.errors.map((error, idx) => (
                            <div key={idx} className="text-xs text-red-600 dark:text-red-400 font-mono">
                              {error}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex gap-2 pt-2">
                  {!importStatus.preview ? (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleParseImport}
                        disabled={!importJson.trim() || importStatus.type === 'parsing'}
                        className="flex-1 gap-2"
                      >
                        {importStatus.type === 'parsing' ? (
                          <>
                            <Loader className="w-4 h-4 animate-spin" />
                            解析中...
                          </>
                        ) : (
                          '解析配置'
                        )}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setShowImportModal(false);
                          setImportJson('');
                          setImportStatus({ type: 'idle' });
                        }}
                        className="flex-1"
                      >
                        取消
                      </Button>
                    </>
                  ) : importStatus.result ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setShowImportModal(false);
                        setImportJson('');
                        setImportStatus({ type: 'idle' });
                      }}
                      className="flex-1"
                    >
                      关闭
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleConfirmImport}
                        disabled={importStatus.type === 'importing'}
                        className="flex-1 gap-2"
                      >
                        {importStatus.type === 'importing' ? (
                          <>
                            <Loader className="w-4 h-4 animate-spin" />
                            导入中...
                          </>
                        ) : (
                          `确认导入 ${importStatus.preview.length} 个服务`
                        )}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setImportJson('');
                          setImportStatus({ type: 'idle' });
                        }}
                        disabled={importStatus.type === 'importing'}
                        className="flex-1"
                      >
                        重新粘贴
                      </Button>
                    </>
                  )}
                </div>

                <p className="text-[11px] text-gray-500 dark:text-slate-500 text-center">
                  💡 支持从 Claude Desktop 或 VS Code 的 MCP 配置文件中复制 JSON
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

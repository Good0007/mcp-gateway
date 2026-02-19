import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useServices, useStartService, useStopService, useDeleteService, useAddService, useUpdateService, useService } from '@/hooks/useAgent';
import { Loader, Play, Square, AlertCircle, Settings, Plus, Trash2, PlayCircle, StopCircle, X, Edit, Upload, CheckCircle2, Wrench } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { MCPServiceStatus, Tool } from '@mcp-agent/shared';
import { parseMCPConfig } from '@/utils/mcp-config-parser';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useI18n';

function StatusBadge({ status }: { status: MCPServiceStatus }) {
  const { t } = useTranslation();
  const variants: Record<MCPServiceStatus, { label: string; color: string }> = {
    running: { label: t('services.status.running'), color: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
    stopped: { label: t('services.status.stopped'), color: 'bg-gray-500/10 dark:bg-slate-500/20 text-gray-600 dark:text-slate-400 border-gray-500/20' },
    starting: { label: t('services.status.starting'), color: 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/20' },
    error: { label: t('services.status.error'), color: 'bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/20' },
  };

  const variant = variants[status] || variants.stopped;
  return (
    <Badge className={`text-[10px] font-medium border ${variant.color}`}>
      {variant.label}
    </Badge>
  );
}

export function ServicesPage() {
  const { t } = useTranslation();
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{
    id: string;
    name: string;
    type?: 'stdio' | 'embedded' | 'sse' | 'http';
  } | null>(null);

  // 工具详情弹窗状态
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);

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
      toast.success(t('services.toast.start_success'));
    } catch (err: any) {
      console.error('Failed to start service:', err);
      // Show friendly error message
      const errorMsg = err?.response?.data?.error || err?.message || t('services.toast.start_fail_desc');
      toast.error(t('services.toast.start_fail'), {
        description: errorMsg,
        duration: 6000,
      });
    }
  };

  const handleStop = async (serviceId: string) => {
    try {
      await stopService.mutateAsync(serviceId);
      toast.success(t('services.toast.stop_success'));
    } catch (err: any) {
      console.error('Failed to stop service:', err);
      // Show friendly error message
      const errorMsg = err?.response?.data?.error || err?.message || t('services.toast.stop_fail');
      toast.error(t('services.toast.stop_fail_title'), {
        description: errorMsg,
      });
    }
  };

  const handleEdit = (serviceId: string) => {
    // Set edit ID and open modal
    setEditingServiceId(serviceId);
    setShowServiceModal(true);
    // useEffect will handle data loading and form filling
  };

  const handleAddService = async () => {
    try {
      // Build service config object
      const serviceConfig: any = {
        id: serviceForm.id.trim(),
        type: serviceForm.type,
        name: serviceForm.name.trim(),
        description: serviceForm.description.trim(),
        enabled: false,
      };

      // Add specific config based on type
      if (serviceForm.type === 'stdio') {
        serviceConfig.command = serviceForm.command.trim();
        // Convert space-separated args to array
        if (serviceForm.args.trim()) {
          serviceConfig.args = serviceForm.args.trim().split(/\s+/);
        }
        if (serviceForm.cwd.trim()) {
          serviceConfig.cwd = serviceForm.cwd.trim();
        }
        // Parse env JSON
        if (serviceForm.env.trim()) {
          try {
            serviceConfig.env = JSON.parse(serviceForm.env);
          } catch (e) {
            toast.error(t('services.toast.format_error'), {
              description: t('services.toast.env_format_error'),
            });
            return;
          }
        }
      } else if (serviceForm.type === 'sse') {
        serviceConfig.url = serviceForm.url.trim();
        // Parse headers JSON
        if (serviceForm.headers.trim()) {
          try {
            serviceConfig.headers = JSON.parse(serviceForm.headers);
          } catch (e) {
            toast.error(t('services.toast.format_error'), {
              description: t('services.toast.headers_format_error'),
            });
            return;
          }
        }
      } else if (serviceForm.type === 'http') {
        serviceConfig.baseUrl = serviceForm.baseUrl.trim();
        // Parse headers JSON
        if (serviceForm.headers.trim()) {
          try {
            serviceConfig.headers = JSON.parse(serviceForm.headers);
          } catch (e) {
            toast.error(t('services.toast.format_error'), {
              description: t('services.toast.headers_format_error'),
            });
            return;
          }
        }
      }

      if (editingServiceId) {
        // Edit mode
        await updateService.mutateAsync({ id: editingServiceId, updates: serviceConfig });
        toast.success(t('services.toast.update_success'));
      } else {
        // Add mode
        await addService.mutateAsync(serviceConfig);
        toast.success(t('services.toast.add_success'));
      }
      
      setShowServiceModal(false);
      resetForm();
    } catch (err: any) {
      console.error('Failed to save service:', err);
      // Show friendly error message
      const errorMsg = err.message || t('services.toast.save_fail');
      toast.error(t('services.toast.save_fail_title'), {
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
    const service = services.find(s => s.id === serviceId);
    if (service) {
      setShowDeleteConfirm({
        id: serviceId,
        name: service.name,
        type: service.type,
      });
    }
  };

  const confirmDelete = async () => {
    if (showDeleteConfirm) {
      try {
        await deleteService.mutateAsync(showDeleteConfirm.id);
        toast.success(t('services.toast.delete_success'));
        setShowDeleteConfirm(null);
      } catch (err) {
        console.error('Failed to delete service:', err);
        // Show friendly error message
        const errorMsg = err instanceof Error ? err.message : t('services.toast.delete_fail');
        toast.error(t('services.toast.delete_fail_title'), {
          description: errorMsg,
        });
        setShowDeleteConfirm(null);
      }
    }
  };

  // 解析导入的配置
  const handleParseImport = () => {
    if (!importJson.trim()) {
      setImportStatus({ type: 'error', message: t('services.import.paste_json') });
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
        message: t('services.import.parse_success', { count: result.services?.length || 0 }),
        preview: result.services 
      });
    } catch (error) {
      setImportStatus({ 
        type: 'error', 
        message: error instanceof Error ? error.message : t('services.import.parse_fail') 
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
        errors.push(`${service.id}: ${error instanceof Error ? error.message : t('services.error.unknown')}`);
      }
    }

    setImportStatus({ 
      type: 'success',
      message: t('services.import.complete', { success, failed }),
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
          <p className="text-sm text-gray-500 dark:text-slate-500">{t('services.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <p className="text-sm text-red-500">{t('services.error.load_fail')}</p>
          <p className="text-xs text-gray-500 dark:text-slate-500">
            {error instanceof Error ? error.message : t('services.error.unknown')}
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
              {t('services.stats.total')} <span className="font-semibold text-gray-900 dark:text-white">{services.length}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs text-gray-600 dark:text-slate-400">
              {t('services.stats.running')} <span className="font-semibold text-emerald-600 dark:text-emerald-400">{services.filter(s => s.status === 'running').length}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-slate-600"></div>
            <span className="text-xs text-gray-600 dark:text-slate-400">
              {t('services.stats.stopped')} <span className="font-semibold text-gray-600 dark:text-slate-400">{services.filter(s => s.status === 'stopped').length}</span>
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
            {t('services.button.import')}
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
            {t('services.button.add')}
          </Button>
        </div>
      </div>

      {/* 空状态提示 */}
      {services.length === 0 && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-2">
            <Settings className="w-10 h-10 text-gray-400 dark:text-slate-600 mx-auto" />
            <p className="text-sm text-gray-500 dark:text-slate-500">{t('services.empty.title')}</p>
            <p className="text-xs text-gray-400 dark:text-slate-600">
              {t('services.empty.desc')}
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
                      {service.description || t('services.desc.none')}
                    </p>

                    <div className="flex items-center gap-4 text-[11px] text-gray-400 dark:text-slate-600">
                      {service.serverInfo?.version && (
                        <span>{t('services.version')} {service.serverInfo.version}</span>
                      )}
                      {service.toolCount !== undefined && (
                        <span>{t('services.tool_count')} {service.toolCount}</span>
                      )}
                    </div>

                    {/* 工具列表 - 只在服务运行时显示 */}
                    {service.status === 'running' && (
                      <div className="mt-3">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <span className="text-[11px] text-gray-500 dark:text-slate-500 mr-1">{t('services.tools')}</span>
                          <ToolsList serviceId={service.id} onToolClick={(tool) => {
                            setSelectedTool(tool);
                          }} />
                        </div>
                      </div>
                    )}

                    {service.error && (
                      <div className="mt-2 flex items-start gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">
                            {t('services.error.start_error')}
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
                        className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-red-500/50 dark:hover:border-red-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        title={t('services.button.stop_tooltip')}
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
                        className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        title={t('services.button.start_tooltip')}
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
                      className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-colors cursor-pointer"
                      title={t('services.button.edit_tooltip')}
                    >
                      <Edit className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                    </button>
                    <button
                      onClick={() => handleDeleteService(service.id)}
                      className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-500/50 dark:hover:border-red-500/50 transition-colors cursor-pointer"
                      title={t('services.button.delete_tooltip')}
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
                  {editingServiceId ? t('services.modal.edit_title') : t('services.modal.add_title')}
                </CardTitle>
                <button
                  onClick={() => {
                    setShowServiceModal(false);
                    resetForm();
                  }}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                </button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label={t('services.form.id')}
                    placeholder={t('services.form.id_placeholder')}
                    value={serviceForm.id}
                    onChange={(e) => setServiceForm({ ...serviceForm, id: e.target.value })}
                    disabled={!!editingServiceId}
                  />
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700 dark:text-slate-300">
                      {t('services.form.type')}
                    </label>
                    <select
                      value={serviceForm.type}
                      onChange={(e) => setServiceForm({ ...serviceForm, type: e.target.value as any })}
                      className="w-full h-10 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 text-sm text-gray-900 dark:text-white"
                    >
                      <option value="stdio">{t('services.type.stdio')}</option>
                      <option value="sse">{t('services.type.sse')}</option>
                      <option value="http">{t('services.type.http')}</option>
                      <option value="embedded">{t('services.type.embedded')}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label={t('services.form.name')}
                    placeholder={t('services.form.name_placeholder')}
                    value={serviceForm.name}
                    onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                  />
                  <Input
                    label={t('services.form.desc')}
                    placeholder={t('services.form.desc_placeholder')}
                    value={serviceForm.description}
                    onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                  />
                </div>

                {/* Stdio 类型配置 */}
                {serviceForm.type === 'stdio' && (
                  <div className="space-y-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-500/20">
                    <h4 className="text-xs font-semibold text-gray-900 dark:text-white">{t('services.config.stdio')}</h4>
                    <div className="grid grid-cols-1 gap-4">
                      <Input
                        label={t('services.form.command')}
                        placeholder={t('services.form.command_placeholder')}
                        value={serviceForm.command}
                        onChange={(e) => setServiceForm({ ...serviceForm, command: e.target.value })}
                      />
                      <Input
                        label={t('services.form.args')}
                        placeholder={t('services.form.args_placeholder')}
                        value={serviceForm.args}
                        onChange={(e) => setServiceForm({ ...serviceForm, args: e.target.value })}
                      />
                      <Input
                        label={t('services.form.cwd')}
                        placeholder={t('services.form.cwd_placeholder')}
                        value={serviceForm.cwd}
                        onChange={(e) => setServiceForm({ ...serviceForm, cwd: e.target.value })}
                      />
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-700 dark:text-slate-300">
                          {t('services.form.env')}
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
                    <h4 className="text-xs font-semibold text-gray-900 dark:text-white">{t('services.config.sse')}</h4>
                    <Input
                      label={t('services.form.url')}
                      placeholder={t('services.form.url_placeholder')}
                      value={serviceForm.url}
                      onChange={(e) => setServiceForm({ ...serviceForm, url: e.target.value })}
                    />
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-700 dark:text-slate-300">
                        {t('services.form.headers')}
                      </label>
                      <textarea
                        value={serviceForm.headers}
                        onChange={(e) => setServiceForm({ ...serviceForm, headers: e.target.value })}
                        placeholder={t('services.form.headers_placeholder')}
                        className="w-full min-h-[80px] rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 font-mono resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* HTTP 类型配置 */}
                {serviceForm.type === 'http' && (
                  <div className="space-y-4 p-4 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-500/20">
                    <h4 className="text-xs font-semibold text-gray-900 dark:text-white">{t('services.config.http')}</h4>
                    <Input
                      label={t('services.form.base_url')}
                      placeholder={t('services.form.base_url_placeholder')}
                      value={serviceForm.baseUrl}
                      onChange={(e) => setServiceForm({ ...serviceForm, baseUrl: e.target.value })}
                    />
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-gray-700 dark:text-slate-300">
                        {t('services.form.headers')}
                      </label>
                      <textarea
                        value={serviceForm.headers}
                        onChange={(e) => setServiceForm({ ...serviceForm, headers: e.target.value })}
                        placeholder={t('services.form.headers_placeholder')}
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
                        {editingServiceId ? t('services.button.saving') : t('services.button.adding')}
                      </>
                    ) : (
                      editingServiceId ? t('services.button.save') : t('services.button.add_confirm')
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
                    {t('services.button.cancel')}
                  </Button>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-slate-500 text-center">
                  💡 {editingServiceId ? t('services.tip.save_restart') : t('services.tip.add_manual_start')}
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
            <Card className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-2xl">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                      {t('services.modal.delete_title')}
                    </h3>
                    <p 
                      className="text-sm text-gray-700 dark:text-slate-300 mb-4"
                      dangerouslySetInnerHTML={{ __html: t('services.modal.delete_confirm', { name: showDeleteConfirm.name }) }}
                    />
                    
                    {showDeleteConfirm.type === 'stdio' && (
                      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-md">
                        <p className="text-xs text-blue-900 dark:text-blue-300">
                          💡 {t('services.modal.delete_stdio_tip')}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={confirmDelete}
                        className="flex-1"
                      >
                        {t('services.button.delete_confirm')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDeleteConfirm(null)}
                        className="flex-1"
                      >
                        {t('services.button.cancel')}
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
                    {t('services.import.title')}
                  </CardTitle>
                  <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                    {t('services.import.subtitle')}
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
                    {t('services.import.paste_label')}
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
                      {t('services.import.preview_label')}
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
                          <div className="text-xs text-gray-600 dark:text-slate-400">{t('services.import.success_label')}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-500/20">
                          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {importStatus.result.failed}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-slate-400">{t('services.import.fail_label')}</div>
                        </div>
                      </div>
                      {importStatus.result.errors.length > 0 && (
                        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-500/20">
                          <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2">{t('services.import.error_details')}</div>
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
                              {t('services.button.parsing')}
                            </>
                          ) : (
                            t('services.button.parse')
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
                          {t('services.button.cancel')}
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
                        {t('services.button.close')}
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
                              {t('services.button.importing')}
                            </>
                          ) : (
                            t('services.button.import_confirm', { count: importStatus.preview.length })
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
                          {t('services.button.repaste')}
                        </Button>
                      </>
                    )}
                  </div>

                  <p className="text-[11px] text-gray-500 dark:text-slate-500 text-center">
                    💡 {t('services.import.tip')}
                  </p>
                </CardContent>
              </Card>
            </div>
          </>
        )}

      {/* 工具详情弹窗 */}
      {selectedTool && (() => {
        console.log('[Modal] Rendering tool detail:', selectedTool.name);
        return (
          <div 
            className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              // 点击背景关闭
              if (e.target === e.currentTarget) {
                console.log('[Modal] Background clicked, closing');
                setSelectedTool(null);
              }
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
                onClick={() => {
                  setSelectedTool(null);
                }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-slate-400" />
              </button>
            </div>

            {/* 内容区 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* 描述 */}
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-slate-300 mb-1 block">
                  {t('services.tool.description')}
                </label>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  {selectedTool.description || t('services.desc.none')}
                </p>
              </div>

              {/* 参数列表 */}
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-slate-300 mb-2 block">
                  {t('services.tool.params', { count: Object.keys(selectedTool.parameters || {}).length })}
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
                              {t('services.tool.required')}
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
                            <span className="font-medium">{t('services.tool.enum')}</span>{' '}
                            <span className="font-mono">{JSON.stringify(param.enum)}</span>
                          </div>
                        )}
                        {param.default !== undefined && (
                          <div className="text-xs text-gray-500 dark:text-slate-500">
                            <span className="font-medium">{t('services.tool.default')}</span>{' '}
                            <span className="font-mono">{JSON.stringify(param.default)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-slate-500 italic">{t('services.tool.no_params')}</p>
                )}
              </div>

              {/* JSON Schema */}
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-slate-300 mb-2 block">
                  {t('services.tool.full_def')}
                </label>
                <pre className="text-xs bg-gray-900 dark:bg-black text-gray-100 p-3 rounded-lg overflow-x-auto">
                  <code>{JSON.stringify(selectedTool, null, 2)}</code>
                </pre>
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="p-4 border-t border-gray-200 dark:border-slate-800 flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedTool(null);
                }}
              >
                {t('services.button.close')}
              </Button>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}

// 工具列表组件
function ToolsList({ serviceId, onToolClick }: { serviceId: string; onToolClick: (tool: Tool) => void }) {
  const { t } = useTranslation();
  const { data: serviceDetail } = useService(serviceId);
  const tools = serviceDetail?.tools || [];
  const [expanded, setExpanded] = useState(false);

  if (tools.length === 0) {
    return <span className="text-[11px] text-gray-400 dark:text-slate-500 italic">{t('services.tool.empty')}</span>;
  }

  const displayTools = expanded ? tools : tools.slice(0, 10);

  return (
    <>
      {displayTools.map((tool, idx) => (
        <button
          key={`${serviceId}-${tool.name}-${idx}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToolClick(tool);
          }}
          className="text-[10px] px-2 py-0.5 bg-primary-500/5 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 border border-primary-500/20 hover:bg-primary-500/10 dark:hover:bg-primary-500/20 transition-colors cursor-pointer rounded-md inline-flex items-center gap-1"
          title={t('services.tool.click_detail')}
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
          title={expanded ? t('services.tool.collapse') : t('services.tool.expand')}
        >
          {expanded ? t('services.tool.collapse') : t('services.tool.more', { count: tools.length - 10 })}
        </button>
      )}
    </>
  );
}

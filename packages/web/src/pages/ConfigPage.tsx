import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWebConfig, useExportConfig, useImportConfig } from '@/hooks/useWebConfig';
import { 
  Download, 
  Upload, 
  Database, 
  Loader2,
  CheckCircle2,
  Copy,
  FileCheck,
  Info,
  Settings,
} from 'lucide-react';
import { useState, useRef } from 'react';
import { toast } from '@/lib/toast';
import { useTranslation } from '@/hooks/useI18n';

export function ConfigPage() {
  const { t, language } = useTranslation();
  const { data: config, isLoading } = useWebConfig();
  const exportMutation = useExportConfig();
  const importMutation = useImportConfig();

  const [importedContent, setImportedContent] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 导出配置
  const handleExport = async () => {
    try {
      const result = await exportMutation.mutateAsync();
      
      // 创建并下载文件
      const blob = new Blob([result.content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(t('config.export.success'));
    } catch (error) {
      toast.error((error instanceof Error ? error.message : String(error)) || t('config.toast.export_fail'));
    }
  };

  // 导入配置
  const handleImport = async () => {
    if (!importedContent.trim()) {
      toast.error(t('config.toast.select_file'));
      return;
    }

    try {
      await importMutation.mutateAsync(importedContent);
      setImportedContent('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      toast.success(t('config.toast.import_success'));
      
      // 延迟刷新让用户看到成功提示
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      toast.error((error instanceof Error ? error.message : String(error)) || t('config.toast.import_fail'));
    }
  };

  // 读取文件
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportedContent(content);
      toast.success(t('config.toast.read_success'));
    };
    reader.onerror = () => {
      toast.error(t('config.toast.read_fail'));
    };
    reader.readAsText(file);
  };

  // 复制配置到剪贴板
  const handleCopyConfig = async () => {
    if (!config) return;
    
    try {
      const content = JSON.stringify(config.config, null, 2);
      await navigator.clipboard.writeText(content);
      toast.success(t('config.copy.success'));
    } catch {
      toast.error(t('config.toast.copy_fail'));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          <p className="text-sm text-gray-500 dark:text-slate-500">{t('config.loading')}</p>
        </div>
      </div>
    );
  }

  const configData = config?.config;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('config.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {t('config.subtitle')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 配置概览 */}
        <Card className="md:col-span-2 dark:bg-slate-900 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="w-5 h-5 text-primary-500" />
              {t('config.overview')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-slate-800/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
                    {t('config.services')}
                  </span>
                  <Settings className="w-4 h-4 text-gray-400 dark:text-slate-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {configData?.services?.length || 0}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-gray-50 dark:bg-slate-800/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
                    {t('config.endpoints')}
                  </span>
                  <Database className="w-4 h-4 text-gray-400 dark:text-slate-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {configData?.xiaozhi?.endpoints?.length || 0}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-gray-50 dark:bg-slate-800/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
                    {t('config.last_update')}
                  </span>
                  <FileCheck className="w-4 h-4 text-gray-400 dark:text-slate-600" />
                </div>
                <p className="text-xs font-medium text-gray-900 dark:text-white">
                  {configData?.lastUpdate 
                    ? new Date(configData.lastUpdate).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US')
                    : t('config.unknown')}
                </p>
              </div>
            </div>

            {/* 当前端点 */}
            {configData?.xiaozhi?.currentEndpointId && (
              <div className="mt-4 p-4 rounded-lg border border-primary-500/20 bg-primary-500/5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary-500" />
                  <span className="text-xs font-medium text-gray-700 dark:text-slate-300">
                    {t('config.current_endpoint')}：
                  </span>
                  <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                    {configData.xiaozhi.endpoints?.find(
                      (ep: { id: string; name: string }) => ep.id === configData.xiaozhi.currentEndpointId
                    )?.name || t('config.unknown')}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 导出配置 */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Download className="w-5 h-5 text-emerald-500" />
              {t('config.export.title')}
            </CardTitle>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              {t('config.export.desc')}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={exportMutation.isPending}
                className="flex-1 gap-2"
              >
                {exportMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {exportMutation.isPending ? t('config.export.exporting') : t('config.export.btn')}
              </Button>

              <Button
                variant="secondary"
                onClick={handleCopyConfig}
                className="gap-2"
                title={t('config.export.copy')}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/20">
              <div className="flex gap-2">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  {t('config.export.info')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 导入配置 */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="w-5 h-5 text-amber-500" />
              {t('config.import.title')}
            </CardTitle>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              {t('config.import.desc')}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
                id="config-file-upload"
              />
              <label
                htmlFor="config-file-upload"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-slate-800/50 border-gray-300 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                {importedContent ? (
                  <div className="flex flex-col items-center text-emerald-500">
                    <CheckCircle2 className="w-8 h-8 mb-2" />
                    <span className="text-sm font-medium">{t('config.import.select')}</span>
                    <span className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                      {t('config.import.change')}
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-gray-500 dark:text-slate-400">
                    <Upload className="w-8 h-8 mb-2" />
                    <span className="text-sm font-medium">{t('config.import.drag')}</span>
                    <span className="text-xs mt-1">{t('config.import.format')}</span>
                  </div>
                )}
              </label>
            </div>

            <Button
              className="w-full gap-2"
              onClick={handleImport}
              disabled={!importedContent || importMutation.isPending}
            >
              {importMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {importMutation.isPending ? t('config.import.importing') : t('config.import.btn')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

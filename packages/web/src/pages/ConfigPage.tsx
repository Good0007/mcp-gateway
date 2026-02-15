import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWebConfig, useExportConfig, useImportConfig } from '@/hooks/useWebConfig';
import { 
  Download, 
  Upload, 
  FileJson, 
  Database, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  FileCheck,
  Settings,
  Info
} from 'lucide-react';
import { useState, useRef } from 'react';
import { toast } from '@/lib/toast';

export function ConfigPage() {
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
      
      toast.success('配置导出成功');
    } catch (error: any) {
      toast.error(error.message || '导出配置失败');
    }
  };

  // 导入配置
  const handleImport = async () => {
    if (!importedContent.trim()) {
      toast.error('请先选择配置文件');
      return;
    }

    try {
      await importMutation.mutateAsync(importedContent);
      setImportedContent('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      toast.success('配置导入成功，页面将刷新');
      
      // 延迟刷新让用户看到成功提示
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      toast.error(error.message || '导入配置失败');
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
      toast.success('文件读取成功');
    };
    reader.onerror = () => {
      toast.error('文件读取失败');
    };
    reader.readAsText(file);
  };

  // 复制配置到剪贴板
  const handleCopyConfig = async () => {
    if (!config) return;
    
    try {
      const content = JSON.stringify(config.config, null, 2);
      await navigator.clipboard.writeText(content);
      toast.success('配置已复制到剪贴板');
    } catch (error) {
      toast.error('复制失败');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          <p className="text-sm text-gray-500 dark:text-slate-500">加载配置信息...</p>
        </div>
      </div>
    );
  }

  const configData = config?.config;

  return (
    <div className="space-y-6">

      {/* 配置概览 */}
      <Card className="dark:bg-slate-900 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="w-5 h-5 text-primary-500" />
            配置概览
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-slate-800/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
                  已添加服务
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
                  已保存端点
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
                  最后更新
                </span>
                <FileCheck className="w-4 h-4 text-gray-400 dark:text-slate-600" />
              </div>
              <p className="text-xs font-medium text-gray-900 dark:text-white">
                {configData?.lastUpdate 
                  ? new Date(configData.lastUpdate).toLocaleString('zh-CN')
                  : '未知'}
              </p>
            </div>
          </div>

          {/* 当前端点 */}
          {configData?.xiaozhi?.currentEndpointId && (
            <div className="mt-4 p-4 rounded-lg border border-primary-500/20 bg-primary-500/5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary-500" />
                <span className="text-xs font-medium text-gray-700 dark:text-slate-300">
                  当前使用端点：
                </span>
                <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                  {configData.xiaozhi.endpoints?.find(
                    ep => ep.id === configData.xiaozhi.currentEndpointId
                  )?.name || '未知'}
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
            导出配置
          </CardTitle>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            将当前配置导出为 JSON 文件，用于备份或迁移
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button
              variant="primary"
              onClick={handleExport}
              disabled={exportMutation.isPending}
              className="gap-2"
            >
              {exportMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {exportMutation.isPending ? '导出中...' : '导出为文件'}
            </Button>

            <Button
              variant="secondary"
              onClick={handleCopyConfig}
              className="gap-2"
            >
              <Copy className="w-4 h-4" />
              复制到剪贴板
            </Button>
          </div>

          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/20">
            <div className="flex gap-2">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                导出的配置文件包含所有服务、端点和偏好设置，但不包含敏感的密钥或密码。
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
            导入配置
          </CardTitle>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            从 JSON 文件导入配置，将覆盖当前配置
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
                id="config-file-input"
              />
              <label htmlFor="config-file-input" className="cursor-pointer">
                <div className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                  <FileJson className="w-4 h-4" />
                  选择配置文件
                </div>
              </label>
            </div>

            {importedContent && (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    文件已加载，共 {(importedContent.length / 1024).toFixed(2)} KB
                  </span>
                </div>
              </div>
            )}

            <Button
              variant="primary"
              onClick={handleImport}
              disabled={!importedContent || importMutation.isPending}
              className="gap-2 w-full sm:w-auto"
            >
              {importMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {importMutation.isPending ? '导入中...' : '导入配置'}
            </Button>
          </div>

          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/20">
            <div className="flex gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  注意事项：
                </p>
                <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-0.5 ml-4 list-disc">
                  <li>导入配置将覆盖当前所有设置</li>
                  <li>建议先导出当前配置进行备份</li>
                  <li>导入成功后页面将自动刷新</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

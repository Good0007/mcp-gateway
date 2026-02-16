import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useWebConfig, useExportConfig, useImportConfig, useMcpProxy, useUpdateMcpProxy, useGenerateProxyToken } from '@/hooks/useWebConfig';
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
  Info,
  Plug,
  Server,
  Activity,
  Code,
  Shield,
  Eye,
  EyeOff,
  RefreshCw,
  Power,
  Trash2,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { toast } from '@/lib/toast';

export function ConfigPage() {
  const { data: config, isLoading } = useWebConfig();
  const exportMutation = useExportConfig();
  const importMutation = useImportConfig();

  const [importedContent, setImportedContent] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [proxyStatus, setProxyStatus] = useState<any>(null);
  const [proxyLoading, setProxyLoading] = useState(false);
  const [showToken, setShowToken] = useState(false);

  // MCP Proxy hooks
  const { data: mcpProxyData, isLoading: mcpProxyLoading } = useMcpProxy();
  const updateMcpProxy = useUpdateMcpProxy();
  const generateToken = useGenerateProxyToken();
  const proxyConfig = mcpProxyData?.mcpProxy;

  // 获取代理状态
  const fetchProxyStatus = async () => {
    setProxyLoading(true);
    try {
      const response = await fetch('http://localhost:3001/mcp/status');
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
    <Tabs defaultValue="config" className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
        <TabsTrigger value="config" className="gap-2">
          <Settings className="w-4 h-4" />
          配置管理
        </TabsTrigger>
        <TabsTrigger value="proxy" className="gap-2">
          <Plug className="w-4 h-4" />
          MCP 代理
        </TabsTrigger>
      </TabsList>

      {/* Tab 1: 配置管理 */}
      <TabsContent value="config" className="space-y-6">

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
      </TabsContent>

      {/* Tab 2: MCP 代理服务器 */}
      <TabsContent value="proxy" className="space-y-6">
        {/* 代理状态概览 */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Server className="w-5 h-5 text-primary-500" />
                代理服务器状态
              </CardTitle>
              <Button
                variant={proxyConfig?.enabled !== false ? 'primary' : 'outline'}
                size="sm"
                className="gap-2"
                disabled={mcpProxyLoading || updateMcpProxy.isPending}
                onClick={() => updateMcpProxy.mutate({ enabled: proxyConfig?.enabled === false ? true : false })}
              >
                <Power className="w-4 h-4" />
                {proxyConfig?.enabled !== false ? '已启用' : '已禁用'}
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
                        服务状态
                      </span>
                      <Activity className={`w-4 h-4 ${proxyConfig?.enabled !== false ? 'text-emerald-500' : 'text-red-500'}`} />
                    </div>
                    <Badge className={proxyConfig?.enabled !== false ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}>
                      {proxyConfig?.enabled !== false ? '运行中' : '已禁用'}
                    </Badge>
                  </div>

                  <div className="p-4 rounded-lg bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
                        认证状态
                      </span>
                      <Shield className="w-4 h-4 text-gray-400 dark:text-slate-600" />
                    </div>
                    <Badge className={proxyConfig?.token ? 'bg-blue-500 text-white' : 'bg-gray-400 text-white'}>
                      {proxyConfig?.token ? '已设置' : '未设置'}
                    </Badge>
                  </div>

                  <div className="p-4 rounded-lg bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
                        活跃会话
                      </span>
                      <Server className="w-4 h-4 text-gray-400 dark:text-slate-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {proxyStatus.stats?.activeSessions || 0}
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
                        可用工具
                      </span>
                      <Plug className="w-4 h-4 text-gray-400 dark:text-slate-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {proxyStatus.stats?.totalTools || 0}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                      协议信息
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-blue-600/70 dark:text-blue-400/70">协议版本：</span>
                      <span className="text-blue-700 dark:text-blue-300 font-mono ml-1">
                        {proxyStatus.protocol}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-600/70 dark:text-blue-400/70">传输方式：</span>
                      <span className="text-blue-700 dark:text-blue-300 font-mono ml-1">
                        {proxyStatus.transports?.join(', ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-slate-500">
                无法连接到代理服务器
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
                刷新状态
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Token 认证管理 */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="w-5 h-5 text-amber-500" />
              Token 认证
            </CardTitle>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              配置 Bearer Token 认证以保护代理端点。设置后，所有客户端连接都需要在请求头中携带此 Token。
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <input
                  type={showToken ? 'text' : 'password'}
                  readOnly
                  value={proxyConfig?.token || ''}
                  placeholder="未设置 Token（不启用认证）"
                  className="w-full px-3 py-2 pr-10 text-sm font-mono bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg"
                />
                {proxyConfig?.token && (
                  <button
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
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
                      toast.success('已生成新的 Token');
                      setShowToken(true);
                    },
                  });
                }}
              >
                <RefreshCw className={`w-4 h-4 ${generateToken.isPending ? 'animate-spin' : ''}`} />
                生成新 Token
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
                        toast.success('Token 已复制到剪贴板');
                      } catch {
                        toast.error('复制失败');
                      }
                    }}
                  >
                    <Copy className="w-4 h-4" />
                    复制
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                    onClick={() => {
                      updateMcpProxy.mutate({ token: '' }, {
                        onSuccess: () => {
                          toast.success('Token 已清除');
                          setShowToken(false);
                        },
                      });
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                    清除
                  </Button>
                </>
              )}
            </div>
            {proxyConfig?.token && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/20">
                <div className="flex gap-2">
                  <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    生成新 Token 后，需要同步更新所有客户端（VS Code、Claude Desktop 等）的配置，否则连接将被拒绝。
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
              VS Code 配置
            </CardTitle>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              在项目根目录创建 <code className="font-mono bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">.vscode/mcp.json</code> 文件
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <pre className="text-xs bg-gray-900 dark:bg-black text-gray-100 p-4 rounded-lg overflow-x-auto">
                <code>{JSON.stringify({
                  servers: {
                    "mcp-agent": {
                      type: "sse",
                      url: "http://localhost:3001/mcp/sse",
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
                          url: "http://localhost:3001/mcp/sse",
                          ...(proxyConfig?.token ? { headers: { Authorization: `Bearer ${proxyConfig?.token}` } } : {}),
                        },
                      },
                    };
                    await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
                    toast.success('配置已复制到剪贴板');
                  } catch {
                    toast.error('复制失败');
                  }
                }}
                className="absolute top-3 right-3 p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                <Copy className="w-4 h-4 text-gray-300" />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/20">
              <div className="flex gap-2">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                    配置步骤：
                  </p>
                  <ol className="text-xs text-blue-700 dark:text-blue-300 space-y-1 ml-4 list-decimal">
                    <li>在项目根目录创建 <code className="font-mono">.vscode/mcp.json</code> 文件</li>
                    <li>粘贴上述配置内容（Token 已自动包含）</li>
                    <li>保存文件，VS Code 将自动发现并连接</li>
                    <li>也可在 VS Code 命令面板中搜索 "MCP: List Servers" 查看状态</li>
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
              Claude Desktop 配置
            </CardTitle>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              在 Claude Desktop 的配置文件中添加以下内容
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <pre className="text-xs bg-gray-900 dark:bg-black text-gray-100 p-4 rounded-lg overflow-x-auto">
                <code>{JSON.stringify({
                  mcpServers: {
                    "mcp-agent": {
                      url: "http://localhost:3001/mcp/sse",
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
                          url: "http://localhost:3001/mcp/sse",
                          ...(proxyConfig?.token ? { headers: { Authorization: `Bearer ${proxyConfig?.token}` } } : {}),
                        },
                      },
                    };
                    await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
                    toast.success('配置已复制到剪贴板');
                  } catch {
                    toast.error('复制失败');
                  }
                }}
                className="absolute top-3 right-3 p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                <Copy className="w-4 h-4 text-gray-300" />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-500/20">
              <div className="flex gap-2">
                <Info className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-medium text-purple-700 dark:text-purple-300">
                    配置文件位置：
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

        {/* 使用说明 */}
        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="w-5 h-5 text-amber-500" />
              使用说明
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-gray-700 dark:text-slate-300">
              <div>
                <h4 className="font-semibold mb-2">✨ 功能特点</h4>
                <ul className="space-y-1.5 ml-4 list-disc text-xs">
                  <li>统一入口：将所有 MCP 服务聚合为一个端点</li>
                  <li>多客户端支持：VS Code、Claude Desktop 等都可连接</li>
                  <li>实时同步：服务变化自动通知所有客户端</li>
                  <li>标准协议：完全兼容 MCP 2024-11-05 规范</li>
                  <li>Token 认证：可选的 Bearer Token 认证保护</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">🔌 连接方式</h4>
                <ul className="space-y-1.5 ml-4 list-disc text-xs">
                  <li>Streamable HTTP：VS Code 等现代客户端使用 POST 直连</li>
                  <li>Legacy SSE：兼容旧版客户端的 SSE 长连接方式</li>
                  <li>会话管理：每个客户端独立会话，互不干扰</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">🔐 安全配置</h4>
                <ul className="space-y-1.5 ml-4 list-disc text-xs">
                  <li>可通过上方 Token 管理面板生成认证令牌</li>
                  <li>设置 Token 后，客户端需在 headers 中携带 Authorization: Bearer &lt;token&gt;</li>
                  <li>上方配置代码已自动包含当前 Token，复制即可使用</li>
                  <li>未设置 Token 时，任何客户端均可自由连接</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">⚠️ 注意事项</h4>
                <ul className="space-y-1.5 ml-4 list-disc text-xs">
                  <li>确保 mcp-agent 服务正在运行（端口 3001）</li>
                  <li>代理服务器会暴露所有已启动的 MCP 服务工具</li>
                  <li>暴露到公网时务必启用 Token 认证</li>
                  <li>更换 Token 后需同步更新所有客户端配置</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

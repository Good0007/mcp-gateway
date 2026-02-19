import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { MarketPage } from '@/pages/MarketPage';
import { ServicesPage } from '@/pages/ServicesPage';
import { XiaozhiPage } from '@/pages/XiaozhiPage';
import { LogsPage } from '@/pages/LogsPage';
import { ConfigPage } from '@/pages/ConfigPage';
import { EnvironmentPage } from '@/pages/EnvironmentPage';
import { LoginPage } from '@/pages/LoginPage';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStatus, useLogin } from '@/hooks/useAuth';
import { Toaster } from 'sonner';
import { Loader2 } from 'lucide-react';

const pageMeta: Record<string, { title: string; subtitle?: string }> = {
  market:      { title: '插件市场',     subtitle: '浏览和安装 MCP 插件' },
  xiaozhi:     { title: 'Xiaozhi 服务', subtitle: '管理小智 AI 连接和工具' },
  services:    { title: '服务配置',     subtitle: '配置 MCP 服务实例' },
  environment: { title: '环境检测',     subtitle: '检测和安装 MCP 运行环境' },
  logs:        { title: '日志查看',     subtitle: '查看系统运行日志' },
  config:      { title: '配置管理',     subtitle: '导出和导入您的配置' },
};

function App() {
  useTheme();
  const [currentPage, setCurrentPage] = useState('market');
  
  // Authentication
  const { data: authStatus, isLoading: authLoading } = useAuthStatus();
  const loginMutation = useLogin();

  const meta = pageMeta[currentPage] ?? pageMeta.market;

  // Handle login
  const handleLogin = async (username: string, password: string): Promise<boolean> => {
    try {
      await loginMutation.mutateAsync({ username, password });
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  // Show loading spinner while checking auth status
  if (authLoading) {
    return (
      <>
        <Toaster 
          position="top-right" 
          theme="system"
          richColors 
          closeButton
          duration={4000}
        />
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">加载中...</p>
          </div>
        </div>
      </>
    );
  }

  // Show login page if auth is enabled and user is not authenticated
  if (authStatus?.enabled && !authStatus?.authenticated) {
    return (
      <>
        <Toaster 
          position="top-right" 
          theme="system"
          richColors 
          closeButton
          duration={4000}
        />
        <LoginPage onLogin={handleLogin} />
      </>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'market':      return <MarketPage />;
      case 'xiaozhi':     return <XiaozhiPage />;
      case 'services':    return <ServicesPage />;
      case 'environment': return <EnvironmentPage />;
      case 'logs':        return <LogsPage />;
      case 'config':      return <ConfigPage />;
      default:            return <MarketPage />;
    }
  };

  return (
    <>
      <Toaster 
        position="top-right" 
        theme="system"
        richColors 
        closeButton
        duration={4000}
      />
      <Layout
        currentPage={currentPage}
        pageTitle={meta.title}
        pageSubtitle={meta.subtitle}
        onNavigate={setCurrentPage}
      >
        {renderPage()}
      </Layout>
    </>
  );
}

export default App;

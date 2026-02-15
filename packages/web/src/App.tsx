import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { MarketPage } from '@/pages/MarketPage';
import { ServicesPage } from '@/pages/ServicesPage';
import { XiaozhiPage } from '@/pages/XiaozhiPage';
import { LogsPage } from '@/pages/LogsPage';
import { ConfigPage } from '@/pages/ConfigPage';
import { EnvironmentPage } from '@/pages/EnvironmentPage';
import { useTheme } from '@/hooks/useTheme';
import { Toaster } from 'sonner';

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

  const meta = pageMeta[currentPage] ?? pageMeta.market;

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

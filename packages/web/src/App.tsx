import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { MarketPage } from '@/pages/MarketPage';
import { useTheme } from '@/hooks/useTheme';

const pageMeta: Record<string, { title: string; subtitle?: string }> = {
  market:   { title: '插件市场',     subtitle: '浏览和安装 MCP 插件' },
  xiaozhi:  { title: 'Xiaozhi 服务', subtitle: '管理小智 AI 连接' },
  services: { title: '服务配置',     subtitle: '配置 MCP 服务实例' },
  monitor:  { title: '连接监控',     subtitle: '查看实时连接状态' },
  logs:     { title: '日志查看',     subtitle: '查看系统运行日志' },
};

function Placeholder({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-64 rounded-xl border border-dashed border-gray-300 dark:border-slate-700">
      <p className="text-sm text-gray-400 dark:text-gray-500">{label} — 功能开发中</p>
    </div>
  );
}

function App() {
  useTheme();
  const [currentPage, setCurrentPage] = useState('market');

  const meta = pageMeta[currentPage] ?? pageMeta.market;

  const renderPage = () => {
    switch (currentPage) {
      case 'market':   return <MarketPage />;
      case 'xiaozhi':  return <Placeholder label="Xiaozhi 服务" />;
      case 'services': return <Placeholder label="服务配置" />;
      case 'monitor':  return <Placeholder label="连接监控" />;
      case 'logs':     return <Placeholder label="日志查看" />;
      default:         return <MarketPage />;
    }
  };

  return (
    <Layout
      currentPage={currentPage}
      pageTitle={meta.title}
      pageSubtitle={meta.subtitle}
      onNavigate={setCurrentPage}
    >
      {renderPage()}
    </Layout>
  );
}

export default App;

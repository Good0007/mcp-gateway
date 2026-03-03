import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { MarketPage } from '@/pages/MarketPage';
import { ServicesPage } from '@/pages/ServicesPage';
import { ConnectionPage } from '@/pages/ConnectionPage';
import { LogsPage } from '@/pages/LogsPage';
import { ConfigPage } from '@/pages/ConfigPage';
import { EnvironmentPage } from '@/pages/EnvironmentPage';
import { LoginPage } from '@/pages/LoginPage';
import { useTheme } from './hooks/useTheme';
import { useAuthStatus, useLogin } from '@/hooks/useAuth';
import { Toaster } from 'sonner';
import { Loader2 } from 'lucide-react';

function App() {
  const { theme } = useTheme();
  const [currentPage, setCurrentPage] = useState('market');
  
  // Authentication
  const { data: authStatus, isLoading: authLoading, error: authError } = useAuthStatus();
  const loginMutation = useLogin();

  console.log('App Render:', { currentPage, authStatus, authLoading, authError });

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
    console.log('App: Loading auth status...');
    return (
      <>
        <Toaster 
          position="top-right" 
          theme={theme}
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

  if (authError) {
    console.error('App: Auth error:', authError);
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 dark:bg-red-900/10 text-red-500">
        <div className="text-center p-4">
          <h3 className="text-lg font-bold mb-2">初始化失败</h3>
          <p>{(authError as Error).message}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  // Show login page if auth is enabled and user is not authenticated
  if (authStatus?.enabled && !authStatus?.authenticated) {
    return (
      <>
        <Toaster 
          position="top-right" 
          theme={theme}
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
      case 'xiaozhi':     return <ConnectionPage />;
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
        theme={theme}
        richColors 
        closeButton
        duration={4000}
      />
      <Layout
        currentPage={currentPage}
        onNavigate={setCurrentPage}
      >
        {renderPage()}
      </Layout>
    </>
  );
}

export default App;

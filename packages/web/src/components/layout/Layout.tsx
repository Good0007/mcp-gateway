import React from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

interface LayoutProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  children: React.ReactNode;
}

export function Layout({ currentPage, onNavigate, children }: LayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-300">
      <Header currentPage={currentPage} onNavigate={onNavigate} />
      
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8">
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow sm:p-6 p-4 border border-gray-200 dark:border-slate-800 min-h-[calc(100vh-16rem)]">
          {children}
        </div>
      </main>

      <Footer />
    </div>
  );
}

import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useTheme } from '../../lib/theme';

export const AppLayout: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div
      className={`min-h-screen flex font-sans antialiased selection:bg-purple-600/30 selection:text-purple-200 transition-colors duration-200 ${
        isLight
          ? 'bg-[#FAF9F6] text-[#111827]'
          : 'bg-[#0B0D14] text-[#F1F5F9]'
      }`}
    >
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <main
          className={`flex-1 overflow-y-auto flex flex-col min-w-0 transition-colors duration-200 ${
            isLight ? 'bg-[#FAF9F6]' : 'bg-[#0B0D14]'
          }`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

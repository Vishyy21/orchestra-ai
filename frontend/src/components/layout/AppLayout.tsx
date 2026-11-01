import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useTheme } from '../../lib/theme';

export const AppLayout: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div
      className={`min-h-screen flex font-sans antialiased selection:bg-[#12615D]/20 selection:text-[#12615D] dark:selection:bg-[#14918E]/30 dark:selection:text-[#22D3EE] transition-colors duration-200 ${
        isLight
          ? 'bg-[#F7F6F1] text-[#172A29]'
          : 'bg-[#0B0F14] text-[#F1F5F9]'
      }`}
    >
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <main
          className={`flex-1 overflow-y-auto flex flex-col min-w-0 transition-colors duration-200 ${
            isLight ? 'bg-[#F7F6F1]' : 'bg-[#0B0F14]'
          }`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex bg-[#0B0D14] text-[#F1F5F9] font-sans antialiased selection:bg-purple-600/30 selection:text-purple-200">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <main className="flex-1 overflow-y-auto flex flex-col min-w-0 bg-[#0B0D14]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

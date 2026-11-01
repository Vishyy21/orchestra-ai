import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#08090C] text-[#EDEDEF] font-sans selection:bg-[#6366F1]/30 selection:text-[#A5B4FC]">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto flex flex-col min-w-0 bg-[#08090C] canvas-grid-bg">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

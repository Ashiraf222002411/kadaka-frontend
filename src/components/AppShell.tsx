'use client';

import React from 'react';
import DashboardNav from '@/app/dashboard/DashboardNav';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardNav />
      <div className="lg:pl-64 min-w-0">
        <div className="pt-16">
          <main className="p-4 lg:p-6 max-w-7xl">{children}</main>
        </div>
      </div>
    </div>
  );
}

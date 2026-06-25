'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import Icon from '@/components/Icon';

const PAGE_META = {
  '/dashboard': { title: 'Dashboard', sub: 'Overview of properties, requests and funds' },
  '/properties': { title: 'Properties', sub: 'Manage the property portfolio' },
  '/requests': { title: 'Maintenance Requests', sub: 'Logged issues, ranked by the decision engine' },
  '/funds': { title: 'Funds & Allocation', sub: 'Budgets and DSS-recommended fund allocation' },
  '/reports': { title: 'Reports', sub: 'Analytics and the fund allocation audit trail' },
};

export default function AppLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading || !user) {
    return <div className="center-screen"><div className="loading"><div className="spinner" />Loading…</div></div>;
  }

  const meta = PAGE_META[pathname] || { title: 'PropertyDSS', sub: '' };

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      <div className="main">
        <header className="topbar">
          <button className="btn-icon menu-btn" onClick={() => setSidebarOpen((o) => !o)} aria-label="Menu"><Icon name="menu" size={18} /></button>
          <div>
            <h2>{meta.title}</h2>
            <div className="sub">{meta.sub}</div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

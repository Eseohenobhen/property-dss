'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { initials } from '@/lib/format';
import Icon from '@/components/Icon';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/properties', label: 'Properties', icon: 'properties' },
  { href: '/requests', label: 'Maintenance', icon: 'maintenance' },
  { href: '/funds', label: 'Funds & Allocation', icon: 'funds' },
  { href: '/reports', label: 'Reports', icon: 'reports' },
];

export default function Sidebar({ open, onNavigate }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-brand">
        <span className="logo">P</span> PropertyDSS
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">Menu</div>
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={`nav-link ${active ? 'active' : ''}`} onClick={onNavigate}>
              <span className="ico"><Icon name={item.icon} /></span> {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-foot">
        <div className="user-chip">
          <div className="avatar">{initials(user?.fullName)}</div>
          <div className="user-meta">
            <div className="nm">{user?.fullName}</div>
            <span className={`role-pill ${user?.role}`}>{user?.role}</span>
          </div>
        </div>
        <button className="btn btn-secondary btn-block btn-sm" onClick={logout}>Sign out</button>
      </div>
    </aside>
  );
}

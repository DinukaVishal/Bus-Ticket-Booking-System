import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  CalendarDays,
  BarChart3,
  Settings,
  ShieldCheck,
  ArrowLeft,
  Upload,
} from 'lucide-react';

interface ComplianceLayoutProps {
  children?: React.ReactNode;
  title?: string;
  description?: string;
}

/**
 * Shared layout for the Compliance & Regulatory module.
 * Renders a consistent header + tab navigation for both Admin and
 * Bus Owner compliance pages.
 */
export function ComplianceLayout({
  children,
  title = 'Compliance & Regulatory Management',
  description,
}: ComplianceLayoutProps) {
  const navigate = useNavigate();
  const { isAdmin, isBusOwner } = useAuthContext();

  const tabs = [
    { to: '/admin/compliance', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/compliance/documents', label: 'Documents', icon: FileText },
    { to: '/admin/compliance/calendar', label: 'Calendar', icon: CalendarDays },
    { to: '/admin/compliance/reports', label: 'Reports', icon: BarChart3 },
    ...(isAdmin ? [{ to: '/admin/compliance/settings', label: 'Settings', icon: Settings }] : []),
  ];

  const backTo = isAdmin ? '/admin' : '/bus-owner/dashboard';

  return (
    <div className="min-h-screen bg-background/60 backdrop-blur-xl pb-10 relative overflow-hidden">
      <Header />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem]">
        <div className="absolute left-6 top-8 w-44 h-44 rounded-full bg-primary/10 blur-3xl animate-blob" />
        <div className="absolute right-6 top-24 w-56 h-56 rounded-full bg-accent/15 blur-3xl animate-blob delay-2000" />
      </div>

      <main className="container mx-auto px-4 py-8 relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 animate-slide-up">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold">{title}</h1>
              {description ? (
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">
                  {isAdmin
                    ? 'Admin: monitor all legal documents, verification and compliance across owners.'
                    : 'Manage your buses, drivers and crew compliance documents and renewals.'}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isBusOwner && (
              <Button asChild variant="outline" className="gap-2">
                <NavLink to="/owner/compliance/upload">
                  <Upload className="h-4 w-4" /> Upload
                </NavLink>
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate(backTo)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="floating-window p-1 mb-6 inline-flex rounded-2xl border overflow-x-auto max-w-full">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                )
              }
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </NavLink>
          ))}
        </div>

        {children ?? <Outlet />}
      </main>
    </div>
  );
}

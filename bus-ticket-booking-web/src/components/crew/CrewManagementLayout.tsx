import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, UserRound, ArrowLeft, GitBranch, BarChart3 } from 'lucide-react';

/**
 * Shared layout for the Driver & Crew Management pages.
 * Provides a consistent header + tab navigation used by:
 *   /admin/overview     -> CrewDashboard
 *   /admin/drivers      -> DriversPage
 *   /admin/crew         -> CrewPage
 *   /admin/assignments  -> AssignmentsPage
 * (Both Admin and Bus Owner roles can access these pages.)
 */
const CrewManagementLayout = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuthContext();

  const tabs = [
    { to: '/admin/overview', label: 'Overview', icon: BarChart3 },
    { to: '/admin/drivers', label: 'Drivers', icon: Users },
    { to: '/admin/crew', label: 'Crew', icon: UserRound },
    { to: '/admin/assignments', label: 'Assignments', icon: GitBranch },
  ];

  return (
    <div className="min-h-screen bg-background/60 backdrop-blur-xl pb-10 relative overflow-hidden">
      <Header />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem]">
        <div className="absolute left-6 top-8 w-44 h-44 rounded-full bg-primary/10 blur-3xl animate-blob" />
        <div className="absolute right-6 top-24 w-56 h-56 rounded-full bg-accent/15 blur-3xl animate-blob delay-2000" />
      </div>

      <main className="container mx-auto px-4 py-8 relative">
        {/* Header row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 animate-slide-up">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold">Driver &amp; Crew Management</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {isAdmin ? 'Admin: manage all drivers, crew and assignments.' : 'Manage your buses, drivers, crew and assignments.'}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate(isAdmin ? '/admin' : '/bus-owner/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to {isAdmin ? 'Admin Dashboard' : 'Owner Dashboard'}
          </Button>
        </div>

        {/* Tab navigation */}
        <div className="floating-window p-1 mb-6 inline-flex rounded-2xl border">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
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

        <Outlet />
      </main>
    </div>
  );
};

export default CrewManagementLayout;


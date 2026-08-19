import { Link } from 'react-router-dom';
import { useCrewDashboardStats } from '@/hooks/useCrewDashboardStats';
import CrewStatCards from '@/components/crew/CrewStatCards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Users, UserRound, GitBranch, ArrowRight, ClipboardCheck } from 'lucide-react';

/**
 * Analytics overview for the Driver & Crew Management system.
 * Rendered at /admin/drivers (and shared via CrewManagementLayout tabs).
 * Accessible to Admin and Bus Owner.
 */
const CrewDashboard = () => {
  const { data: stats, isLoading } = useCrewDashboardStats();

  const quickLinks = [
    { to: '/admin/drivers', label: 'Manage Drivers', icon: Users, desc: 'Add, edit and manage drivers.' },
    { to: '/admin/crew', label: 'Manage Crew', icon: UserRound, desc: 'Conductors, inspectors and assistants.' },
    { to: '/admin/assignments', label: 'Assignments', icon: GitBranch, desc: 'Assign staff to buses and routes.' },
  ];

  return (
    <div className="space-y-8">
      <div className="floating-window p-6 border">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="w-10 h-10 text-primary" />
            <div>
              <h2 className="text-xl font-bold">Crew &amp; Fleet Overview</h2>
              <p className="text-sm text-muted-foreground">
                Real-time snapshot of your drivers, crew and active assignments.
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {quickLinks.map((link) => (
              <Button key={link.to} variant="outline" asChild>
                <Link to={link.to}>
                  <link.icon className="w-4 h-4 mr-2" />
                  {link.label}
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <CrewStatCards stats={stats} loading={isLoading} />
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Driver breakdown */}
        <Card className="floating-window hover-card border">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Driver Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-3">
            {[
              { label: 'Available', value: stats?.available_drivers ?? 0, color: 'bg-emerald-500' },
              { label: 'Assigned', value: stats?.assigned_drivers ?? 0, color: 'bg-blue-500' },
              { label: 'On Leave', value: stats?.on_leave_drivers ?? 0, color: 'bg-amber-500' },
              { label: 'Inactive', value: (stats?.total_drivers ?? 0) - (stats?.active_drivers ?? 0), color: 'bg-gray-400' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${item.color}`} />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <span className="font-bold">{item.value}</span>
              </div>
            ))}
            <div className="border-t pt-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Drivers</span>
              <span className="font-bold text-lg">{stats?.total_drivers ?? 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* Crew summary */}
        <Card className="floating-window hover-card border">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-base flex items-center gap-2">
              <UserRound className="w-4 h-4 text-primary" />
              Crew Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Crew Members</span>
              <span className="font-bold">{stats?.total_crew ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Active Crew</span>
              <span className="font-bold text-emerald-600">{stats?.active_crew ?? 0}</span>
            </div>
            <div className="border-t pt-3 flex items-center justify-between">
              <span className="text-sm font-medium">Active Assigned Buses</span>
              <span className="font-bold text-blue-600">{stats?.assigned_buses ?? 0}</span>
            </div>
            <Link to="/admin/crew" className="block">
              <Button variant="outline" className="w-full mt-2">
                Manage Crew <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CrewDashboard;


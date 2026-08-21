import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, UserRound, Bus, CheckCircle2 } from 'lucide-react';
import type { CrewDashboardStats } from '@/hooks/useCrewDashboardStats';

interface CrewStatCardsProps {
  stats: CrewDashboardStats | null | undefined;
  loading?: boolean;
}

/**
 * Stat cards used on the Crew Management pages and dashboard.
 */
const CrewStatCards = ({ stats, loading }: CrewStatCardsProps) => {
  const items = [
    {
      label: 'Total Drivers',
      value: stats?.total_drivers ?? 0,
      icon: Users,
      accent: 'text-blue-600 bg-blue-100',
    },
    {
      label: 'Available Drivers',
      value: stats?.available_drivers ?? 0,
      icon: CheckCircle2,
      accent: 'text-emerald-600 bg-emerald-100',
    },
    {
      label: 'Assigned Drivers',
      value: stats?.assigned_drivers ?? 0,
      icon: Bus,
      accent: 'text-amber-600 bg-amber-100',
    },
    {
      label: 'Total Crew',
      value: stats?.total_crew ?? 0,
      icon: UserRound,
      accent: 'text-violet-600 bg-violet-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {items.map((item) => (
        <Card key={item.label} className="floating-window hover-card border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">{item.label}</p>
                <p className="text-3xl font-bold mt-1">
                  {loading ? '—' : item.value}
                </p>
              </div>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${item.accent}`}>
                <item.icon className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default CrewStatCards;


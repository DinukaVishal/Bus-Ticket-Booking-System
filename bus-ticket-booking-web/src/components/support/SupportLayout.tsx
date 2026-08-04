import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/contexts/AuthContext';
import { useUnreadCount } from '@/hooks/useSupport';
import { Badge } from '@/components/ui/badge';
import {
  PlusCircle,
  Ticket,
  LifeBuoy,
  ClipboardList,
  LayoutDashboard,
  FolderCog,
  BarChart3,
  Bell,
} from 'lucide-react';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  match?: string[]; // path prefixes that should mark this item active
  adminOnly?: boolean;
  staffOnly?: boolean;
  end?: boolean;
}

const navItems: NavItem[] = [
  {
    label: 'Support Home',
    to: '/support',
    icon: <LayoutDashboard className="h-4 w-4" />,
    match: ['/support'],
    end: true,
  },
  {
    label: 'Create Ticket',
    to: '/support/create',
    icon: <PlusCircle className="h-4 w-4" />,
    match: ['/support/create'],
  },
  {
    label: 'My Tickets',
    to: '/support/my-tickets',
    icon: <Ticket className="h-4 w-4" />,
    match: ['/support/my-tickets'],
  },
  {
    label: 'Staff Desk',
    to: '/support/assigned',
    icon: <ClipboardList className="h-4 w-4" />,
    match: ['/support/assigned'],
    staffOnly: true,
  },
  {
    label: 'Admin Support',
    to: '/admin/support',
    icon: <LifeBuoy className="h-4 w-4" />,
    match: ['/admin/support'],
    adminOnly: true,
  },
  {
    label: 'Categories',
    to: '/admin/support/categories',
    icon: <FolderCog className="h-4 w-4" />,
    match: ['/admin/support/categories'],
    adminOnly: true,
  },
  {
    label: 'Analytics',
    to: '/admin/support/analytics',
    icon: <BarChart3 className="h-4 w-4" />,
    match: ['/admin/support/analytics'],
    adminOnly: true,
  },
];

interface SupportLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

/**
 * Layout wrapper for the Support module pages.
 * Renders a page header and a responsive navigation row.
 */
export function SupportLayout({ children, title, description, actions }: SupportLayoutProps) {
  const location = useLocation();
  const { isAdmin, isStaff } = useAuthContext();
  const { data: unread = 0 } = useUnreadCount();

  const visibleItems = navItems.filter(
    (item) =>
      (item.adminOnly ? isAdmin : true) &&
      (item.staffOnly ? isStaff || isAdmin : true),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LifeBuoy className="h-4 w-4" />
            <span>Customer Support</span>
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/notification"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/70 text-muted-foreground transition-colors hover:bg-muted"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <Badge className="absolute -right-1 -top-1 h-5 min-w-5 justify-center rounded-full px-1 text-[10px]">
                {unread}
              </Badge>
            )}
          </Link>
          {actions}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {visibleItems.map((item) => {
          const active = item.end
            ? location.pathname === item.to
            : item.match?.some((p) => location.pathname.startsWith(p)) || location.pathname.startsWith(item.to);

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                active
                  ? 'border-primary/30 bg-primary text-primary-foreground shadow-sm'
                  : 'border-border/70 bg-card/70 text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}


import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; to: string };
  className?: string;
}

/**
 * Reusable empty state used when lists have no data.
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-4 py-16 text-center', className)}>
      {icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/70 text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && (
        <Button asChild className="mt-6">
          <Link to={action.to}>{action.label}</Link>
        </Button>
      )}
    </div>
  );
}


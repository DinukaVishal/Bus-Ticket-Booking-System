import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { ShieldCheck } from 'lucide-react';

interface ComplianceScoreCardProps {
  score: number;
  validCount?: number;
  requiredCount?: number;
  title?: string;
  className?: string;
}

/**
 * Displays a compliance percentage score with a progress bar and
 * valid/required breakdown. Used on owner & admin dashboards.
 */
export function ComplianceScoreCard({
  score,
  validCount = 0,
  requiredCount = 0,
  title = 'Compliance Score',
  className,
}: ComplianceScoreCardProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const tone =
    clamped >= 80 ? 'text-emerald-600' : clamped >= 50 ? 'text-amber-600' : 'text-red-600';

  return (
    <Card className={cn('p-5', className)}>
      <CardHeader className="p-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <ShieldCheck className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 space-y-3">
        <div className="flex items-baseline gap-2">
          <span className={cn('font-display text-4xl font-bold', tone)}>{clamped}%</span>
          <span className="text-sm text-muted-foreground">compliance</span>
        </div>
        <Progress value={clamped} className="h-2 rounded-full" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{validCount} valid</span>
          <span>{requiredCount} total</span>
        </div>
      </CardContent>
    </Card>
  );
}

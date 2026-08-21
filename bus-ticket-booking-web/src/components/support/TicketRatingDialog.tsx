import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { useRateTicket } from '@/hooks/useSupport';
import { Loader2, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TicketRatingDialogProps {
  ticketId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingRating?: { rating: number; feedback: string | null } | null;
}

const RATING_LABELS = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

/**
 * Modal used by ticket owners to rate the support they received.
 */
export function TicketRatingDialog({ ticketId, open, onOpenChange, existingRating }: TicketRatingDialogProps) {
  const [rating, setRating] = useState(existingRating?.rating || 0);
  const [hover, setHover] = useState(0);
  const [feedback, setFeedback] = useState(existingRating?.feedback || '');
  const rateTicket = useRateTicket();

  const alreadyRated = !!existingRating;

  const handleSubmit = async () => {
    if (rating < 1) return;
    try {
      await rateTicket.mutateAsync({ ticketId, rating, feedback: feedback.trim() || undefined });
      toast({ title: 'Thanks for your feedback!', description: `You rated this support ${rating}/5.` });
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Failed to submit rating', description: error?.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{alreadyRated ? 'Your rating' : 'Rate this support'}</DialogTitle>
          <DialogDescription>
            {alreadyRated
              ? 'You have already rated this ticket. Thank you!'
              : 'How satisfied were you with the help you received?'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-center gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                disabled={alreadyRated}
                onMouseEnter={() => !alreadyRated && setHover(star)}
                onMouseLeave={() => !alreadyRated && setHover(0)}
                onClick={() => !alreadyRated && setRating(star)}
                className="transition-transform hover:scale-110 disabled:cursor-not-allowed"
                aria-label={`${star} stars`}
              >
                <Star
                  className={cn(
                    'h-8 w-8',
                    (hover || rating) >= star
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-muted-foreground/30',
                  )}
                />
              </button>
            ))}
          </div>

          <p className="text-center text-sm font-medium text-muted-foreground">
            {alreadyRated
              ? RATING_LABELS[(existingRating?.rating || 1) - 1] || 'Rated'
              : rating > 0
                ? RATING_LABELS[rating - 1]
                : 'Select a rating'}
          </p>

          <Textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder={alreadyRated ? 'Your feedback.' : 'Share your feedback (optional)...'}
            rows={3}
            disabled={alreadyRated}
            className="resize-none"
          />

          {!alreadyRated && (
            <Button onClick={handleSubmit} disabled={rating < 1 || rateTicket.isPending} className="w-full rounded-full">
              {rateTicket.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Submit Rating
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/support/constants';
import { useAddNote } from '@/hooks/useSupport';
import { toast } from '@/hooks/use-toast';
import type { TicketNoteRow } from '@/types/support';
import { Loader2, MessageSquarePlus, StickyNote } from 'lucide-react';

interface InternalNotesProps {
  ticketId: string;
  notes: TicketNoteRow[];
  className?: string;
}

function getInitials(name?: string | null) {
  if (!name) return 'S';
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/**
 * Internal (staff/admin only) notes panel for a ticket.
 */
export function InternalNotes({ ticketId, notes, className }: InternalNotesProps) {
  const [note, setNote] = useState('');
  const addNote = useAddNote();

  const handleAdd = async () => {
    if (!note.trim()) return;
    try {
      await addNote.mutateAsync({ ticketId, note: note.trim() });
      setNote('');
      toast({ title: 'Note added', description: 'Internal note saved.' });
    } catch (error: any) {
      toast({ title: 'Failed to add note', description: error?.message, variant: 'destructive' });
    }
  };

  return (
    <div className={cn('rounded-2xl border border-amber-200/60 bg-amber-50/40 dark:border-amber-500/20 dark:bg-amber-500/5 p-4 space-y-4', className)}>
      <div className="flex items-center gap-2">
        <StickyNote className="h-4 w-4 text-amber-600" />
        <h3 className="text-sm font-semibold text-foreground">Internal Notes</h3>
      </div>

      <div className="space-y-3">
        {notes.map((n) => (
          <div key={n.id} className="rounded-xl border border-border/60 bg-card/70 p-3">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="bg-amber-100 text-amber-700 text-[10px]">
                  {getInitials(n.author?.display_name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-semibold text-foreground">{n.author?.display_name || 'Staff'}</span>
              <span className="text-[11px] text-muted-foreground">{formatDateTime(n.created_at)}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{n.note}</p>
          </div>
        ))}

        {notes.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-2">No internal notes yet.</p>
        )}
      </div>

      <div className="space-y-2">
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add an internal note (visible to staff & admins only)..."
          rows={2}
          className="resize-none bg-background/60"
        />
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={!note.trim() || addNote.isPending}
          className="gap-2 rounded-full"
        >
          {addNote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquarePlus className="h-4 w-4" />}
          Add Note
        </Button>
      </div>
    </div>
  );
}


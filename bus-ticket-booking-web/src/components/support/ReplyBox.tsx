import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AttachmentButton } from './AttachmentButton';
import { toast } from '@/hooks/use-toast';
import { useSendMessage } from '@/hooks/useSupport';
import { Loader2, Send } from 'lucide-react';

interface ReplyBoxProps {
  ticketId: string;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
}

/**
 * Composer for replying to a support ticket, with optional file attachment.
 */
export function ReplyBox({ ticketId, disabled, placeholder = 'Type your reply...', label = 'Reply' }: ReplyBoxProps) {
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const sendMessage = useSendMessage();

  const canSend = message.trim().length > 0 || !!attachment;

  const handleSend = async () => {
    if (!canSend || sendMessage.isPending || disabled) return;

    try {
      await sendMessage.mutateAsync({
        ticketId,
        message: message.trim(),
        attachment: attachment || null,
      });
      setMessage('');
      setAttachment(null);
      toast({ title: 'Reply sent', description: 'Your message has been posted to the ticket.' });
    } catch (error: any) {
      toast({
        title: 'Failed to send reply',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 p-4 space-y-3">
      {label && <p className="text-sm font-semibold text-foreground">{label}</p>}
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={placeholder}
        rows={3}
        disabled={disabled}
        className="resize-none bg-background/50"
      />
      <div className="flex items-center justify-between gap-3">
        <AttachmentButton file={attachment} onSelect={setAttachment} disabled={disabled} />
        <Button
          onClick={handleSend}
          disabled={!canSend || sendMessage.isPending || disabled}
          className="gap-2 rounded-full"
        >
          {sendMessage.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Send Reply
        </Button>
      </div>
    </div>
  );
}


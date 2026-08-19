import { useAuthContext } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/support/constants';
import type { SupportMessageRow } from '@/types/support';
import { Download, FileText } from 'lucide-react';

interface MessageThreadProps {
  messages: SupportMessageRow[];
}

function getInitials(name?: string | null) {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function isImageUrl(url: string) {
  return /\.(jpe?g|png|gif|webp)(\?.*)?$/i.test(url) || url.includes('image');
}

/**
 * Conversation thread rendered as chat bubbles. Own (current user) messages
 * are aligned right; others are aligned left.
 */
export function MessageThread({ messages }: MessageThreadProps) {
  const { user } = useAuthContext();
  const currentUserId = user?.id;

  if (messages.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 py-14 text-center text-sm text-muted-foreground">
        No messages yet. Start the conversation below.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => {
        const mine = message.sender_id === currentUserId;
        const senderName = message.sender?.display_name || 'Support';

        return (
          <div key={message.id} className={cn('flex items-start gap-3', mine && 'flex-row-reverse')}>
            <Avatar className="h-9 w-9 shrink-0 border border-border/60">
              <AvatarFallback className={cn('text-xs font-bold', mine ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground')}>
                {getInitials(senderName)}
              </AvatarFallback>
            </Avatar>

            <div className={cn('flex max-w-[80%] flex-col gap-1', mine ? 'items-end' : 'items-start')}>
              <div className="flex items-center gap-2 px-1">
                <span className="text-xs font-semibold text-foreground">{senderName}</span>
                <span className="text-[11px] text-muted-foreground">{formatDateTime(message.created_at)}</span>
              </div>

              <div
                className={cn(
                  'rounded-2xl border px-4 py-2.5 text-sm leading-relaxed shadow-sm',
                  mine
                    ? 'rounded-br-sm border-primary/20 bg-primary text-primary-foreground'
                    : 'rounded-bl-sm border-border/70 bg-card text-foreground',
                )}
              >
                <p className="whitespace-pre-wrap break-words">{message.message}</p>

                {message.attachment_url && (
                  <div className="mt-3">
                    {isImageUrl(message.attachment_url) ? (
                      <a href={message.attachment_url} target="_blank" rel="noreferrer">
                        <img
                          src={message.attachment_url}
                          alt="attachment"
                          className="max-h-48 rounded-lg border border-white/20 object-cover"
                        />
                      </a>
                    ) : (
                      <a
                        href={message.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                          'inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-xs font-medium transition-colors',
                          mine
                            ? 'bg-white/10 hover:bg-white/20'
                            : 'bg-muted/60 hover:bg-muted',
                        )}
                      >
                        <FileText className="h-4 w-4" />
                        View attachment
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


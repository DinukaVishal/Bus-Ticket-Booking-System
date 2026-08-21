import { Button } from '@/components/ui/button';
import { Paperclip, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AttachmentButtonProps {
  file: File | null;
  onSelect: (file: File | null) => void;
  accept?: string;
  disabled?: boolean;
}

/**
 * Reusable file picker button used in the reply composer and create-ticket form.
 */
export function AttachmentButton({ file, onSelect, accept, disabled }: AttachmentButtonProps) {
  if (file) {
    return (
      <div className="flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground">
        <Paperclip className="h-3.5 w-3.5 text-primary" />
        <span className="max-w-[200px] truncate">{file.name}</span>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="ml-1 text-muted-foreground transition-colors hover:text-destructive"
          title="Remove attachment"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={disabled}
      className="gap-2 rounded-full text-muted-foreground"
      onClick={() => document.getElementById('support-attachment-input')?.click()}
    >
      <Paperclip className="h-4 w-4" />
      Attach
      <input
        id="support-attachment-input"
        type="file"
        accept={accept || 'image/*,.pdf'}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] || null;
          onSelect(f);
          e.target.value = '';
        }}
        aria-hidden
      />
    </Button>
  );
}


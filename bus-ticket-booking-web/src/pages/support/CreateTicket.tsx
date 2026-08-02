import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { SupportLayout, AttachmentButton } from '@/components/support';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useCategories, useCreateTicket } from '@/hooks/useSupport';
import { toast } from '@/hooks/use-toast';
import { TICKET_PRIORITIES } from '@/lib/support/constants';
import type { TicketPriority } from '@/types/support';
import { CATEGORY_EMOJI } from '@/lib/support/constants';
import { Loader2, Send, Sparkles } from 'lucide-react';

const CreateTicket = () => {
  const navigate = useNavigate();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const createTicket = useCreateTicket();

  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('Medium');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);

  const canSubmit = category && subject.trim() && description.trim();

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      const created = await createTicket.mutateAsync({ category, subject: subject.trim(), description: description.trim(), priority });
      toast({
        title: 'Ticket created',
        description: `Your ticket ${created.ticket_number} was created successfully.`,
      });
      navigate(`/support/${created.id}`);
    } catch (error: any) {
      toast({
        title: 'Failed to create ticket',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen page-shell page-bg">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <SupportLayout title="Create a Support Ticket" description="Describe your issue and our team will help you.">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card/70 p-6 space-y-5">
              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                {categoriesLoading ? (
                  <Skeleton className="h-10 w-full rounded-md" />
                ) : (
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.name}>
                          <span className="inline-flex items-center gap-2">
                            <span>{CATEGORY_EMOJI[c.name] || '📋'}</span>
                            {c.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {!categoriesLoading && categories.length === 0 && (
                  <p className="text-xs text-muted-foreground">No categories available yet.</p>
                )}
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TICKET_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        <span className="inline-flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              p === 'Low' ? 'bg-slate-400' : p === 'Medium' ? 'bg-blue-500' : p === 'High' ? 'bg-orange-500' : 'bg-red-500'
                            }`}
                          />
                          {p}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Use <strong>Critical</strong> for urgent issues like payment failures or safety concerns.
                </p>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of your issue"
                  maxLength={120}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide as much detail as possible: booking ID, route, date, what happened..."
                  rows={6}
                  className="resize-none"
                />
              </div>

              {/* Attachments */}
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-border/80 p-3">
                <AttachmentButton file={attachment} onSelect={setAttachment} />
                <span className="text-xs text-muted-foreground">
                  Optional. Images or PDF, max 5 MB. Uploaded after the ticket is created.
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => navigate(-1)} className="rounded-full">
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={!canSubmit || createTicket.isPending} className="gap-2 rounded-full">
                  {createTicket.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Submit Ticket
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-border/60 bg-card/70 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-foreground">Tips for a fast resolution</h3>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex gap-2"><span>📌</span> Include your booking/payment reference.</li>
                  <li className="flex gap-2"><span>📅</span> Mention relevant dates and routes.</li>
                  <li className="flex gap-2"><span>📸</span> Attach screenshots if possible.</li>
                  <li className="flex gap-2"><span>⚡</span> Higher priorities get handled sooner.</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-blue-200/60 bg-blue-50/50 dark:border-blue-500/20 dark:bg-blue-500/5 p-5 text-sm text-muted-foreground">
                {category ? (
                  <>
                    You're about to create a <strong className="text-foreground">{category}</strong> ticket with{' '}
                    <strong className="text-foreground">{priority}</strong> priority.
                  </>
                ) : (
                  <>Select a category to get started.</>
                )}
              </div>
            </div>
          </div>
        </SupportLayout>
      </main>
    </div>
  );
};

export default CreateTicket;


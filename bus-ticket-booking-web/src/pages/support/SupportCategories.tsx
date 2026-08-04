import { useState } from 'react';
import Header from '@/components/layout/Header';
import {
  SupportLayout,
} from '@/components/support';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  useAllCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '@/hooks/useSupport';
import { toast } from '@/hooks/use-toast';
import { CATEGORY_EMOJI } from '@/lib/support/constants';
import { Plus, Pencil, Trash2, Loader2, FolderCog } from 'lucide-react';

interface CategoryEditorProps {
  initial?: { id: string; name: string; description: string | null; active: boolean };
  onClose: () => void;
}

function CategoryEditor({ initial, onClose }: CategoryEditorProps) {
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [active, setActive] = useState(initial?.active ?? true);

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const isEdit = !!initial;
  const isPending = createCategory.isPending || updateCategory.isPending;

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      if (isEdit && initial) {
        await updateCategory.mutateAsync({ id: initial.id, input: { name: name.trim(), description: description.trim() || null, active } });
        toast({ title: 'Category updated', description: `"${name.trim()}" has been updated.` });
      } else {
        await createCategory.mutateAsync({ name: name.trim(), description: description.trim() || undefined });
        toast({ title: 'Category created', description: `"${name.trim()}" added.` });
      }
      onClose();
    } catch (error: any) {
      toast({ title: 'Save failed', description: error?.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cat-name">Name *</Label>
        <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lost Item" maxLength={60} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cat-desc">Description</Label>
        <Textarea id="cat-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Short description" />
      </div>
      {isEdit && (
        <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
          <div>
            <p className="text-sm font-medium">Active</p>
            <p className="text-xs text-muted-foreground">Inactive categories are hidden from the create-ticket form.</p>
          </div>
          <Switch checked={active} onCheckedChange={setActive} />
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose} className="rounded-full">Cancel</Button>
        <Button onClick={handleSave} disabled={!name.trim() || isPending} className="gap-2 rounded-full">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isEdit ? 'Save Changes' : 'Create Category'}
        </Button>
      </div>
    </div>
  );
}

const SupportCategories = () => {
  const { data: categories = [], isLoading, error } = useAllCategories();
  const deleteCategory = useDeleteCategory();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string; description: string | null; active: boolean } | undefined>();

  const openCreate = () => {
    setEditing(undefined);
    setDialogOpen(true);
  };

  const openEdit = (cat: { id: string; name: string; description: string | null; active: boolean }) => {
    setEditing(cat);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteCategory.mutateAsync(id);
      toast({ title: 'Category deleted', description: `"${name}" removed.` });
    } catch (error: any) {
      toast({ title: 'Delete failed', description: error?.message, variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen page-shell page-bg">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <SupportLayout
          title="Support Categories"
          description="Manage the categories passengers can select when creating tickets."
          actions={
            <Button className="gap-2 rounded-full" onClick={openCreate}>
              <Plus className="h-4 w-4" /> New Category
            </Button>
          }
        >
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editing ? 'Edit Category' : 'Create Category'}</DialogTitle>
                <DialogDescription>
                  {editing ? 'Update the category details below.' : 'Add a new category for support tickets.'}
                </DialogDescription>
              </DialogHeader>
              <CategoryEditor initial={editing} onClose={() => setDialogOpen(false)} />
            </DialogContent>
          </Dialog>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-36 rounded-2xl" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
              Failed to load categories.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((cat) => (
                <Card key={cat.id} className="p-5">
                  <CardHeader className="p-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-lg">
                          {CATEGORY_EMOJI[cat.name] || '📋'}
                        </div>
                        <CardTitle className="text-base font-semibold">{cat.name}</CardTitle>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cat)} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Delete">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete "{cat.name}"?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove the category. Existing tickets keep their category text.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 text-white hover:bg-red-700"
                                onClick={() => handleDelete(cat.id, cat.name)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 pt-3">
                    <p className="min-h-10 text-sm text-muted-foreground">{cat.description || '—'}</p>
                    <div className="mt-3">
                      {cat.active ? (
                        <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500 border border-slate-200">
                          Inactive
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {categories.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 py-16 text-center">
                  <FolderCog className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="font-medium text-muted-foreground">No categories yet</p>
                  <Button className="mt-4 gap-2 rounded-full" onClick={openCreate}>
                    <Plus className="h-4 w-4" /> Add your first category
                  </Button>
                </div>
              )}
            </div>
          )}
        </SupportLayout>
      </main>
    </div>
  );
};

export default SupportCategories;


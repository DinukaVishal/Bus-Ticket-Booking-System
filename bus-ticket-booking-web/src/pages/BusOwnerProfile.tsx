import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, User, Mail, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface BusOwnerProfile {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  bank_name?: string | null;
  bank_account_holder?: string | null;
  bank_account_number?: string | null;
  bank_branch?: string | null;
}

const BusOwnerProfile = () => {
  const { user, profile } = useAuthContext();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<BusOwnerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    bankName: '',
    bankAccountHolder: '',
    bankAccountNumber: '',
    bankBranch: '',
  });

  useEffect(() => {
    if (user) {
      loadProfileData();
    }
  }, [user]);

  const loadProfileData = async () => {
    try {
      // Get user profile from Supabase Auth
      const { data: authUser, error: authError } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (authUser.user) {
        const { data: profileRow, error: profileError } = await supabase
          .from('profiles')
          .select('id, user_id, display_name, bank_name, bank_account_holder, bank_account_number, bank_branch')
          .eq('user_id', authUser.user.id)
          .single();

        if (profileError) throw profileError;

        setProfileData({
          id: authUser.user.id,
          user_id: authUser.user.id,
          display_name: profileRow?.display_name || profile?.displayName || 'Bus Owner',
          email: authUser.user.email || '',
          bank_name: profileRow?.bank_name || null,
          bank_account_holder: profileRow?.bank_account_holder || null,
          bank_account_number: profileRow?.bank_account_number || null,
          bank_branch: profileRow?.bank_branch || null,
        });

        setFormData({
          displayName: profileRow?.display_name || profile?.displayName || '',
          bankName: profileRow?.bank_name || '',
          bankAccountHolder: profileRow?.bank_account_holder || '',
          bankAccountNumber: profileRow?.bank_account_number || '',
          bankBranch: profileRow?.bank_branch || '',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error loading profile',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // Update profile in database
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: formData.displayName,
          bank_name: formData.bankName || null,
          bank_account_holder: formData.bankAccountHolder || null,
          bank_account_number: formData.bankAccountNumber || null,
          bank_branch: formData.bankBranch || null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: 'Profile Updated',
        description: 'Your profile has been updated successfully.',
      });

      // Reload profile
      await loadProfileData();
    } catch (error: any) {
      toast({
        title: 'Error saving profile',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen page-shell page-bg bg-fixed booking-blur text-foreground flex items-center justify-center">
        <div className="absolute inset-0 pointer-events-none bg-black/10 backdrop-blur-lg" />
        <Loader2 className="w-8 h-8 animate-spin text-primary relative z-10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen page-shell page-bg bg-fixed booking-blur text-foreground">
      <Header />
      <div className="absolute inset-0 pointer-events-none bg-black/10 backdrop-blur-lg" />

      <main className="relative z-10 flex-1 container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/bus-owner/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <User className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Bus Owner Profile</h1>
            <p className="text-muted-foreground">Manage your profile information</p>
          </div>
        </div>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* Email (Read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Your email"
                    value={profileData?.email || ''}
                    className="pl-10"
                    disabled
                    readOnly
                  />
                </div>
                <p className="text-xs text-muted-foreground">Email cannot be changed. Contact support if you need to update it.</p>
              </div>

              {/* Display Name */}
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="displayName"
                    name="displayName"
                    type="text"
                    placeholder="Enter your display name"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Bank Account Info */}
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Bank Account Information
                </h4>
                <p className="text-sm text-muted-foreground">
                  Bank Name: <span className="font-semibold">{profileData?.bank_name || 'Not set'}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Account Holder: <span className="font-semibold">{profileData?.bank_account_holder || 'Not set'}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Account Number: <span className="font-mono text-xs">{profileData?.bank_account_number ? `****${String(profileData.bank_account_number).slice(-4)}` : 'Not set'}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Branch: <span className="font-semibold">{profileData?.bank_branch || 'Not set'}</span>
                </p>
              </div>

              {/* Bank Info Fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    name="bankName"
                    type="text"
                    placeholder="Bank name"
                    value={formData.bankName}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bankAccountHolder">Account Holder</Label>
                  <Input
                    id="bankAccountHolder"
                    name="bankAccountHolder"
                    type="text"
                    placeholder="Account holder name"
                    value={formData.bankAccountHolder}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bankAccountNumber">Account Number</Label>
                  <Input
                    id="bankAccountNumber"
                    name="bankAccountNumber"
                    type="text"
                    placeholder="Account number"
                    value={formData.bankAccountNumber}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bankBranch">Bank Branch</Label>
                  <Input
                    id="bankBranch"
                    name="bankBranch"
                    type="text"
                    placeholder="Bank branch"
                    value={formData.bankBranch}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* Save Button */}
              <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Profile'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Common Tasks</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  Go to Dashboard to manage your buses
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  Add new buses with driver and conductor information
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  View and track all your registered buses
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Contact Support</h4>
              <p className="text-sm text-muted-foreground">
                If you need any assistance, please contact our support team at support@quickbus.com
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default BusOwnerProfile;

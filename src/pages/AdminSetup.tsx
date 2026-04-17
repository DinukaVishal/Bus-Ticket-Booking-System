import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Shield, Loader2, CheckCircle } from 'lucide-react';

// This is the setup code - in production, use an environment variable
const ADMIN_SETUP_CODE = 'QUICKBUS-ADMIN-2024';

const AdminSetup = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading: authLoading } = useAuthContext();
  const [setupCode, setSetupCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasAdmins, setHasAdmins] = useState<boolean | null>(null);
  const [checkingAdmins, setCheckingAdmins] = useState(true);

  useEffect(() => {
    const checkForAdmins = async () => {
      const { count, error } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');
      
      if (!error) {
        setHasAdmins((count || 0) > 0);
      }
      setCheckingAdmins(false);
    };

    checkForAdmins();
  }, []);

  useEffect(() => {
    if (!authLoading && isAdmin) {
      navigate('/admin');
    }
  }, [isAdmin, authLoading, navigate]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: 'Not logged in',
        description: 'Please log in first to claim admin access.',
        variant: 'destructive',
      });
      navigate('/login');
      return;
    }

    if (setupCode !== ADMIN_SETUP_CODE) {
      toast({
        title: 'Invalid setup code',
        description: 'The setup code you entered is incorrect.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Call secure edge function for admin setup (server-side validation)
      const { data, error } = await supabase.functions.invoke('setup-admin', {
        body: { setupCode },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: 'Admin access granted!',
        description: 'You now have admin privileges. Redirecting...',
      });

      // Force refresh auth state
      setTimeout(() => {
        window.location.href = '/admin';
      }, 1000);
    } catch (error: any) {
      const errorMessage = error.message || 'Could not grant admin access.';
      
      if (errorMessage.includes('already')) {
        toast({
          title: 'Already an admin',
          description: 'You already have admin access.',
        });
        setTimeout(() => {
          window.location.href = '/admin';
        }, 1000);
      } else {
        toast({
          title: 'Setup failed',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || checkingAdmins) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (hasAdmins && !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-display font-semibold mb-2">Admin Already Configured</h1>
          <p className="text-muted-foreground mb-6">
            An admin account already exists. Please contact your system administrator for access.
          </p>
          <Button onClick={() => navigate('/')}>Go to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold">Admin Setup</h1>
          <p className="text-muted-foreground mt-2">
            {user 
              ? 'Enter the setup code to claim admin access'
              : 'Please log in first, then return here to claim admin access'
            }
          </p>
        </div>

        {!user ? (
          <div className="bg-card rounded-xl p-8 shadow-card text-center">
            <p className="text-muted-foreground mb-4">You need to be logged in to set up admin access.</p>
            <Button onClick={() => navigate('/login')}>Go to Login</Button>
          </div>
        ) : (
          <div className="bg-card rounded-xl p-8 shadow-card">
            <div className="bg-primary/5 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span>Logged in as <strong>{user.email}</strong></span>
              </div>
            </div>

            <form onSubmit={handleSetup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="setupCode">Setup Code</Label>
                <Input
                  id="setupCode"
                  type="password"
                  value={setupCode}
                  onChange={(e) => setSetupCode(e.target.value)}
                  placeholder="Enter admin setup code"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  The setup code is: <code className="bg-muted px-1 rounded">QUICKBUS-ADMIN-2024</code>
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  'Claim Admin Access'
                )}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSetup;

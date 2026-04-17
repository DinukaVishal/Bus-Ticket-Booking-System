import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Bus, Loader2, Lock, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    // Check for recovery token in URL hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    if (type === 'recovery') {
      setIsValid(true);
    }

    // Also listen for auth state changes (Supabase auto-processes the token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsValid(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please make sure both passwords are the same.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 6 characters.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      toast({
        title: 'Password Updated!',
        description: 'Your password has been reset successfully.',
      });

      setTimeout(() => navigate('/login'), 2000);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset password.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:block relative h-full bg-black overflow-hidden">
        <video autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover opacity-80">
          <source src="/qickvideo12.mp4" />
        </video>
        <div className="absolute inset-0 bg-black/40 z-10" />
        <div className="absolute inset-0 z-20 flex flex-col justify-between p-10 text-white">
          <div className="flex items-center gap-2 text-lg font-medium">
            <Bus className="h-6 w-6 text-primary" />
            <span className="font-display font-bold">QuickBus</span>
          </div>
          <div className="space-y-4 max-w-lg">
            <h1 className="text-4xl font-display font-bold leading-tight tracking-tight drop-shadow-lg">
              Almost there! <br /> Set your new password.
            </h1>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-8 lg:p-12 bg-background animate-in slide-in-from-right duration-500">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 max-w-[400px]">
          {!isValid ? (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <Lock className="w-8 h-8 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold">Invalid Reset Link</h1>
              <p className="text-muted-foreground">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
              <Button onClick={() => navigate('/forgot-password')} className="mt-4">
                Request New Link
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-col space-y-2 text-center lg:text-left">
                <h1 className="text-3xl font-bold tracking-tight">Reset Password</h1>
                <p className="text-sm text-muted-foreground">
                  Enter your new password below.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-9"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      className="pl-9"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full h-11" disabled={isLoading}>
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</>
                  ) : (
                    'Reset Password'
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;

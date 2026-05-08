import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Bus, Loader2, Mail, Lock, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

const BusOwnerLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justLoggedIn, setJustLoggedIn] = useState(false);
  const { user, isAdmin, isBusOwner, isLoading } = useAuthContext();

  // Handle redirect after login
  useEffect(() => {
    if (justLoggedIn && !isLoading && user) {
      console.log('Redirecting after bus owner login. User:', user, 'isAdmin:', isAdmin, 'isBusOwner:', isBusOwner);

      if (isBusOwner) {
        console.log('Bus owner verified, redirecting to /bus-owner/dashboard');
        toast({
          title: 'Welcome back!',
          description: 'You have successfully logged in as a bus owner.',
        });
        window.location.href = '/bus-owner/dashboard';
      } else if (isAdmin) {
        console.log('Admin logged in via bus owner login, redirecting to /admin');
        toast({
          title: 'Welcome back!',
          description: 'You have successfully logged in as an admin.',
        });
        window.location.href = '/admin';
      } else {
        console.log('Not a bus owner or admin, access denied');
        toast({
          title: 'Access Denied',
          description: 'This account is not authorized for bus owner access.',
          variant: 'destructive',
        });
        // Sign out and redirect
        supabase.auth.signOut();
        window.location.href = '/login';
      }
    }
  }, [justLoggedIn, isLoading, user, isAdmin, isBusOwner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Mark that login was successful, let useEffect handle redirect
      console.log('Bus owner login successful, marking for redirect...');
      toast({
        title: 'Login Successful',
        description: 'Verifying your account type...',
      });
      setJustLoggedIn(true);

    } catch (error: any) {
      toast({
        title: 'Login Failed',
        description: error.message || 'Invalid email or password.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background/60 backdrop-blur-xl flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Bus className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Bus Owner Login</CardTitle>
          <p className="text-muted-foreground">Sign in to your bus owner account</p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>

            <div className="text-center space-y-2">
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot your password?
              </Link>

              <p className="text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link to="/bus-owner/signup" className="text-primary hover:underline">
                  Sign up here
                </Link>
              </p>

              <p className="text-sm text-muted-foreground">
                Not a bus owner?{' '}
                <Link to="/login" className="text-primary hover:underline">
                  Sign in as passenger
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default BusOwnerLogin;

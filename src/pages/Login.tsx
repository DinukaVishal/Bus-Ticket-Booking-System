import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // අලුතින් useNavigate ගත්තා
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Bus, Loader2, Mail, Lock, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Login = () => {
  const navigate = useNavigate(); // Navigate එක Setup කළා
  const { isDriver, isLoading: authLoading } = useAuthContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user is a driver
      const { data: isDriverData } = await supabase
        .rpc('has_role', { _user_id: data.user.id, _role: 'driver' });

      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
      });

      // Redirect based on user role
      if (isDriverData) {
        navigate('/driver/dashboard');
      } else {
        navigate('/booking');
      }

    } catch (error: any) {
      toast({
        title: 'Login Failed',
        description: error.message || 'Invalid email or password.',
        variant: 'destructive',
      });
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
              "Journey with comfort, <br /> arrive with style."
            </h1>
            <p className="text-lg text-zinc-200 drop-shadow-md">
              Experience the next generation of bus travel booking in Sri Lanka.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-8 lg:p-12 bg-background animate-in slide-in-from-right duration-500">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 max-w-[400px]">
          <div className="flex flex-col space-y-2 text-center lg:text-left">
            <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">
              Enter your email to sign in to your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="name@example.com" className="pl-9" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="password" type="password" placeholder="••••••••" className="pl-9" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </div>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-primary">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="w-full h-11" disabled={isLoading}>
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing In...</>
              ) : ('Sign In')}
            </Button>
          </form>

          <div className="px-8 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="underline underline-offset-4 hover:text-primary font-medium inline-flex items-center">
              Sign up <ArrowRight className="ml-1 w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
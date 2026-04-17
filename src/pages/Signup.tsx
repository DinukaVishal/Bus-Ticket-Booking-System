import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Bus, Loader2, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Signup = () => {
  const navigate = useNavigate();
  const { signUp } = useAuthContext();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please make sure your passwords match.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 6 characters long.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: displayName,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            { 
              user_id: data.user.id, 
              display_name: displayName,
            }
          ]);

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }
      }

      toast({
        title: 'Account created!',
        description: 'You can now sign in with your credentials.',
      });
      navigate('/');
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Signup Failed',
        description: error.message || 'Could not create account.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen grid lg:grid-cols-2">
      {/* වම් පැත්ත: VIDEO BACKGROUND */}
      <div className="hidden lg:block relative h-full bg-black overflow-hidden">
        
        {/* 1. Video Layer */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover opacity-80"
        >
          {/* මෙතනත් ඒ Video එකම දාමු */}
          <source src="/qickvideo12.mp4" />
        </video>

        {/* 2. Overlay Layer */}
        <div className="absolute inset-0 bg-black/40 z-10" />

        {/* 3. Text Layer */}
        <div className="absolute inset-0 z-20 flex flex-col justify-between p-10 text-white">
          <div className="flex items-center gap-2 text-lg font-medium">
            <Bus className="h-6 w-6 text-primary" />
            <span className="font-display font-bold">QuickBus</span>
          </div>
          <div className="space-y-4 max-w-lg">
            <h1 className="text-4xl font-display font-bold leading-tight tracking-tight drop-shadow-lg">
              "Start your next adventure <br /> with us today."
            </h1>
            <p className="text-lg text-zinc-200 drop-shadow-md">
              Join thousands of happy travelers using QuickBus for their daily commute.
            </p>
          </div>
        </div>
      </div>

      {/* දකුණු පැත්ත: Form එක */}
      <div className="flex items-center justify-center p-8 lg:p-12 bg-background animate-in slide-in-from-right duration-500">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 max-w-[400px]">
          <div className="flex flex-col space-y-2 text-center lg:text-left">
            <h1 className="text-3xl font-bold tracking-tight">Create an account</h1>
            <p className="text-sm text-muted-foreground">
              Enter your details below to create your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="John Doe"
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="pl-9"
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9"
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
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-11" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          <div className="px-8 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link 
              to="/login" 
              className="underline underline-offset-4 hover:text-primary font-medium inline-flex items-center"
            >
              Sign in <ArrowRight className="ml-1 w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Bus, Loader2, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setIsSent(true);
      toast({
        title: 'Email Sent!',
        description: 'Check your inbox for the password reset link.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send reset email.',
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
              Don't worry, <br /> we've got you.
            </h1>
            <p className="text-lg text-zinc-200 drop-shadow-md">
              Reset your password and get back on your journey.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-8 lg:p-12 bg-background animate-in slide-in-from-right duration-500">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 max-w-[400px]">
          {isSent ? (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold">Check Your Email</h1>
              <p className="text-muted-foreground">
                We sent a password reset link to <strong>{email}</strong>. Click the link in the email to reset your password.
              </p>
              <Link to="/login">
                <Button variant="outline" className="mt-4">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to Login
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="flex flex-col space-y-2 text-center lg:text-left">
                <h1 className="text-3xl font-bold tracking-tight">Forgot Password?</h1>
                <p className="text-sm text-muted-foreground">
                  Enter your email and we'll send you a link to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      className="pl-9"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full h-11" disabled={isLoading}>
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </form>

              <div className="text-center text-sm text-muted-foreground">
                <Link to="/login" className="underline underline-offset-4 hover:text-primary font-medium inline-flex items-center">
                  <ArrowLeft className="mr-1 w-3 h-3" /> Back to Login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

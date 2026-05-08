import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bus, Key, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const StaffLogin = () => {
  const [accessCode, setAccessCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) {
      setError('Please enter an access code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Find bus by access code using a dedicated RPC function.
      // This allows staff to login without requiring an owner auth session.
      const { data: busData, error: busError } = await supabase
        .rpc('get_owner_bus_by_staff_access_code', {
          _staff_access_code: accessCode.toUpperCase(),
        });

      const bus = Array.isArray(busData) ? busData[0] : busData;

      if (busError || !bus) {
        setError('Invalid access code. Please check with your bus owner.');
        return;
      }

      // Store staff session in localStorage
      const staffSession = {
        busId: bus.id,
        busNumber: bus.bus_number,
        busType: bus.bus_type,
        totalSeats: bus.total_seats,
        accessCode: bus.staff_access_code,
        loginTime: new Date().toISOString(),
      };

      localStorage.setItem('bus_staff_session', JSON.stringify(staffSession));

      toast({
        title: 'Login successful',
        description: `Welcome to ${bus.bus_number} dashboard.`,
      });

      // Navigate to staff dashboard
      navigate('/staff/dashboard');

    } catch (err: any) {
      console.error('Login error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background/60 backdrop-blur-xl flex flex-col">
      <Header />

      <div className="flex-1 container mx-auto px-4 py-8 max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4 shadow-inner">
            <Bus className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-foreground">
            Bus Staff Login
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your access code to access the staff dashboard
          </p>
        </div>

        <Card className="shadow-lg border-2">
          <CardHeader className="pb-3 bg-muted/30 border-b">
            <CardTitle className="text-base flex items-center gap-2 font-bold">
              <Key className="w-4 h-4 text-primary" />
              Access Code Login
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accessCode">Access Code</Label>
                <Input
                  id="accessCode"
                  type="text"
                  placeholder="Enter 8-character code"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  className="text-center font-mono text-lg tracking-wider"
                  maxLength={8}
                  required
                />
                <p className="text-xs text-muted-foreground text-center">
                  Get this code from your bus owner
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  <>
                    <Key className="w-5 h-5 mr-2" />
                    Access Dashboard
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Info */}
        <div className="text-center text-sm text-muted-foreground space-y-2 mt-6 bg-muted/30 p-4 rounded-xl border">
          <p className="font-medium">Need an access code?</p>
          <p className="text-xs">Contact your bus owner to get the staff access code for your bus.</p>
        </div>
      </div>
    </div>
  );
};

export default StaffLogin;
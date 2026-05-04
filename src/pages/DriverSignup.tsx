import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Bus, Loader2, Mail, Lock, User, Phone, Calendar, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const DriverSignup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
    licenseNumber: '',
    licenseExpiry: '',
    phoneNumber: '',
    emergencyContact: '',
    experienceYears: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please make sure your passwords match.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 6 characters long.',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.licenseNumber || !formData.licenseExpiry || !formData.phoneNumber) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in all required driver information.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            display_name: formData.displayName,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: authData.user.id,
            display_name: formData.displayName,
          });

        if (profileError) throw profileError;

        // Add driver role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            role: 'driver',
          });

        if (roleError) throw roleError;

        // Create driver profile
        const { error: driverProfileError } = await supabase
          .from('driver_profiles')
          .insert({
            user_id: authData.user.id,
            license_number: formData.licenseNumber,
            license_expiry: formData.licenseExpiry,
            phone_number: formData.phoneNumber,
            emergency_contact: formData.emergencyContact || null,
            experience_years: parseInt(formData.experienceYears) || 0,
          });

        if (driverProfileError) throw driverProfileError;

        toast({
          title: 'Account created successfully!',
          description: 'Please check your email to verify your account.',
        });

        navigate('/driver/login');
      }
    } catch (error: any) {
      toast({
        title: 'Signup Failed',
        description: error.message || 'An error occurred during signup.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background/60 backdrop-blur-xl flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Bus className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Driver Registration</CardTitle>
          <p className="text-muted-foreground">Join QuickBus as a driver and start earning</p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Full Name *</Label>
                  <Input
                    id="displayName"
                    name="displayName"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Driver Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Bus className="w-5 h-5" />
                Driver Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">License Number *</Label>
                  <Input
                    id="licenseNumber"
                    name="licenseNumber"
                    type="text"
                    placeholder="Enter license number"
                    value={formData.licenseNumber}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="licenseExpiry">License Expiry Date *</Label>
                  <Input
                    id="licenseExpiry"
                    name="licenseExpiry"
                    type="date"
                    value={formData.licenseExpiry}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number *</Label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    placeholder="Enter phone number"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experienceYears">Years of Experience</Label>
                  <Input
                    id="experienceYears"
                    name="experienceYears"
                    type="number"
                    placeholder="Years of driving experience"
                    value={formData.experienceYears}
                    onChange={handleInputChange}
                    min="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyContact">Emergency Contact</Label>
                <Input
                  id="emergencyContact"
                  name="emergencyContact"
                  type="tel"
                  placeholder="Emergency contact number"
                  value={formData.emergencyContact}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  Create Driver Account
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>

            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/driver/login" className="text-primary hover:underline">
                  Sign in here
                </Link>
              </p>
              <p className="text-sm text-muted-foreground">
                Not a driver?{' '}
                <Link to="/signup" className="text-primary hover:underline">
                  Sign up as passenger
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default DriverSignup;
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { useAuthContext } from '@/contexts/AuthContext';
import { useRoutes } from '@/hooks/useRoutes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Bus, Loader2, ArrowLeft, Save, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const DriverAddBus = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const { data: allRoutes = [] } = useRoutes();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [formData, setFormData] = useState({
    busNumber: '',
    busType: '',
    totalSeats: '',
    registrationNumber: '',
    insuranceExpiry: '',
    fitnessCertificateExpiry: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to add a bus.',
        variant: 'destructive',
      });
      return;
    }

    // Validation
    if (!formData.busNumber || !formData.busType || !formData.totalSeats ||
        !formData.registrationNumber || !formData.insuranceExpiry || !formData.fitnessCertificateExpiry ||
        !selectedRoute) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields including selecting a route.',
        variant: 'destructive',
      });
      return;
    }

    if (parseInt(formData.totalSeats) < 1) {
      toast({
        title: 'Invalid Seat Count',
        description: 'Total seats must be at least 1.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Insert the bus
      const { data: busData, error: busError } = await supabase
        .from('driver_buses')
        .insert({
          driver_user_id: user.id,
          bus_number: formData.busNumber,
          bus_type: formData.busType,
          total_seats: parseInt(formData.totalSeats),
          registration_number: formData.registrationNumber,
          insurance_expiry: formData.insuranceExpiry,
          fitness_certificate_expiry: formData.fitnessCertificateExpiry,
          is_active: false,
        })
        .select();

      if (busError) throw busError;

      if (!busData || busData.length === 0) {
        throw new Error('Failed to create bus');
      }

      const busId = busData[0].id;

      // Create driver_routes record to link bus to route
      const { error: routeError } = await supabase
        .from('driver_routes')
        .insert({
          driver_user_id: user.id,
          route_id: selectedRoute,
          bus_id: busId,
          is_active: true, // Driver selected the route when adding the bus
        });

      if (routeError) throw routeError;

      toast({
        title: 'Bus Added Successfully',
        description: 'Your bus has been registered and is pending admin verification.',
      });

      navigate('/driver/dashboard');

    } catch (error: any) {
      toast({
        title: 'Error Adding Bus',
        description: error.message || 'Failed to add bus. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background/60 backdrop-blur-xl flex flex-col">
      <Header />

      <div className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/driver/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Bus className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Add New Bus</h1>
            <p className="text-muted-foreground">Register your bus to start accepting bookings</p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Bus Information</CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="route">Select Route *</Label>
                <Select value={selectedRoute} onValueChange={setSelectedRoute}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a route to operate..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allRoutes.map((route) => (
                      <SelectItem key={route.id} value={route.id}>
                        {route.name} ({route.from} → {route.to})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Each bus can operate on only one route</p>
              </div>

              {selectedRoute && (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  {allRoutes.find(r => r.id === selectedRoute) && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-semibold">{allRoutes.find(r => r.id === selectedRoute)?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {allRoutes.find(r => r.id === selectedRoute)?.from} → {allRoutes.find(r => r.id === selectedRoute)?.to}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="busNumber">Bus Number *</Label>
                  <Input
                    id="busNumber"
                    name="busNumber"
                    type="text"
                    placeholder="e.g., NB-1234"
                    value={formData.busNumber}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="busType">Bus Type *</Label>
                  <Select value={formData.busType} onValueChange={(value) => handleSelectChange('busType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select bus type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rosa">Rosa</SelectItem>
                      <SelectItem value="luxury_ac">Luxury AC</SelectItem>
                      <SelectItem value="super_long">Super Long</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="totalSeats">Total Seats *</Label>
                  <Input
                    id="totalSeats"
                    name="totalSeats"
                    type="number"
                    placeholder="e.g., 54"
                    value={formData.totalSeats}
                    onChange={handleInputChange}
                    min="1"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="registrationNumber">Registration Number *</Label>
                  <Input
                    id="registrationNumber"
                    name="registrationNumber"
                    type="text"
                    placeholder="e.g., ABC-1234"
                    value={formData.registrationNumber}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="insuranceExpiry">Insurance Expiry Date *</Label>
                  <Input
                    id="insuranceExpiry"
                    name="insuranceExpiry"
                    type="date"
                    value={formData.insuranceExpiry}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fitnessCertificateExpiry">Fitness Certificate Expiry *</Label>
                  <Input
                    id="fitnessCertificateExpiry"
                    name="fitnessCertificateExpiry"
                    type="date"
                    value={formData.fitnessCertificateExpiry}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Important Notes:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• All information must be accurate and up-to-date</li>
                  <li>• Your bus will be reviewed by administrators before activation</li>
                  <li>• Ensure insurance and fitness certificates are valid</li>
                  <li>• You can only add buses that you own or operate</li>
                </ul>
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/driver/dashboard')}
                  className="flex-1"
                >
                  Cancel
                </Button>

                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding Bus...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Add Bus
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DriverAddBus;
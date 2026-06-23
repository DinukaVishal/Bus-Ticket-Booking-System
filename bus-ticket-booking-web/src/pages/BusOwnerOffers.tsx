import { useState, useMemo, useEffect } from 'react';
import Header from '@/components/layout/Header';
import { useOffersByBus, useAddOffer, useDeleteOffer } from '@/hooks/useOffers';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface BusInfo {
  id: string;
  bus_number: string;
  route_ids?: string[];
}

interface RouteInfo {
  id: string;
  name: string;
  from_city: string;
  to_city: string;
}

interface TripPrice {
  trip_id: string;
  price: number;
  departure_time: string;
}

const BusOwnerOffers = () => {
  const { user } = useAuthContext();
  const [buses, setBuses] = useState<BusInfo[]>([]);
  const [selectedBusId, setSelectedBusId] = useState<string>('');
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [tripPrices, setTripPrices] = useState<TripPrice[]>([]);
  const [selectedTicketPrice, setSelectedTicketPrice] = useState<number>(0);
  const [busesSortedLoading, setBusesSortedLoading] = useState(true);

  const { data: offersForBus = [], isLoading: offersLoading } = useOffersByBus(selectedBusId);
  const addOffer = useAddOffer();
  const deleteOffer = useDeleteOffer();

  const [form, setForm] = useState({ code: '', title: '', description: '', discount_percent: '', discount_amount: '', route_id: '', starts_at: '', ends_at: '' });

  // Auto-calculate discount_percent from discount_amount
  const calculatedPercent = useMemo(() => {
    if (!selectedTicketPrice || !form.discount_amount) return 0;
    return Math.round((parseFloat(form.discount_amount) / selectedTicketPrice) * 100);
  }, [form.discount_amount, selectedTicketPrice]);

  // Load buses for this owner
  useEffect(() => {
    if (!user) return;
    const loadBuses = async () => {
      try {
        const { data: busesData, error } = await supabase
          .from('owner_buses')
          .select('id, bus_number')
          .eq('bus_owner_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) throw error;

        let busesWithRoutes = busesData || [];

        // Fetch route assignments
        if (busesData && busesData.length > 0) {
          const { data: routeAssignments, error: routeErr } = await supabase
            .from('owner_routes')
            .select('owner_bus_id, route_id')
            .eq('bus_owner_id', user.id)
            .eq('is_active', true)
            .in('owner_bus_id', busesData.map(b => b.id));

          if (!routeErr && routeAssignments) {
            const routeMap = new Map<string, string[]>();
            routeAssignments.forEach((a: any) => {
              if (!routeMap.has(a.owner_bus_id)) routeMap.set(a.owner_bus_id, []);
              routeMap.get(a.owner_bus_id)!.push(a.route_id);
            });

            busesWithRoutes = busesData.map(b => ({
              ...b,
              route_ids: routeMap.get(b.id) || [],
            }));
          }
        }

        setBuses(busesWithRoutes);
        if (busesWithRoutes.length > 0) {
          setSelectedBusId(busesWithRoutes[0].id);
        }
      } catch (err: any) {
        toast({ title: 'Error loading buses', description: err.message, variant: 'destructive' });
      } finally {
        setBusesSortedLoading(false);
      }
    };

    loadBuses();
  }, [user]);

  // Load routes for selected bus
  useEffect(() => {
    if (!selectedBusId) {
      setRoutes([]);
      setTripPrices([]);
      return;
    }

    const loadRoutes = async () => {
      const selectedBus = buses.find(b => b.id === selectedBusId);
      if (!selectedBus || !selectedBus.route_ids || selectedBus.route_ids.length === 0) {
        setRoutes([]);
        setTripPrices([]);
        return;
      }

      const { data: routeData, error } = await supabase
        .from('routes')
        .select('id, name, from_city, to_city')
        .in('id', selectedBus.route_ids);

      if (!error && routeData) {
        setRoutes(routeData);
      }
    };

    loadRoutes();
  }, [selectedBusId, buses]);

  // Load trip prices for selected route
  useEffect(() => {
    if (!form.route_id) {
      setTripPrices([]);
      setSelectedTicketPrice(0);
      return;
    }

    const loadPrices = async () => {
      const { data: tripData, error } = await supabase
        .from('trips')
        .select('id, price, departure_time')
        .eq('route_id', form.route_id)
        .eq('is_active', true);

      if (!error && tripData) {
        const prices = tripData.map(t => ({
          trip_id: t.id,
          price: t.price,
          departure_time: t.departure_time,
        }));
        setTripPrices(prices);

        // Auto-select first trip's price if available
        if (prices.length > 0) {
          setSelectedTicketPrice(prices[0].price);
        }
      }
    };

    loadPrices();
  }, [form.route_id]);

  const handleAdd = async () => {
    if (!selectedBusId) {
      toast({ title: 'Please select a bus first' });
      return;
    }

    // Validate that at least discount_percent or discount_amount is set
    const hasDiscount = form.discount_percent || form.discount_amount;
    if (!hasDiscount) {
      toast({ title: 'Please enter a discount percentage or amount' });
      return;
    }

    try {
      // If discount_amount is set without percent, auto-calculate percent
      let finalPercent = form.discount_percent ? parseInt(form.discount_percent) : null;
      if (form.discount_amount && !form.discount_percent && selectedTicketPrice) {
        finalPercent = calculatedPercent;
      }

      const payload: any = {
        owner_bus_id: selectedBusId,
        code: form.code.trim(),
        title: form.title.trim(),
        description: form.description.trim() || null,
        discount_percent: finalPercent,
        discount_amount: form.discount_amount ? parseFloat(form.discount_amount) : null,
        route_id: form.route_id || null,
        starts_at: form.starts_at || undefined,
        ends_at: form.ends_at || null,
        is_active: true,
      };

      await addOffer.mutateAsync(payload);
      toast({ title: 'Offer created successfully!' });
      setForm({ code: '', title: '', description: '', discount_percent: '', discount_amount: '', route_id: '', starts_at: '', ends_at: '' });
      setSelectedTicketPrice(0);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete offer?')) return;
    try {
      await deleteOffer.mutateAsync(id);
      toast({ title: 'Offer deleted' });
    } catch (err: any) {
      toast({ title: 'Error deleting', description: err.message, variant: 'destructive' });
    }
  };

  const selectedBus = buses.find(b => b.id === selectedBusId);

  return (
    <div className="min-h-screen page-shell page-bg">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Manage Bus Offers</h1>

        {busesSortedLoading ? (
          <div>Loading buses...</div>
        ) : buses.length === 0 ? (
          <div className="text-muted-foreground">No buses found. Please add buses first.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bus Selector */}
            <div className="lg:col-span-1">
              <div className="p-4 rounded-lg border bg-card">
                <h2 className="font-semibold mb-3">Select Bus</h2>
                <div className="space-y-2">
                  {buses.map(bus => (
                    <button
                      key={bus.id}
                      onClick={() => setSelectedBusId(bus.id)}
                      className={`w-full text-left px-3 py-2 rounded border transition ${
                        selectedBusId === bus.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:bg-white/5'
                      }`}
                    >
                      <div className="font-medium">{bus.bus_number}</div>
                      <div className="text-xs text-muted-foreground">{bus.route_ids?.length || 0} routes</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Create Offer */}
            <div className="lg:col-span-1 p-4 rounded-lg border bg-card">
              <h2 className="font-semibold mb-3">Create Offer</h2>
              <div className="space-y-2">
                <Input placeholder="Code (e.g. QUICK20)" value={form.code} onChange={e => setForm(s => ({ ...s, code: e.target.value }))} required />
                <Input placeholder="Title (e.g. Summer Special)" value={form.title} onChange={e => setForm(s => ({ ...s, title: e.target.value }))} required />
                <Textarea placeholder="Description" value={form.description} onChange={e => setForm(s => ({ ...s, description: e.target.value }))} />

                {/* Route Selector - only shows routes for selected bus */}
                <div>
                  <label className="text-sm text-muted-foreground block mb-1">Route (to set ticket price)</label>
                  <select
                    value={form.route_id}
                    onChange={e => setForm(s => ({ ...s, route_id: e.target.value }))}
                    className="w-full px-3 py-2 rounded border border-border bg-background text-foreground"
                  >
                    <option value="">Select a route</option>
                    {routes.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.from_city} → {r.to_city})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ticket Price Display */}
                {selectedTicketPrice > 0 && (
                  <div className="p-2 rounded bg-primary/10 border border-primary/20">
                    <div className="text-xs text-muted-foreground">Ticket Price</div>
                    <div className="text-lg font-semibold">Rs {selectedTicketPrice}</div>
                  </div>
                )}

                {/* Discount Input */}
                <div>
                  <label className="text-sm text-muted-foreground block mb-1">Discount Amount (Rs)</label>
                  <Input 
                    placeholder="Enter discount amount" 
                    type="number"
                    value={form.discount_amount} 
                    onChange={e => setForm(s => ({ ...s, discount_amount: e.target.value }))} 
                  />
                  {calculatedPercent > 0 && (
                    <div className="text-xs text-emerald-600 mt-1">
                      = {calculatedPercent}% off
                    </div>
                  )}
                </div>

                {/* Discount Percent (manual override) */}
                <div>
                  <label className="text-sm text-muted-foreground block mb-1">Or Discount % (manual override)</label>
                  <Input 
                    placeholder="Enter discount %" 
                    type="number"
                    value={form.discount_percent} 
                    onChange={e => setForm(s => ({ ...s, discount_percent: e.target.value }))} 
                  />
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Start</label>
                    <Input type="datetime-local" value={form.starts_at} onChange={e => setForm(s => ({ ...s, starts_at: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">End</label>
                    <Input type="datetime-local" value={form.ends_at} onChange={e => setForm(s => ({ ...s, ends_at: e.target.value }))} />
                  </div>
                </div>
                <Button onClick={handleAdd} className="w-full mt-2">Create Offer</Button>
              </div>
            </div>

            {/* Offers List */}
            <div className="lg:col-span-1 p-4 rounded-lg border bg-card">
              <h2 className="font-semibold mb-3">
                Offers for {selectedBus?.bus_number}
              </h2>
              {offersLoading ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : offersForBus.length === 0 ? (
                <div className="text-sm text-muted-foreground">No offers yet</div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {offersForBus.map((o: any) => (
                    <div key={o.id} className="flex items-start justify-between bg-background/60 p-3 rounded border border-border/30">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{o.title}</div>
                        <div className="text-xs text-muted-foreground truncate">{o.description}</div>
                        <div className="text-xs text-muted-foreground mt-1">{o.code}</div>
                      </div>
                      <div className="flex flex-col items-end gap-2 ml-2">
                        <div className="text-sm font-semibold whitespace-nowrap">{o.discount_percent ? `${o.discount_percent}%` : o.discount_amount ? `Rs ${o.discount_amount}` : ''}</div>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(o.id)}>Delete</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default BusOwnerOffers;

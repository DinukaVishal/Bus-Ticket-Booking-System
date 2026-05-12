import { useState } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Route, Trip } from '@/types/booking';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Bus, Clock, Users, Banknote, ChevronRight, Search as SearchIcon, ArrowLeft } from 'lucide-react';

interface HomeSearchPanelProps {
  routes: Route[];
}

const HomeSearchPanel = ({ routes }: HomeSearchPanelProps) => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showResults, setShowResults] = useState(false);
  const [availableTrips, setAvailableTrips] = useState<Trip[]>([]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRoute && selectedDate) {
      // Filter trips available on the selected date
      const trips = selectedRoute.trips || [];
      setAvailableTrips(trips);
      setShowResults(true);
    }
  };

  const handleBookTicket = (trip: Trip) => {
    if (!user) {
      // Redirect to login if not authenticated
      navigate('/login', { state: { from: '/' } });
      return;
    }
    // Navigate to booking page with pre-selected route and trip
    navigate('/booking', { state: { routeId: selectedRoute?.id, tripId: trip.id, date: selectedDate } });
  };

  // Get today's date in YYYY-MM-DD format
  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="bg-blue-950/60 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl p-8 md:p-10">
      <div className="max-w-5xl mx-auto">
        {!showResults ? (
          <div>
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">Find Your Next Journey</h2>
              <p className="text-slate-300 text-lg">Search and book buses instantly</p>
            </div>

            <form onSubmit={handleSearch} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Route Selection */}
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-2">
                    <MapPin className="w-4 h-4 inline mr-2" />
                    Select Route
                  </label>
                  <select
                    value={selectedRoute?.id || ''}
                    onChange={(e) => {
                      const route = routes.find(r => r.id === e.target.value);
                      setSelectedRoute(route || null);
                    }}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all text-sm"
                    required
                  >
                    <option value="">Choose a route...</option>
                    {routes.map((route) => (
                      <option key={route.id} value={route.id} className="bg-slate-900 text-white">
                        {route.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Selection */}
                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Travel Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={today}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all text-sm"
                    required
                  />
                </div>

                {/* Search Button */}
                <div className="flex items-end">
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-sky-500/30 flex items-center justify-center gap-2"
                  >
                    <SearchIcon className="w-4 h-4" />
                    Search
                  </Button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">{selectedRoute?.name}</h3>
                <p className="text-slate-300 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(selectedDate), 'EEE, MMM d, yyyy')}
                </p>
              </div>
              <Button
                onClick={() => setShowResults(false)}
                variant="outline"
                className="border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Modify
              </Button>
            </div>

            {availableTrips.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {availableTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 hover:bg-slate-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-1"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Bus className="w-6 h-6 text-sky-400" />
                        <div>
                          <p className="font-semibold text-white text-sm">{trip.busNumber || 'Bus'}</p>
                          <p className="text-xs text-slate-400">{selectedRoute?.busType ?? 'Standard'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-5 text-sm">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-xs">{trip.departureTime || selectedRoute?.departureTime || 'TBD'} → {trip.arrivalTime || selectedRoute?.arrivalTime || 'TBD'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-xs">{selectedRoute?.totalSeats ?? 'N/A'} seats</span>
                      </div>
                      <div className="flex items-center gap-1 text-sky-300 font-bold text-base">
                        <Banknote className="w-4 h-4" />
                        Rs. {trip.price ?? selectedRoute?.price ?? 0}
                      </div>
                    </div>

                    <Button
                      onClick={() => handleBookTicket(trip)}
                      className="w-full bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white font-semibold py-2 rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
                    >
                      Book Now
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Bus className="w-12 h-12 text-slate-500 mx-auto mb-3 opacity-50" />
                <p className="text-slate-400">No buses available for this route and date</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeSearchPanel;

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
  const [fromLocation, setFromLocation] = useState<string>('');
  const [toLocation, setToLocation] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [showResults, setShowResults] = useState(false);
  const [matchingRoutes, setMatchingRoutes] = useState<Route[]>([]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (fromLocation && toLocation && selectedDate) {
      // Find routes that match the from/to locations (case insensitive)
      const matching = routes.filter(route =>
        route.from.toLowerCase().includes(fromLocation.toLowerCase()) &&
        route.to.toLowerCase().includes(toLocation.toLowerCase())
      );
      setMatchingRoutes(matching);
      setShowResults(true);
    }
  };

  const handleBookTicket = (route: Route) => {
    if (!user) {
      // Redirect to login if not authenticated
      navigate('/login', { state: { from: '/' } });
      return;
    }
    // Navigate to booking page with pre-selected route and search criteria
    navigate('/booking', { state: { routeId: route.id, date: selectedDate, fromLocation, toLocation } });
  };

  // Get today's date in YYYY-MM-DD format
  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="bg-slate-950/20 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl p-8 md:p-10">
      <div className="max-w-5xl mx-auto">
        {!showResults ? (
          <div>
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">Find Your Next Journey</h2>
              <p className="text-slate-300 text-lg">Search and book buses instantly</p>
            </div>

            <form onSubmit={handleSearch} className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                  {/* From Location */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">
                      <MapPin className="w-4 h-4 inline mr-2" />
                      From
                    </label>
                    <input
                      type="text"
                      value={fromLocation}
                      onChange={(e) => setFromLocation(e.target.value)}
                      placeholder="Enter departure city"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all text-sm"
                      required
                    />
                  </div>

                  {/* To Location */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">
                      <MapPin className="w-4 h-4 inline mr-2" />
                      To
                    </label>
                    <input
                      type="text"
                      value={toLocation}
                      onChange={(e) => setToLocation(e.target.value)}
                      placeholder="Enter destination city"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all text-sm"
                      required
                    />
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
                </div>

                {/* Search Button */}
                <div className="md:ml-4">
                  <Button
                    type="submit"
                    className="w-full md:w-auto px-8 py-2.5 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-sky-500/30 flex items-center justify-center gap-2"
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
                <h3 className="text-2xl font-bold text-white mb-2">Available Routes</h3>
                <p className="text-slate-300 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {fromLocation} → {toLocation}
                </p>
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

            {matchingRoutes.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {matchingRoutes.map((route) => (
                  <div
                    key={route.id}
                    className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 hover:bg-slate-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-1"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Bus className="w-6 h-6 text-sky-400" />
                        <div>
                          <p className="font-semibold text-white text-sm">{route.name}</p>
                          <p className="text-xs text-slate-400">{route.busType}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-5 text-sm">
                      <div className="flex items-center gap-2 text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-xs">{route.from} → {route.to}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-xs">{route.departureTime || 'TBD'} → {route.arrivalTime || 'TBD'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-xs">{route.totalSeats} seats</span>
                      </div>
                      <div className="flex items-center gap-1 text-sky-300 font-bold text-base">
                        <Banknote className="w-4 h-4" />
                        Rs. {route.price || 0}
                      </div>
                    </div>

                    <Button
                      onClick={() => handleBookTicket(route)}
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
                <p className="text-slate-400">No routes found for this journey</p>
                <p className="text-slate-500 text-sm mt-2">Try different cities or check spelling</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeSearchPanel;

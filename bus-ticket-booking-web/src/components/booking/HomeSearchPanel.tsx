import { useState } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Route, Trip } from '@/types/booking';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Bus, Clock, Users, Banknote, ChevronRight, Search as SearchIcon, ArrowLeft } from 'lucide-react';
import { SRI_LANKA_CITIES } from '@/lib/sriLankaCoordinates';

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
  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [showToSuggestions, setShowToSuggestions] = useState(false);

  // Get city suggestions based on input
  const getCitySuggestions = (input: string): string[] => {
    if (!input.trim()) return [];
    const searchTerm = input.toLowerCase().trim();
    return SRI_LANKA_CITIES.filter(city =>
      city.name.toLowerCase().includes(searchTerm)
    )
      .map(city => city.name)
      .slice(0, 5); // Limit to 5 suggestions
  };

  const fromSuggestions = getCitySuggestions(fromLocation);
  const toSuggestions = getCitySuggestions(toLocation);

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
    <div className="h-full bg-slate-950/20 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl p-8 md:p-10 flex flex-col justify-between">
      <div className="w-full flex flex-col justify-center flex-1">
        {!showResults ? (
          <div className="space-y-8">
            <div className="text-center mb-6">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Find Your Next Journey</h2>
              <p className="text-slate-300 text-base md:text-lg">Search and book buses instantly</p>
            </div>

            <form onSubmit={handleSearch} className="space-y-8">
              {/* From Location */}
              <div className="relative">
                <label className="block text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  From
                </label>
                <input
                  type="text"
                  value={fromLocation}
                  onChange={(e) => {
                    setFromLocation(e.target.value);
                    setShowFromSuggestions(true);
                  }}
                  onFocus={() => fromLocation && setShowFromSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowFromSuggestions(false), 200)}
                  placeholder="Enter departure city"
                  className="w-full px-5 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all text-base"
                  required
                />
                {/* Suggestions Dropdown */}
                {showFromSuggestions && fromSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-2 bg-slate-800 border border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {fromSuggestions.map((city) => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => {
                          setFromLocation(city);
                          setShowFromSuggestions(false);
                        }}
                        className="w-full px-5 py-3 text-left text-white hover:bg-slate-700 transition-colors first:rounded-t-lg last:rounded-b-lg flex items-center gap-2"
                      >
                        <MapPin className="w-4 h-4 text-slate-400" />
                        {city}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* To Location */}
              <div className="relative">
                <label className="block text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  To
                </label>
                <input
                  type="text"
                  value={toLocation}
                  onChange={(e) => {
                    setToLocation(e.target.value);
                    setShowToSuggestions(true);
                  }}
                  onFocus={() => toLocation && setShowToSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowToSuggestions(false), 200)}
                  placeholder="Enter destination city"
                  className="w-full px-5 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all text-base"
                  required
                />
                {/* Suggestions Dropdown */}
                {showToSuggestions && toSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-2 bg-slate-800 border border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {toSuggestions.map((city) => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => {
                          setToLocation(city);
                          setShowToSuggestions(false);
                        }}
                        className="w-full px-5 py-3 text-left text-white hover:bg-slate-700 transition-colors first:rounded-t-lg last:rounded-b-lg flex items-center gap-2"
                      >
                        <MapPin className="w-4 h-4 text-slate-400" />
                        {city}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Travel Date */}
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Travel Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={today}
                  className="w-full px-5 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-all text-base"
                  required
                />
              </div>

              {/* Search Button */}
              <Button
                type="submit"
                className="w-full mt-6 px-8 py-3 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-sky-500/30 flex items-center justify-center gap-2 text-base"
              >
                <SearchIcon className="w-5 h-5" />
                Search Buses
              </Button>
            </form>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Available Routes</h3>
                <p className="text-slate-300 flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4" />
                  {fromLocation} → {toLocation}
                </p>
                <p className="text-slate-300 flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(selectedDate), 'EEE, MMM d, yyyy')}
                </p>
              </div>
              <Button
                onClick={() => setShowResults(false)}
                variant="outline"
                className="border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2 h-10"
              >
                <ArrowLeft className="w-4 h-4" />
                Modify
              </Button>
            </div>

            {matchingRoutes.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2 grid-cols-1">
                {matchingRoutes.map((route) => (
                  <div
                    key={route.id}
                    className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:bg-slate-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Bus className="w-5 h-5 text-sky-400" />
                        <div>
                          <p className="font-semibold text-white text-sm">{route.name}</p>
                          <p className="text-xs text-slate-400">{route.busType}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 mb-3 text-xs">
                      <div className="flex items-center gap-2 text-slate-300">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span>{route.from} → {route.to}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{route.departureTime || 'TBD'} → {route.arrivalTime || 'TBD'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sky-300 font-bold text-sm">
                        <Banknote className="w-3.5 h-3.5" />
                        Rs. {route.price || 0}
                      </div>
                    </div>

                    <Button
                      onClick={() => handleBookTicket(route)}
                      className="w-full bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white font-semibold py-2 rounded-lg transition-all flex items-center justify-center gap-2 text-xs"
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

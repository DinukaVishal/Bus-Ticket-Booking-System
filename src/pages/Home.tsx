import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Bus, ShieldCheck, Clock, MapPin, Search, CreditCard, ChevronRight, Star } from 'lucide-react';

const Home = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      
      {/* 1. Hero Section (Video Background සමඟ) */}
      <section className="relative text-white py-24 lg:py-32 overflow-hidden flex items-center min-h-[85vh]">
        
        {/* --- Background Video --- */}
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          className="absolute top-0 left-0 w-full h-full object-cover z-0"
        >
          {/* මෙතනට ඔයාගේ වීඩියෝ එකේ නම දෙන්න */}
          <source src="/qickvideo12.mp4" type="video/mp4" />
        </video>

        {/* --- Dark Overlay (වීඩියෝ එක උඩින් අකුරු පැහැදිලිව පේන්න) --- */}
        <div className="absolute inset-0 bg-blue-950/60 z-10"></div>

        {/* --- Content --- */}
        <div className="container mx-auto px-4 text-center relative z-20 mt-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 mb-8 animate-fade-in">
            <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
            <span className="text-sm font-medium tracking-wide">Sri Lanka's #1 Bus Booking Platform</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight drop-shadow-lg">
            Travel Made <span className="text-blue-300">Simple.</span>
          </h1>
          
          <p className="text-lg md:text-2xl mb-10 opacity-90 max-w-2xl mx-auto font-light drop-shadow-md">
            Book your bus tickets online easily, securely, and travel across Sri Lanka with comfort.
          </p>
          
          {/* Main Call to Action Button */}
          <Link to="/booking">
            <Button 
              size="lg" 
              className="bg-white text-blue-900 hover:bg-blue-50 font-bold text-lg px-8 py-7 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 group"
            >
              Book Your Ticket Now
              <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </section>

      {/* 2. How It Works Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">How QuickBus Works?</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Get your ticket in just 3 simple steps</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Step 1 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center transition-all duration-300 hover:shadow-xl hover:-translate-y-2 group">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-800">1. Search Route</h3>
              <p className="text-gray-500">Choose your origin, destination, and travel date.</p>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center transition-all duration-300 hover:shadow-xl hover:-translate-y-2 group">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <Bus className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-800">2. Select Seat</h3>
              <p className="text-gray-500">Pick your favorite bus and select your preferred seat.</p>
            </div>

            {/* Step 3 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center transition-all duration-300 hover:shadow-xl hover:-translate-y-2 group">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <CreditCard className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-800">3. Pay & Go</h3>
              <p className="text-gray-500">Make a secure payment and receive your e-ticket instantly.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-16">Why Choose QuickBus?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 max-w-6xl mx-auto">
            <div className="flex gap-4 items-start">
              <div className="bg-green-100 p-3 rounded-lg text-green-600 mt-1">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-800 mb-2">Secure Payments</h4>
                <p className="text-gray-600 text-sm leading-relaxed">Your transactions are 100% secure with our encrypted payment gateways.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="bg-purple-100 p-3 rounded-lg text-purple-600 mt-1">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-800 mb-2">24/7 Customer Support</h4>
                <p className="text-gray-600 text-sm leading-relaxed">We are here to help you anytime, anywhere during your journey.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="bg-orange-100 p-3 rounded-lg text-orange-600 mt-1">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-800 mb-2">Island-wide Coverage</h4>
                <p className="text-gray-600 text-sm leading-relaxed">Connecting major cities and towns across Sri Lanka with luxury buses.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Driver Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Are You a Bus Driver?</h2>
            <p className="text-lg md:text-xl mb-8 opacity-90 max-w-2xl mx-auto">
              Join our driver network and start earning. Register your bus, manage bookings, and provide live tracking to passengers.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl">
                <Bus className="w-12 h-12 mx-auto mb-4 text-blue-200" />
                <h3 className="text-xl font-bold mb-2">Register Your Bus</h3>
                <p className="text-blue-100">Add your bus details and start accepting bookings</p>
              </div>

              <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl">
                <MapPin className="w-12 h-12 mx-auto mb-4 text-blue-200" />
                <h3 className="text-xl font-bold mb-2">Live GPS Tracking</h3>
                <p className="text-blue-100">Share your location with passengers in real-time</p>
              </div>

              <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl">
                <ShieldCheck className="w-12 h-12 mx-auto mb-4 text-blue-200" />
                <h3 className="text-xl font-bold mb-2">Manage Bookings</h3>
                <p className="text-blue-100">View passenger details and seat bookings</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/driver/signup">
                <Button
                  size="lg"
                  className="bg-white text-blue-900 hover:bg-blue-50 font-bold text-lg px-8 py-6 rounded-full shadow-2xl transition-all duration-300 hover:scale-105"
                >
                  Sign Up as Driver
                </Button>
              </Link>

              <Link to="/driver/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-blue-900 font-bold text-lg px-8 py-6 rounded-full shadow-2xl transition-all duration-300 hover:scale-105"
                >
                  Driver Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;
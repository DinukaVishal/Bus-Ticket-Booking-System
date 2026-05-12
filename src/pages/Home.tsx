import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import { Bus, ShieldCheck, Clock, MapPin, Search, CreditCard, ChevronRight, Star } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useRoutes } from '@/hooks/useRoutes';
import HomeSearchPanel from '@/components/booking/HomeSearchPanel';

const Home = () => {
  const { theme } = useTheme();
  const { data: routes = [] } = useRoutes();
  return (
    <div className="min-h-screen relative bg-[url('/quickbus-bg.jpg')] bg-cover bg-center bg-fixed bg-slate-950/70 backdrop-blur-xl flex flex-col font-sans">
      <Header isHomePage={true} />
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
        <div className={`absolute inset-0 z-10 ${theme === 'dark' ? 'bg-slate-950/70' : 'bg-blue-950/60'}`}></div>

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

      {/* Search Panel Section */}
      <section className="py-24 bg-slate-700/80">
        <div className="container mx-auto px-4 max-w-5xl">
          <HomeSearchPanel routes={routes} />
        </div>
      </section>

      {/* 2. How It Works Section */}
      <section className="py-24 bg-slate-900/95 text-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400 mb-3">Step-by-step</p>
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">Book your trip in minutes</h2>
            <p className="mt-4 text-slate-300 max-w-2xl mx-auto">
              QuickBus makes bus travel easier with transparent pricing, instant confirmation and modern ticketing.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 max-w-6xl mx-auto">
            <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.8)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:border-white/20">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-800 text-sky-300 mb-6 shadow-lg shadow-sky-500/10">
                <Search className="w-7 h-7" />
              </div>
              <span className="text-sm uppercase tracking-[0.24em] text-sky-200">Step 1</span>
              <h3 className="mt-4 text-2xl font-semibold text-white">Search your route</h3>
              <p className="mt-3 text-slate-300">Enter your departure, destination and travel date for instant options.</p>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.8)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:border-white/20">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-800 text-emerald-300 mb-6 shadow-lg shadow-emerald-500/10">
                <Bus className="w-7 h-7" />
              </div>
              <span className="text-sm uppercase tracking-[0.24em] text-emerald-200">Step 2</span>
              <h3 className="mt-4 text-2xl font-semibold text-white">Pick your bus & seat</h3>
              <p className="mt-3 text-slate-300">Choose the vehicle, seat and amenities that suit your journey.</p>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.8)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:border-white/20">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-800 text-violet-300 mb-6 shadow-lg shadow-violet-500/10">
                <CreditCard className="w-7 h-7" />
              </div>
              <span className="text-sm uppercase tracking-[0.24em] text-violet-200">Step 3</span>
              <h3 className="mt-4 text-2xl font-semibold text-white">Pay securely</h3>
              <p className="mt-3 text-slate-300">Complete payment using your preferred method and travel with confidence.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Features Section */}
      <section className="py-24 bg-slate-900/80 text-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <p className="text-sm uppercase tracking-[0.3em] text-sky-300 mb-3">Why customers prefer us</p>
            <h2 className="text-4xl md:text-5xl font-semibold">Built for smoother travel</h2>
            <p className="mt-4 text-slate-400 max-w-2xl mx-auto">
              Every feature on QuickBus is designed to make bus booking faster, clearer and more reliable.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 max-w-6xl mx-auto">
            <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.8)]">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-900 text-emerald-300 mb-5">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">Secure payments</h3>
              <p className="text-slate-300 leading-relaxed">Payments are protected with encryption and multiple secure gateways.</p>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.8)]">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-900 text-violet-300 mb-5">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">24/7 support</h3>
              <p className="text-slate-300 leading-relaxed">Need help? Our team is available anytime to support your travel plans.</p>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-[0_30px_60px_-30px_rgba(15,23,42,0.8)]">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-900 text-orange-300 mb-5">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">All routes covered</h3>
              <p className="text-slate-300 leading-relaxed">Travel across Sri Lanka with a wide network of trusted bus routes.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Business Growth Section */}
      <section className="py-24 bg-gradient-to-r from-slate-950 to-slate-800 text-white">
        <div className="container mx-auto px-4">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-sky-300 mb-4">Partner with us</p>
              <h2 className="text-4xl font-semibold mb-6">A smarter way for bus owners to grow</h2>
              <p className="max-w-2xl text-slate-300 leading-relaxed text-lg">
                QuickBus gives bus owners a modern dashboard for fleet management, route planning and booking insights — all in one place.
              </p>
            </div>
            <div className="grid gap-6">
              <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-xl shadow-slate-950/10">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-950 text-sky-300 mb-4">
                  <Bus className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Register your fleet</h3>
                <p className="text-slate-300">Add bus details and routes in minutes with a simple onboarding flow.</p>
              </div>
              <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-xl shadow-slate-950/10">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-950 text-emerald-300 mb-4">
                  <MapPin className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Manage routes</h3>
                <p className="text-slate-300">Create, edit and publish routes with full control over schedules and stops.</p>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/bus-owner/signup">
              <Button size="lg" className="bg-sky-400 text-slate-950 hover:bg-sky-300 px-8 py-5 rounded-full font-semibold shadow-2xl shadow-sky-500/30">
                Sign Up as Bus Owner
              </Button>
            </Link>
            <Link to="/bus-owner/login">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 px-8 py-5 rounded-full font-semibold">
                Bus Owner Login
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 5. Staff Login Section */}
      <section className="py-24 bg-slate-900/95 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center rounded-[32px] border border-white/10 bg-white/5 p-12 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.9)] backdrop-blur-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 mb-6 text-sm font-semibold text-slate-200">
              <ShieldCheck className="w-4 h-4 text-purple-300" />
              Staff Dashboard Access
            </div>
            <h2 className="text-4xl font-semibold mb-5">Staff portal for real-time operations</h2>
            <p className="mx-auto mb-10 max-w-2xl text-slate-300 leading-relaxed">
              Login to your staff dashboard to manage bookings, track bus locations and oversee passenger check-ins with speed.
            </p>

            <Link to="/staff/login">
              <Button size="lg" className="bg-purple-700 text-white hover:bg-purple-600 px-10 py-6 rounded-full shadow-2xl shadow-purple-500/20">
                Staff Login
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
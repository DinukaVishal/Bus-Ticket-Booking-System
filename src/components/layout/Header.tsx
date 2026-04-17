import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bus, LayoutDashboard, LogOut, User, Ticket, Radio, Navigation, ChevronDown, UserCircle, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, isAdmin, signOut } = useAuthContext();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: 'Signed out',
        description: 'You have been signed out successfully.',
      });
      navigate('/');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to sign out.',
        variant: 'destructive',
      });
    }
  };

  const displayName = profile?.displayName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  
  const getFallback = () => {
    if (displayName) return displayName.charAt(0).toUpperCase();
    return 'U';
  };

  return (
    <header className="gradient-hero text-primary-foreground sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-display font-bold text-xl hover:scale-105 transition-transform">
            <Bus className="w-6 h-6" />
            <span>QuickBus</span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1 md:gap-2">
            <Link
              to="/booking"
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium transition-colors hidden sm:flex items-center',
                location.pathname === '/booking' || location.pathname === '/'
                  ? 'bg-white/20'
                  : 'hover:bg-white/10'
              )}
            >
              Book Tickets
            </Link>

            <Link
              to="/tracking"
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
                location.pathname === '/tracking'
                  ? 'bg-white/20'
                  : 'hover:bg-white/10'
              )}
            >
              <Radio className="w-4 h-4" />
              <span className="hidden sm:inline">Live Track</span>
            </Link>

            {user && (
              <Link
                to="/my-bookings"
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
                  location.pathname === '/my-bookings'
                    ? 'bg-white/20'
                    : 'hover:bg-white/10'
                )}
              >
                <Ticket className="w-4 h-4" />
                <span className="hidden sm:inline">My Bookings</span>
              </Link>
            )}

            {user && (
              <Link
                to="/driver"
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 text-emerald-100 hover:text-white',
                  location.pathname === '/driver'
                    ? 'bg-emerald-500/40 text-white'
                    : 'hover:bg-emerald-500/20'
                )}
              >
                <Navigation className="w-4 h-4" />
                <span className="hidden sm:inline">Driver</span>
              </Link>
            )}
            
            {isAdmin && (
              <Link
                to="/admin"
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 bg-rose-500/20 text-rose-100 hover:bg-rose-500/40',
                  location.pathname === '/admin' ? 'bg-rose-500/50' : ''
                )}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            )}

            {/* User Menu - MODERN DROPDOWN */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="relative h-10 w-auto px-2 ml-1 flex items-center gap-2 rounded-full hover:bg-white/10 transition-all group border border-white/10"
                  >
                    <Avatar className="h-7 w-7 rounded-full border border-white/20 shadow-sm transition-transform duration-300 group-hover:scale-110 bg-primary-foreground text-primary">
                      {/* @ts-ignore */}
                      <AvatarImage src={profile?.avatarUrl || profile?.avatar_url || ''} className="object-cover" />
                      <AvatarFallback className="font-bold text-xs">{getFallback()}</AvatarFallback>
                    </Avatar>
                    
                    <div className="hidden md:flex flex-col items-start">
                      <span className="text-sm font-semibold truncate max-w-[120px]">
                        {displayName}
                      </span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                
                {/* WIDENED DROPDOWN TO w-72 */}
                <DropdownMenuContent className="w-72 mt-2 p-1.5 rounded-xl shadow-xl border-2" align="end">
                  <DropdownMenuLabel className="p-3">
                    <div className="flex items-center gap-3">
                      {/* Avatar size slightly increased and shrink-0 added */}
                      <Avatar className="h-11 w-11 rounded-full border shadow-sm shrink-0">
                        {/* @ts-ignore */}
                        <AvatarImage src={profile?.avatarUrl || profile?.avatar_url || ''} className="object-cover" />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">{getFallback()}</AvatarFallback>
                      </Avatar>
                      
                      {/* min-w-0 is crucial here for text truncation to work inside flex */}
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-extrabold text-foreground text-sm truncate w-full block" title={displayName}>
                          {displayName}
                        </span>
                        <span className="text-[11.5px] text-muted-foreground truncate w-full block mb-1" title={user.email}>
                          {user.email}
                        </span>
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex border w-fit capitalize shadow-sm",
                          isAdmin ? "bg-rose-50 text-rose-600 border-rose-200" : "bg-primary/5 text-primary border-primary/10"
                        )}>
                          {isAdmin ? 'System Admin' : 'Standard User'}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem asChild className="p-0">
                    <Link to="/profile" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg cursor-pointer hover:bg-muted group">
                      <UserCircle className="w-4 h-4 text-muted-foreground transition-colors group-hover:text-primary" />
                      My Account Profile
                    </Link>
                  </DropdownMenuItem>
                  
                  {isAdmin && (
                    <DropdownMenuItem asChild className="p-0">
                      <Link to="/admin" className="flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-rose-600 rounded-lg cursor-pointer hover:bg-rose-50 group">
                        <ShieldCheck className="w-4 h-4 text-rose-500 transition-colors group-hover:text-rose-600" />
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-destructive rounded-lg cursor-pointer hover:bg-destructive/10 group">
                    <LogOut className="w-4 h-4 text-destructive transition-colors group-hover:translate-x-1" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2 ml-2">
                <Button variant="ghost" asChild className="text-white hover:bg-white/10 hover:text-white">
                  <Link to="/login">Login</Link>
                </Button>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
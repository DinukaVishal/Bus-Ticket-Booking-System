import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bus, LayoutDashboard, LogOut, User, Ticket, Radio, Navigation, ChevronDown, UserCircle, ShieldCheck, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthContext } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useScrollPosition } from '@/hooks/useScrollPosition';
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

interface HeaderProps {
  isHomePage?: boolean;
  isStaff?: boolean;
}

const Header = ({ isHomePage = false, isStaff = false }: HeaderProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, isAdmin, signOut } = useAuthContext();
  const { theme, toggleTheme } = useTheme();
  const scrollPosition = useScrollPosition();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Determine if header should be transparent (only on home page and when scrolled less than 100px)
  const isTransparent = isHomePage && scrollPosition < 100;

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
    <header 
      className={`z-50 transition-all duration-300 ${isHomePage && isTransparent ? 'fixed' : 'sticky'} top-0 left-0 right-0 w-full ${
        theme === 'dark' ? 'text-white' : 'text-white'
      }`}
      style={{
        background: isTransparent 
          ? 'transparent' 
          : theme === 'dark'
            ? 'linear-gradient(135deg, hsla(222, 47%, 15%, 0.95) 0%, hsla(222, 47%, 20%, 0.95) 100%)'
            : 'linear-gradient(135deg, hsla(222, 60%, 25%, 0.95) 0%, hsla(222, 60%, 35%, 0.95) 100%)',
        backdropFilter: isTransparent ? 'none' : 'blur(12px)',
        borderBottom: isTransparent ? 'none' : theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: isTransparent ? 'none' : theme === 'dark' ? '0 20px 25px -5px rgba(0, 0, 0, 0.3)' : '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}
    >
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-display font-bold text-xl hover:scale-105 transition-transform">
            <Bus className="w-6 h-6" />
            <span>QuickBus</span>
          </Link>

          {/* Mobile menu toggle */}
          {!isStaff && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="sm:hidden p-2 h-10 w-10 rounded-lg text-white hover:bg-white/10 transition-colors"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              <Navigation className="w-5 h-5" />
            </Button>
          )}

          {/* Navigation */}
          {!isStaff && (
            <nav className="hidden sm:flex items-center gap-1 md:gap-2">
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

              {/* Theme Toggle Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="ml-1 p-2 h-9 w-9 rounded-lg hover:bg-white/10 transition-colors"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? (
                  <Moon className="w-4 h-4" />
                ) : (
                  <Sun className="w-4 h-4" />
                )}
              </Button>

              {/* User Menu - MODERN DROPDOWN */}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="relative h-10 w-10 p-0 ml-1 flex items-center justify-center rounded-full hover:bg-white/10 transition-all group border border-white/10"
                    >
                      <Avatar className="h-7 w-7 rounded-full border border-white/20 shadow-sm transition-transform duration-300 group-hover:scale-110 bg-primary-foreground text-primary">
                        {/* @ts-ignore */}
                        <AvatarImage src={profile?.avatarUrl || profile?.avatar_url || ''} className="object-cover" />
                        <AvatarFallback className="font-bold text-xs">{getFallback()}</AvatarFallback>
                      </Avatar>
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
          )}
        </div>

        {!isStaff && mobileMenuOpen && (
          <div className="sm:hidden mt-3 rounded-3xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl shadow-black/20 backdrop-blur-xl">
            <div className="flex flex-col gap-2">
              <Link
                to="/booking"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'block px-4 py-3 rounded-2xl text-sm font-medium transition-colors',
                  location.pathname === '/booking' || location.pathname === '/' ? 'bg-white/10' : 'hover:bg-white/10'
                )}
              >
                Book Tickets
              </Link>
              {user && (
                <Link
                  to="/my-bookings"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'block px-4 py-3 rounded-2xl text-sm font-medium transition-colors',
                    location.pathname === '/my-bookings' ? 'bg-white/10' : 'hover:bg-white/10'
                  )}
                >
                  My Bookings
                </Link>
              )}
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'block px-4 py-3 rounded-2xl text-sm font-medium transition-colors',
                    location.pathname === '/admin' ? 'bg-rose-500/20 text-rose-100' : 'hover:bg-white/10'
                  )}
                >
                  Admin Dashboard
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  toggleTheme();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-4 py-3 rounded-2xl text-sm font-medium transition-colors hover:bg-white/10"
              >
                {theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              </button>
              {!user ? (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-3 rounded-2xl text-sm font-medium transition-colors hover:bg-white/10"
                >
                  Login
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    handleSignOut();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 rounded-2xl text-sm font-semibold text-destructive transition-colors hover:bg-white/10"
                >
                  Sign out
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
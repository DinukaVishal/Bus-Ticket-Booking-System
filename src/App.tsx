import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Home from "./pages/Home";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import AdminSetup from "./pages/AdminSetup";
import MyBookings from "./pages/MyBookings";
import Profile from "./pages/Profile";
import TicketScanner from "./pages/TicketScanner";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import LiveTracking from "./pages/LiveTracking.tsx";
import BusOwnerDashboard from "./pages/BusOwnerDashboard";
import BusOwnerSignup from "./pages/BusOwnerSignup";
import BusOwnerLogin from "./pages/BusOwnerLogin";
import BusOwnerAddBus from "./pages/BusOwnerAddBus";
import BusOwnerAddTrips from "./pages/BusOwnerAddTrips";
import BusOwnerEditBus from "./pages/BusOwnerEditBus";
import BusOwnerProfile from "./pages/BusOwnerProfile";
import StaffLogin from "./pages/StaffLogin";
import StaffDashboard from "./pages/StaffDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppShell = () => {
  return (
    <div className="page-shell min-h-screen page-bg">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/booking"
          element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin>
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-bookings"
          element={
            <ProtectedRoute>
              <MyBookings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scan"
          element={
            <ProtectedRoute requireAdmin>
              <TicketScanner />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/admin-setup" element={<AdminSetup />} />
        <Route path="/tracking" element={<LiveTracking />} />
        <Route path="/tracking/:routeId" element={<LiveTracking />} />
        <Route path="/tracking/:routeId/:bookingId" element={<LiveTracking />} />
        <Route
          path="/bus-owner/dashboard"
          element={
            <ProtectedRoute requireBusOwner>
              <BusOwnerDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/bus-owner/signup" element={<BusOwnerSignup />} />
        <Route path="/bus-owner/login" element={<BusOwnerLogin />} />
        <Route
          path="/bus-owner/add-bus"
          element={
            <ProtectedRoute requireBusOwner>
              <BusOwnerAddBus />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bus-owner/edit-bus/:busId"
          element={
            <ProtectedRoute requireBusOwner>
              <BusOwnerEditBus />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bus-owner/add-trips/:busId"
          element={
            <ProtectedRoute requireBusOwner>
              <BusOwnerAddTrips />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bus-owner/profile"
          element={
            <ProtectedRoute requireBusOwner>
              <BusOwnerProfile />
            </ProtectedRoute>
          }
        />
        <Route path="/staff/login" element={<StaffLogin />} />
        <Route path="/staff/dashboard" element={<StaffDashboard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppShell />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

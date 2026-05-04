import { Navigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireDriver?: boolean;
}

const ProtectedRoute = ({ children, requireAdmin = false, requireDriver = false }: ProtectedRouteProps) => {
  const { user, isAdmin, isDriver, isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background/60 backdrop-blur-xl flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (requireDriver && !isDriver) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

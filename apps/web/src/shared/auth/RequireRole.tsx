import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import type { AppRole } from './permissions';

export function RequireRole({ allowed, children }: { allowed: AppRole[]; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user || !allowed.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function ProtectedRoute() {
    const { session, loading } = useAuth();
    const location = useLocation();

    if (loading) return <div style={{ padding: 16 }}>Cargando...</div>;

    if (!session) {
        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    return <Outlet />;
}

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Loading } from './Loading';

export function ProtectedRoute() {
    const { session, loading } = useAuth();
    const location = useLocation();

    if (loading) return <div style={{ padding: 16 }}><Loading /></div>;

    if (!session) {
        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    // Magic link case: user authenticated via email link, bypassing Verify.tsx.
    // sessionStorage may still hold a pending /join/CODE redirect.
    const pending = sessionStorage.getItem('asadito_from');
    if (pending?.startsWith('/join/') && location.pathname !== pending) {
        sessionStorage.removeItem('asadito_from');
        return <Navigate to={pending} replace />;
    }

    return <Outlet />;
}

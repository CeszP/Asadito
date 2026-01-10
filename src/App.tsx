import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';

import Login from './pages/Login';
import Verify from './pages/Verify';
import EventsHome from './pages/EventsHome';
import EventDetail from './pages/EventDetail';
import Join from './pages/Join';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/join/:code" element={<Join />} />

        {/* Protegidas */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<EventsHome />} />
          <Route path="/event/:id" element={<EventDetail />} />
        </Route>

        {/* Catch-all AL FINAL */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

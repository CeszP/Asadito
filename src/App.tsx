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
        <Route path="/login" element={<Login />} />
        <Route path="/verify" element={<Verify />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<EventsHome />} />
          <Route path="/event/:id" element={<EventDetail />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<EventsHome />} />
          <Route path="/event/:id" element={<EventDetail />} />
          <Route path="/join/:code" element={<Join />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

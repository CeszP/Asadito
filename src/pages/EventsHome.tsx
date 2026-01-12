import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listMyEvents, createEvent } from '../lib/events';
import { signOut } from '../lib/auth';
import type { EventRow } from '../types/db';

export default function EventsHome() {
    const navigate = useNavigate();
    const [events, setEvents] = useState<EventRow[]>([]);
    const [title, setTitle] = useState('Asadito del sábado');
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function refresh() {
        setErr(null);
        const data = await listMyEvents();
        setEvents(data);
    }

    useEffect(() => {
        refresh().catch((e) => setErr(e?.message ?? 'No se pudieron cargar eventos'));
    }, []);

    async function onCreate() {
        setErr(null);
        setLoading(true);
        try {
            const ev = await createEvent(title.trim());
            setTitle('Asadito del sábado');
            await refresh();
            navigate(`/event/${ev.id}`);
        } catch (e: any) {
            setErr(e?.message ?? 'No se pudo crear el evento');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ padding: 16, maxWidth: 720, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>Asadito</h2>
                <button onClick={() => signOut()} style={{ padding: 10, borderRadius: 10, border: '1px solid #000' }}>
                    Cerrar sesión
                </button>
            </div>

            <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Nombre del evento"
                    style={{ padding: 12, borderRadius: 10, border: '1px solid #ccc' }}
                />
                <button
                    disabled={loading}
                    onClick={onCreate}
                    style={{ padding: 12, borderRadius: 10, border: '1px solid #000', fontWeight: 700 }}
                >
                    {loading ? 'Creando...' : 'Crear evento'}
                </button>

                {err && <div style={{ color: 'crimson' }}>{err}</div>}
            </div>
            <button onClick={() => navigate('/me')} style={{ padding: 10, borderRadius: 10, border: '1px solid #ccc' }}>
                Mi nombre
            </button>

            <h3 style={{ marginTop: 20 }}>Tus eventos</h3>

            <div style={{ display: 'grid', gap: 10 }}>
                {events.map((ev) => (
                    <button
                        key={ev.id}
                        onClick={() => navigate(`/event/${ev.id}`)}
                        style={{ textAlign: 'left', padding: 12, borderRadius: 10, border: '1px solid #ddd' }}
                    >
                        <div style={{ fontWeight: 700 }}>{ev.title}</div>
                        <div style={{ opacity: 0.8 }}>{ev.location_text ?? 'Sin ubicación'}</div>
                    </button>
                ))}
                {events.length === 0 && <div style={{ opacity: 0.7 }}>Aún no tienes eventos. Crea el primero.</div>}
            </div>
        </div>
    );
}

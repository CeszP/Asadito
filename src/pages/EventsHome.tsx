import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listMyEvents, createEvent } from '../lib/events';
import { signOut } from '../lib/auth';
import type { EventRow } from '../types/db';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Loading } from '../components/Loading';

function formatEventDate(dateStr: string | null): string | null {
    if (!dateStr) return null;
    try {
        return new Intl.DateTimeFormat('es-MX', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'UTC',
        }).format(new Date(dateStr));
    } catch {
        return null;
    }
}

export default function EventsHome() {
    const navigate = useNavigate();

    const [events, setEvents] = useState<EventRow[]>([]);
    const [listLoading, setListLoading] = useState(true);
    const [title, setTitle] = useState('Asadito del sábado');
    const [adults, setAdults] = useState<number>(4);
    const [minors, setMinors] = useState<number>(0);
    const [datetime, setDatetime] = useState('');
    const [location, setLocation] = useState('');
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function refresh() {
        setErr(null);
        const data = await listMyEvents();
        setEvents(data);
    }

    useEffect(() => {
        refresh()
            .catch((e) => setErr(e?.message ?? 'No se pudieron cargar eventos'))
            .finally(() => setListLoading(false));
    }, []);

    async function onCreate() {
        setErr(null);

        const cleanTitle = title.trim();
        if (!cleanTitle) {
            setErr('Ingresa un nombre para el evento.');
            return;
        }

        const a = Number.isFinite(adults) ? Math.max(0, Math.floor(adults)) : 0;
        const m = Number.isFinite(minors) ? Math.max(0, Math.floor(minors)) : 0;

        if (a + m <= 0) {
            setErr('Debes indicar al menos 1 asistente.');
            return;
        }

        setLoading(true);
        try {
            const ev = await createEvent({
                title: cleanTitle,
                adults_count: a,
                minors_count: m,
                event_datetime: datetime || null,
                location_text: location || null,
            });

            setTitle('Asadito del sábado');
            setAdults(4);
            setMinors(0);
            setDatetime('');
            setLocation('');

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
                <h2 style={{ margin: 0 }}>Asadito 🔥</h2>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Button size="sm" onClick={() => navigate('/me')}>Mi nombre</Button>
                    <Button size="sm" onClick={() => signOut()}>Cerrar sesión</Button>
                </div>
            </div>

            <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
                <Input
                    label="Nombre del evento"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Asadito del sábado"
                />

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 140 }}>
                        <Input
                            label="Adultos"
                            value={String(adults)}
                            onChange={(e) => setAdults(Number(e.target.value))}
                            inputMode="numeric"
                        />
                    </div>
                    <div style={{ flex: 1, minWidth: 140 }}>
                        <Input
                            label="Menores"
                            value={String(minors)}
                            onChange={(e) => setMinors(Number(e.target.value))}
                            inputMode="numeric"
                        />
                    </div>
                </div>

                <Input
                    label="Fecha y hora (opcional)"
                    type="datetime-local"
                    value={datetime}
                    onChange={(e) => setDatetime(e.target.value)}
                />

                <Input
                    label="Lugar (opcional)"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ej. Casa de Rodrigo"
                />

                <Button variant="primary" full disabled={loading} onClick={onCreate}>
                    {loading ? 'Creando...' : 'Crear evento'}
                </Button>

                {err && <div className="msg-error">{err}</div>}
            </div>

            <h3 style={{ marginTop: 28, marginBottom: 12 }}>Tus eventos</h3>

            {listLoading && <Loading text="Cargando eventos..." />}

            <div style={{ display: 'grid', gap: 10 }}>
                {events.map((ev) => {
                    const dateLabel = formatEventDate(ev.event_datetime);
                    return (
                        <button
                            key={ev.id}
                            onClick={() => navigate(`/event/${ev.id}`)}
                            className="card"
                            style={{ textAlign: 'left', cursor: 'pointer', width: '100%' }}
                        >
                            <div style={{ fontWeight: 700 }}>{ev.title}</div>
                            <div className="event-meta">
                                {typeof ev.adults_count === 'number'
                                    ? `${ev.adults_count} adultos · ${ev.minors_count} menores`
                                    : 'Asistentes no especificados'}
                                {dateLabel && ` · ${dateLabel}`}
                            </div>
                            {ev.location_text && (
                                <div className="event-meta">📍 {ev.location_text}</div>
                            )}
                        </button>
                    );
                })}

                {!listLoading && events.length === 0 && (
                    <div style={{ opacity: 0.65 }}>Aún no tienes eventos. Crea el primero.</div>
                )}
            </div>
        </div>
    );
}

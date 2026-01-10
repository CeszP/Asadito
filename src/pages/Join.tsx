import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { joinByCode } from '../lib/invites';

export default function Join() {
    const { code } = useParams();
    const navigate = useNavigate();

    const [msg, setMsg] = useState('Uniéndote al evento...');
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        const run = async () => {
            const c = String(code ?? '').trim();
            if (!c) {
                setErr('Código faltante.');
                return;
            }

            const { data } = await supabase.auth.getSession();
            if (!data.session) {
                navigate('/login', { replace: true, state: { from: `/join/${c}` } });
                return;
            }

            try {
                const eventId = await joinByCode(c);
                setMsg('Listo. Redirigiendo...');
                navigate(`/event/${eventId}`, { replace: true });
            } catch (e: any) {
                setErr(e?.message ?? 'No se pudo unir.');
            }
        };

        run();
    }, [code, navigate]);

    return (
        <div style={{ padding: 16, maxWidth: 520, margin: '0 auto' }}>
            <h2>Asadito</h2>
            {!err ? <p>{msg}</p> : <p style={{ color: 'crimson' }}>{err}</p>}
            <button onClick={() => navigate('/')} style={{ padding: 10, borderRadius: 10, border: '1px solid #ccc' }}>
                Ir a eventos
            </button>
        </div>
    );
}

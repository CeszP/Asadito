import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { joinByCode } from '../lib/invites';

export default function Join() {
    const { code } = useParams();
    const navigate = useNavigate();

    const [msg, setMsg] = useState('Uniéndote al evento...');
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        const c = String(code ?? '').trim();
        if (!c) {
            setErr('Código faltante.');
            return;
        }

        joinByCode(c)
            .then((eventId) => {
                setMsg('Listo. Redirigiendo...');
                navigate(`/event/${eventId}`, { replace: true });
            })
            .catch((e: any) => {
                setErr(e?.message ?? 'No se pudo unir.');
            });
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

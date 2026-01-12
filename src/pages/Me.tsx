import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyProfile, upsertMyDisplayName } from '../lib/profile';

export default function Me() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [msg, setMsg] = useState<string | null>(null);
    const [err, setErr] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        getMyProfile()
            .then((p) => setName(p?.display_name ?? ''))
            .catch(() => { });
    }, []);

    async function onSave() {
        setMsg(null);
        setErr(null);
        setSaving(true);
        try {
            await upsertMyDisplayName(name);
            setMsg('Guardado.');
        } catch (e: any) {
            setErr(e?.message ?? 'No se pudo guardar.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div style={{ padding: 16, maxWidth: 520, margin: '0 auto' }}>
            <button onClick={() => navigate('/')} style={{ padding: 10, borderRadius: 10, border: '1px solid #ccc' }}>
                ← Volver
            </button>

            <h2 style={{ marginTop: 14 }}>Tu nombre</h2>
            <p style={{ marginTop: 0, opacity: 0.8 }}>Esto es lo que verán los demás en gastos y checklist.</p>

            <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. César"
                style={{ padding: 12, borderRadius: 10, border: '1px solid #ccc', width: '100%' }}
            />

            <button
                onClick={onSave}
                disabled={saving}
                style={{ marginTop: 10, padding: 12, borderRadius: 10, border: '1px solid #000', fontWeight: 800 }}
            >
                {saving ? 'Guardando...' : 'Guardar'}
            </button>

            {msg && <div style={{ marginTop: 10, opacity: 0.85 }}>{msg}</div>}
            {err && <div style={{ marginTop: 10, color: 'crimson' }}>{err}</div>}
        </div>
    );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyProfile, upsertMyDisplayName } from '../lib/profile';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

export default function Me() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [msg, setMsg] = useState<string | null>(null);
    const [err, setErr] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        getMyProfile()
            .then((p) => setName(p?.display_name ?? ''))
            .catch(() => {});
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
            <Button variant="ghost" onClick={() => navigate('/')}>
                ← Volver
            </Button>

            <h2 style={{ marginTop: 14 }}>Tu nombre</h2>
            <p style={{ marginTop: 0, opacity: 0.75 }}>
                Esto es lo que verán los demás en gastos y checklist.
            </p>

            <div style={{ display: 'grid', gap: 10 }}>
                <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. César"
                    error={err ?? undefined}
                />

                <Button variant="primary" full onClick={onSave} disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar'}
                </Button>

                {msg && <div className="msg-success">{msg}</div>}
            </div>
        </div>
    );
}

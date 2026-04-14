import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { joinByCode } from '../lib/invites';
import { getMyProfile, upsertMyDisplayName } from '../lib/profile';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Loading } from '../components/Loading';

type Phase = 'init' | 'name_prompt' | 'joining' | 'error';

export default function Join() {
    const { code: codeParam } = useParams();
    const navigate = useNavigate();
    const code = String(codeParam ?? '').trim();

    const [phase, setPhase] = useState<Phase>('init');
    const [displayName, setDisplayName] = useState('');
    const [err, setErr] = useState<string | null>(null);

    async function doJoin() {
        setPhase('joining');
        setErr(null);
        try {
            const eid = await joinByCode(code);
            navigate(`/event/${eid}`, { replace: true });
        } catch (e: any) {
            setErr(e?.message ?? 'No se pudo unir al evento.');
            setPhase('error');
        }
    }

    useEffect(() => {
        const run = async () => {
            if (!code) {
                setErr('Código de invitación inválido.');
                setPhase('error');
                return;
            }

            const { data } = await supabase.auth.getSession();
            if (!data.session) {
                navigate('/login', { replace: true, state: { from: `/join/${code}` } });
                return;
            }

            const profile = await getMyProfile().catch(() => null);
            if (!profile?.display_name?.trim()) {
                setPhase('name_prompt');
            } else {
                await doJoin();
            }
        };

        run();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [code]);

    async function onSaveName() {
        const clean = displayName.trim();
        if (clean.length < 2) {
            setErr('Ingresa al menos 2 caracteres.');
            return;
        }
        setErr(null);
        try {
            await upsertMyDisplayName(clean);
            await doJoin();
        } catch (e: any) {
            setErr(e?.message ?? 'No se pudo guardar el nombre.');
        }
    }

    if (phase === 'init' || phase === 'joining') {
        return (
            <div style={{ padding: 16, maxWidth: 420, margin: '80px auto', textAlign: 'center' }}>
                <Loading text={phase === 'joining' ? 'Uniéndote al evento...' : 'Cargando...'} />
            </div>
        );
    }

    if (phase === 'name_prompt') {
        return (
            <div style={{ padding: 24, maxWidth: 420, margin: '60px auto' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: 6 }}>Asadito 🔥</h1>
                <h2 style={{ marginTop: 0, marginBottom: 6 }}>¡Bienvenido!</h2>
                <p style={{ marginTop: 0, marginBottom: 24, opacity: 0.75 }}>
                    ¿Cómo te llamas? Los demás miembros del evento te verán así.
                </p>
                <div style={{ display: 'grid', gap: 10 }}>
                    <Input
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && onSaveName()}
                        placeholder="Ej. César"
                        autoFocus
                        error={err ?? undefined}
                    />
                    <Button variant="primary" full onClick={onSaveName}>
                        Continuar al evento →
                    </Button>
                </div>
            </div>
        );
    }

    // error phase
    return (
        <div style={{ padding: 24, maxWidth: 420, margin: '60px auto' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: 6 }}>Asadito 🔥</h1>
            <p className="msg-error" style={{ marginBottom: 20 }}>{err}</p>
            <Button variant="primary" onClick={() => navigate('/')}>
                Ir a mis eventos
            </Button>
        </div>
    );
}

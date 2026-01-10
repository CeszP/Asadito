import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { signOut } from '../lib/auth';

export default function Home() {
    const [email, setEmail] = useState<string>('');

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setEmail(data.user?.email ?? '');
        });
    }, []);

    return (
        <div style={{ padding: 16 }}>
            <h2>Asadito</h2>
            <p>Sesión activa: <strong>{email || '—'}</strong></p>

            <button
                onClick={() => signOut()}
                style={{ padding: 12, borderRadius: 10, border: '1px solid #000', fontWeight: 700 }}
            >
                Cerrar sesión
            </button>

            <hr style={{ margin: '16px 0' }} />

            <p>Siguiente: Crear evento + checklist realtime.</p>
        </div>
    );
}

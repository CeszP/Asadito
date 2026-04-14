import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { sendOtp } from '../lib/auth';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const from = (location.state as any)?.from ?? '/';

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail.includes('@')) {
            setError('Ingresa un email válido.');
            return;
        }

        setLoading(true);
        try {
            await sendOtp(cleanEmail);
            sessionStorage.setItem('asadito_from', from);
            navigate('/verify', { state: { email: cleanEmail, from } });
        } catch (err: any) {
            setError(err?.message ?? 'No se pudo enviar el código. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{ padding: 16, maxWidth: 420, margin: '0 auto' }}>
            <h1 style={{ marginBottom: 8 }}>Asadito 🔥</h1>
            <p style={{ marginTop: 0, marginBottom: 20, opacity: 0.75 }}>
                Entra con tu correo. Te enviamos un código.
            </p>

            <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10 }}>
                <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    inputMode="email"
                    autoComplete="email"
                    error={error ?? undefined}
                />

                <Button variant="primary" full disabled={loading}>
                    {loading ? 'Enviando...' : 'Enviar código'}
                </Button>
            </form>
        </div>
    );
}

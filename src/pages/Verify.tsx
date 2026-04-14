import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { verifyOtp, sendOtp } from '../lib/auth';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

type VerifyState = { email: string; from?: string };

export default function Verify() {
    const navigate = useNavigate();
    const location = useLocation();
    const state = (location.state ?? {}) as VerifyState;

    const email = state.email;
    const from = state.from ?? sessionStorage.getItem('asadito_from') ?? '/';

    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!email) {
        return (
            <div style={{ padding: 16 }}>
                <p>Falta el correo. Regresa a iniciar sesión.</p>
                <Button onClick={() => navigate('/login')}>Ir a Login</Button>
            </div>
        );
    }

    async function onVerify(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        const token = code.trim();
        if (token.length < 6) {
            setError('Ingresa el código de 6 dígitos.');
            return;
        }

        setLoading(true);
        try {
            await verifyOtp(email, token);
            sessionStorage.removeItem('asadito_from');
            navigate(from, { replace: true });
        } catch (err: any) {
            setError(err?.message ?? 'Código inválido o expirado.');
        } finally {
            setLoading(false);
        }
    }

    async function onResend() {
        setError(null);
        setResending(true);
        try {
            await sendOtp(email);
        } catch (err: any) {
            setError(err?.message ?? 'No se pudo reenviar el código.');
        } finally {
            setResending(false);
        }
    }

    return (
        <div style={{ padding: 16, maxWidth: 420, margin: '0 auto' }}>
            <h2>Verifica tu correo</h2>
            <p style={{ marginTop: 0, opacity: 0.75 }}>
                Enviamos un código a <strong>{email}</strong>.
            </p>

            <form onSubmit={onVerify} style={{ display: 'grid', gap: 10 }}>
                <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Código (6 dígitos)"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    error={error ?? undefined}
                />

                <Button variant="primary" full disabled={loading}>
                    {loading ? 'Verificando...' : 'Entrar'}
                </Button>

                <Button type="button" full onClick={onResend} disabled={resending}>
                    {resending ? 'Reenviando...' : 'Reenviar código'}
                </Button>
            </form>
        </div>
    );
}

import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CATEGORIES } from '../constants/categories';
import type { Category } from '../constants/categories';
import type { ItemRow, ItemStatus } from '../types/db';
import { useEventItems } from '../hooks/useEventItems';
import { addItem, deleteItem, updateItemStatus } from '../lib/items';
import { createInvite } from '../lib/invites';
import { useEventExpenses } from '../hooks/useEventExpenses';
import { addExpense, deleteExpense } from '../lib/expenses';
import { useProfiles } from '../hooks/useProfiles';



function nextStatus(s: ItemStatus): ItemStatus {
    if (s === 'pending') return 'bought';
    if (s === 'bought') return 'delivered';
    return 'pending';
}

function statusLabel(s: ItemStatus) {
    if (s === 'pending') return 'Pendiente';
    if (s === 'bought') return 'Comprado';
    return 'Listo';
}

export default function EventDetail() {
    const { id } = useParams();
    const eventId = String(id);
    const navigate = useNavigate();

    const { items, loading } = useEventItems(eventId);

    const [name, setName] = useState('');
    const [category, setCategory] = useState<Category>(CATEGORIES[0]);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const [inviteUrl, setInviteUrl] = useState<string | null>(null);
    const [inviteLoading, setInviteLoading] = useState(false);

    const { expenses, total } = useEventExpenses(eventId);
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');

    const byUser = useMemo(() => {
        const map = new Map<string, number>();
        for (const e of expenses) {
            map.set(e.paid_by, (map.get(e.paid_by) ?? 0) + Number(e.amount));
        }
        return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    }, [expenses]);

    const userIds = useMemo(() => expenses.map(e => e.paid_by), [expenses]);
    const profiles = useProfiles(userIds);

    const grouped = useMemo(() => {
        const map: Record<string, ItemRow[]> = {};
        for (const it of items) (map[it.category] ??= []).push(it);
        return map;
    }, [items]);

    async function onAdd() {
        setErr(null);
        const clean = name.trim();
        if (!clean) return;

        setSaving(true);
        try {
            await addItem({ event_id: eventId, name: clean, category });
            setName('');
        } catch (e: any) {
            setErr(e?.message ?? 'No se pudo agregar.');
        } finally {
            setSaving(false);
        }
    }

    async function onToggle(it: ItemRow) {
        setErr(null);
        try {
            await updateItemStatus(it.id, nextStatus(it.status));
        } catch (e: any) {
            setErr(e?.message ?? 'No se pudo actualizar.');
        }
    }

    async function onDelete(it: ItemRow) {
        setErr(null);
        try {
            await deleteItem(it.id);
        } catch (e: any) {
            setErr(e?.message ?? 'No se pudo borrar.');
        }
    }

    async function onCreateInvite() {
        setErr(null);
        setInviteLoading(true);
        try {
            const inv = await createInvite(eventId, 1440); // 24h
            const url = `${window.location.origin}/join/${inv.code}`;
            setInviteUrl(url);

            // Copiar al portapapeles (puede fallar en algunos contextos; no lo tratamos como fatal)
            try {
                await navigator.clipboard.writeText(url);
            } catch {
                // no-op
            }
        } catch (e: any) {
            setErr(e?.message ?? 'No se pudo generar invitación.');
        } finally {
            setInviteLoading(false);
        }
    }

    return (
        <div style={{ padding: 16, maxWidth: 820, margin: '0 auto' }}>
            <button
                onClick={() => navigate('/')}
                style={{ padding: 10, borderRadius: 10, border: '1px solid #ccc' }}
            >
                ← Volver
            </button>

            <h2 style={{ marginTop: 14, marginBottom: 8 }}>Checklist</h2>

            <div style={{ opacity: 0.75, marginBottom: 12 }}>
                Evento: <code>{eventId}</code>
            </div>

            {/* Invites */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                <button
                    onClick={onCreateInvite}
                    disabled={inviteLoading}
                    style={{ padding: 10, borderRadius: 10, border: '1px solid #000', fontWeight: 800 }}
                >
                    {inviteLoading ? 'Generando...' : 'Generar invitación'}
                </button>

                {inviteUrl && (
                    <div style={{ opacity: 0.85, wordBreak: 'break-all' }}>
                        Link{'\u00A0'}
                        {inviteUrl ? (
                            <>
                                (copiado si tu navegador lo permitió): <code>{inviteUrl}</code>
                            </>
                        ) : null}
                    </div>
                )}
            </div>

            <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Tortillas, carbón, salsa..."
                    style={{ padding: 12, borderRadius: 10, border: '1px solid #ccc' }}
                />

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {CATEGORIES.map((c) => (
                        <button
                            key={c}
                            onClick={() => setCategory(c)}
                            style={{
                                padding: '10px 12px',
                                borderRadius: 999,
                                border: '1px solid #ccc',
                                fontWeight: 700,
                                opacity: category === c ? 1 : 0.55,
                            }}
                        >
                            {c}
                        </button>
                    ))}
                </div>

                <button
                    onClick={onAdd}
                    disabled={saving}
                    style={{ padding: 12, borderRadius: 10, border: '1px solid #000', fontWeight: 700 }}
                >
                    {saving ? 'Agregando...' : 'Agregar'}
                </button>

                {err && <div style={{ color: 'crimson' }}>{err}</div>}
            </div>

            {loading && <div>Cargando lista...</div>}

            <div style={{ display: 'grid', gap: 14 }}>
                {CATEGORIES.filter((c) => (grouped[c] ?? []).length > 0).map((cat) => (
                    <div key={cat} style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
                        <div style={{ fontWeight: 800, marginBottom: 8 }}>{cat}</div>

                        <div style={{ display: 'grid', gap: 8 }}>
                            {(grouped[cat] ?? []).map((it) => (
                                <div
                                    key={it.id}
                                    style={{
                                        border: '1px solid #ddd',
                                        borderRadius: 12,
                                        padding: 10,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 10,
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 800 }}>{it.name}</div>
                                        <div style={{ opacity: 0.75 }}>Estatus: {statusLabel(it.status)}</div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button
                                            onClick={() => onToggle(it)}
                                            style={{
                                                padding: '10px 12px',
                                                borderRadius: 10,
                                                border: '1px solid #000',
                                                fontWeight: 700,
                                            }}
                                        >
                                            Cambiar
                                        </button>
                                        <button
                                            onClick={() => onDelete(it)}
                                            style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #ccc' }}
                                        >
                                            Borrar
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {items.length === 0 && !loading && (
                    <div style={{ opacity: 0.75 }}>
                        Aún no hay cosas en la lista. Agrega la primera (ej. carbón).
                    </div>
                )}
            </div>

            <hr style={{ margin: '24px 0' }} />
            <h3>Gastos</h3>

            <div style={{ display: 'grid', gap: 10, maxWidth: 320 }}>
                <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Monto"
                    inputMode="decimal"
                    style={{ padding: 10 }}
                />
                <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Nota (ej. Carbón)"
                    style={{ padding: 10 }}
                />
                <button
                    onClick={async () => {
                        await addExpense(eventId, Number(amount), note);
                        setAmount('');
                        setNote('');
                    }}
                >
                    Agregar gasto
                </button>
            </div>

            <p><strong>Total:</strong> ${total.toFixed(2)}</p>

            <hr style={{ margin: '16px 0' }} />

            <h4>¿Quién ha puesto cuánto?</h4>

            <div style={{ display: 'grid', gap: 8 }}>
                {byUser.map(([uid, amt]) => (
                    <div
                        key={uid}
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            border: '1px solid #eee',
                            borderRadius: 8,
                        }}
                    >
                        <span style={{ fontWeight: 600 }}>
                            {profiles[uid]?.display_name
                                ?? profiles[uid]?.email
                                ?? `Usuario ${uid.slice(0, 6)}`}
                        </span>

                        <span style={{ fontWeight: 700 }}>
                            ${amt.toFixed(2)}
                        </span>
                    </div>
                ))}

                {byUser.length === 0 && (
                    <div style={{ opacity: 0.7 }}>
                        Aún no hay gastos registrados.
                    </div>
                )}
            </div>

            <ul>
                {expenses.map((e) => (
                    <li key={e.id}>
                        ${e.amount} — {e.note ?? 'Sin nota'}
                        <button onClick={() => deleteExpense(e.id)}>✕</button>
                    </li>
                ))}
            </ul>


            <hr style={{ margin: '18px 0' }} />
            <div style={{ opacity: 0.75 }}>
                Tip: usa “Generar invitación” y abre el link con otro usuario (en incógnito) para que se una y vea la lista.
            </div>
        </div>
    );
}

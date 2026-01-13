import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CATEGORIES } from '../constants/categories';
import type { Category } from '../constants/categories';
import type { ItemRow, ItemStatus } from '../types/db';
import { useEventItems } from '../hooks/useEventItems';
import { addItem, deleteItem, updateItemStatus } from '../lib/items';
import { useEvent } from '../hooks/useEvent';
import { buildRecommendations, formatRecAmount } from '../lib/recommendations';
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

type Transfer = { from: string; to: string; amount: number };

export default function EventDetail() {
    const { id } = useParams();
    const eventId = id ?? '';
    const navigate = useNavigate();

    if (!eventId) {
        return (
            <div style={{ padding: 16 }}>
                <p>Evento inválido.</p>
                <button onClick={() => navigate('/')} style={{ padding: 10, borderRadius: 10, border: '1px solid #ccc' }}>
                    Ir a eventos
                </button>
            </div>
        );
    }

    // Event meta (adult/minors)
    const { event } = useEvent(eventId);

    const recs = useMemo(() => {
        const a = event?.adults_count ?? 0;
        const m = event?.minors_count ?? 0;
        return buildRecommendations(a, m);
    }, [event?.adults_count, event?.minors_count]);

    // Items
    const { items, loading } = useEventItems(eventId);

    const [name, setName] = useState('');
    const [category, setCategory] = useState<Category>(CATEGORIES[0]);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    // Invites
    const [inviteUrl, setInviteUrl] = useState<string | null>(null);
    const [inviteLoading, setInviteLoading] = useState(false);

    // Expenses
    const { expenses, total } = useEventExpenses(eventId);
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [expenseErr, setExpenseErr] = useState<string | null>(null);
    const [expenseSaving, setExpenseSaving] = useState(false);

    const grouped = useMemo(() => {
        const map: Record<string, ItemRow[]> = {};
        for (const it of items) (map[it.category] ??= []).push(it);
        return map;
    }, [items]);

    const byUser = useMemo(() => {
        const map = new Map<string, number>();
        for (const e of expenses) {
            map.set(e.paid_by, (map.get(e.paid_by) ?? 0) + Number(e.amount));
        }
        return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    }, [expenses]);

    const balances = useMemo(() => {
        if (byUser.length === 0) return [];
        const perPerson = total / byUser.length;

        return byUser.map(([uid, amt]) => ({
            uid,
            paid: amt,
            diff: amt - perPerson,
        }));
    }, [byUser, total]);

    const transfers = useMemo<Transfer[]>(() => {
        if (byUser.length === 0) return [];

        const perPerson = total / byUser.length;
        const round2 = (n: number) => Math.round(n * 100) / 100;

        const creditors: Array<{ uid: string; amt: number }> = [];
        const debtors: Array<{ uid: string; amt: number }> = [];

        for (const [uid, paid] of byUser) {
            const diff = round2(paid - perPerson);
            if (diff > 0.009) creditors.push({ uid, amt: diff });
            else if (diff < -0.009) debtors.push({ uid, amt: -diff });
        }

        creditors.sort((a, b) => b.amt - a.amt);
        debtors.sort((a, b) => b.amt - a.amt);

        const out: Transfer[] = [];
        let i = 0;
        let j = 0;

        while (i < debtors.length && j < creditors.length) {
            const d = debtors[i];
            const c = creditors[j];

            const pay = Math.min(d.amt, c.amt);
            if (pay > 0.009) {
                out.push({ from: d.uid, to: c.uid, amount: round2(pay) });
                d.amt = round2(d.amt - pay);
                c.amt = round2(c.amt - pay);
            }

            if (d.amt <= 0.009) i++;
            if (c.amt <= 0.009) j++;
        }

        return out;
    }, [byUser, total]);

    const userIds = useMemo(() => {
        const set = new Set<string>();
        for (const e of expenses) set.add(e.paid_by);
        return Array.from(set);
    }, [expenses]);

    const profiles = useProfiles(userIds);

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

    async function onAddExpense() {
        setExpenseErr(null);

        const amt = Number(amount);
        const cleanNote = note.trim();

        if (!Number.isFinite(amt) || amt <= 0) {
            setExpenseErr('Ingresa un monto válido.');
            return;
        }

        setExpenseSaving(true);
        try {
            await addExpense(eventId, amt, cleanNote || undefined);
            setAmount('');
            setNote('');
        } catch (e: any) {
            setExpenseErr(e?.message ?? 'No se pudo agregar el gasto.');
        } finally {
            setExpenseSaving(false);
        }
    }

    return (
        <div style={{ padding: 16, maxWidth: 820, margin: '0 auto' }}>
            <button onClick={() => navigate('/')} style={{ padding: 10, borderRadius: 10, border: '1px solid #ccc' }}>
                ← Volver
            </button>

            <h2 style={{ marginTop: 14, marginBottom: 8 }}>Checklist</h2>

            <div style={{ opacity: 0.75, marginBottom: 12 }}>
                Evento: <code>{eventId}</code>
            </div>

            {/* Recomendación (Iteración 1) */}
            {event && (
                <div style={{ border: '1px solid #eee', borderRadius: 12, padding: 12, marginBottom: 14 }}>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Recomendación</div>
                    <div style={{ opacity: 0.8, marginBottom: 10 }}>
                        Para <strong>{event.adults_count}</strong> adultos y <strong>{event.minors_count}</strong> menores
                    </div>

                    <div style={{ display: 'grid', gap: 8 }}>
                        {recs.map((r) => (
                            <div
                                key={r.key}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    border: '1px solid #eee',
                                    borderRadius: 10,
                                    padding: '8px 10px',
                                }}
                            >
                                <span style={{ fontWeight: 700 }}>{r.label}</span>
                                <span style={{ fontWeight: 800 }}>
                                    {formatRecAmount(r.target, r.unit)} {r.unit}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

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
                        Link (copiado si tu navegador lo permitió): <code>{inviteUrl}</code>
                    </div>
                )}
            </div>

            {/* Add item */}
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
                                            style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #000', fontWeight: 700 }}
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
                    <div style={{ opacity: 0.75 }}>Aún no hay cosas en la lista. Agrega la primera (ej. carbón).</div>
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
                    style={{ padding: 10, borderRadius: 10, border: '1px solid #ccc' }}
                />
                <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Nota (ej. Carbón)"
                    style={{ padding: 10, borderRadius: 10, border: '1px solid #ccc' }}
                />
                <button
                    onClick={onAddExpense}
                    disabled={expenseSaving}
                    style={{ padding: 12, borderRadius: 10, border: '1px solid #000', fontWeight: 800 }}
                >
                    {expenseSaving ? 'Agregando...' : 'Agregar gasto'}
                </button>
                {expenseErr && <div style={{ color: 'crimson' }}>{expenseErr}</div>}
            </div>

            <p>
                <strong>Total:</strong> ${total.toFixed(2)}
            </p>

            <hr style={{ margin: '16px 0' }} />
            <h4>Balance</h4>

            <div style={{ display: 'grid', gap: 8 }}>
                {balances.map(({ uid, diff }) => {
                    if (Math.abs(diff) < 0.01) return null;

                    const label = profiles[uid]?.display_name?.trim()
                        ? profiles[uid]!.display_name!
                        : `Invitado ${uid.slice(0, 4)}`;

                    return (
                        <div
                            key={uid}
                            style={{
                                padding: '8px 10px',
                                border: '1px solid #eee',
                                borderRadius: 8,
                                background: diff > 0 ? '#f0fff4' : '#fff5f5',
                                color: diff > 0 ? '#046c4e' : '#7f1d1d',
                            }}
                        >
                            {diff > 0 ? (
                                <>
                                    <strong>{label}</strong> recibe <strong>${diff.toFixed(2)}</strong>
                                </>
                            ) : (
                                <>
                                    {label} debe <strong>${Math.abs(diff).toFixed(2)}</strong>
                                </>
                            )}
                        </div>
                    );
                })}

                {balances.every((b) => Math.abs(b.diff) < 0.01) && <div style={{ opacity: 0.7 }}>Todos están parejos.</div>}
            </div>

            <hr style={{ margin: '16px 0' }} />
            <h4>¿Quién le paga a quién?</h4>

            <div style={{ display: 'grid', gap: 8 }}>
                {transfers.map((t, idx) => {
                    if (t.from === t.to) return null;

                    const fromName = profiles[t.from]?.display_name?.trim()
                        ? profiles[t.from]!.display_name!
                        : `Invitado ${t.from.slice(0, 4)}`;

                    const toName = profiles[t.to]?.display_name?.trim()
                        ? profiles[t.to]!.display_name!
                        : `Invitado ${t.to.slice(0, 4)}`;

                    return (
                        <div
                            key={`${t.from}-${t.to}-${idx}`}
                            style={{
                                padding: '10px 12px',
                                border: '1px solid #eee',
                                borderRadius: 10,
                                display: 'flex',
                                justifyContent: 'space-between',
                                gap: 10,
                            }}
                        >
                            <span style={{ fontWeight: 700 }}>
                                {fromName} <span style={{ opacity: 0.7, fontWeight: 600 }}>paga a</span> {toName}
                            </span>
                            <span style={{ fontWeight: 800 }}>${t.amount.toFixed(2)}</span>
                        </div>
                    );
                })}

                {transfers.length === 0 && <div style={{ opacity: 0.7 }}>Todo parejo. Nadie le debe a nadie.</div>}
            </div>

            <hr style={{ margin: '16px 0' }} />
            <h4>Desglose de Gastos</h4>

            <div style={{ display: 'grid', gap: 8 }}>
                {byUser.map(([uid, amt]) => {
                    const label = profiles[uid]?.display_name?.trim()
                        ? profiles[uid]!.display_name!
                        : `Invitado ${uid.slice(0, 4)}`;

                    return (
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
                            <span style={{ fontWeight: 600 }}>{label}</span>
                            <span style={{ fontWeight: 700 }}>${amt.toFixed(2)}</span>
                        </div>
                    );
                })}

                {byUser.length === 0 && <div style={{ opacity: 0.7 }}>Aún no hay gastos registrados.</div>}
            </div>

            <ul>
                {expenses.map((e) => (
                    <li key={e.id}>
                        ${Number(e.amount).toFixed(2)} — {e.note ?? 'Sin nota'}{' '}
                        <button onClick={() => deleteExpense(e.id)} style={{ marginLeft: 8 }}>
                            ✕
                        </button>
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

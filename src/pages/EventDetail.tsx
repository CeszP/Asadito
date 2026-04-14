import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CATEGORIES } from '../constants/categories';
import type { Category } from '../constants/categories';
import type { ItemRow, ItemStatus } from '../types/db';
import { useEventItems } from '../hooks/useEventItems';
import { addItem, deleteItem, updateItemStatus, updateItemName } from '../lib/items';
import { useEvent } from '../hooks/useEvent';
import { buildRecommendations, formatRecAmount, REC_TO_CATEGORY } from '../lib/recommendations';
import { SUGGESTED_CUTS } from '../constants/suggestedCuts';
import { createInvite } from '../lib/invites';
import { useEventExpenses } from '../hooks/useEventExpenses';
import { addExpense, deleteExpense } from '../lib/expenses';
import { updateEvent, deleteEvent } from '../lib/events';
import { useProfiles } from '../hooks/useProfiles';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Loading } from '../components/Loading';

// ─── Helpers ────────────────────────────────────────────────

function nextStatus(s: ItemStatus): ItemStatus {
    if (s === 'pending') return 'bought';
    if (s === 'bought') return 'delivered';
    return 'pending';
}

function statusLabel(s: ItemStatus) {
    if (s === 'pending') return 'Pendiente';
    if (s === 'bought') return 'Comprado';
    return 'Listo ✓';
}

function nextStatusLabel(s: ItemStatus) {
    if (s === 'pending') return 'Marcar comprado';
    if (s === 'bought') return 'Marcar listo';
    return 'Reabrir';
}

function statusStyle(s: ItemStatus): React.CSSProperties {
    if (s === 'delivered') return { opacity: 0.55, textDecoration: 'line-through' };
    return {};
}

function formatEventDate(dateStr: string | null): string | null {
    if (!dateStr) return null;
    try {
        return new Intl.DateTimeFormat('es-MX', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'UTC',
        }).format(new Date(dateStr));
    } catch {
        return null;
    }
}

type Transfer = { from: string; to: string; amount: number };

// ─── Component ──────────────────────────────────────────────

export default function EventDetail() {
    const { id } = useParams();
    const eventId = id ?? '';
    const navigate = useNavigate();

    // All hooks at the top (no conditional hook calls)
    const { session } = useAuth();
    const { event, loading: eventLoading } = useEvent(eventId);
    const { items, loading: itemsLoading } = useEventItems(eventId);
    const { expenses, total } = useEventExpenses(eventId);

    const [name, setName] = useState('');
    const [qty, setQty] = useState('');
    const [unit, setUnit] = useState<'kg' | 'pz' | 'l' | ''>('');
    const [isHomemade, setIsHomemade] = useState(false);
    const [category, setCategory] = useState<Category>(CATEGORIES[0]);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const nameInputRef = useRef<HTMLInputElement>(null);

    // Sugerencias de cortes expandidas
    const [expandedRec, setExpandedRec] = useState<string | null>(null);

    const [inviteUrl, setInviteUrl] = useState<string | null>(null);
    const [inviteLoading, setInviteLoading] = useState(false);

    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [expenseErr, setExpenseErr] = useState<string | null>(null);
    const [expenseSaving, setExpenseSaving] = useState(false);

    // Editar título del evento
    const [localTitle, setLocalTitle] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState(false);
    const [editTitle, setEditTitle] = useState('');

    // Editar ítem inline
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editingItemName, setEditingItemName] = useState('');

    // Filtro de ítems
    const [statusFilter, setStatusFilter] = useState<ItemStatus | 'all'>('all');

    // Eliminar evento
    const [deletingEvent, setDeletingEvent] = useState(false);

    // Owner detection
    const isOwner = !!session && !!event && event.created_by === session.user.id;

    // Filtered + grouped items
    const filteredItems = useMemo(() => {
        if (statusFilter === 'all') return items;
        return items.filter((it) => it.status === statusFilter);
    }, [items, statusFilter]);

    const statusCounts = useMemo(() => ({
        all: items.length,
        pending: items.filter((it) => it.status === 'pending').length,
        bought: items.filter((it) => it.status === 'bought').length,
        delivered: items.filter((it) => it.status === 'delivered').length,
    }), [items]);

    const grouped = useMemo(() => {
        const map: Record<string, ItemRow[]> = {};
        for (const it of filteredItems) (map[it.category] ??= []).push(it);
        return map;
    }, [filteredItems]);

    // Static recommendations
    const recs = useMemo(() => {
        const a = event?.adults_count ?? 0;
        const m = event?.minors_count ?? 0;
        return buildRecommendations(a, m);
    }, [event?.adults_count, event?.minors_count]);

    // Progress: sum of item qty per category+unit combination
    const itemQtyByCategory = useMemo(() => {
        const map: Record<string, number> = {};
        for (const it of items) {
            if (it.qty && it.unit) {
                const key = `${it.category}:${it.unit}`;
                map[key] = (map[key] ?? 0) + it.qty;
            }
        }
        return map;
    }, [items]);

    const recProgress = useMemo(() => {
        const map: Record<string, number> = {};
        for (const r of recs) {
            const cat = REC_TO_CATEGORY[r.key];
            map[r.key] = itemQtyByCategory[`${cat}:${r.unit}`] ?? 0;
        }
        return map;
    }, [recs, itemQtyByCategory]);

    // Categories that have a default recommendation
    const defaultRecCategories = useMemo(
        () => new Set(Object.values(REC_TO_CATEGORY)),
        []
    );

    // Items marked as "hecho en casa" grouped by category
    const homemadeByCategory = useMemo(() => {
        const map: Record<string, boolean> = {};
        for (const it of items) {
            if (it.is_homemade) map[it.category] = true;
        }
        return map;
    }, [items]);

    // Items outside default rec categories that have qty+unit (shown as "Personalizados")
    const customPlanItems = useMemo(() =>
        items.filter(it => !defaultRecCategories.has(it.category) && it.qty != null && it.unit),
        [items, defaultRecCategories]
    );

    // Expenses breakdown
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
        return byUser.map(([uid, amt]) => ({ uid, paid: amt, diff: amt - perPerson }));
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

    // ─── Handlers ───────────────────────────────────────────

    function prefillFromRec(r: { key: string; label: string; unit: 'kg' | 'pz' | 'l'; target: number }) {
        const assigned = recProgress[r.key] ?? 0;
        const rawRemaining = Math.max(0, Math.round((r.target - assigned) * 100) / 100);
        const remaining = r.unit === 'pz' ? Math.round(rawRemaining) : rawRemaining;
        const cat = REC_TO_CATEGORY[r.key] as Category | undefined;
        if (cat && CATEGORIES.includes(cat as Category)) setCategory(cat as Category);
        setQty(remaining > 0 ? String(remaining) : '');
        setUnit(r.unit);
        setIsHomemade(false);
        setName(r.label);
        setExpandedRec(null);
        setTimeout(() => {
            nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            nameInputRef.current?.focus();
            nameInputRef.current?.select();
        }, 50);
    }

    async function quickAdd(recKey: string, cutName: string, cutQty: number, cutUnit: string) {
        const cat = REC_TO_CATEGORY[recKey] as Category;
        setErr(null);
        try {
            await addItem({
                event_id: eventId,
                name: cutName,
                category: cat,
                qty: cutQty,
                unit: cutUnit,
            });
            setExpandedRec(null);
        } catch (e: any) {
            setErr(e?.message ?? 'No se pudo agregar.');
        }
    }

    async function onAdd() {
        setErr(null);
        const clean = name.trim();
        if (!clean) return;
        setSaving(true);
        try {
            await addItem({
                event_id: eventId,
                name: clean,
                category,
                qty: qty ? Number(qty) : null,
                unit: unit || null,
                is_homemade: isHomemade,
            });
            setName('');
            setQty('');
            setUnit('');
            setIsHomemade(false);
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
            const inv = await createInvite(eventId, 1440);
            const url = `${window.location.origin}/join/${inv.code}`;
            setInviteUrl(url);
            try { await navigator.clipboard.writeText(url); } catch { /* no-op */ }
        } catch (e: any) {
            setErr(e?.message ?? 'No se pudo generar invitación.');
        } finally {
            setInviteLoading(false);
        }
    }

    async function onSaveTitle() {
        const clean = editTitle.trim();
        if (!clean) return;
        try {
            await updateEvent(eventId, { title: clean });
            setLocalTitle(clean);
            setEditingTitle(false);
        } catch (e: any) {
            setErr(e?.message ?? 'No se pudo renombrar el evento.');
        }
    }

    async function onSaveItemName(it: ItemRow) {
        const clean = editingItemName.trim();
        if (!clean || clean === it.name) { setEditingItemId(null); return; }
        try {
            await updateItemName(it.id, clean);
            setEditingItemId(null);
        } catch (e: any) {
            setErr(e?.message ?? 'No se pudo renombrar el ítem.');
        }
    }

    async function onDeleteEvent() {
        if (!window.confirm('¿Eliminar este evento? Esta acción no se puede deshacer.')) return;
        setDeletingEvent(true);
        try {
            await deleteEvent(eventId);
            navigate('/');
        } catch (e: any) {
            setErr(e?.message ?? 'No se pudo eliminar el evento.');
            setDeletingEvent(false);
        }
    }

    async function onAddExpense() {
        setExpenseErr(null);
        const amt = Number(amount);
        if (!Number.isFinite(amt) || amt <= 0) {
            setExpenseErr('Ingresa un monto válido.');
            return;
        }
        setExpenseSaving(true);
        try {
            await addExpense(eventId, amt, note.trim() || undefined);
            setAmount('');
            setNote('');
        } catch (e: any) {
            setExpenseErr(e?.message ?? 'No se pudo agregar el gasto.');
        } finally {
            setExpenseSaving(false);
        }
    }

    // ─── Guard ───────────────────────────────────────────────

    if (!eventId) {
        return (
            <div style={{ padding: 16 }}>
                <p>Evento inválido.</p>
                <Button onClick={() => navigate('/')}>Ir a eventos</Button>
            </div>
        );
    }

    const displayName = (uid: string) =>
        profiles[uid]?.display_name?.trim() || `Invitado ${uid.slice(0, 4)}`;

    // ─── Render ──────────────────────────────────────────────

    return (
        <div style={{ padding: 16, maxWidth: 820, margin: '0 auto' }}>

            {/* ── Header del evento ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <Button variant="ghost" onClick={() => navigate('/')}>← Volver</Button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {inviteUrl && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem' }}>
                            <span style={{ color: '#059669', fontWeight: 600 }}>✓ Link copiado</span>
                            <button
                                className="btn btn--sm"
                                style={{ fontSize: '0.82rem' }}
                                onClick={() => navigator.clipboard.writeText(inviteUrl).catch(() => {})}
                            >
                                Copiar de nuevo
                            </button>
                        </div>
                    )}
                    <Button size="sm" onClick={onCreateInvite} disabled={inviteLoading}>
                        {inviteLoading ? 'Generando...' : 'Invitar'}
                    </Button>
                </div>
            </div>

            <div style={{ marginTop: 10, marginBottom: 20 }}>
                {eventLoading ? (
                    <Loading text="Cargando evento..." />
                ) : (
                    <>
                        {editingTitle ? (
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                                <Input
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') onSaveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
                                    autoFocus
                                    style={{ minWidth: 200 }}
                                />
                                <Button size="sm" variant="primary" onClick={onSaveTitle}>Guardar</Button>
                                <Button size="sm" onClick={() => setEditingTitle(false)}>Cancelar</Button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <h2 style={{ margin: 0 }}>
                                    {localTitle ?? event?.title ?? 'Evento'}
                                </h2>
                                {isOwner && <span className="badge">Organizador</span>}
                                {isOwner && (
                                    <Button size="sm" variant="ghost" onClick={() => { setEditTitle(localTitle ?? event?.title ?? ''); setEditingTitle(true); }}>
                                        ✏️ Renombrar
                                    </Button>
                                )}
                            </div>
                        )}
                        <div className="event-meta">
                            {event?.adults_count ?? 0} adultos · {event?.minors_count ?? 0} menores
                        </div>
                        {event?.event_datetime && (
                            <div className="event-meta">🗓 {formatEventDate(event.event_datetime)}</div>
                        )}
                        {event?.location_text && (
                            <div className="event-meta">📍 {event.location_text}</div>
                        )}
                        {isOwner && (
                            <Button
                                size="sm" variant="danger"
                                style={{ marginTop: 10 }}
                                onClick={onDeleteEvent}
                                disabled={deletingEvent}
                            >
                                {deletingEvent ? 'Eliminando...' : 'Eliminar evento'}
                            </Button>
                        )}
                    </>
                )}
            </div>

            {/* ── Recomendación estática ── */}
            {event && (
                <div className="card" style={{ marginBottom: 14 }}>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>Cantidades sugeridas</div>
                    <div className="event-meta" style={{ marginBottom: 10 }}>
                        Para {event.adults_count} adultos y {event.minors_count} menores
                    </div>
                    <div style={{ display: 'grid', gap: 6 }}>
                        {recs.map((r) => {
                            const assigned = recProgress[r.key] ?? 0;
                            const remaining = Math.max(0, Math.round((r.target - assigned) * 100) / 100);
                            const cat = REC_TO_CATEGORY[r.key];
                            const isHM = homemadeByCategory[cat] ?? false;
                            const covered = isHM || (assigned > 0 && remaining < 0.01);
                            const cuts = SUGGESTED_CUTS[r.key];
                            const isExpanded = expandedRec === r.key;

                            return (
                                <div
                                    key={r.key}
                                    style={{
                                        padding: '8px 10px',
                                        borderRadius: 8,
                                        border: `1px solid ${covered ? 'rgba(5,150,105,0.4)' : 'var(--color-card-border)'}`,
                                        background: covered ? 'rgba(5,150,105,0.06)' : undefined,
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 600 }}>{r.label}</span>
                                        <span style={{ fontWeight: 700 }}>
                                            {formatRecAmount(r.target, r.unit)} {r.unit}
                                        </span>
                                    </div>

                                    {/* Progreso */}
                                    {(assigned > 0 || isHM) && (
                                        <div style={{ fontSize: '0.82rem', marginTop: 3, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                            {isHM
                                                ? <span style={{ color: '#059669', fontWeight: 600 }}>✓ Hecho en casa</span>
                                                : <>
                                                    <span style={{ opacity: 0.7 }}>
                                                        En lista: <strong>{formatRecAmount(assigned, r.unit)} {r.unit}</strong>
                                                    </span>
                                                    {covered
                                                        ? <span style={{ color: '#059669', fontWeight: 600 }}>✓ Cubierto</span>
                                                        : <span style={{ color: 'var(--color-danger)' }}>
                                                            Falta: <strong>{formatRecAmount(remaining, r.unit)} {r.unit}</strong>
                                                          </span>
                                                    }
                                                </>
                                            }
                                        </div>
                                    )}

                                    {/* Botón agregar / toggle cortes */}
                                    <Button
                                        size="sm" variant="ghost"
                                        style={{ marginTop: 4, fontSize: '0.82rem' }}
                                        onClick={() => cuts
                                            ? setExpandedRec(isExpanded ? null : r.key)
                                            : prefillFromRec(r)
                                        }
                                    >
                                        {cuts ? (isExpanded ? '▲ Cerrar' : '+ Agregar al plan') : '+ Agregar al plan'}
                                    </Button>

                                    {/* Panel de cortes sugeridos */}
                                    {isExpanded && cuts && (
                                        <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                                            <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: 2 }}>
                                                Sugerencias ({formatRecAmount(remaining, r.unit)} {r.unit} restantes):
                                            </div>
                                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                {cuts.map((cut) => {
                                                    const base = remaining > 0 ? remaining : r.target;
                                                    const rawCutQty = Math.round(cut.pct * base * 100) / 100;
                                                    const cutQty = Math.max(r.unit === 'pz' ? 1 : 0.01, r.unit === 'pz' ? Math.round(rawCutQty) : rawCutQty);
                                                    return (
                                                        <button
                                                            key={cut.name}
                                                            className="btn btn--sm"
                                                            style={{ borderRadius: 999, fontSize: '0.82rem' }}
                                                            onClick={() => quickAdd(r.key, cut.name, cutQty, r.unit)}
                                                        >
                                                            + {cut.name} ({formatRecAmount(cutQty, r.unit)} {r.unit})
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <Button
                                                size="sm" variant="ghost"
                                                style={{ fontSize: '0.82rem', paddingLeft: 0 }}
                                                onClick={() => prefillFromRec(r)}
                                            >
                                                Otro / personalizado →
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Personalizados: ítems de Bebidas/Extras con qty */}
                        {customPlanItems.length > 0 && (
                            <>
                                <div style={{ fontSize: '0.8rem', opacity: 0.55, marginTop: 4, marginBottom: 2, fontWeight: 600 }}>
                                    PERSONALIZADOS
                                </div>
                                {customPlanItems.map((it) => {
                                    const done = it.status === 'delivered' || it.status === 'bought' || it.is_homemade;
                                    return (
                                        <div
                                            key={it.id}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '8px 10px',
                                                borderRadius: 8,
                                                border: `1px solid ${done ? 'rgba(5,150,105,0.4)' : 'var(--color-card-border)'}`,
                                                background: done ? 'rgba(5,150,105,0.06)' : undefined,
                                            }}
                                        >
                                            <span style={{ fontWeight: 600 }}>
                                                {it.name}
                                                <span style={{ fontWeight: 400, opacity: 0.65, marginLeft: 6 }}>
                                                    {it.unit === 'pz' ? Math.round(it.qty!) : Number(it.qty).toFixed(2)} {it.unit}
                                                </span>
                                            </span>
                                            {done
                                                ? <span style={{ color: '#059669', fontSize: '0.82rem', fontWeight: 600 }}>
                                                    {it.is_homemade ? '✓ Hecho en casa' : '✓ Cubierto'}
                                                  </span>
                                                : <span style={{ opacity: 0.55, fontSize: '0.82rem' }}>Pendiente</span>
                                            }
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ── Lista de ítems ── */}
            <h3 style={{ marginTop: 28, marginBottom: 14 }}>¿Qué llevamos?</h3>
            <div style={{ display: 'grid', gap: 10, marginBottom: 18 }}>
                <Input
                    ref={nameInputRef}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Diezmillo, arrachera, Coca-Cola..."
                    onKeyDown={(e) => e.key === 'Enter' && onAdd()}
                />
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Input
                        value={qty}
                        onChange={(e) => setQty(e.target.value)}
                        placeholder="Cantidad (opcional)"
                        inputMode="decimal"
                        style={{ flex: 1 }}
                    />
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        {(['kg', 'pz', 'l'] as const).map((u) => (
                            <button
                                key={u}
                                className={`btn btn--sm ${unit === u ? 'btn--primary' : ''}`}
                                style={{ borderRadius: 999, minWidth: 36 }}
                                onClick={() => setUnit(unit === u ? '' : u)}
                            >
                                {u}
                            </button>
                        ))}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {CATEGORIES.map((c) => (
                        <button
                            key={c}
                            onClick={() => setCategory(c)}
                            className="btn btn--sm"
                            style={{
                                borderRadius: 999,
                                opacity: category === c ? 1 : 0.5,
                                fontWeight: category === c ? 700 : 500,
                            }}
                        >
                            {c}
                        </button>
                    ))}
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={isHomemade}
                        onChange={(e) => setIsHomemade(e.target.checked)}
                        style={{ width: 16, height: 16, cursor: 'pointer' }}
                    />
                    Se prepara en casa
                </label>
                <Button variant="primary" onClick={onAdd} disabled={saving}>
                    {saving ? 'Agregando...' : 'Agregar ítem'}
                </Button>
                {err && <div className="msg-error">{err}</div>}
            </div>

            {/* ── Filtro de ítems ── */}
            {!itemsLoading && items.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                    {(['all', 'pending', 'bought', 'delivered'] as const).map((f) => {
                        const labels = { all: 'Todos', pending: 'Pendiente', bought: 'Comprado', delivered: 'Listo' };
                        const count = statusCounts[f];
                        return (
                            <button
                                key={f}
                                className={`btn btn--sm ${statusFilter === f ? 'btn--primary' : ''}`}
                                style={{ borderRadius: 999 }}
                                onClick={() => setStatusFilter(f)}
                            >
                                {labels[f]} {count > 0 && <span style={{ opacity: 0.7 }}>({count})</span>}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ── Lista de ítems ── */}
            {itemsLoading && <Loading text="Cargando lista..." />}

            <div style={{ display: 'grid', gap: 12 }}>
                {CATEGORIES.filter((c) => (grouped[c] ?? []).length > 0).map((cat) => (
                    <div key={cat} className="card">
                        <div style={{ fontWeight: 800, marginBottom: 8 }}>{cat}</div>
                        <div style={{ display: 'grid', gap: 6 }}>
                            {(grouped[cat] ?? []).map((it) => (
                                <div
                                    key={it.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 10,
                                        padding: '8px 10px',
                                        borderRadius: 8,
                                        border: `1px solid ${it.is_homemade ? 'rgba(5,150,105,0.4)' : 'var(--color-card-border)'}`,
                                        background: it.is_homemade ? 'rgba(5,150,105,0.06)' : undefined,
                                        ...(it.is_homemade ? {} : statusStyle(it.status)),
                                    }}
                                >
                                    {editingItemId === it.id ? (
                                        <div style={{ display: 'flex', gap: 6, flex: 1, flexWrap: 'wrap' }}>
                                            <Input
                                                value={editingItemName}
                                                onChange={(e) => setEditingItemName(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') onSaveItemName(it); if (e.key === 'Escape') setEditingItemId(null); }}
                                                autoFocus
                                                style={{ flex: 1, minWidth: 120 }}
                                            />
                                            <Button size="sm" variant="primary" onClick={() => onSaveItemName(it)}>✓</Button>
                                            <Button size="sm" onClick={() => setEditingItemId(null)}>✕</Button>
                                        </div>
                                    ) : (
                                        <div>
                                            <div style={{ fontWeight: 600 }}>
                                                {it.name}
                                                {it.qty != null && it.unit && (
                                                    <span style={{ fontWeight: 400, opacity: 0.65, marginLeft: 6 }}>
                                                        {it.unit === 'pz' ? Math.round(it.qty) : it.qty.toFixed(2)} {it.unit}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.82rem', opacity: 0.7 }}>
                                                {it.is_homemade ? '✓ Hecho en casa' : statusLabel(it.status)}
                                            </div>
                                        </div>
                                    )}
                                    {editingItemId !== it.id && (
                                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                            {!it.is_homemade && (
                                                <Button size="sm" variant="primary" onClick={() => onToggle(it)}>
                                                    {nextStatusLabel(it.status)}
                                                </Button>
                                            )}
                                            {isOwner && (
                                                <Button size="sm" onClick={() => { setEditingItemId(it.id); setEditingItemName(it.name); }}>
                                                    Editar
                                                </Button>
                                            )}
                                            {isOwner && (
                                                <Button size="sm" variant="danger" onClick={() => onDelete(it)}>
                                                    Borrar
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {items.length === 0 && !itemsLoading && (
                    <div style={{ opacity: 0.65 }}>
                        Aún no hay ítems. Agrega el primero (ej. carbón).
                    </div>
                )}
                {items.length > 0 && filteredItems.length === 0 && (
                    <div style={{ opacity: 0.65 }}>
                        No hay ítems con ese filtro.
                    </div>
                )}
            </div>

            <hr style={{ margin: '28px 0', opacity: 0.2 }} />

            {/* ── Gastos ── */}
            <h3 style={{ marginTop: 0 }}>Gastos</h3>

            <div style={{ display: 'grid', gap: 8, maxWidth: 360, marginBottom: 16 }}>
                <Input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Monto"
                    inputMode="decimal"
                />
                <Input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Nota (ej. Carbón, carne...)"
                />
                <Button variant="primary" full onClick={onAddExpense} disabled={expenseSaving}>
                    {expenseSaving ? 'Agregando...' : 'Registrar gasto'}
                </Button>
                {expenseErr && <div className="msg-error">{expenseErr}</div>}
            </div>

            <p style={{ marginBottom: 4 }}>
                <strong>Total:</strong> ${total.toFixed(2)}
            </p>

            {/* Lista de gastos */}
            <div style={{ display: 'grid', gap: 4, marginBottom: 20 }}>
                {expenses.map((e) => (
                    <div
                        key={e.id}
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: '1px solid var(--color-card-border)',
                            gap: 10,
                        }}
                    >
                        <div>
                            <span style={{ fontWeight: 600 }}>{displayName(e.paid_by)}</span>
                            <span style={{ opacity: 0.6 }}> · </span>
                            <strong>${Number(e.amount).toFixed(2)}</strong>
                            {e.note && <span style={{ opacity: 0.7 }}> — {e.note}</span>}
                        </div>
                        {isOwner && (
                            <Button size="sm" variant="danger" onClick={() => deleteExpense(e.id)}>
                                ✕
                            </Button>
                        )}
                    </div>
                ))}
                {expenses.length === 0 && (
                    <div style={{ opacity: 0.65 }}>Aún no hay gastos registrados.</div>
                )}
            </div>

            <hr style={{ margin: '20px 0', opacity: 0.2 }} />

            {/* ── Balance ── */}
            <h4 style={{ marginTop: 0 }}>Balance</h4>
            <div style={{ display: 'grid', gap: 6, marginBottom: 20 }}>
                {balances.map(({ uid, diff }) => {
                    if (Math.abs(diff) < 0.01) return null;
                    return (
                        <div
                            key={uid}
                            style={{
                                padding: '8px 12px',
                                borderRadius: 8,
                                border: '1px solid var(--color-card-border)',
                                background: diff > 0 ? 'rgba(5,150,105,0.08)' : 'rgba(220,38,38,0.08)',
                                color: diff > 0 ? '#059669' : 'var(--color-danger)',
                            }}
                        >
                            {diff > 0 ? (
                                <><strong>{displayName(uid)}</strong> recibe <strong>${diff.toFixed(2)}</strong></>
                            ) : (
                                <>{displayName(uid)} debe <strong>${Math.abs(diff).toFixed(2)}</strong></>
                            )}
                        </div>
                    );
                })}
                {balances.every((b) => Math.abs(b.diff) < 0.01) && (
                    <div style={{ opacity: 0.65 }}>Todos están parejos.</div>
                )}
            </div>

            {/* ── Quién le paga a quién ── */}
            <h4 style={{ marginTop: 0 }}>¿Quién le paga a quién?</h4>
            <div style={{ display: 'grid', gap: 6, marginBottom: 20 }}>
                {transfers.map((t, idx) => {
                    if (t.from === t.to) return null;
                    return (
                        <div
                            key={`${t.from}-${t.to}-${idx}`}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                gap: 10,
                                padding: '10px 12px',
                                borderRadius: 8,
                                border: '1px solid var(--color-card-border)',
                            }}
                        >
                            <span>
                                <strong>{displayName(t.from)}</strong>
                                <span style={{ opacity: 0.65 }}> paga a </span>
                                <strong>{displayName(t.to)}</strong>
                            </span>
                            <span style={{ fontWeight: 700 }}>${t.amount.toFixed(2)}</span>
                        </div>
                    );
                })}
                {transfers.length === 0 && (
                    <div style={{ opacity: 0.65 }}>Todo parejo. Nadie le debe a nadie.</div>
                )}
            </div>

            {/* ── Desglose por persona ── */}
            <h4 style={{ marginTop: 0 }}>Desglose por persona</h4>
            <div style={{ display: 'grid', gap: 6 }}>
                {byUser.map(([uid, amt]) => (
                    <div
                        key={uid}
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: '1px solid var(--color-card-border)',
                        }}
                    >
                        <span>{displayName(uid)}</span>
                        <span style={{ fontWeight: 700 }}>${amt.toFixed(2)}</span>
                    </div>
                ))}
                {byUser.length === 0 && <div style={{ opacity: 0.65 }}>Sin gastos aún.</div>}
            </div>
        </div>
    );
}

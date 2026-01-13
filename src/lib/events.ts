import { supabase } from "./supabase";
import type { EventRow } from "../types/db";

export async function listMyEvents(): Promise<EventRow[]> {
  // Con tu policy events_select_if_member, esto SOLO regresa eventos
  // donde exista event_members para el usuario.
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as EventRow[];
}

export async function createEvent(payload: {
  title: string;
  adults_count: number;
  minors_count: number;
}): Promise<EventRow> {
  const title = payload.title.trim();
  if (!title) throw new Error("Nombre de evento requerido");

  // Necesitamos user_id para insertar event_members
  const { data: sess, error: sessErr } = await supabase.auth.getSession();
  if (sessErr) throw sessErr;

  const uid = sess.session?.user?.id;
  if (!uid) throw new Error("No hay sesión activa");

  // 1) Insert event (created_by se llena por DEFAULT auth.uid())
  const { data: ev, error: evErr } = await supabase
    .from("events")
    .insert({
      title,
      adults_count: payload.adults_count,
      minors_count: payload.minors_count,
    })
    .select("*")
    .single();

  if (evErr) throw evErr;
  if (!ev) throw new Error("No se pudo crear el evento");

  // 2) Insert membership (para que pase tu policy SELECT)
  const { error: memErr } = await supabase.from("event_members").insert({
    event_id: ev.id,
    user_id: uid,
    // Si tu tabla tiene role, descomenta:
    // role: "owner",
  });

  if (memErr) throw memErr;

  return ev as EventRow;
}

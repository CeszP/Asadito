import { supabase } from "./supabase";
import type { EventRow } from "../types/db";

export async function listMyEvents(): Promise<EventRow[]> {
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
}) {
  const { data, error } = await supabase
    .from("events")
    .insert({
      title: payload.title,
      adults_count: payload.adults_count,
      minors_count: payload.minors_count,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

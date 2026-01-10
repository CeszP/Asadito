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

export async function createEvent(
  title: string,
  event_datetime?: string | null,
  location_text?: string | null
) {
  const { data, error } = await supabase
    .rpc("create_event_with_owner", {
      p_title: title,
      p_event_datetime: event_datetime ?? null,
      p_location_text: location_text ?? null,
    })
    .single();

  if (error) throw error;
  return data as EventRow;
}

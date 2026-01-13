// src/hooks/useEvent.ts
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { EventRow } from "../types/db";

export function useEvent(eventId: string) {
  const [event, setEvent] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function run() {
      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from("events")
          .select("id,title,adults_count,minors_count,created_at")
          .eq("id", eventId)
          .single();

        if (!mounted) return;

        if (error) throw error;

        setEvent(data as EventRow);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? "No se pudo cargar el evento");
        setEvent(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (eventId) run();

    return () => {
      mounted = false;
    };
  }, [eventId]);

  return { event, loading, error };
}

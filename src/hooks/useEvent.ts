import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export type EventMeta = {
  id: string;
  title: string;
  adults_count: number;
  minors_count: number;
};

export function useEvent(eventId: string) {
  const [event, setEvent] = useState<EventMeta | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;

    setLoading(true);
    supabase
      .from("events")
      .select("id,title,adults_count,minors_count")
      .eq("id", eventId)
      .single()
      .then(({ data, error }) => {
        if (!error) setEvent(data as EventMeta);
      })
      .finally(() => setLoading(false));
  }, [eventId]);

  return { event, loading };
}

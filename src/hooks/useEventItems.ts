import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { ItemRow } from "../types/db";

export function useEventItems(eventId: string) {
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    setItems((data ?? []) as ItemRow[]);
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => setLoading(false));

    const channel = supabase
      .channel(`items:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "items",
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          // Reload simple por MVP; luego optimizamos a updates incrementales
          load().catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  return { items, loading, reload: load };
}

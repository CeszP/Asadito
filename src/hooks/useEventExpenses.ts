import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { ExpenseRow } from "../types/db";

export function useEventExpenses(eventId: string) {
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);

  async function load() {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (!error) setExpenses((data ?? []) as ExpenseRow[]);
  }

  useEffect(() => {
    load();

    const channel = supabase
      .channel(`expenses:${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses" },
        () => {
          load(); // 🔥 siempre recarga
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return { expenses, total };
}

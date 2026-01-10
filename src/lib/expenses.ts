import { supabase } from "./supabase";

export async function addExpense(
  eventId: string,
  amount: number,
  note?: string
) {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("No hay sesión");

  const { error } = await supabase.from("expenses").insert({
    event_id: eventId,
    paid_by: uid,
    amount,
    note: note ?? null,
  });

  if (error) throw error;
}

export async function deleteExpense(id: string) {
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw error;
}

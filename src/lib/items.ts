import { supabase } from "./supabase";
import type { ItemRow, ItemStatus } from "../types/db";

export async function addItem(params: {
  event_id: string;
  name: string;
  category: string;
  qty?: number | null;
  unit?: string | null;
}) {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const uid = userData.user?.id;
  if (!uid) throw new Error("No hay sesión.");

  const { error } = await supabase.from("items").insert({
    event_id: params.event_id,
    name: params.name,
    category: params.category,
    qty: params.qty ?? null,
    unit: params.unit ?? null,
    created_by: uid,
    status: "pending",
  });

  if (error) throw error;
}

export async function updateItemStatus(itemId: string, status: ItemStatus) {
  const { error } = await supabase
    .from("items")
    .update({ status })
    .eq("id", itemId);
  if (error) throw error;
}

export async function deleteItem(itemId: string) {
  const { error } = await supabase.from("items").delete().eq("id", itemId);
  if (error) throw error;
}

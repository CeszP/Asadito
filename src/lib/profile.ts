import { supabase } from "./supabase";

export async function upsertMyDisplayName(displayName: string) {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const uid = userData.user?.id;
  if (!uid) throw new Error("No hay sesión");

  const clean = displayName.trim();
  if (clean.length < 2) throw new Error("Nombre muy corto");

  const { error } = await supabase.from("profiles").upsert({
    id: uid,
    display_name: clean,
  });

  if (error) throw error;
}

export async function getMyProfile() {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const uid = userData.user?.id;
  if (!uid) throw new Error("No hay sesión");

  const { data, error } = await supabase
    .from("profiles")
    .select("id,display_name")
    .eq("id", uid)
    .maybeSingle();

  if (error) throw error;
  return data as { id: string; display_name: string | null } | null;
}

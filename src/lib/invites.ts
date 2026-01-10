import { supabase } from "./supabase";

export type InviteRow = {
  id: string;
  event_id: string;
  code: string;
  expires_at: string | null;
  created_at: string;
};

export async function createInvite(
  eventId: string,
  expiresMinutes = 1440
): Promise<InviteRow> {
  const { data, error } = await supabase
    .rpc("create_invite", {
      p_event_id: eventId,
      p_expires_minutes: expiresMinutes,
    })
    .single();

  if (error) throw error;
  return data as InviteRow;
}

export async function joinByCode(code: string): Promise<string> {
  const { data, error } = await supabase
    .rpc("join_event_by_code", { p_code: code })
    .single();

  if (error) throw error;
  // data es event_id (uuid)
  return String(data);
}

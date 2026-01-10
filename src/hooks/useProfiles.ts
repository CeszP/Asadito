import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
};

export function useProfiles(userIds: string[]) {
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});

  useEffect(() => {
    const ids = Array.from(new Set(userIds)).filter(Boolean);
    if (ids.length === 0) return;

    supabase
      .from("profiles")
      .select("id,email,display_name")
      .in("id", ids)
      .then(({ data, error }) => {
        if (error) return;
        const map: Record<string, ProfileRow> = {};
        for (const p of data ?? []) map[p.id] = p as ProfileRow;
        setProfiles(map);
      });
  }, [userIds.join(",")]);

  return profiles;
}
